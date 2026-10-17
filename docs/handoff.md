# Handoff: Teu Marketing (2026-10-17, fim do M5)

## Onde estamos
Branch **`m5-meus-posts`** (só local, commitada), empilhada sobre `m3-estilos` → `m3-ajustes` → `m3-foto` → `m0-m1-motor-acento`. Nenhum PR mergeado.

- **M3 (Fases A–D)** feito, aguardando validação do usuário. Detalhe e roteiros antigos em `docs/estado.md` e no git (`git show m3-estilos:docs/handoff.md`).
- **M5 / J4 (feito nesta sessão):** Meus Posts com Miniatura, duplicar e excluir; eventos `post_duplicado`/`post_excluido`.
- **Bug corrigido:** eventos dos Ativos (`ativo_enviado`, `tratamento_aplicado`, `ativo_excluido`) eram recusados pela constraint `eventos_nome_check` e sumiam calados. Migration `eventos_ativos_e_posts` + pgTAP `eventos.test.sql`. **Evento novo = PROPS + constraint + esse teste.**
- **Planejamento até vender:** `docs/plano.md` → "Restante até vender": ~6 iterações (M6a Convites, M6b painel, fechamento do editor, M7 reduzido, produção, teste com 3 pessoas). Este M5 foi a 1ª.
- **Fase E, estilização:** `docs/estilizacao.md`. Só visual, tarefas E0–E13 para agentes (Sonnet), com contrato (o que pode e não pode mexer, textos travados do E2E, pronto = build + E2E + prints 1440/375).

Decisões do usuário nesta sessão (não presumir de novo):
- desempenho fino **não** é preocupação agora: saiu do aceite; `desempenho.test.ts` virou guarda de p95 < 150 ms (meta de 50 ms segue no log e no backlog)
- depois do MVP: mais controles, mais fontes e texturas no Post, Perfil de Marca com algo parecido com gerador de paleta (é feature, não estilização)
- estilização = fase só visual, a qualquer tempo, quebrada para agentes

Verificado: lint, typecheck, 242 testes do motor, 74 de banco (`db:test`), `pnpm build` e E2E J1→J4 contra o build na 3001 (inclui eventos conferidos no banco).

**Leia nesta ordem:** `CLAUDE.md` → `docs/estado.md` → `docs/plano.md` (Restante até vender) → `docs/mvp.md`.

## Roteiro de teste para o usuário (M5: Meus Posts)
Preparar: `pnpm exec supabase start` → `pnpm exec supabase migration up` (migration nova) → `pnpm teste:usuarios` → reiniciar `pnpm dev:local` → entrar como `cliente@teste.dev`.

1. Abra um Post, mude algo, volte para **Meus Posts**: o cartão mostra a Miniatura (aparece ~4 s depois da última mudança, ou na hora ao exportar/sair pelo menu).
2. Clique num Post **Exportado**, corrija o texto, **Baixar imagem** de novo.
3. Em Meus Posts, botão de **copiar** (Duplicar) num Post com foto: abre um Rascunho igual (texto, Estilo, foto tratada). Mude e baixe: o original não muda.
4. Botão de **lixeira** (Excluir) → janela "Excluir este Post?" → **Excluir Post**. Some da grade; a imagem continua em Ativos.

**Parceiro:** nada mudou (o Parceiro não vê Posts nem Miniaturas: mesma pasta do Cliente no bucket, RLS por pasta).

## Pendências do usuário (não bloqueiam)
- **Pergunta aberta: Trava de rosto** está no aceite do MVP mas foi adiada com as features de imagem. Fica no MVP (detecção de rosto no browser, sem IA generativa) ou vai para o backlog?
- E0 da estilização: escolher a direção visual quando um agente propuser.
- Push das branches e PRs na ordem: `m0-m1-motor-acento → main`, `m3-foto`, `m3-ajustes`, `m3-estilos`, `m5-meus-posts`. Trocar a branch padrão do GitHub para `main`.
- publi-lab: levar o fix do `_numero`; aprovar (ou não) a "parede" do Blue Note.
- Staging: `supabase link` + `db push` (6 migrations), Vercel, Resend (domínio), template do Magic Link.
- Mandar os arquivos de textura (JPEG ~1080×1350, claros).
- Texto do termo de uso e da política de privacidade (iteração M7).

## Próximo passo (a próxima sessão faz, nesta ordem)
1. **Abrir:** `git branch` (deve estar em `m5-meus-posts`) → `pnpm build`. Se quebrar, corrigir antes de tudo.
2. Retorno do usuário (M3, M5, Trava de rosto). Se não respondeu, seguir.
3. **M6a, Convites (J2):** subir CSV (além de colar), fila do Resend (100/dia; excedente fica "agendado" para o dia seguinte), expiração em 7 dias por cron diário (Vercel Hobby: 1x/dia), reenvio gera link novo, mesmo email não ativo em dois Parceiros. Testes pgTAP + E2E. Já existe: colar emails com prévia, reenviar, status `agendado` no enum e na tela (`pages/clientes.vue`, `server/api/convites/*`, `server/utils/convites.ts`).
4. Depois: M6b (painel), fechamento do editor, M7 reduzido (ver `docs/plano.md`).
5. Fechar com lint, typecheck, test, `db:test`, build e E2E, mais o roteiro de teste. Telas novas: acrescentar os textos usados no E2E em "Textos travados" de `docs/estilizacao.md`.

Fora até o usuário pedir: desempenho fino, misturas de regras, Duas tintas "parede", features de imagem com IA, staging.

## Contexto que não está nos docs
- **O usuário deixa o `dev:local` rodando na 3000.** Não mate. Teste: `pnpm build`, `PORT=3001 node apps/web/scripts/local.mjs node apps/web/.output/server/index.mjs` (background) e `PORT=3001 BASE=http://localhost:3001 node apps/web/scripts/local.mjs pnpm --filter @teu/web e2e`. Parar pelo PID da porta (`ss -ltnp | grep :3001`).
- Migration nova no local: `pnpm exec supabase migration up < /dev/null` (não `db reset`: apaga os usuários de teste do usuário).
- Sem `psql` na máquina: `docker exec supabase_db_teu-marketing psql -U postgres -c '...'`.
- Miniatura: só no browser (`usePosts.ts`); a grade lista `<cliente>/miniaturas` e pede URLs assinadas em lote. Ir para outra página com `page.goto` (E2E) não dispara `onBeforeRouteLeave`: a Miniatura vem do debounce de 4 s ou da Exportação.
- Oráculos: `packages/oraculo/.venv/bin/python packages/oraculo/gerar.py` (~3 min) e `node packages/oraculo/tipografia/gerar.mjs [estilo]` (~3 min). Saídas fora do git.
- Nome interno × nome na tela: `selo` = Foto que fala, `duotom` = Duas tintas, `citacao` = Depoimento, `ogilvy` = Foto e legenda, `heroi` = Herói.
- **Não inventar produto:** campo ou comportamento que o usuário não disse vira pergunta.
- **Como o usuário trabalha:** rápido, curto (caveman, PT-BR); interface leiga, nunca virar Canva; pronto = build + E2E; roteiro de teste como Parceiro e Cliente; commit só em branch, sem push, PR é dele.

## Skills sugeridas
- `tdd`: M6a/M6b
- `supabase`: fila, cron, RLS
- `frontend-design` / `high-end-visual-design`: tarefa E0 da estilização (agente separado)
