import { IsString, MinLength } from 'class-validator';

export class UploadCertificateDto {
  /**
   * Senha do arquivo .pfx fornecida pelo contador.
   * Mínimo 4 caracteres (certificados A1 geralmente têm senhas mais longas).
   * NUNCA é armazenada em texto puro — só o hash bcrypt vai pro banco.
   */
  @IsString()
  @MinLength(4)
  password: string;
}
