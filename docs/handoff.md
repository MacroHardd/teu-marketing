# Handoff: Teu Marketing (2026-10-17, fim do M3 Fase C)

## Onde estamos
M3 em andamento na branch **`m3-estilos`** (só local, commitada), empilhada sobre `m3-ajustes` → `m3-foto` → `m0-m1-motor-acento`. Nenhum PR mergeado.

- **Fases A e B (feitas, aguardando validação do usuário):** Perfil de Marca, Ajustes, Travas, Manchete, legenda, telemetria; Estilos da skill `tipografia-igor` (Acento, Zona calma, Síncope, Letra fina). Detalhe em `docs/estado.md`.
- **Fase C (feita nesta sessão, aguardando validação do usuário):**
  - **Todos os 13 Estilos mapeados.** Novos: Riscada (skill, E10), Número, Herói, Vazio, Foto que fala, Depoimento, Duas tintas (publi).
  - **Arrastar o texto na prévia** com encaixe: ao arrastar aparecem as 3 posições (em cima / no meio / embaixo) e o texto encaixa ao soltar. Só vertical, só nos Estilos que já tinham posição (Acento, Manchete, Número, Letra fina). Os botões continuam.

Decisões do usuário nesta sessão (não presumir de novo):
- todos os Estilos da skill e do publi entram (antes era corte de 7)
- controle por arrastar = **texto com encaixe** (não elementos, não palavra, não linhas)
- Duas tintas = **Blue Note faixa + janela** (a "parede" espera aprovação no publi-lab)
- `_numero` corrigido **na cópia daqui** do publi; ele leva o fix para o publi-lab

Verificado:
- lint e typecheck
- regressão: 73 casos do publi + 32 da skill, todos < 1% (Riscada 0,02–0,09%)
- 231 testes do motor; 43 de RLS
- `pnpm build` e o E2E completo contra o build (porta 3001): arrastar, Riscada no browser, 13 Estilos com foto

**Não verificado:** desempenho (p95 < 50 ms). A máquina estava com load 8–9 em 8 núcleos: o teste falhou com 91 ms (os Estilos antigos também falham assim nessa carga). Pela proporção com a Manchete, a Riscada fica em ~20 ms com a máquina livre.

**Leia nesta ordem:** `CLAUDE.md` → `docs/estado.md` → `docs/adr/0003-*` → `packages/oraculo/README.md`.

## Roteiro de teste para o usuário (Fase C)
Preparar: `pnpm exec supabase start` → `pnpm teste:usuarios` → `pnpm dev:local` (**reinicie o dev** para pegar o Motor novo) → entrar como `cliente@teste.dev`.

1. **Arrastar:** Acento com "Menos ruído, mais *resultado*". Clique no texto da prévia e arraste para baixo: aparecem "Em cima / No meio / Embaixo"; solte e o texto encaixa. O botão de posição acompanha.
2. **Riscada:** "eu perdi o *medo* de vender". Palavra marcada escrita à mão e arranhada, resto pequeno.
   - Variação Sem cor / Com acento (vermelho, ou a cor da marca).
   - Sem asterisco: o Motor escolhe a palavra de tom escuro (medo, cansaço…) ou a mais longa.
3. **Número** (sem foto): "1.200 clientes atendidos em 2025". "Workshop no sábado 20/11" não vira mais "11".
4. **Herói:** "Por apenas R$ 49,90 no combo" (o preço vira o objeto). Com foto: a foto no centro, iluminada.
5. **Com foto:**
   - **Foto que fala:** até 3 palavras ("Gente que cuida"); o nome da marca vai no retângulo.
   - **Vazio:** a foto pequena no alto, frase curta embaixo.
   - **Depoimento:** `"Mudou minha relação com o dinheiro" — Ana, cliente`. A fala vai para cima ou para baixo, onde a foto é mais calma.
   - **Duas tintas:** "Workshop de marketing no sábado 20/11 às 19h". Variação Faixa (foto embaixo) ou Janela (foto no canto). Título na cor da marca, data embaixo.
6. Contraste: em Foto que fala / Depoimento com foto clara, se a Trava acender, "Escurecer atrás do texto" resolve.

**Parceiro / isolamento:** igual antes.

## Pendências do usuário (não bloqueiam)
- Push da `m3-estilos` e PRs na ordem: `m0-m1-motor-acento → main`, `m3-foto`, `m3-ajustes`, `m3-estilos`.
- Trocar a branch padrão do GitHub para `main`.
- publi-lab: levar o fix do `_numero`; aprovar (ou não) a "parede" do Blue Note.
- Staging: `supabase link` + `db push` (4 migrations), Vercel, Resend, template do Magic Link.

## Próximo passo (a próxima sessão faz, nesta ordem)
1. **Abrir:** `git branch` (deve estar em `m3-estilos`) → `pnpm build`. Se quebrar, corrigir antes de tudo.
2. **Retorno do usuário sobre as Fases A/B/C.** Se não testou, seguir.
3. **Desempenho com a máquina livre** (`uptime` com load < 2): `pnpm --filter @teu/motor exec vitest run test/desempenho.test.ts`. Se falhar livre, otimizar (Riscada primeiro: `riscado` em `desenhista.ts`). Não mexer no limite.
4. **M5 (J4):** Meus Posts com duplicar e excluir + eventos `post_duplicado`/`post_excluido`; miniatura na grade se for barato.
5. **M6 (J5):** Convite por CSV, fila do Resend (100/dia, status "agendado"), expiração 7 dias por cron, desativar Cliente liberando Assento, destaque de Cliente parado (14 dias); Parceiro sem ver conteúdo (RLS + pgTAP).
6. Fechar com lint, typecheck, test, `db:test`, build e E2E, mais o roteiro de teste.

Fora até o usuário pedir: misturas de regras, Duas tintas "parede", features de imagem (Trava de rosto), staging.

## Contexto que não está nos docs
- **O usuário deixa o `dev:local` rodando na 3000.** Não mate. Teste: `pnpm build`, `PORT=3001 node apps/web/scripts/local.mjs node apps/web/.output/server/index.mjs` (background) e `PORT=3001 BASE=http://localhost:3001 node apps/web/scripts/local.mjs pnpm --filter @teu/web e2e`. Parar pelo PID da porta (`ss -ltnp | grep :3001`).
- Oráculos: `packages/oraculo/.venv/bin/python packages/oraculo/gerar.py` (~3 min, publi) e `node packages/oraculo/tipografia/gerar.mjs [estilo]` (~3 min, skill, Chrome do sistema). Saídas fora do git. `DIFF=1` grava todos os diffs; `PCT=1` imprime a % da regressão da skill.
- Riscada: o ruído do `feTurbulence` foi conferido contra o Chrome com um HTML de teste (screenshot headless). O Chrome amostra em (x+1, y+1) a partir da origem do filtro encaixada no pixel. Se um dia a regressão da Riscada subir, refazer essa conferência primeiro.
- Depoimento: a escolha cima/baixo usa `foto_meta.bordas`. Fotos enviadas antes desta sessão não têm `bordas`: decide só pela moldura (pode escolher diferente do publi). Reenviar a foto resolve.
- Nome interno × nome na tela: `selo` = Foto que fala (não confundir com o Elemento opcional Selo), `duotom` = Duas tintas, `citacao` = Depoimento, `ogilvy` = Foto e legenda, `heroi` = Herói.
- **Não inventar produto:** campo ou comportamento que o usuário não disse vira pergunta.
- **Como o usuário trabalha:** rápido, curto (caveman, PT-BR); interface leiga, nunca virar Canva; pronto = build + E2E; roteiro de teste como Parceiro e Cliente; commit só em branch, sem push, PR é dele.

## Skills sugeridas
- `tipografia-igor` (ler): regras; origem dos números em `motion-videos-mappings/tipografia-lab/MAPA.md`
- `diagnose`: regressão reprovando ou desempenho
- `tdd`: M5/M6
