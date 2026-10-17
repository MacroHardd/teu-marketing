# Fase E: estilização da Plataforma

*Criado em 2026-10-17. Fase só visual: pode rodar a qualquer momento, em paralelo às features, sem mudar comportamento. Cada tarefa é pequena e fechada para que um agente (ex.: Sonnet) faça sozinho. Os termos seguem o [`CONTEXT.md`](../CONTEXT.md).*

**Fora desta fase:** a aparência do Post (Motor, Desenhista, Estilos, fontes e texturas do Post). Isso é feature e mexe na regressão visual. Esta fase é só a **interface da Plataforma** (telas, menus, cartões, botões).

## Contrato (vale para toda tarefa)

**Pode mexer:**
- `apps/web/app/app.config.ts` (cores e `ui` do Nuxt UI) e `apps/web/app/assets/css/*`
- no `<template>` dos `.vue`: classes, props visuais (`color`, `variant`, `size`, `icon`, `:ui`), ordem e agrupamento visual de blocos
- componentes novos **só de apresentação** (sem `fetch`, sem Supabase, sem estado de negócio), em `apps/web/app/components/ui/`
- imagens e fontes **da interface** em `apps/web/public/ui/` (com licença livre anotada em `apps/web/public/ui/LICENCAS.md`)

**Não pode mexer:**
- nada no `<script>` além de importar um componente de apresentação
- `packages/`, `apps/web/server/`, `supabase/`, `apps/web/app/composables/`
- o `<canvas>` da prévia (tamanho lógico, proporção 4:5, eventos de arrastar)
- **textos visíveis e nomes acessíveis** que o E2E usa (lista em [Textos travados](#textos-travados)). Trocar texto de interface é tarefa de copy, separada, com aprovação do usuário
- `data-testid` (hoje: `ativo`, `caixa-corte`, `escolhe-ativo`, `input-ativo`, `input-foto`, `input-logo`, `previa`, `trava`)
- regras do produto: nada de fonte livre, color picker, camadas ou mover elementos (ver `CLAUDE.md`). Estilizar **nunca** adiciona controle novo
- a interface continua leiga e limpa: **nunca virar Canva**

**Pronto quando:**
1. `pnpm lint && pnpm typecheck && pnpm build` passam
2. o E2E passa contra o build (ver `docs/handoff.md`, "Contexto que não está nos docs": porta 3001)
3. prints antes/depois em **1440 px e 375 px**, tema claro e escuro, anexados ao PR
4. nenhuma rolagem horizontal em 375 px
5. contraste de texto WCAG AA (4,5:1; 3:1 para texto grande)

**Git:** uma branch por tarefa (`estilo/E<n>-<slug>`) a partir da `main` atualizada, commit só na branch, PR é do usuário.

**Conflito com feature:** cada tarefa diz de quais telas depende. Se a tela está sendo mexida por uma branch de feature ainda não mergeada (ver `docs/estado.md`), espere o merge ou pegue outra tarefa.

## Tarefas

| # | Tarefa | Arquivos | Depende de |
|---|---|---|---|
| E0 | **Direção visual.** Propor 3 direções (paleta da interface, fonte da interface, raio, densidade), cada uma com print da tela Meus Posts e do editor. O usuário escolhe. Skill: `frontend-design` ou `high-end-visual-design`. Não implementa nada | protótipo fora do app (`/prototipo` não versionado ou imagens) | nada |
| E1 | **Tokens.** Aplicar a direção escolhida: `primary`/`neutral` em `app.config.ts`, escala de cor e `--font-sans` em `main.css`, raio e `ui` globais (botão, cartão, badge). Fonte da interface em `public/ui/` ou Google Fonts via `@nuxt/fonts` | `app.config.ts`, `main.css` | E0 |
| E2 | **Moldura.** Barra lateral, cabeçalho, logo "Teu Marketing" (SVG simples), favicon, menu do usuário | `layouts/default.vue`, `components/UserMenu.vue`, `public/` | E1 |
| E3 | **Entrada.** Entrar, Confirmar, Acesso negado, Convite inválido | `layouts/auth.vue`, `pages/entrar.vue`, `pages/confirmar.vue`, `pages/acesso/[motivo].vue` | E1 |
| E4 | **Meus Posts.** Grade, cartão do Post (miniatura, status), estados vazios, aviso do Perfil de Marca | `pages/posts/index.vue` | E1, M5 mergeado |
| E5 | **Editor, coluna da esquerda.** Texto, foto, grade de Estilos e Variações | `pages/posts/[id].vue` (só template) | E1 |
| E6 | **Editor, prévia.** Moldura da prévia, avisos de Trava, botão Baixar | `pages/posts/[id].vue` (só template) | E5 (mesmo arquivo: não em paralelo) |
| E7 | **Editor, Ajustes e legenda.** Grupos de Ajuste, `SeletorTextura` | `pages/posts/[id].vue`, `components/SeletorTextura.vue` | E6 |
| E8 | **Ativos.** Grade, miniatura, janela de Tratar e recorte | `pages/ativos.vue`, `components/ativos/*` | E1 |
| E9 | **Perfil de Marca.** Formulário e prévia | `pages/marca.vue` | E1 |
| E10 | **Painel do Parceiro.** Assentos, convidar, tabelas de Convites e Clientes, destaque de Cliente parado | `pages/clientes.vue` | E1, M6 mergeado |
| E11 | **Erros e avisos.** `error.vue` (404/500), toasts, estados de carregamento (skeleton) | `error.vue`, `app.vue` | E1 |
| E12 | **Passada 375 px.** Revisar todas as telas no celular; corrigir quebras | todas as acima | E2–E11 |
| E13 | **Passada tema escuro + acessibilidade.** Contraste, foco visível no teclado, `aria-label` em botão só com ícone (pode *adicionar* aria-label, não trocar os existentes) | todas | E2–E11 |

E5, E6 e E7 mexem no mesmo arquivo: uma de cada vez. As outras podem rodar em paralelo depois do E1.

## Textos travados

O E2E (`apps/web/e2e/jornada.mjs`) acha os elementos por estes textos e nomes. Não trocar sem atualizar o E2E na mesma tarefa de copy:

- Textos: "0 de 2 acessos em uso", "1 de 2 acessos em uso", "1 Convite(s)…", "1 repetido(s)…", "1 válido(s)…", "Inválido(s)…", "Exportado", "Imagem baixada", "Imagem salva", "No meio", "Peça acesso ao seu parceiro", "Salvo", "Verifique seu email"
- Botões e links: "Aplicar recorte", "Baixar imagem", "Com bloco", "Sem bloco", "Cores Noite", "Criar meu primeiro Post", "Duotom", "Foto e legenda", "Letra P", "Na letra", "@ / nome", "Novo Post", "Preencher Perfil de Marca", "Quadrado", "Recortar", "Riscada", "Síncope", "Acento" (com "sugerido"), "Salvar", "Texto em cima", "Texto embaixo", "Tratar imagem", "Trocar foto", "Trocar logo", "Usar Manchete", "Usar num Post novo", e os nomes dos 13 Estilos
- Telas novas das features (M5, M6) entram nesta lista quando forem feitas.

Para conferir a lista atual: `grep -n "getByText\|name:" apps/web/e2e/jornada.mjs`.
