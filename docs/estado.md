# Estado do projeto

*Atualizar ao fim de cada sessão (ver `CLAUDE.md`). Os registros mais recentes ficam no topo.*

## Agora

- **Fase:** construção. M1 (spike do motor) **aprovado**; M0 parcial.
- **Handoff da última sessão:** [handoff.md](handoff.md).
- **Feito no M0:** `git init` (sem commit), monorepo pnpm (`apps/web` do template dashboard com LICENSE MIT, `packages/motor`, `packages/oraculo`), CI com lint, typecheck, oráculo e testes.
- **Falta no M0:** Supabase local (CLI não instalada; Docker ok) + primeiras migrations; remoto no GitHub pessoal; staging Vercel + Supabase Free; "hello" autenticado.
- **Próximo passo:** usuário cria/aponta repo GitHub pessoal, projeto Supabase (sa-east-1) e Vercel → terminar M0 → M2 (fatia vertical). Depois, quebrar M2 em issues (skill `to-issues`).
- **Bloqueios:** contas externas (GitHub, Vercel, Supabase, Resend) dependem do usuário.
- **Pendência no publi:** `_numero` corta data/hora ("20/11" → "11"). Corrigir no publi antes de portar Número e Herói (ver `packages/oraculo/README.md`).
- **Valores assumidos sem confirmação explícita do usuário:**
  - o Convite expira em 7 dias
  - um Cliente é considerado parado depois de 14 dias
  - a foto é reduzida para no máximo 2160 px
  - Trava bloqueante impede a Exportação
  - corte do MVP com 5 Estilos (ver [mvp.md](mvp.md))

## Histórico

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
