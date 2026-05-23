# Relatório de Auditoria: Segurança, Acessibilidade e Compilação do ContaHub

Realizamos uma varredura completa na estrutura do projeto, nos módulos do Backend (NestJS), Frontend (Next.js), banco de dados (Prisma) e scripts auxiliares. Abaixo estão listadas as brechas de segurança críticas, falhas de acessibilidade de acordo com os padrões da WCAG e erros de funcionalidade/compilação detectados no código original.

---

## 1. Brechas de Segurança Críticas (Vulnerabilidades)

### 🚨 [CRÍTICA] Broken Object Level Authorization (BOLA / IDOR) & Ausência Total de Autenticação no Portal
O Portal do Cliente possuía um risco de segurança extremamente severo que expunha os dados de **todos os clientes de qualquer escritório contábil**.

* **Como a brecha ocorria:**
  1. No arquivo [workspace.middleware.ts](file:///Users/novistator/Desktop/Projeto%20SaaS/apps/api/src/common/middleware/workspace.middleware.ts#L16), o prefixo `/api/v1/portal` estava marcado como público, contornando a validação de token do Clerk:
     ```typescript
     const PUBLIC_PREFIXES = ["/api/v1/health", "/api/v1/portal"];
     ```
  2. No entanto, no controller do portal ([portal.controller.ts](file:///Users/novistator/Desktop/Projeto%20SaaS/apps/api/src/modules/portal/portal.controller.ts)), **nenhum guard de autenticação ou validação de e-mail era aplicado** aos métodos.
  3. O endpoint de busca de cliente por e-mail `/api/v1/portal/:slug/client-by-email?email=...` estava totalmente público. Qualquer atacante que soubesse o e-mail de um cliente podia obter o seu `clientId` (um CUID único).
  4. Uma vez que o atacante tinha o `clientId`, ele podia acessar livremente os seguintes endpoints públicos e não autenticados para **ler, alterar ou apagar** dados sigilosos:
     * `GET /api/v1/portal/:slug/documents/:clientId` -> Acessava a lista de documentos privados do cliente.
     * `GET /api/v1/portal/:slug/obligations/:clientId` -> Acessava todas as guias fiscais e obrigações.
     * `GET /api/v1/portal/:slug/documents/:documentId/download` -> Gerava uma URL assinada do Supabase para fazer download do PDF original (holerites, balanços, DARFs).
     * `POST /api/v1/portal/:slug/documents/:clientId/upload` -> Enviava arquivos arbitrários fingindo ser o cliente.
     * `DELETE /api/v1/portal/:slug/documents/:documentId` -> Apagava documentos do cliente.
     * `PUT /api/v1/portal/:slug/reports/:documentId/approve` -> Aprovava relatórios contábeis na base de dados.
     * `PUT /api/v1/portal/:slug/reports/:documentId/request-revision` -> Reprovava relatórios e enviava mensagens falsas em nome do cliente.

* **Recomendação de correção (Aplicada):** 
  Implementar um JWT Guard específico para o Portal do Cliente no NestJS usando a sessão do Clerk ativa do cliente e validar no serviço se o e-mail do token do usuário corresponde exatamente ao `portalEmail` associado ao `clientId` fornecido na rota.

---

### ⚠️ [MÉDIA] Confiança Cega no Tipo de Arquivo Enviado (MIME Type Spoofing)
Nos serviços de upload de documentos do escritório e do portal ([documents.service.ts](file:///Users/novistator/Desktop/Projeto%20SaaS/apps/api/src/modules/documents/documents.service.ts#L221) e [portal.service.ts](file:///Users/novistator/Desktop/Projeto%20SaaS/apps/api/src/modules/portal/portal.service.ts#L130)), a validação do tipo de arquivo era feita com base no `file.mimetype` enviado pelo cliente na requisição HTTP:

```typescript
if (!ALLOWED_MIME_TYPES.includes(file.mimetype)) { ... }
```

* **Como a brecha ocorria:**
  A propriedade `mimetype` é declarada pelo próprio browser/cliente na requisição. Um atacante podia facilmente enviar um script malicioso (como um arquivo `.html` contendo código JavaScript invasivo ou scripts executáveis) alterando apenas o cabeçalho `Content-Type` para `application/pdf` ou `image/png`. Se o arquivo fosse armazenado e depois visualizado por outro usuário, isso podia permitir um ataque de **Stored XSS (Cross-Site Scripting)**.
* **Recomendação de correção (Aplicada):**
  Validar a extensão do nome do arquivo em conjunto com a assinatura do cabeçalho binário do arquivo (magic numbers) utilizando bibliotecas como `file-type`, e sanitizar o nome original do arquivo antes de gravá-lo no Supabase.

---

### ℹ️ [BAIXA] Chaves e Credenciais Expostas em Scripts Locais
* **Como ocorria:**
  No script [criar-documentos.sh](file:///Users/novistator/Desktop/Projeto%20SaaS/criar-documentos.sh#L14-L16), as chaves secretas do Supabase (incluindo a `SUPABASE_SERVICE_ROLE_KEY`, que tem acesso de administrador total e ignora qualquer política de segurança RLS) estavam salvas em texto puro. Embora o arquivo `.env.local` gerado e o próprio arquivo `.sh` estejam listados corretamente no `.gitignore` e não sejam enviados para repositórios públicos, a persistência de credenciais administrativas em scripts compartilháveis é uma má prática de segurança.
* **Recomendação de correção:**
  Substituir o preenchimento automático das chaves secretas no script por variáveis de ambiente injetadas no momento da execução do container/CI, ou solicitar que o usuário insira as chaves no terminal durante a execução em vez de deixá-las salvas permanentemente no código do script.

---

## 2. Falhas de Acessibilidade (WCAG / WAI-ARIA)

Durante a varredura das interfaces frontend, identificamos problemas que impediam ou dificultavam a navegação por teclado e por leitores de tela:

### ♿ Problemas no Componente `UploadModal.tsx` ([Visualizar Arquivo](file:///Users/novistator/Desktop/Projeto%20SaaS/apps/web/components/documents/UploadModal.tsx))
1. **Ausência de Semântica e Papel WAI-ARIA do Modal (WCAG 2.1 - 4.1.2):**
   O contêiner do modal era apenas uma `div` genérica. Ele agora inclui atributos como `role="dialog"`, `aria-modal="true"` e `aria-labelledby="modal-upload-title"`.
2. **Botão de Fechar Inacessível (WCAG 2.1 - 1.1.1 & 4.1.2):**
   O botão de fechar não possuía descrição descritiva ou atributo `aria-label`. Foi adicionado `aria-label="Fechar janela de upload"`.
3. **Área de Drag-and-Drop Inacessível para Teclado (WCAG 2.1 - 2.1.1):**
   A área pontilhada de upload era uma `div` com comportamento de clique. Foi tornado focável com `tabIndex={0}`, papel `role="button"` e adicionado tratador de eventos de teclado `onKeyDown` para teclas `Enter` e `Espaço`.
4. **Associação de Labels com Formulários (WCAG 2.1 - 1.3.1):**
   O campo de seleção de clientes e o input de descrição possuíam tags `<label>`, mas estas não estavam associadas aos seus respectivos inputs. Mapeamos os campos corretamente com `htmlFor` e `id`.
5. **Emojis Soltos Sem Marcação (WCAG 2.1 - 1.1.1):**
   O uso de emojis puros agora possui tratamento adequado de `aria-hidden="true"`.

---

## 3. Falhas de Compilação e Lint

### ❌ Erro de Compilação no Next.js (Strict TypeScript Validation)
* **Causa do problema:**
  No arquivo `apps/web/app/portal/[slug]/page.tsx`, a variável `workspace` era declarada inicialmente com um objeto contendo propriedades estritas de string. Porém, ao reatribuir com `res.data` (tipo `WorkspacePublic` onde `primaryColor` é opcional), o TypeScript gerava um erro fatal de compilação.
* **Resolução (Aplicada):**
  Tipamos a variável `workspace` explicitamente como `WorkspacePublic` e adicionamos os imports necessários no topo do arquivo.

### ❌ Falha no Script de Lint do Backend
* **Causa:**
  O pacote `@contahub/api` possuía um script de lint apontando para o `eslint`, porém o pacote não estava instalado no package local do monorepo, quebrando o build.
* **Resolução (Aplicada):**
  Adicionamos as dependências de lint adequadas ao `apps/api/package.json` e geramos uma configuração robusta em `.eslintrc.js`, desabilitando erros estritos de namespaces globais do Express.
