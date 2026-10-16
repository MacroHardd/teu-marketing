# Estado do projeto

*Atualizar ao fim de cada sessão (ver `CLAUDE.md`). Os registros mais recentes ficam no topo.*

## Agora

- **Fase:** construção. M1 aprovado; M2 pronto local; **M3 em andamento** na branch `m3-foto` (criada a partir de `m0-m1-motor-acento`, porque o PR para a `main` ainda não foi mergeado). M0 só falta staging.
- **Handoff da última sessão:** [handoff.md](handoff.md).
- **Git / produção:**
  - `origin/main` ainda está no 1º commit (`c5ea7ad`), **sem o fix do build**: o deploy da `main` quebra até o merge do PR `m0-m1-motor-acento → main`. Na branch o build passa (`pnpm build` e `NITRO_PRESET=vercel`).
  - A branch padrão do GitHub está como `m0-m1-motor-acento`. Trocar para `main` em Settings → General → Default branch (sem `gh`/token aqui, não dá para fazer daqui).
  - Ordem sugerida: trocar a default para `main` → mergear `m0-m1-motor-acento` → abrir PR `m3-foto → main`.
- **Supabase hospedado:** projeto criado, `apps/web/.env` aponta para ele, mas as **migrations não foram aplicadas** (erro `PGRST205`). Falta `pnpm exec supabase link --project-ref <ref>` + `pnpm exec supabase db push` (agora são 2 migrations: `inicio` e `foto`, que cria o bucket `fotos`) + configurar o painel (`docs/infra.md`).
- **Feito no M3 até agora:** foto (upload JPEG/PNG/HEIC até 10 MB, reduzida a 2160 px no browser, analisada, bucket privado), Estilos Letra fina e Foto e legenda portados e passando na regressão, troca de Estilo com 1 clique (com sugestão), enquadramento (arrastar) e zoom.
- **Falta no M3:** Variações (precisam nascer no publi; alinhar com o usuário antes), demais Ajustes (P/M/G, zona, cor da paleta, Elementos, CTA), Trava de rosto (detecção no upload), Trava de contraste com ação de correção, telemetria `ajuste_aplicado`/`trava_*`, Manchete e Número (este depende do fix do `_numero` no publi).
- **Bloqueios:** staging e merge/default branch dependem do usuário.
- **Pendência no publi:** `_numero` corta data/hora ("20/11" → "11"). Corrigir no publi antes de portar Número e Herói (ver `packages/oraculo/README.md`).
- **Valores assumidos sem confirmação explícita do usuário:**
  - o Convite expira em 7 dias
  - um Cliente é considerado parado depois de 14 dias
  - a foto é reduzida para no máximo 2160 px (JPEG 88%); grade de luminância 32×32
  - Trava bloqueante impede a Exportação; texto que não cabe na Letra fina é bloqueante (o publi corta em 6 linhas)
  - corte do MVP com 5 Estilos (ver [mvp.md](mvp.md))

## Histórico

### 2026-10-16. Build verificado + M3 (foto, Letra fina, Foto e legenda)
- A sessão abriu com o checkout local na `main` velha (build quebrado: `opentype.js` sem default). O fix já estava na branch; trabalho seguiu nela. Build verificado de 3 jeitos: `node .output`, preset `vercel` e clone limpo com pnpm 10 (que troca sozinho para o pnpm 11.8 do `packageManager`).
- CI ganhou o passo de **build de produção** (preset vercel): antes só lint/typecheck/testes, por isso o build quebrado passou. `.vercel/` no `.gitignore`.
- Regra registrada no `CLAUDE.md`: só é "pronto" com build de produção + E2E passando local.
- Motor: `foto.ts` (MetaFoto, `recorteCover` = `ImageOps.fit`, filtro cinza feito à mão), itens `foto` e `degrade` na Cena, Estilos `fina` e `ogilvy`. Regressão: 19 casos novos com fotos sintéticas, diff ≤ 0,9%, luminância atrás do texto ±1 do publi. p95 com foto 18,7 ms (Node).
- Banco: migration `foto` (colunas `foto_path`, `foto_meta`; bucket privado `fotos` por pasta do Cliente) + 9 testes pgTAP (Parceiro e outro Cliente não leem nem escrevem; Cliente desativado perde acesso).
- App: editor com foto, Estilos com sugestão, arrastar para enquadrar, zoom. Eventos `estilo_trocado` e `foto_enviada`. E2E cobre Post com foto (upload → Storage → recarregar → exportar), rodado contra o build de produção.
- Não verificado: HEIC (sem arquivo de teste; caminho = `createImageBitmap`, e `heic2any` carregado sob demanda se falhar), Safari/Edge reais.

### 2026-10-16. Build de produção corrigido + main
- `nuxt build` falhava: `"default" is not exported by opentype.js` (o dist ESM do 1.3.5 não tem default; o dev aceitava). Import nomeado + versão fixada. Build ok (52 s) e E2E passou contra o build rodando com `node .output/server/index.mjs`.
- `main` criada no 1º commit e enviada; a branch de trabalho foi enviada com o fix.

### 2026-10-16. M2 local: Supabase, RLS, Convite e editor mínimo
- Supabase local (CLI 2.121 fixada no repo). Migration `inicio`: parceiros, clientes, convites, posts, eventos; RLS em tudo; aceite do Convite em função só do servidor. Advisors limpos.
- 24 testes de RLS (pgTAP): Parceiro não lê Posts nem eventos nem dados de outro Parceiro; Cliente só os próprios Posts; anônimo nada; aceite respeita prazo, Assento e outro Parceiro.
- App: template limpo (sem Inbox/Customers/inglês), entrada por link mágico (`/entrar`), Convite com 1 clique (`/convite/<token>`), painel do Parceiro (Assentos, convidar com prévia, Convites com reenviar, Clientes), Meus Posts e editor com Acento, salvamento automático e Exportação PNG. Página `/spike` removida (o editor substitui).
- Telemetria: `convite_enviado`, `convite_aceito`, `editor_aberto`, `post_criado`, `post_exportado`, `erro_motor`, com props validadas por zod `.strict()` (sem conteúdo do Cliente; conferido no banco).
- `pnpm parceiro:criar` (J1 por script). E2E `pnpm --filter @teu/web e2e` cobre J1→J3 em Chrome headless.
- Achados: `[auth.email] enable_signup=false` desliga o login por email inteiro; `@nuxtjs/supabase` pegava h3 v2 (corrigido com `packageExtensions`).

### 2026-10-16. Monorepo + spike do motor (M1)
- Monorepo pnpm montado; publi extraído em `packages/oraculo/publi/` (versionado, roda no CI).
- Motor TS do Estilo Acento: Motor puro → Cena → Desenhista Canvas (texto como contorno de glifo via opentype.js).
- Problema achado e resolvido: o publi mede texto com hinting do FreeType (impossível no browser). O oráculo passa a medir com métrica linear, igual ao TS → layout 1:1.
- Resultado: 18 casos do Acento passam na regressão (diff máx. 0,51% da peça, limite 1%; deslocar 1 px já reprova); Trava de área de acento bate ±0,2 pp sem ler pixel; escolha de Estilo e campos iguais ao publi em 32 textos × 13 Estilos; regra "nunca altera texto" testada.
- p95 Motor + Desenhista: 8 ms no Node, **1,3 ms no Chrome** (meta 50 ms). Página `/spike` com preview ao vivo e Exportação PNG 1080×1350 verificada em Chrome headless.
- ADR 0001 mantido.

### 2026-10-16. Sessão de descoberta e planejamento
- Entrevista (grill-with-docs) fechou: atores, ausência de white-label, Assentos, loop do Cliente, Ajustes 80/20, Exportação sem integração com a Meta, motor TS no browser com o publi como oráculo, stack Nuxt + Supabase, entrada por link mágico, painel do Parceiro só com Uso, Perfil de Marca todo opcional, foco em desktop.
- Criados: `CONTEXT.md`, ADRs 0001 e 0002, `docs/{escopo,mvp,prd-fase1-post-estatico,plano,infra,templates}.md`, `docs/medicao/{tecnico,operacional}.md`, `.agents/product-marketing.md`.
- Decidido: nome e domínio **Teu Marketing**; licença das fontes não bloqueia; IA será tratada em outra ocasião; infra gratuita até o primeiro cliente pagante; prioridade é vender rápido.
