# ContaHub 🧾

> O sistema nervoso digital do seu escritório de contabilidade.

SaaS multi-tenant para escritórios de contabilidade brasileiros — automatiza obrigações fiscais, gestão de clientes, documentos e comunicação.

---

## Stack

| Camada | Tecnologia |
|---|---|
| Monorepo | Turborepo + pnpm workspaces |
| Frontend | Next.js 14 (App Router) |
| Backend | NestJS + TypeScript |
| Banco | PostgreSQL + Prisma ORM |
| Auth | Clerk |
| Storage | Cloudflare R2 |
| Jobs | BullMQ + Redis |
| Deploy | Vercel (web) + Railway (api) |

---

## Estrutura

```
contahub/
├── apps/
│   ├── web/      → Next.js dashboard
│   ├── api/      → NestJS REST API
│   └── jobs/     → Workers BullMQ
├── packages/
│   ├── database/ → Prisma schema + client
│   ├── ui/       → Design system
│   ├── shared/   → Types + Zod schemas
│   └── config/   → ESLint, TS, Tailwind base
└── .github/
    └── workflows/ → CI/CD pipelines
```

---

## Começando

### Pré-requisitos
- Node.js >= 20
- pnpm >= 9
- PostgreSQL (local ou Railway)
- Redis (local ou Railway)

### Instalação

```bash
# 1. Clonar o repositório
git clone https://github.com/ContaHub/contahub.git
cd contahub

# 2. Instalar dependências
pnpm install

# 3. Configurar variáveis de ambiente
cp .env.example .env.local
# Preencha os valores no .env.local

# 4. Gerar o Prisma Client
pnpm db:generate

# 5. Criar o banco e rodar migrations
pnpm db:migrate

# 6. Popular banco com dados de exemplo
pnpm db:seed

# 7. Rodar todos os apps em desenvolvimento
pnpm dev
```

### Apps rodando
- **Web**: http://localhost:3000
- **API**: http://localhost:3001/api/v1
- **Health check**: http://localhost:3001/api/v1/health

---

## Branches

```
main      → produção (protegida, só aceita PR)
develop   → staging (deploy automático)
feature/* → novas funcionalidades
fix/*     → correções
chore/*   → manutenção técnica
```

---

## Scripts úteis

```bash
pnpm dev          # Roda todos os apps
pnpm build        # Build de produção
pnpm lint         # Lint em todos os packages
pnpm db:studio    # Abre o Prisma Studio (interface visual do banco)
pnpm db:seed      # Popula banco com dados de exemplo
```

---

## Time

- **Pietro** — Co-fundador
- **[Seu nome]** — Co-fundador

---

## Licença

Proprietário — todos os direitos reservados.
