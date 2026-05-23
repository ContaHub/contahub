# Relatório de Erros e Sugestões de Correção — ContaHub

Este documento consolida os problemas identificados no ContaHub nas áreas de **compilação**, **segurança**, **acessibilidade (WCAG)** e **configuração local**, acompanhados das respectivas propostas e trechos de código para correção imediata.

---

## 1. Falha de Compilação do Next.js (TypeScript Estrito)

### O Erro
Durante a build de produção (`next build`), a compilação do frontend é interrompida com o seguinte erro:
```bash
./app/portal/[slug]/page.tsx:22:5
Type error: Type 'WorkspacePublic' is not assignable to type '{ name: string; primaryColor: string; }'.
  Types of property 'primaryColor' are incompatible.
    Type 'string | undefined' is not assignable to type 'string'.
      Type 'undefined' is not assignable to type 'string'.
```

### O Porquê
A variável `workspace` é inicializada com valores de tipo estrito:
```typescript
let workspace = { name: "Escritório Contábil", primaryColor: "#2563EB" };
```
Como não há tipagem explícita na declaração, o TypeScript infere que `primaryColor` é uma `string` obrigatória. Ao tentar reatribuir `workspace = res.data` (cujo tipo `WorkspacePublic` define `primaryColor?: string`, ou seja, `string | undefined`), ocorre a quebra de tipos.

### Correção Sugerida
Tipar a variável explicitamente como `WorkspacePublic` e utilizar valores padrões seguros na renderização.

```diff
-  // Busca info pública do escritório para personalizar a tela
-  let workspace = { name: "Escritório Contábil", primaryColor: "#2563EB" };
-  try {
-    const res = await getWorkspaceBySlug(params.slug);
-    workspace = res.data;
-  } catch {
-    // Escritório não encontrado — mostra tela genérica
-  }
+  // Busca info pública do escritório para personalizar a tela
+  let workspace: WorkspacePublic = {
+    id: "",
+    slug: params.slug,
+    name: "Escritório Contábil",
+    primaryColor: "#2563EB"
+  };
+
+  try {
+    const res = await getWorkspaceBySlug(params.slug);
+    workspace = res.data;
+  } catch {
+    // Escritório não encontrado — mostra tela genérica
+  }
```

E no JSX onde a cor é aplicada, garanta um fallback adequado usando coalescência nula:
```diff
-  style={{ backgroundColor: workspace.primaryColor || "#2563EB" }}
+  style={{ backgroundColor: workspace.primaryColor ?? "#2563EB" }}
```

---

## 2. Vulnerabilidade Crítica de Segurança: Broken Object Level Authorization (BOLA/IDOR)

### O Erro
O Portal do Cliente expõe dados extremamente sigilosos (documentos corporativos, faturamento, guias fiscais) de qualquer cliente sem verificar se quem faz a requisição é de fato o dono da conta.

* **Endpoints afetados:**
  * `GET /api/v1/portal/:slug/documents/:clientId` (Lista os documentos privados do cliente)
  * `GET /api/v1/portal/:slug/obligations/:clientId` (Exibe guias fiscais do cliente)
  * `GET /api/v1/portal/:slug/documents/:documentId/download` (Gera link de download com URL assinada para qualquer arquivo)
  * `DELETE /api/v1/portal/:slug/documents/:documentId` (Remove documentos do cliente)

### O Porquê
No arquivo [workspace.middleware.ts](file:///Users/novistator/Desktop/Projeto%20SaaS/apps/api/src/common/middleware/workspace.middleware.ts), a rota do portal está liberada como pública:
```typescript
const PUBLIC_PREFIXES = ["/api/v1/health", "/api/v1/portal"];
```
Entretanto, no [portal.controller.ts](file:///Users/novistator/Desktop/Projeto%20SaaS/apps/api/src/modules/portal/portal.controller.ts), não há Guards secundários ou validação de JWT específica do Clerk para validar a sessão do cliente do portal. O `clientId` é lido diretamente dos parâmetros da URL de forma arbitrária e sem validação de autoria ou permissão.

### Correção Sugerida
1. Reintroduzir a verificação de token Clerk para requisições do Portal no Middleware, validando a assinatura do Clerk do usuário conectado.
2. Criar um Guard ou lógica no serviço do portal para conferir se o e-mail do usuário autenticado no Clerk (`req.userEmail`) coincide com o campo `portalEmail` cadastrado na tabela `Client` para aquele ID:

```typescript
// Exemplo de verificação a ser adicionada na camada de serviço (portal.service.ts)
async validateClientAccess(workspaceSlug: string, clientId: string, currentUserEmail: string) {
  const workspace = await prisma.workspace.findUnique({ where: { slug: workspaceSlug } });
  if (!workspace) throw new NotFoundException("Escritório não encontrado");

  const client = await prisma.client.findFirst({
    where: {
      id: clientId,
      workspaceId: workspace.id,
      portalEmail: currentUserEmail,
      portalEnabled: true,
    },
  });

  if (!client) {
    throw new UnauthorizedException("Você não tem permissão para acessar os dados deste cliente.");
  }
}
```

---

## 3. Vulnerabilidade Média: MIME Type Spoofing no Upload de Arquivos

### O Erro
A validação do formato do arquivo recebido nos endpoints de upload baseia-se unicamente na propriedade `mimetype` enviada na requisição multipart do cliente.

* **Arquivos afetados:**
  * [documents.service.ts](file:///Users/novistator/Desktop/Projeto%20SaaS/apps/api/src/modules/documents/documents.service.ts)
  * [portal.service.ts](file:///Users/novistator/Desktop/Projeto%20SaaS/apps/api/src/modules/portal/portal.service.ts)

### O Porquê
O código confia cegamente no `file.mimetype` declarado pelo browser:
```typescript
if (!ALLOWED_MIME_TYPES.includes(file.mimetype)) {
  throw new BadRequestException("Tipo de arquivo não permitido.");
}
```
Um usuário malicioso pode enviar um script JavaScript malicioso renomeado para `.pdf` ou com o cabeçalho `Content-Type: application/pdf`. O servidor aceitará o arquivo e o enviará ao storage do Supabase, o que pode abrir espaço para ataques de Stored XSS e execução arbitrária do script por outros contadores ao abrirem a guia.

### Correção Sugerida
Além de validar o `mimetype` enviado, faça uma validação dupla checando a extensão do nome do arquivo original utilizando uma regex ou biblioteca de mapeamento robusta:

```typescript
const extension = file.originalname.split(".").pop()?.toLowerCase();
const allowedExtensions = ["pdf", "jpg", "jpeg", "png", "webp", "xls", "xlsx", "xml"];

if (!extension || !allowedExtensions.includes(extension)) {
  throw new BadRequestException("Extensão de arquivo não permitida.");
}
```

Para segurança reforçada de nível de produção, pode-se ler os primeiros bytes do buffer (magic numbers) para certificar a integridade real do binário recebido usando a biblioteca `file-type`.

---

## 4. Falhas de Acessibilidade (WCAG 2.1) no Modal de Upload

### O Erro
O componente `UploadModal.tsx` apresenta severas barreiras para navegação por teclado e por leitores de tela.

### O Porquê e Correção Sugerida

#### A. Falha: O Modal não tem semântica de Dialog
* **O Problema:** A `div` do modal é puramente visual. Usuários com deficiência visual não são avisados de que o contexto mudou para uma janela de diálogo.
* **A Correção:** Adicionar atributos WAI-ARIA no container principal:

```html
<div 
  className="bg-white rounded-2xl shadow-2xl w-full max-w-lg"
  role="dialog"
  aria-modal="true"
  aria-labelledby="modal-title"
>
```

#### B. Falha: Botão de fechar inacessível (sem descrição)
* **O Problema:** O botão de fechar (`onClose`) renderiza apenas um SVG sem texto descritivo.
* **A Correção:** Adicionar um atributo `aria-label`:

```html
<button 
  onClick={onClose} 
  className="text-gray-400 hover:text-gray-600"
  aria-label="Fechar janela"
>
```

#### C. Falha: Área interativa de drop inacessível por teclado
* **O Problema:** A `div` que reage ao clique para carregar o arquivo não recebe foco de tabulação e não aceita atalhos de teclado.
* **A Correção:** Adicionar `tabIndex={0}`, `role="button"` e habilitar os atalhos `Enter`/`Espaço`:

```tsx
<div
  onDrop={handleFileDrop}
  onDragOver={(e) => e.preventDefault()}
  onClick={() => inputRef.current?.click()}
  onKeyDown={(e) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      inputRef.current?.click();
    }
  }}
  tabIndex={0}
  role="button"
  aria-label="Área de envio de arquivos. Pressione Enter ou Espaço para selecionar um arquivo do seu dispositivo."
  className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-colors ${
    file ? "border-blue-300 bg-blue-50" : "border-gray-200 hover:border-blue-300 hover:bg-gray-50"
  }`}
>
```

#### D. Falha: Rótulos (<label>) desconectados dos Inputs
* **O Problema:** Os elementos `<label>` e os inputs/selects não estão explicitamente associados, confundindo leitores de tela.
* **A Correção:** Usar `htmlFor` no label correspondendo ao `id` do respectivo controle de formulário:

```html
<!-- Exemplo para o Select -->
<label htmlFor="client-select" className="block text-sm font-medium text-gray-700 mb-1">Cliente *</label>
<select
  id="client-select"
  value={clientId}
  onChange={(e) => setClientId(e.target.value)}
  required
  className="..."
>
```

---

## 5. Falha de Validação Estática (Lint) no Backend

### O Erro
Ao rodar a verificação de código automatizada global (`pnpm run lint`), o monorepo falha na etapa do backend com o erro:
```bash
@contahub/api:lint: sh: eslint: command not found
```

### O Porquê
O `package.json` da pasta `apps/api` possui uma instrução de lint vinculada ao `eslint`, contudo o pacote do `eslint` e as suas dependências/configurações de parser TypeScript não estão declarados como dependências instaladas no package.

### Correção Sugerida
Instalar as dependências necessárias de desenvolvimento no escopo do pacote `apps/api` ou centralizá-las no workspace raiz:

```bash
cd apps/api
pnpm add -D eslint @typescript-eslint/parser @typescript-eslint/eslint-plugin
```

Ou, se preferir unificar o estilo no monorepo, herdar a configuração do pacote `@contahub/config` no workspace.
