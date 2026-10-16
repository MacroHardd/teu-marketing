# Reaproveitamento de templates Nuxt

Fonte: <https://nuxt.com/templates>, consultado em 2026-10-16. Só entram templates **gratuitos, oficiais (`nuxt-ui-templates/*`) e com licença MIT**, que são os que usam a mesma stack que a nossa (Nuxt 4 + Nuxt UI v4). Os templates premium e os de terceiros foram descartados.

Critério para reaproveitar: o trecho tem que encaixar quase direto no nosso caso de uso e ser barato de adaptar. Quando adaptar sai caro, escrevemos do zero com componentes do Nuxt UI.

## Base: `nuxt-ui-templates/dashboard` (MIT)

Repositório: <https://github.com/nuxt-ui-templates/dashboard>

É a base do app (`apps/web`). O shell com sidebar e as tabelas servem para as três áreas do app: Cliente, Parceiro e Admin.

| Peça do template | Vira | Adaptação |
|---|---|---|
| `layouts/default.vue` (UDashboardGroup + sidebar + navbar) | shell das três áreas | menu por papel. Sidebar enxuta no Cliente (Meus Posts, Perfil de Marca) |
| `pages/customers.vue` (UTable com filtro, colunas, seleção, paginação, ações por linha) | lista de Clientes e Convites do Parceiro, e lista de Parceiros do Admin | trocar colunas (status, Perfil completo, Posts exportados no mês, último acesso) e ações (reenviar Convite, desativar) |
| `components/customers/AddModal.vue` | modal "Convidar Clientes" (digitar emails ou subir planilha) | acrescentar o parse de CSV/XLSX no browser e uma prévia antes de confirmar |
| `components/customers/DeleteModal.vue` | confirmar desativação de Cliente e exclusão de Post | só textos |
| `components/home/HomeStats.vue` | cards de Uso (Assentos usados/total, Clientes ativos, Posts no mês, Clientes parados) | trocar a origem dos dados |
| `components/UserMenu.vue` | menu da conta + sair | tirar o seletor de tema se não for usado |
| `pages/settings/*` | Perfil de Marca do Cliente e dados do Parceiro | reaproveitar o layout de formulário em seções |
| `components/home/HomeChart.*` | (depois) gráfico de Posts por mês | fora da Fase 1 |
| `inbox`, `NotificationsSlideover`, `TeamsMenu` | não usamos | remover |
| `server/api/*` (mocks) | não usamos | remover. Os dados vêm do Supabase |

## `nuxt-ui-templates/saas` (MIT): só a autenticação

Repositório: <https://github.com/nuxt-ui-templates/saas>

| Peça | Vira | Adaptação |
|---|---|---|
| `layouts/auth.vue` | layout das telas de entrada | trocar a marca |
| `pages/login.vue` (UAuthForm) | entrada por **link mágico** | deixar só o campo de email. Tirar senha, "lembrar" e os provedores Google/GitHub. Ligar ao `signInWithOtp` do Supabase e criar a tela "verifique seu email" |
| `pages/signup.vue` | não usamos | ninguém se cadastra sozinho: o Cliente entra por Convite e o Parceiro é criado pelo Admin |
| landing, pricing, blog, docs, changelog | fora da Fase 1 | podem servir de base para o site comercial voltado a Parceiros, depois |

## `nuxt-ui-templates/chat` (MIT): só o padrão de upload

Repositório: <https://github.com/nuxt-ui-templates/chat>

| Peça | Vira | Adaptação |
|---|---|---|
| `composables/useFileUpload.ts` (status por arquivo, preview com `createObjectURL`) | upload da foto do Post | trocar o blob do NuxtHub/Vercel por Supabase Storage. Acrescentar redimensionamento, conversão de HEIC e a análise da foto (ADR 0001) |
| `components/drag-drop/Overlay.vue` | soltar a foto em cima do editor | só estilo |
| `components/ModalConfirm.vue` | confirmação genérica | direto |
| AI SDK, drizzle, `nuxt-auth-utils`, NuxtHub | **não usamos** | é outra stack de auth e banco (veja o ADR 0002) |

## Descartados

- `editor` (TipTap/Notion): é edição de texto rico, não de imagem.
- `landing`: só para o site comercial, depois.
- `atidraw`, `nuxt-image-gallery`: dependem do NuxtHub. A grade de "Meus Posts" sai com componentes do Nuxt UI.
- Premium (Nuxter, Supastarter, SuperSaaS etc.): têm auth, billing e times próprios que conflitam com Supabase + billing manual.

## O que não tem template (escrevemos do zero)

- **Editor do Post**: preview em Canvas com o Motor, mais a barra de Ajustes (ADR 0001). É o coração do produto.
- **Seleção de Estilo e Variação**: grade de miniaturas renderizadas pelo próprio Motor.
- **Exportação**: PNG no browser e botão "copiar legenda".
- **`packages/motor`**: porta do publi para TS.

## Licença

Todos os três são MIT. Manter o arquivo `LICENSE` original de cada template no repositório (ou em `THIRD_PARTY_LICENSES.md`), junto com o aviso de copyright.
