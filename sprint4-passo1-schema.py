#!/usr/bin/env python3
"""
ContaHub — Sprint 4, Passo 1 (v2)
Adiciona ao schema.prisma:
  - Campos ecacLastChecked, ecacAlertCount, certificate, ecacConsultations no model Client
  - Model ClientCertificate
  - Model EcacConsultation
  - Model EcacPendency
  - Enums: CertificateStatus, ConsultationStatus, PendencyType

Executar da raiz do projeto:
  python3 sprint4-passo1-schema.py
"""

import sys

SCHEMA_PATH = "packages/database/prisma/schema.prisma"

# Marcador único: apenas o model Client tem @@unique([workspaceId, cnpj])
# Inserimos os novos campos antes do fechamento do model Client
CLIENT_CLOSING = '  @@unique([workspaceId, cnpj])\n  @@index([workspaceId])\n  @@index([workspaceId, status])\n}'

NEW_CLIENT_CLOSING = '''  /// Última vez que o e-CAC foi consultado para este cliente
  ecacLastChecked   DateTime?

  /// Número de pendências ativas no e-CAC (cache para exibição rápida no dashboard)
  ecacAlertCount    Int       @default(0)

  /// Certificado digital A1 associado ao cliente (relação 1-1)
  certificate       ClientCertificate?

  /// Histórico de consultas ao e-CAC
  ecacConsultations EcacConsultation[]

  @@unique([workspaceId, cnpj])
  @@index([workspaceId])
  @@index([workspaceId, status])
}'''

MODELS_TO_ADD = """

// ============================================================
// SPRINT 4 — INTEGRAÇÃO e-CAC / RECEITA FEDERAL
// ============================================================

/// Certificado digital A1 do cliente (.pfx criptografado com AES-256 no Supabase)
/// A senha do .pfx é armazenada como hash bcrypt — nunca em texto puro.
/// A chave AES de criptografia fica apenas no .env (CERTIFICATE_ENCRYPTION_KEY).
model ClientCertificate {
  id           String            @id @default(cuid())
  clientId     String            @unique
  client       Client            @relation(fields: [clientId], references: [id], onDelete: Cascade)

  /// Chave do arquivo criptografado no Supabase bucket "certificates"
  storageKey   String

  /// Data de expiração extraída do .pfx via node-forge
  expiresAt    DateTime

  /// Status operacional do certificado
  status       CertificateStatus @default(ACTIVE)

  /// Hash bcrypt da senha do .pfx — nunca armazenar a senha em texto puro
  passwordHash String

  createdAt    DateTime          @default(now())
  updatedAt    DateTime          @updatedAt

  @@map("client_certificates")
}

/// Registro de cada varredura automática do e-CAC para um cliente
/// Criado após cada execução do EcacWorker (cron toda segunda-feira às 03h BRT)
model EcacConsultation {
  id           String             @id @default(cuid())
  clientId     String
  client       Client             @relation(fields: [clientId], references: [id], onDelete: Cascade)
  workspaceId  String

  /// Data/hora em que a varredura foi executada
  consultedAt  DateTime           @default(now())

  /// Se a consulta foi bem-sucedida, parcial ou falhou
  status       ConsultationStatus @default(SUCCESS)

  /// Mensagem de erro técnico, se falhou (para diagnóstico)
  errorMessage String?

  /// Hash SHA-256 do conteúdo extraído — se igual à consulta anterior, não notifica
  contentHash  String?

  /// Pendências encontradas nesta consulta
  pendencies   EcacPendency[]

  @@index([clientId])
  @@index([workspaceId])
  @@map("ecac_consultations")
}

/// Cada pendência individual encontrada numa consulta e-CAC
/// Ex: um débito de IRPJ, uma DEFIS pendente, um parcelamento ativo
model EcacPendency {
  id             String           @id @default(cuid())
  consultationId String
  consultation   EcacConsultation @relation(fields: [consultationId], references: [id], onDelete: Cascade)
  clientId       String
  workspaceId    String

  /// Categoria da pendência
  type           PendencyType

  /// Descrição legível para o contador (ex: "DARF - IRPJ 1º trim/2026")
  description    String

  /// Valor monetário em reais, se aplicável (débitos, multas)
  amount         Decimal?         @db.Decimal(12, 2)

  /// Data de vencimento, se aplicável
  dueDate        DateTime?

  /// Situação atual conforme o e-CAC (ex: "Em aberto", "Parcelado", "Contestado")
  situation      String?

  /// Se o contador já foi notificado via WhatsApp/e-mail sobre esta pendência
  notified       Boolean          @default(false)

  createdAt      DateTime         @default(now())

  @@index([clientId])
  @@index([workspaceId])
  @@index([consultationId])
  @@map("ecac_pendencies")
}

// ============================================================
// ENUMS — SPRINT 4
// ============================================================

enum CertificateStatus {
  ACTIVE
  EXPIRED
  INVALID
  REVOKED
}

enum ConsultationStatus {
  SUCCESS
  FAILED
  PARTIAL
}

enum PendencyType {
  DEBT
  DECLARATION
  INSTALLMENT
  PROCESS
  SIMPLES
  OTHER
}
"""

def main():
    try:
        with open(SCHEMA_PATH, "r", encoding="utf-8") as f:
            content = f.read()
    except FileNotFoundError:
        print(f"ERRO: Arquivo não encontrado: {SCHEMA_PATH}")
        print("Execute este script a partir da raiz do projeto:")
        print("  cd ~/Desktop/Projeto\\ SaaS")
        sys.exit(1)

    # Verificar se já foi aplicado
    if "ClientCertificate" in content:
        print("AVISO: Os models da Sprint 4 já estão presentes no schema. Nada alterado.")
        sys.exit(0)

    # Verificar o marcador
    if CLIENT_CLOSING not in content:
        print("ERRO: Não encontrei o fechamento esperado do model Client.")
        print("Marcador buscado:")
        print(repr(CLIENT_CLOSING))
        sys.exit(1)

    # 1. Inserir campos novos no model Client
    content = content.replace(CLIENT_CLOSING, NEW_CLIENT_CLOSING)
    print("✓ Campos ecacLastChecked, ecacAlertCount, certificate e ecacConsultations adicionados ao model Client")

    # 2. Adicionar novos models e enums no final
    content = content.rstrip() + "\n" + MODELS_TO_ADD + "\n"
    print("✓ Models ClientCertificate, EcacConsultation e EcacPendency adicionados")
    print("✓ Enums CertificateStatus, ConsultationStatus e PendencyType adicionados")

    with open(SCHEMA_PATH, "w", encoding="utf-8") as f:
        f.write(content)

    print("\n✅ Schema atualizado com sucesso!")
    print("\nPróximo passo — rodar a migration:")
    print("  cd packages/database")
    print("  npx prisma migrate dev --name add_ecac_sprint4")

if __name__ == "__main__":
    main()