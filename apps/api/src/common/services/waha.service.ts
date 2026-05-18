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
        headers: { "X-Api-Key": this.apiKey },
      });
      if (!res.ok) return false;
      const data = await res.json();
      return data.status === "WORKING";
    } catch {
      return false;
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
        headers: {
          "Content-Type": "application/json",
          "X-Api-Key": this.apiKey,
        },
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
