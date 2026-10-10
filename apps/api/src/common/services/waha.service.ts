import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";

// Tipagem das mensagens que o WAHA aceita
interface TextMessage {
  chatId: string;   // formato: "5511999990000@c.us"
  text: string;
  session: string;
}

interface SendResult {
  id: string;
  timestamp: number;
}

@Injectable()
export class WahaService {
  private readonly logger = new Logger(WahaService.name);
  private readonly baseUrl: string;
  private readonly apiKey: string;
  private readonly session: string;

  constructor(private config: ConfigService) {
    this.baseUrl = this.config.get("WAHA_URL") || "http://localhost:3000";
    this.apiKey = this.config.get("WAHA_API_KEY") || "";
    this.session = this.config.get("WAHA_SESSION") || "default";
  }

  private get headers(): Record<string, string> {
  return {
    "Content-Type": "application/json",
    "X-Api-Key": this.apiKey,
    "ngrok-skip-browser-warning": "true",
  };
}

  // Formata número brasileiro para o formato do WhatsApp
  // "11999990000" → "5511999990000@c.us"
  private formatPhoneNumber(phone: string): string {
    const digits = phone.replace(/\D/g, "");
    // Adiciona DDI 55 se não tiver
    const withDdi = digits.startsWith("55") ? digits : `55${digits}`;
    return `${withDdi}@c.us`;
  }

  // Verifica se a sessão do WAHA está ativa
  async isSessionActive(): Promise<boolean> {
    try {
      const res = await fetch(`${this.baseUrl}/api/sessions/${this.session}`, {
        headers: this.headers,
      });
      if (!res.ok) return false;
      const data = await res.json();
      return data.status === "WORKING";
    } catch {
      return false;
    }
  }

  // Resolve um LID (identificador anônimo do WhatsApp) para o telefone real.
  // Por quê: o webhook de entrada pode trazer "...@lid" em vez do número,
  // e sem o telefone não dá para casar a mensagem com Client.phone/whatsapp.
  // Retorna só os dígitos (ex.: "5511948528055") ou null se não resolver.
  async resolveLid(lid: string): Promise<string | null> {
    try {
      // O endpoint espera o LID sem o sufixo "@lid"
      const lidDigits = lid.replace(/@lid$/, "");
      const res = await fetch(
        `${this.baseUrl}/api/${this.session}/lids/${encodeURIComponent(lidDigits)}`,
        { headers: this.headers },
      );
      if (!res.ok) {
        this.logger.warn(`WAHA lids retornou ${res.status} para o LID informado`);
        return null;
      }
      const data = (await res.json()) as { lid?: string; pn?: string | null };
      // "pn" vem como "5511948528055@c.us"; guardamos só os dígitos
      return data.pn ? data.pn.replace(/\D/g, "") : null;
    } catch (err) {
      this.logger.error(`Erro ao resolver LID: ${err}`);
      return null;
    }
  }

  // Envia mensagem de texto para um número
  async sendText(phone: string, message: string): Promise<SendResult | null> {
    try {
      const chatId = this.formatPhoneNumber(phone);
      const body: TextMessage = {
        chatId,
        text: message,
        session: this.session,
      };

      const res = await fetch(`${this.baseUrl}/api/sendText`, {
        method: "POST",
        headers: this.headers,
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const error = await res.text();
        this.logger.error(`WAHA sendText falhou: ${error}`);
        return null;
      }

      const result = await res.json();
      this.logger.log(`✅ WhatsApp enviado para ${phone}`);
      return result;
    } catch (err) {
      this.logger.error(`Erro ao enviar WhatsApp: ${err}`);
      return null;
    }
  }
}
