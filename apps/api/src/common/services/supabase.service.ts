import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { createClient, SupabaseClient } from "@supabase/supabase-js";

@Injectable()
export class SupabaseService {
  private readonly logger = new Logger(SupabaseService.name);
  private readonly client: SupabaseClient;
  private readonly bucket: string;

  constructor(private config: ConfigService) {
    const url = this.config.get<string>("SUPABASE_URL")!;
    const key = this.config.get<string>("SUPABASE_SERVICE_ROLE_KEY")!;
    this.bucket = this.config.get<string>("SUPABASE_BUCKET") || "documents";
    // Usa a service_role key no backend — tem permissão total
    this.client = createClient(url, key);
  }

  // Faz upload de um arquivo para o bucket
  // storageKey: caminho no bucket — ex: "workspaceId/clientId/filename.pdf"
  async upload(
    storageKey: string,
    file: Buffer,
    mimeType: string
  ): Promise<{ url: string } | null> {
    const { error } = await this.client.storage
      .from(this.bucket)
      .upload(storageKey, file, {
        contentType: mimeType,
        upsert: true, // Sobrescreve se já existir (nova versão)
      });

    if (error) {
      this.logger.error(`Upload falhou: ${error.message}`);
      this.logger.error(`Nome do erro: ${error.name}`);
      // @ts-ignore — cause pode não estar tipado no SDK, mas costuma existir em erros de fetch
      const cause = (error as any).cause;
      this.logger.error(`Causa raiz: ${cause?.message ?? 'sem causa capturada'}`);
      this.logger.error(`Causa completa: ${JSON.stringify(cause, Object.getOwnPropertyNames(cause || {}))}`);
      return null;
    }

    return { url: storageKey };
  }

  // Gera uma URL assinada temporária para download (válida por 1 hora)
  // Usamos URL assinada para manter os documentos privados
  async getSignedUrl(storageKey: string, expiresInSeconds = 3600): Promise<string | null> {
    const { data, error } = await this.client.storage
      .from(this.bucket)
      .createSignedUrl(storageKey, expiresInSeconds);

    if (error || !data?.signedUrl) {
      this.logger.error(`Erro ao gerar URL assinada: ${error?.message}`);
      return null;
    }

    return data.signedUrl;
  }

  // Remove um arquivo do bucket
  async delete(storageKey: string): Promise<boolean> {
    const { error } = await this.client.storage
      .from(this.bucket)
      .remove([storageKey]);

    if (error) {
      this.logger.error(`Erro ao deletar arquivo: ${error.message}`);
      return false;
    }

    return true;
  }

  // Lista arquivos de um cliente
  async listFiles(prefix: string): Promise<Array<{ name: string; size: number }>> {
    const { data, error } = await this.client.storage
      .from(this.bucket)
      .list(prefix);

    if (error || !data) return [];
    return data.map((f) => ({ name: f.name, size: f.metadata?.size || 0 }));
  }
}
