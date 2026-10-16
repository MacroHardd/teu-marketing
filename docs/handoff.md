# Handoff: Teu Marketing (2026-10-16, fim da sessão M3 parte 1 + teste local)

## Onde estamos
M1 aprovado, M2 pronto local, **M3 em andamento** na branch `m3-foto` (já no GitHub, empilhada sobre `m0-m1-motor-acento`). Feito no M3:
- foto: upload, redução, análise e bucket privado com RLS
- Estilos **Letra fina** e **Foto e legenda** portados, passando na regressão
- troca de Estilo com sugestão
- enquadramento arrastando + zoom
- usuários de teste locais e `dev:local`
- passo a passo de teste local no `README.md`

Build de produção, lint, typecheck, testes (115 motor + 33 RLS) e E2E passam. Status completo em `docs/estado.md`.

**Leia nesta ordem:**
1. `CLAUDE.md`: regra "pronto = build + E2E", comandos, pegadinhas, paridade com o publi
2. `docs/estado.md`: status, git/produção, o que falta no M3, valores assumidos
3. `README.md` → "Rodar e testar localmente": o fluxo que o usuário usa para validar
4. `docs/mvp.md` e `docs/plano.md` (inclui "Como validamos cada feature")

## Antes de tudo (toda sessão)
1. `git branch`: trabalhe na branch mais nova (`m3-foto` ou a que vier depois do merge). O checkout já apareceu na `main` velha uma vez.
2. Rode o build de produção (`pnpm build`) antes de mexer. Se quebrar, corrija primeiro.
3. Toda entrega termina com: lint + typecheck + test + `pnpm db:test` + build + E2E. Depois, **roteiro de teste manual Parceiro/Cliente** para o usuário (no fim do handoff e na descrição do PR).

## Pendências do usuário (lembrar, não bloqueiam o código)
- Trocar a branch padrão do GitHub para `main`: Settings → General → Default branch. Daqui não dá (sem `gh`/token).
- PRs pelo painel, nesta ordem: `m0-m1-motor-acento → main` (tem o fix do build; sem ele o deploy da `main` quebra) e depois `m3-foto → main`.
- Staging: `supabase link` + `db push` no hospedado (2 migrations), projeto na Vercel, conta no Resend. Ver `docs/infra.md`.

## Próxima tarefa (resto do M3)
- **Variações:** nascem no publi e depois são portadas. **Perguntar ao usuário quais 3 por Estilo** antes de fazer.
- **Ajustes da lista fechada:** P/M/G, zona (topo/centro/base), cor da paleta, Elementos opcionais, CTA. Hoje só existem enquadramento e zoom (`posts.ajustes.enquadramento`).
- **Travas:**
  - rosto: detecção no upload, guardada na `MetaFoto`
  - contraste: com ação de correção
  - os avisos do Motor viram mensagem pelo array `AVISOS` em `apps/web/app/pages/posts/[id].vue`
- **Manchete** (sem foto, fácil) e **Número** (depende do fix do `_numero` no publi).
- Telemetria: `ajuste_aplicado`, `trava_disparada` e `trava_resolvida` (schemas em `apps/web/server/utils/eventos.ts`).
- Detalhe de UI: o email de login local sai em inglês ("Your sign-in link"). Para o critério "tudo em PT-BR": template do magic link em `supabase/config.toml` (local) e no painel (hospedado).

## Roteiro de teste manual (o que existe hoje)
Passo a passo completo no `README.md`. Resumo: `pnpm exec supabase start` → `pnpm teste:usuarios` → `pnpm dev:local` → entrar pelo link impresso (janela anônima) ou pela tela Entrar + Mailpit (http://127.0.0.1:54324).
- **Parceiro** (`parceiro@teste.dev`): 2 de 3 em uso, 2 Clientes, Convite pendente; convidar, reenviar.
- **Cliente** (`cliente@teste.dev`): Novo Post → texto → foto → Letra fina sugerida → Foto e legenda → arrastar/zoom → baixar → recarregar.
- **Isolamento** (`parceiro-b@teste.dev`): só vê `cliente-b@teste.dev`.

## Contexto que não está nos docs
- **Último tropeço do usuário:** ficou parado em "Verifique seu email" sem saber do Mailpit. Corrigido: README e um aviso "Ambiente local / Abrir o Mailpit" que aparece só no `nuxt dev`. O fluxo tela Entrar → Mailpit → clique foi reproduzido em headless e entra.
- **Git:** remoto `MacroHardd/teu-marketing`, push por SSH funciona e o usuário autorizou subir as branches. Nunca commitar na `main`. PR quem abre e aceita é o usuário, pelo painel.
- **O usuário deixa o `dev:local` dele rodando na porta 3000.** Não mate. Para o seu build/teste: `PORT=3001 node apps/web/scripts/local.mjs node apps/web/.output/server/index.mjs` (e `PORT=3001` também no `teste:usuarios` para os links). O E2E tem `BASE` fixo em 3000 e o redirect do Auth local aponta para 3000, então só roda com a porta livre. Para parar um servidor, use o PID da porta (`ss -ltnp | grep :3001`), nunca `pkill -f` (mata o próprio shell).
- O E2E **não rodou** depois da última rodada de mudanças (porta ocupada). As mudanças foram pequenas: nome do Parceiro do E2E, aviso dev na tela Entrar e scripts. Rode o E2E quando a 3000 estiver livre.
- `supabase migration new` lê o stdin: crie o arquivo vazio e escreva depois (ver `CLAUDE.md`).
- **Fotos de teste** são sintéticas (`packages/oraculo/fotos/gerar_fotos.py`), suaves de propósito: Pillow e Canvas reamostram diferente.
- **HEIC não foi testado** (falta arquivo). Ponto de entrada: `preparaFoto` em `apps/web/app/composables/useFoto.ts`.
- **Como o usuário trabalha:** rapidez, respostas curtas (caveman, PT-BR), interface leiga, **nunca virar Canva**. Só considera pronto com o build passando, e quer testar cada feature como Parceiro e como Cliente.
- **Fontes do publi:** usar como estão. **IA:** fora do MVP.

## Skills sugeridas
- `supabase`: migrations, Storage, templates de email, advisors
- `nuxt-ui`: controles de Ajuste e grade de Estilos/Variações
- `tdd`: porte de Estilo/Variação e regras de Trava
- `grill-with-docs`: decidir Variações e Ajustes com o usuário
- `diagnose`: regressão visual reprovando ou preview ≠ PNG
