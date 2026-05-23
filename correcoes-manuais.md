# ContaHub — Correções Manuais (fallback)
**Data:** 23/05/2026 | Para usar quando `aplicar-correcoes.sh` reportar NOOP

---

## FIX-01 — TypeScript estrito no portal

**Arquivo:** `apps/web/app/portal/[slug]/page.tsx`

### Antes
```typescript
let workspace = { name: "Escritório Contábil", primaryColor: "#2563EB" };
try {
  const res = await getWorkspaceBySlug(params.slug);
  workspace = res.data;
} catch {
  // Escritório não encontrado — mostra tela genérica
}
```

### Depois
```typescript
let workspace: WorkspacePublic = {
  id: "",
  slug: params.slug,
  name: "Escritório Contábil",
  primaryColor: "#2563EB",
};
try {
  const res = await getWorkspaceBySlug(params.slug);
  workspace = res.data;
} catch {
  // Escritório não encontrado — mostra tela genérica
}
```

### No JSX (onde a cor é aplicada)
```diff
- style={{ backgroundColor: workspace.primaryColor || "#2563EB" }}
+ style={{ backgroundColor: workspace.primaryColor ?? "#2563EB" }}
```

**Por que `??` e não `||`?**
O operador `||` trata `""` (string vazia) como falsy e cai no fallback.
O `??` só usa o fallback quando o valor é `null` ou `undefined`, que é o comportamento correto aqui.

---

## FIX-02 — BOLA/IDOR no Portal

### 2a. Adicionar ao `apps/api/src/modules/portal/portal.service.ts`

Adicione este método **dentro da classe**, antes do último `}`:

```typescript
/**
 * Valida que o usuário autenticado é dono dos dados solicitados.
 *
 * Por que é necessário:
 * O portal é uma rota pública (sem token de workspace). Sem essa verificação,
 * qualquer pessoa que adivinhe um clientId na URL vê documentos sigilosos
 * de qualquer empresa — vulnerabilidade BOLA/IDOR crítica.
 */
async validateClientAccess(
  workspaceSlug: string,
  clientId: string,
  currentUserEmail: string,
): Promise<void> {
  const workspace = await prisma.workspace.findUnique({
    where: { slug: workspaceSlug },
  });

  if (!workspace) {
    throw new NotFoundException('Escritório não encontrado.');
  }

  const client = await prisma.client.findFirst({
    where: {
      id: clientId,
      workspaceId: workspace.id,
      portalEmail: { equals: currentUserEmail, mode: 'insensitive' },
      portalEnabled: true,
    },
  });

  if (!client) {
    // Mensagem genérica intencional — não vazar se o clientId existe
    throw new UnauthorizedException(
      'Você não tem permissão para acessar os dados deste cliente.',
    );
  }
}
```

Garanta que o import inclua as exceções:
```typescript
import {
  Injectable,
  NotFoundException,
  UnauthorizedException,
  // ... outros já existentes
} from '@nestjs/common';
```

### 2b. Adicionar ao `apps/api/src/modules/portal/portal.controller.ts`

Em **cada método** que recebe `clientId` como parâmetro (getDocuments, getObligations, clientUpload, deleteClientDocument), adicione como **primeira linha**:

```typescript
// Antes de qualquer lógica de negócio:
await this.portalService.validateClientAccess(slug, clientId, req['userEmail']);
```

Exemplo completo:
```typescript
@Get(':slug/documents/:clientId')
async getDocuments(
  @Param('slug') slug: string,
  @Param('clientId') clientId: string,
  @Req() req: Request,
) {
  // [FIX-02] Valida que o e-mail autenticado é dono deste clientId
  await this.portalService.validateClientAccess(slug, clientId, req['userEmail']);

  return this.portalService.getClientDocuments(slug, clientId);
}
```

> **Nota:** `req['userEmail']` deve ser populado pelo middleware do Clerk durante o login do portal. Confirme que o middleware armazena o e-mail do token nessa propriedade.

---

## FIX-03 — MIME Type Spoofing

### Adicionar aos dois arquivos de service

Adicione esta função **fora da classe** (antes de `@Injectable()`):

```typescript
// apps/api/src/modules/documents/documents.service.ts
// apps/api/src/modules/portal/portal.service.ts

const ALLOWED_MIME_TYPES = [
  'application/pdf',
  'image/jpeg',
  'image/png',
  'image/webp',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'text/xml',
  'application/xml',
];

const ALLOWED_EXTENSIONS = ['pdf', 'jpg', 'jpeg', 'png', 'webp', 'xls', 'xlsx', 'xml'];

/**
 * [FIX-03] Validação dupla de tipo de arquivo.
 * Camada 1: mimetype declarado pelo browser (fácil de forjar)
 * Camada 2: extensão do nome original (barreira adicional)
 */
function validateFileType(file: Express.Multer.File): void {
  if (!ALLOWED_MIME_TYPES.includes(file.mimetype)) {
    throw new BadRequestException(`Tipo de arquivo não permitido: ${file.mimetype}`);
  }

  const extension = file.originalname.split('.').pop()?.toLowerCase() ?? '';
  if (!ALLOWED_EXTENSIONS.includes(extension)) {
    throw new BadRequestException(`Extensão de arquivo não permitida: .${extension}`);
  }
}
```

Substitua o bloco de validação inline nos métodos de upload por:
```typescript
// Antes (apenas mimetype):
if (!ALLOWED_MIME_TYPES.includes(file.mimetype)) {
  throw new BadRequestException('Tipo de arquivo não permitido.');
}

// Depois (dupla validação):
validateFileType(file);
```

---

## FIX-04 — Acessibilidade WCAG 2.1 no UploadModal

**Arquivo:** `apps/web/components/documents/UploadModal.tsx`

### 4a. Container do modal — adicionar role e aria
```diff
- <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg">
+ <div
+   className="bg-white rounded-2xl shadow-2xl w-full max-w-lg"
+   role="dialog"
+   aria-modal="true"
+   aria-labelledby="modal-upload-title"
+ >
```

### 4b. Título do modal — adicionar id para aria-labelledby
```diff
- <h2 className="text-lg font-semibold text-gray-900">
+ <h2 id="modal-upload-title" className="text-lg font-semibold text-gray-900">
```

### 4c. Botão de fechar — adicionar aria-label
```diff
- <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
+ <button
+   onClick={onClose}
+   className="text-gray-400 hover:text-gray-600"
+   aria-label="Fechar janela de upload"
+ >
```

### 4d. Área de drag-and-drop — acessível por teclado
```diff
  <div
    onDrop={handleFileDrop}
    onDragOver={(e) => e.preventDefault()}
    onClick={() => inputRef.current?.click()}
+   onKeyDown={(e) => {
+     if (e.key === 'Enter' || e.key === ' ') {
+       e.preventDefault();
+       inputRef.current?.click();
+     }
+   }}
+   tabIndex={0}
+   role="button"
+   aria-label="Área de envio de arquivos. Pressione Enter ou Espaço para selecionar um arquivo."
    className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer ...`}
  >
```

### 4e. Labels conectados a inputs
```diff
- <label className="block text-sm font-medium text-gray-700 mb-1">Cliente *</label>
- <select value={clientId} onChange={(e) => setClientId(e.target.value)} required>
+ <label htmlFor="upload-client" className="block text-sm font-medium text-gray-700 mb-1">
+   Cliente *
+ </label>
+ <select id="upload-client" value={clientId} onChange={(e) => setClientId(e.target.value)} required>

- <label className="block text-sm font-medium text-gray-700 mb-1">Nome do documento</label>
- <input type="text" value={name} onChange={(e) => setName(e.target.value)} />
+ <label htmlFor="upload-name" className="block text-sm font-medium text-gray-700 mb-1">
+   Nome do documento
+ </label>
+ <input id="upload-name" type="text" value={name} onChange={(e) => setName(e.target.value)} />
```

---

## FIX-05 — ESLint no apps/api

### Instalar dependências
```bash
cd apps/api
pnpm add -D eslint@^8.57.0 \
            @typescript-eslint/parser@^7.0.0 \
            @typescript-eslint/eslint-plugin@^7.0.0 \
            eslint-plugin-import@^2.29.1
```

### Criar/substituir `apps/api/.eslintrc.js`
```javascript
module.exports = {
  parser: '@typescript-eslint/parser',
  parserOptions: {
    project: 'tsconfig.json',
    tsconfigRootDir: __dirname,
    sourceType: 'module',
  },
  plugins: ['@typescript-eslint/eslint-plugin'],
  extends: ['plugin:@typescript-eslint/recommended'],
  root: true,
  env: { node: true, jest: true },
  ignorePatterns: ['.eslintrc.js', 'dist/**'],
  rules: {
    '@typescript-eslint/no-explicit-any': 'warn',
    '@typescript-eslint/no-unused-vars': ['warn', { argsIgnorePattern: '^_' }],
    '@typescript-eslint/explicit-function-return-type': 'off',
    '@typescript-eslint/explicit-module-boundary-types': 'off',
  },
};
```

### Verificar script no `apps/api/package.json`
```json
{
  "scripts": {
    "lint": "eslint \"{src,apps,libs,test}/**/*.ts\" --fix"
  }
}
```

### Testar
```bash
# Da raiz do monorepo:
pnpm run lint

# Ou isolado na API:
cd apps/api && pnpm run lint
```

---

## Commit sugerido após todas as correções

```bash
git add -A
git commit -m "fix: segurança, tipagem e acessibilidade (FIX-01 a FIX-05)

- FIX-01: TypeScript estrito no portal — WorkspacePublic tipado explicitamente
- FIX-02: BOLA/IDOR — validateClientAccess em todos endpoints do portal
- FIX-03: MIME spoofing — validação dupla de tipo e extensão de arquivo
- FIX-04: WCAG 2.1 — UploadModal acessível por teclado e leitor de tela
- FIX-05: ESLint instalado e configurado no apps/api"

git push origin main
```
