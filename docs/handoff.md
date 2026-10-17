# Handoff: Teu Marketing (2026-10-16, fim do M3 Fase A)

## Onde estamos
M3 em andamento na branch **`m3-ajustes`** (no GitHub), empilhada sobre `m3-foto` → `m0-m1-motor-acento`. Nenhum PR mergeado.

O usuário dividiu esta rodada em duas fases:
- **Fase A (feita, aguardando validação do usuário):**
  - Perfil de Marca
  - Ajustes da lista fechada
  - Travas de texto cortado e de contraste, com correção
  - Estilo Manchete
  - legenda por Post
  - telemetria
  - email de login em PT-BR
- **Fase B (só depois do ok do usuário):** levar o conhecimento da skill **`tipografia-igor`** (`~/.claude/skills/tipografia-igor`) para a plataforma, como **Estilos puros e Variações**. O usuário passa o caminho da fonte original desse conhecimento se precisar. As Variações saem daí, e não mais "3 por Estilo do publi".

Decisão do usuário: **tratamento de imagem não é prioridade agora**. Haverá features dedicadas a isso. Por isso a Trava de rosto ficou para essas features.

Verificado nesta sessão:
- lint, typecheck e 150 testes do motor
- 43 testes de RLS
- `pnpm build` e o E2E completo contra o build de produção (porta 3001)
- email de login chegando em PT-BR no Mailpit

**Leia nesta ordem:** `CLAUDE.md` → `docs/estado.md` → `README.md` ("Rodar e testar localmente") → `docs/mvp.md`.

## Roteiro de teste para o usuário (Fase A)
Preparar: `pnpm exec supabase start` → `pnpm teste:usuarios` → `pnpm dev:local` → entrar pelo link impresso, numa janela anônima.

**Cliente** (`cliente@teste.dev`):
1. Meus Posts mostra o aviso "Coloque a sua marca nos Posts" → Preencher Perfil de Marca.
   - Preencha nome, @ e uma cor, e envie um logo PNG.
   - A prévia à direita muda ao vivo. Salvar volta para Meus Posts.
2. Novo Post → escreva uma frase.
   - A imagem mostra o @ e o logo.
3. Coluna da direita (Ajustes):
   - Tamanho P/M/G
   - Posição: em cima, no meio, embaixo
   - Cores: a da marca, 6 prontas, claro/escuro
   - Na imagem: liga e desliga @/nome, Logo, Selo
   - CTA
4. Trava de texto cortado:
   - cole umas 60 palavras no Acento → aviso vermelho, e "Baixar imagem" fica desligado
   - clique em "Usar Manchete" ou "Diminuir a letra" → o aviso some
5. Envie uma foto → Letra fina:
   - mude a posição do texto e o tamanho (só P/M nesse Estilo)
   - se a letra ficar difícil de ler: Trava de contraste → "Escurecer atrás do texto" ou "Mover o texto para…"
6. Baixar imagem, Copiar legenda, recarregar a página: tudo continua igual.
7. Tela Entrar → Mailpit: o email chega como "Seu link para entrar no Teu Marketing".

**Parceiro** (`parceiro@teste.dev`):
- Igual ao M2: painel de Uso, Convites, reenviar.
- Ele não tem acesso ao Perfil de Marca nem aos Posts dos Clientes. Isso é garantido pelo RLS e testado no pgTAP.

**Isolamento** (`parceiro-b@teste.dev`): só vê `cliente-b@teste.dev`.

## Pendências do usuário (não bloqueiam)
- Trocar a branch padrão do GitHub para `main`.
- PRs pelo painel, nesta ordem:
  1. `m0-m1-motor-acento → main`
  2. `m3-foto`
  3. `m3-ajustes`
- Staging: `supabase link` + `db push` no hospedado (agora são **3 migrations**: `inicio`, `foto`, `marca`), projeto na Vercel e conta no Resend. No painel do hospedado, **Auth → Email Templates → Magic Link**: copiar `supabase/templates/magic_link.html` e o assunto "Seu link para entrar no Teu Marketing".

## Próximo passo
1. Receber o retorno do usuário sobre a Fase A e corrigir o que ele apontar.
2. **Fase B:**
   - ler a skill `tipografia-igor` (`SKILL.md`, `REGRAS.md`, `presets.ts`)
   - perguntar a origem do conhecimento, se precisar
   - propor ao usuário o mapa skill → Estilos/Variações **antes de codar**
   - lembrar: o MVP é post estático 4:5. A skill também cobre lyric video, que está fora do escopo.
3. Depois disso: `variacao_trocada`, Número (precisa do fix do `_numero` no publi) e staging.

## Contexto que não está nos docs
- **O usuário deixa o `dev:local` rodando na 3000.** Não mate.
  - Para o seu teste: `pnpm build`, depois `PORT=3001 node apps/web/scripts/local.mjs node apps/web/.output/server/index.mjs` (em background) e `PORT=3001 BASE=http://localhost:3001 node apps/web/scripts/local.mjs pnpm --filter @teu/web e2e`.
  - O `local.mjs` é obrigatório também no E2E: sem ele, o `criar-parceiro` lê o `.env` do hospedado ("Could not find the table").
  - Para parar um servidor, use o PID da porta (`ss -ltnp | grep :3001`), nunca `pkill -f`.
- Mudar `supabase/config.toml` exige `supabase stop && supabase start`. Os dados ficam (backup automático). Foi feito nesta sessão (template e redirect da 3001).
- As fixtures do pgTAP usam `@pgtap.dev`: nunca `@teste.dev`, que colide com os usuários de teste.
- Ajustes no Motor:
  - sem Ajuste, a Cena = publi; a regressão garante isso
  - Ajuste novo precisa manter `motor(e) == motor({...e, ajustes: {}})`, que tem teste em `test/ajustes.test.ts`
  - o que cada Estilo oferece fica em `SUPORTE` (`packages/motor/src/ajustes.ts`); a UI só mostra o que está lá
- Na tela, as Travas vêm dos `avisos` do Motor mapeados por regex (`TRAVAS` e `DICAS` em `apps/web/app/pages/posts/[id].vue`). Aviso novo no Motor precisa de uma linha ali.
- **Como o usuário trabalha:**
  - rapidez e respostas curtas (caveman, PT-BR)
  - interface leiga, **nunca virar Canva**
  - pronto = build + E2E passando
  - quer o roteiro de teste como Parceiro e como Cliente
  - commit só em branch, PR quem abre é ele

## Skills sugeridas
- `tipografia-igor` (ler, sem executar): é a fonte da Fase B
- `grill-with-docs`: fechar com o usuário o mapa Estilos/Variações
- `tdd`: porte de Estilo/Variação
- `nuxt-ui`: grade de Variações no editor
- `diagnose`: regressão visual reprovando
