# Handoff: Teu Marketing (2026-10-17, fim do M3 Fase B)

## Onde estamos
M3 em andamento na branch **`m3-ajustes`** (no GitHub), empilhada sobre `m3-foto` → `m0-m1-motor-acento`. Nenhum PR mergeado.

- **Fase A (feita):**
  - Perfil de Marca: nome, @, cor e logo
  - Ajustes da lista fechada
  - Travas de texto cortado e de contraste, com correção
  - Estilo Manchete
  - legenda por Post
  - telemetria
  - email de login em PT-BR
  - Correção do usuário: **contato e hashtags não fazem parte do Perfil**. Hashtags são de cada Post; contato é para a Plataforma falar com o Cliente e nunca aparece em Post. Já foram removidos.
- **Fase B (feita, aguardando validação do usuário):** Estilos da skill `tipografia-igor` (ADR 0003).
  - Acento e Letra fina seguem a skill; Zona calma e Síncope são novos.
  - Variações = as aprovadas na skill: Zona (raios / com a foto), Síncope (com / sem bloco), Fina (P&B / duotom). Acento não tem Variação de layout; as paletas dele ficam em Cores.
  - O oráculo desses quatro é o kit Remotion da skill (`packages/oraculo/tipografia`); o publi continua sendo o oráculo de Manchete e Foto e legenda.

Decisões do usuário nesta fase (não presumir de novo):
- a palavra marcada pelo Cliente manda, mesmo quebrando a regra
- a paleta do Cliente (cor da marca) manda e a regra é aplicada sobre ela; sem cor de marca, valem as paletas aprovadas da skill
- texto longo encolhe até caber
- Riscada e misturas de regras ficam para depois
- tratamento de imagem (Trava de rosto etc.) terá features próprias

Verificado:
- lint e typecheck
- 165 testes funcionais do motor, incluindo os 25 casos da skill e os da Manchete e Foto e legenda com < 1% de diferença
- 43 testes de RLS
- `pnpm build` e o E2E completo contra o build (porta 3001)

**Não verificado:** o teste de desempenho (p95 < 50 ms, Node) falhou aqui com p95 de 54–60 ms. A máquina tinha um jogo usando ~285% de CPU e estava em swap. Medido à parte: os Estilos novos têm p95 de 17 ms e os do publi, sem mudança, 32 ms nessa carga. Conferir no CI ou com a máquina livre.

**Leia nesta ordem:** `CLAUDE.md` → `docs/estado.md` → `docs/adr/0003-*` → `README.md` ("Rodar e testar localmente").

## Roteiro de teste para o usuário (Fase B)
Preparar: `pnpm exec supabase start` → `pnpm teste:usuarios` → `pnpm dev:local` (reinicie o dev para pegar o Motor novo) → entrar como `cliente@teste.dev`.

1. **Acento:** escreva "Menos ruído, mais *resultado*".
   - Sai como o E1 da skill: letra grande, 3 pontos e a palavra marcada na cor.
   - Cores: Villela, Noite e Verde, mais a cor da marca, se o Perfil tiver.
   - Teste também sem asterisco: o Motor escolhe a palavra sozinho.
2. **Zona calma:** a frase fica dentro da pílula, sobre os raios.
   - Cores: Gil, Neon ou a da marca.
   - Com foto, aparece a Variação "Com a foto" (a foto saturada no lugar dos raios).
   - O CTA e o @ ficam dentro da pílula.
3. **Síncope:** "eu *nasci* assim hoje".
   - A palavra marcada sai da coluna; sem marcação, as palavras se alternam.
   - Variação com bloco (letra em negativo no canto) ou sem bloco (fundo cheio Azul, ou da marca).
4. **Letra fina** (com foto):
   - linhas de até 9 letras ocupando a largura, peso fino e regular alternados
   - Variação P&B ou Duotom (azul, ou na cor da marca)
   - a letra fica clara ou escura conforme a área atrás do texto
5. **Texto longo** (umas 30 palavras) no Acento: a letra encolhe até caber.
   - Para ver a Trava, use a Síncope: ela corta, e "Usar Manchete" resolve.
6. **Perfil com cor de marca:** todos os Estilos novos já saem na cor da marca. Trocar para uma paleta pronta em Cores vale mais que ela.

**Parceiro / isolamento:** igual antes (painel de Uso; Parceiro B só vê o próprio Cliente).

## Pendências do usuário (não bloqueiam)
- Trocar a branch padrão do GitHub para `main`.
- PRs pelo painel, nesta ordem: `m0-m1-motor-acento → main`, depois `m3-foto`, depois `m3-ajustes`.
- Staging:
  - `supabase link` + `db push` (agora são **4 migrations**: `inicio`, `foto`, `marca`, `perfil_sem_contato`)
  - Vercel e Resend
  - no painel do hospedado, Auth → Email Templates → Magic Link: copiar `supabase/templates/magic_link.html`

## Próximo passo (a próxima sessão faz, nesta ordem)
1. **Abrir:** `git branch` (deve estar em `m3-ajustes`) → `pnpm build`. Se quebrar, corrigir antes de tudo.
2. **Retorno do usuário sobre as Fases A/B:** perguntar o que ele achou no teste e corrigir. Se ele não tiver testado, seguir.
3. **Teste de desempenho:** rodar `pnpm --filter @teu/motor exec vitest run test/desempenho.test.ts` com a máquina livre (`uptime` com load < 2).
   - Se passar, só anotar no `estado.md`.
   - Se falhar com a máquina livre, otimizar o Motor. Não mexer no limite de 50 ms.
4. **M5, o que falta (J4):** Meus Posts com **duplicar** e **excluir**, mais os eventos `post_duplicado`/`post_excluido`. Miniatura do Post na grade, se for barato (mesmo Motor).
5. **M6 (J5), sem depender do usuário:**
   - Convite por **CSV**
   - **fila** de envio no limite de 100/dia do Resend, com status "agendado"
   - **expiração** do Convite (7 dias) por cron diário
   - **desativar Cliente** liberando o Assento
   - destaque do **Cliente parado** (14 dias)
   - o Parceiro continua sem ver conteúdo (RLS + pgTAP)
6. Fechar com lint, typecheck, test, `db:test`, build e E2E, mais o roteiro de teste Parceiro/Cliente para o usuário.

Fora da próxima sessão, até o usuário pedir: Riscada e misturas, features de imagem (Trava de rosto), Número (falta o fix do `_numero` no publi) e staging (contas dele).

## Contexto que não está nos docs
- **O usuário deixa o `dev:local` rodando na 3000.** Não mate.
  - Para o seu teste: `pnpm build`, depois `PORT=3001 node apps/web/scripts/local.mjs node apps/web/.output/server/index.mjs` (em background) e `PORT=3001 BASE=http://localhost:3001 node apps/web/scripts/local.mjs pnpm --filter @teu/web e2e`.
  - Para parar um servidor, use o PID da porta (`ss -ltnp | grep :3001`), nunca `pkill -f`.
- Oráculo da skill:
  - `npm ci --prefix packages/oraculo/tipografia`, depois `node packages/oraculo/tipografia/gerar.mjs [estilo]`
  - leva ~2,5 min para os 25 casos
  - usa o `/usr/bin/google-chrome`
  - as referências ficam em `packages/oraculo/saida/tipografia` (fora do git)
  - `test/__diff__` recebe as diferenças; `DIFF=1` grava todas
- Porte "como o CSS" (`packages/motor/src/estilos/css.ts`):
  - kerning ligado só nesses Estilos (`kern: true` no item); `larguraKern` tem cache por palavra
  - linha de base = métricas da fonte (hhea/typo) dentro do `line-height`
  - o Remotion usa `box-sizing: border-box`
- As fixtures do pgTAP usam `@pgtap.dev` (`@teste.dev` colide com os usuários de teste).
- Na tela, Travas e dicas vêm dos `avisos` do Motor por regex (`TRAVAS`/`DICAS` em `apps/web/app/pages/posts/[id].vue`).
- **Não inventar produto:** campo ou comportamento que o usuário não disse vira pergunta. O contato/hashtags que inventei custou retrabalho.
- **Como o usuário trabalha:**
  - rapidez e respostas curtas (caveman, PT-BR)
  - interface leiga, **nunca virar Canva**
  - pronto = build + E2E
  - roteiro de teste como Parceiro e como Cliente
  - commit só em branch, PR quem abre é ele

## Skills sugeridas
- `tipografia-igor` (ler): referência das regras; a origem de cada número está em `motion-videos-mappings/tipografia-lab/MAPA.md`
- `tdd`: Riscada e misturas
- `diagnose`: regressão reprovando
