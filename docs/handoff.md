# Handoff: Teu Marketing (2026-10-16, fim da sessão M3 parte 1)

## Onde estamos
M1 aprovado, M2 pronto local, **M3 em andamento** na branch `m3-foto` (empilhada sobre `m0-m1-motor-acento`). Feito: foto (upload, redução, análise, bucket privado com RLS), Estilos **Letra fina** e **Foto e legenda** portados e passando na regressão, troca de Estilo com sugestão, enquadramento arrastando + zoom. Build de produção e E2E (incluindo Post com foto) passam local. Status completo em `docs/estado.md`.

**Leia nesta ordem:**
1. `CLAUDE.md`: regra "pronto = build + E2E", comandos, pegadinhas (CLI do Supabase lê stdin), paridade com o publi (agora com foto)
2. `docs/estado.md`: status, git/produção, o que falta no M3, valores assumidos
3. `docs/mvp.md` e `docs/plano.md` (M3 em diante)

## Antes de tudo (toda sessão)
O checkout pode estar na `main` velha: confira `git branch` e trabalhe em `m3-foto` (ou na branch mais nova). Rode o build de produção antes de mexer em qualquer coisa. Se quebrar, corrija primeiro.

## Próxima tarefa (resto do M3)
- **Variações:** ainda não existem no publi. Nascem lá e depois são portadas. **Alinhar com o usuário antes de inventar** (quais 3 por Estilo).
- **Ajustes da lista fechada:** P/M/G, zona (topo/centro/base), cor da paleta, Elementos opcionais, CTA. Hoje só há enquadramento e zoom (salvos em `posts.ajustes.enquadramento`).
- **Travas:** rosto (precisa de detecção no upload; guardar em `MetaFoto`, ex.: caixas de rosto) e contraste com ação de correção. Os avisos do Motor viram mensagens pelo array `AVISOS` em `apps/web/app/pages/posts/[id].vue`.
- **Manchete** (sem foto, fácil) e **Número** (depende do fix do `_numero` no publi).
- Telemetria: `ajuste_aplicado`, `trava_disparada`/`trava_resolvida` (schemas em `apps/web/server/utils/eventos.ts`).

## Roteiro de teste manual (o que existe hoje)
`pnpm exec supabase start` → `pnpm teste:usuarios` → `pnpm dev:local` → abrir cada link numa janela anônima.
- **Parceiro** (`parceiro@teste.dev`): vê 2 de 3 em uso, os 2 Clientes, o Convite pendente; convida um email novo (chega no Mailpit :54324); reenvia.
- **Cliente** (`cliente@teste.dev`): Novo Post → texto → enviar foto → Letra fina sugerida → trocar para Foto e legenda → arrastar/zoom → Baixar imagem → recarregar e conferir que salvou.
- **Isolamento** (`parceiro-b@teste.dev`): só vê `cliente-b@`.

## Contexto que não está nos docs
- **Git:** remoto `MacroHardd/teu-marketing`, push por SSH funciona. Sem `gh`/token: não dá para abrir PR, mergear nem trocar a branch padrão (está `m0-m1-motor-acento`; o usuário foi avisado). Commitar só em branch, nunca na `main`. `m3-foto` está no remoto; o usuário abre e aceita os PRs pelo painel.
- **O usuário costuma deixar um `nuxt dev` dele na porta 3000.** Não matar. Para o build/teste próprio: `PORT=3001 node apps/web/scripts/local.mjs node apps/web/.output/server/index.mjs` (links do `teste:usuarios` com `PORT=3001` também). O E2E tem `BASE` fixo em 3000 e o redirect do Auth local aponta para 3000: só roda com a porta livre. Parar pelo PID da porta (`ss -ltnp | grep :3000`), nunca `pkill -f` (mata o próprio shell).
- O Supabase local foi resetado nesta sessão (`db reset`): só tem dados dos E2E.
- **Fotos de teste** são sintéticas (`packages/oraculo/fotos/gerar_fotos.py`), suaves de propósito: Pillow e Canvas reamostram diferente.
- **HEIC não foi testado** (sem arquivo). Se aparecer problema: `preparaFoto` em `apps/web/app/composables/useFoto.ts`.
- **Como o usuário trabalha:** rapidez, respostas curtas (caveman, PT-BR), interface leiga, **nunca virar Canva**. Só considera pronto com o build passando.
- **Fontes do publi:** usar como estão. **IA:** fora do MVP.

## Skills sugeridas
- `supabase`: migrations, Storage, advisors
- `nuxt-ui`: controles de Ajuste e grade de Estilos/Variações
- `tdd`: porte de Estilo/Variação e regras de Trava
- `grill-with-docs`: decidir Variações e Ajustes com o usuário
- `diagnose`: regressão visual reprovando ou preview ≠ PNG
