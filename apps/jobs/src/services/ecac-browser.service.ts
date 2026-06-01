import { Injectable, Logger } from '@nestjs/common';
import { chromium, Browser, Page } from 'playwright';
import * as forge from 'node-forge';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import * as crypto from 'crypto';
import { EcacConsultationResult, EcacPendencyData } from './ecac.types';

/**
 * EcacBrowserService
 *
 * Abre Chrome headless, carrega certificado A1 via mTLS,
 * autentica no e-CAC e extrai pendências fiscais do cliente.
 *
 * SEGURANÇA:
 * - .pfx descriptografado fica em /tmp SOMENTE durante a consulta
 * - Arquivo temporário deletado no finally (mesmo em caso de erro)
 * - Permissão 0o600 no arquivo temporário (só o processo owner lê)
 *
 * RESILIÊNCIA:
 * - Seletores com múltiplos fallbacks (layout do gov muda sem aviso)
 * - Screenshot automático em caso de erro salvo em /tmp
 * - Timeout 30s/operação, 60s/navegação
 */
@Injectable()
export class EcacBrowserService {
  private readonly logger = new Logger(EcacBrowserService.name);

  private readonly ECAC_LOGIN   = 'https://cav.receita.fazenda.gov.br/autenticacao/login';
  private readonly PAGE_TIMEOUT = 30_000;
  private readonly NAV_TIMEOUT  = 60_000;

  async consultarPendencias(
    pfxBuffer: Buffer,
    pfxPassword: string,
    clientName: string,
  ): Promise<EcacConsultationResult> {
    let tempPfxPath: string | null = null;
    let browser: Browser | null = null;

    try {
      // 1. Validar o .pfx antes de abrir o browser
      this.extractPemFromPfx(pfxBuffer, pfxPassword);

      // 2. Salvar .pfx em arquivo temporário protegido
      tempPfxPath = this.saveTempPfx(pfxBuffer);

      // 3. Abrir browser headless
      browser = await chromium.launch({
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage'],
      });

      // 4. Criar contexto com certificado mTLS
      const context = await browser.newContext({
        clientCertificates: [{
          origin: 'https://cav.receita.fazenda.gov.br',
          pfxPath: tempPfxPath,
          passphrase: pfxPassword,
        }],
        ignoreHTTPSErrors: false,
      });

      const page = await context.newPage();
      page.setDefaultTimeout(this.PAGE_TIMEOUT);

      // 5. Navegar e autenticar
      await this.navegarEAutenticar(page, clientName);

      // 6. Extrair pendências de cada seção
      const pendencies = await this.extractPendencies(page, clientName);

      // 7. Hash para deduplicação de notificações
      const contentHash = this.hashPendencies(pendencies);

      this.logger.log(`[${clientName}] ✓ ${pendencies.length} pendência(s)`);

      return { success: true, pendencies, contentHash };

    } catch (error: any) {
      this.logger.error(`[${clientName}] Erro: ${error.message}`);
      return { success: false, pendencies: [], errorMessage: error.message };
    } finally {
      if (browser) await browser.close().catch(() => {});
      if (tempPfxPath && fs.existsSync(tempPfxPath)) {
        fs.unlinkSync(tempPfxPath);
      }
    }
  }

  // ─── Autenticação ─────────────────────────────────────

  private async navegarEAutenticar(page: Page, clientName: string): Promise<void> {
    this.logger.debug(`[${clientName}] Acessando e-CAC...`);

    await page.goto(this.ECAC_LOGIN, {
      waitUntil: 'networkidle',
      timeout: this.NAV_TIMEOUT,
    });

    const url = page.url();

    // Login automático via mTLS — já cai no dashboard
    if (url.includes('/ecac/') || url.includes('/dashboard')) {
      this.logger.debug(`[${clientName}] Login automático via certificado`);
      return;
    }

    // Tentar clicar no botão de certificado digital
    const selectors = [
      'a[href*="certificado"]',
      'button:has-text("Certificado Digital")',
      'a:has-text("Certificado")',
      '[id*="cert"]',
      '.btn-certificado',
    ];

    let clicou = false;
    for (const sel of selectors) {
      try {
        const el = await page.$(sel);
        if (el) {
          await el.click();
          clicou = true;
          this.logger.debug(`[${clientName}] Botão certificado: ${sel}`);
          break;
        }
      } catch {}
    }

    if (!clicou) {
      await this.salvarScreenshot(page, clientName, 'botao-nao-encontrado');
      throw new Error('Botão de certificado não encontrado — layout do e-CAC pode ter mudado');
    }

    await page.waitForNavigation({ waitUntil: 'networkidle', timeout: this.NAV_TIMEOUT })
      .catch(() => {});

    const urlPos = page.url();
    if (!urlPos.includes('/ecac') && !urlPos.includes('/dashboard')) {
      await this.salvarScreenshot(page, clientName, 'falha-login');
      throw new Error(`Autenticação falhou — URL: ${urlPos}`);
    }
  }

  // ─── Extração ──────────────────────────────────────────

  private async extractPendencies(page: Page, clientName: string): Promise<EcacPendencyData[]> {
    const all: EcacPendencyData[] = [];
    all.push(...await this.extractDebts(page, clientName));
    all.push(...await this.extractDeclarations(page, clientName));
    all.push(...await this.extractInstallments(page, clientName));
    all.push(...await this.extractSimples(page, clientName));
    return all;
  }

  private async extractDebts(page: Page, clientName: string): Promise<EcacPendencyData[]> {
    const result: EcacPendencyData[] = [];
    try {
      await page.goto(
        'https://cav.receita.fazenda.gov.br/ecac/conteudo/conta/extrato-de-conta.aspx',
        { waitUntil: 'networkidle', timeout: this.NAV_TIMEOUT }
      );

      const rowsSelectors = [
        'table.gridView tr:not(:first-child)',
        '.grid-debitos tbody tr',
        'table[id*="Grid"] tbody tr',
      ];

      let rows: any[] = [];
      for (const sel of rowsSelectors) {
        rows = await page.$$(sel);
        if (rows.length > 0) break;
      }

      for (const row of rows) {
        try {
          const cells = await row.$$('td');
          if (cells.length < 2) continue;
          const desc   = (await cells[0]?.innerText() ?? '').trim();
          const val    = await cells[1]?.innerText().catch(() => '');
          const venc   = await cells[2]?.innerText().catch(() => '');
          const sit    = await cells[3]?.innerText().catch(() => '');
          if (!desc) continue;
          result.push({ type: 'DEBT', description: desc, amount: this.parseCurrency(val), dueDate: this.parseDate(venc), situation: sit?.trim() });
        } catch {}
      }
    } catch (e: any) {
      this.logger.warn(`[${clientName}] Débitos: ${e.message}`);
    }
    return result;
  }

  private async extractDeclarations(page: Page, clientName: string): Promise<EcacPendencyData[]> {
    const result: EcacPendencyData[] = [];
    try {
      await page.goto(
        'https://cav.receita.fazenda.gov.br/ecac/conteudo/declaracoes/pendencias.aspx',
        { waitUntil: 'networkidle', timeout: this.NAV_TIMEOUT }
      );
      const rows = await page.$$('table tbody tr').catch(() => []);
      for (const row of rows) {
        try {
          const cells = await row.$$('td');
          if (cells.length < 2) continue;
          const desc = (await cells[0]?.innerText() ?? '').trim();
          const venc = await cells[1]?.innerText().catch(() => '');
          const sit  = await cells[2]?.innerText().catch(() => '');
          if (!desc) continue;
          result.push({ type: 'DECLARATION', description: desc, dueDate: this.parseDate(venc), situation: sit?.trim() });
        } catch {}
      }
    } catch (e: any) {
      this.logger.warn(`[${clientName}] Declarações: ${e.message}`);
    }
    return result;
  }

  private async extractInstallments(page: Page, clientName: string): Promise<EcacPendencyData[]> {
    const result: EcacPendencyData[] = [];
    try {
      await page.goto(
        'https://cav.receita.fazenda.gov.br/ecac/conteudo/parcelamento/consulta-parcelamento.aspx',
        { waitUntil: 'networkidle', timeout: this.NAV_TIMEOUT }
      );
      const rows = await page.$$('table tbody tr').catch(() => []);
      for (const row of rows) {
        try {
          const cells = await row.$$('td');
          if (cells.length < 2) continue;
          const desc = (await cells[0]?.innerText() ?? '').trim();
          const val  = await cells[1]?.innerText().catch(() => '');
          const sit  = await cells[2]?.innerText().catch(() => '');
          if (!desc) continue;
          result.push({ type: 'INSTALLMENT', description: desc, amount: this.parseCurrency(val), situation: sit?.trim() });
        } catch {}
      }
    } catch (e: any) {
      this.logger.warn(`[${clientName}] Parcelamentos: ${e.message}`);
    }
    return result;
  }

  private async extractSimples(page: Page, clientName: string): Promise<EcacPendencyData[]> {
    const result: EcacPendencyData[] = [];
    try {
      await page.goto(
        'https://cav.receita.fazenda.gov.br/ecac/conteudo/simples/optantes-irregulares.aspx',
        { waitUntil: 'networkidle', timeout: this.NAV_TIMEOUT }
      );
      const body = await page.innerText('body').catch(() => '');
      if (body.toLowerCase().includes('irregular') || body.toLowerCase().includes('pendência')) {
        result.push({ type: 'SIMPLES', description: 'Pendência no Simples Nacional', situation: 'Irregular' });
      }
    } catch (e: any) {
      this.logger.warn(`[${clientName}] Simples: ${e.message}`);
    }
    return result;
  }

  // ─── Helpers ───────────────────────────────────────────

  private extractPemFromPfx(pfxBuffer: Buffer, password: string): { certPem: string; keyPem: string } {
    const pfxDer  = forge.util.createBuffer(pfxBuffer.toString('binary'));
    const pfxAsn1 = forge.asn1.fromDer(pfxDer);
    const pfx     = forge.pkcs12.pkcs12FromAsn1(pfxAsn1, false, password);

    const certBags = pfx.getBags({ bagType: forge.pki.oids.certBag });
    const keyBags  = pfx.getBags({ bagType: forge.pki.oids.pkcs8ShroudedKeyBag });

    const cert = certBags[forge.pki.oids.certBag]?.[0]?.cert;
    const key  = keyBags[forge.pki.oids.pkcs8ShroudedKeyBag]?.[0]?.key;

    if (!cert || !key) throw new Error('Certificado ou chave não encontrados no .pfx');

    return {
      certPem: forge.pki.certificateToPem(cert),
      keyPem:  forge.pki.privateKeyToPem(key),
    };
  }

  private saveTempPfx(pfxBuffer: Buffer): string {
    const p = path.join(os.tmpdir(), `ch-cert-${Date.now()}-${Math.random().toString(36).slice(2)}.pfx`);
    fs.writeFileSync(p, pfxBuffer, { mode: 0o600 });
    return p;
  }

  private async salvarScreenshot(page: Page, clientName: string, motivo: string): Promise<void> {
    try {
      const p = path.join(os.tmpdir(), `ecac-${clientName.replace(/\s+/g,'_')}-${motivo}-${Date.now()}.png`);
      await page.screenshot({ path: p, fullPage: true });
      this.logger.warn(`Screenshot salvo: ${p}`);
    } catch {}
  }

  private parseCurrency(text?: string): number | undefined {
    if (!text) return undefined;
    const v = parseFloat(text.replace(/[R$\s.]/g, '').replace(',', '.'));
    return isNaN(v) ? undefined : Math.round(v * 100);
  }

  private parseDate(text?: string): Date | undefined {
    if (!text) return undefined;
    const m = text.trim().match(/(\d{2})\/(\d{2})\/(\d{4})/);
    if (!m) return undefined;
    return new Date(+m[3], +m[2] - 1, +m[1]);
  }

  private hashPendencies(pendencies: EcacPendencyData[]): string {
    const sorted = [...pendencies]
      .sort((a, b) => a.description.localeCompare(b.description))
      .map((p) => `${p.type}|${p.description}|${p.amount ?? ''}`);
    return crypto.createHash('sha256').update(sorted.join('\n')).digest('hex');
  }
}
