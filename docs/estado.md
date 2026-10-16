# Estado do projeto

*Atualizar ao fim de cada sessão (ver `CLAUDE.md`). Os registros mais recentes ficam no topo.*

## Agora

- **Fase:** construção. M1 aprovado; **M2 pronto local** (jornada J1→J3 passa no E2E); M0 só falta staging.
- **Handoff da última sessão:** [handoff.md](handoff.md).
- **Branch:** `m0-m1-motor-acento` (main vazia; o usuário configura remoto e aprova PR).
- **Falta no M0:** staging (Vercel + Supabase sa-east-1 + Resend) e "hello" autenticado lá. O que configurar: [infra.md](infra.md#configuração-de-produção-painel-não-código) + `apps/web/.env.example`.
- **Próximo passo:** M3 (foto + Ajustes + Variações + Travas ao vivo). Em paralelo, quando o usuário criar as contas: staging e rodar o CI pela 1ª vez (testes de RLS no CI ainda não rodaram em Actions).
- **Bloqueios:** só staging depende do usuário.
- **Pendência no publi:** `_numero` corta data/hora ("20/11" → "11"). Corrigir no publi antes de portar Número e Herói (ver `packages/oraculo/README.md`).
- **Valores assumidos sem confirmação explícita do usuário:**
  - o Convite expira em 7 dias
  - um Cliente é considerado parado depois de 14 dias
  - a foto é reduzida para no máximo 2160 px
  - Trava bloqueante impede a Exportação
  - corte do MVP com 5 Estilos (ver [mvp.md](mvp.md))

## Histórico

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
