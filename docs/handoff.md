# Handoff: Teu Marketing (2026-10-16, fim da sessão M1 + M2 local)

## Onde estamos
M1 (spike do motor) aprovado. **M2 pronto local**: Admin por script → Parceiro entra por link mágico → convida → Cliente entra pelo Convite com 1 clique → escreve → Estilo Acento → baixa o PNG. O M0 só não tem staging, que depende das contas do usuário. O trabalho está na branch `m0-m1-motor-acento`. A `main` (prod) está no 1º commit, e o usuário vai abrir e aprovar o PR da branch para a main. O build de produção passa desde o commit `e3672b5`.

**Leia nesta ordem:**
1. `CLAUDE.md`: comandos, pegadinhas de auth/Convite, como a paridade com o publi funciona
2. `docs/estado.md`: status, próximo passo, valores assumidos, pendência do publi
3. `docs/entregaveis-2026-10-16.md`: o que foi entregue, roteiro de teste manual, o que o usuário precisa fazer
4. `docs/mvp.md`: o alvo e o checklist de aceite
5. `docs/plano.md`: M3 em diante
6. Conforme a necessidade: `CONTEXT.md`, `docs/infra.md` (configuração de prod), `docs/adr/*`, `packages/oraculo/README.md`

## Próxima tarefa
**M3** (`docs/plano.md`): foto (upload, HEIC→JPEG, redimensionar, análise de luminância/cor/rosto), Ajustes da lista fechada, Variações, Travas ao vivo com ação de correção. Na prática:
- Os Estilos com foto do corte do MVP (**Letra fina** `p_fina` e **Foto e legenda** `p_ogilvy`) precisam ser portados. O fluxo de porte está em `CLAUDE.md`: caso em `packages/oraculo/casos/<tipo>.json` → `gerar.py` → conjunto no laço de `test/regressao.test.ts`. O oráculo ainda não aceita foto nos casos: falta passar `imagem` no `gerar.py`.
- O Motor nunca lê pixel. A análise da foto vira metadado no upload (ADR 0001). O publi lê pixel da foto (`foto_cover`, `energia` etc.), então a porta precisa trocar isso por metadados equivalentes.
- **Variações** ainda não existem no publi. Elas nascem no publi e depois são portadas (regra do `CLAUDE.md`). Antes de inventar, alinhar com o usuário.
- Antes de portar Número/Herói: corrigir `_numero` no publi (veja `packages/oraculo/README.md`).
- O editor atual (`apps/web/app/pages/posts/[id].vue`) só tem texto e Acento fixo. As Travas mapeiam os avisos do Motor por regex (array `AVISOS`).

Em paralelo, quando o usuário avisar que criou as contas: staging conforme `docs/infra.md` → "Configuração de produção" e depois rodar o CI pela 1ª vez (o passo de RLS no Actions nunca rodou).

## Contexto que não está nos docs
- **Git:** remoto `git@github.com:MacroHardd/teu-marketing.git`, e o push por SSH funciona daqui. Sem `gh` instalado: não dá para abrir PR. Commitar só em branch, nunca na main. Para o M3, criar uma branch nova a partir da main depois do merge. PR quem aprova é ele; abrir só se der sem pedir permissão. Nunca pedir chaves no chat: ele preenche `.env` e o painel.
- **Como o usuário trabalha:** quer rapidez ("precisa funcionar"), decide rápido, pediu respostas no estilo caveman em PT-BR. Interface limpa, **nunca virar Canva**.
- **Ambiente:**
  - O Python do sistema não tem `ensurepip`: use `uv` para o venv do oráculo.
  - A extensão Chrome não conecta. Para ver a UI, use `playwright-core` (já é devDependency do web) com `/usr/bin/google-chrome`.
  - Não use `pkill -f "nuxt dev"`, que mata o próprio shell. Pare o dev pelo PID da porta (`ss -ltnp | grep :3000`).
  - No dev, clicar antes da hidratação perde o evento. Espere `networkidle` (o E2E já faz isso).
- **Estado local:**
  - `apps/web/.env` **agora aponta para o Supabase hospedado do usuário**, que ainda não tem as migrations. Por isso o app e o E2E falham com `PGRST205`. Para trabalhar local, peça ao usuário para usar as chaves de `pnpm exec supabase status` (ou criar um `.env` local separado). Não edite o `.env` dele sem pedir.
  - O Supabase local tem Parceiros de teste criados pelos E2E. `pnpm exec supabase db reset` zera tudo.
  - Depois de uma migration nova: `pnpm db:tipos`, `pnpm db:test` e `pnpm exec supabase db advisors --local`.
- **Domínio** `app.teumarketing.com.br` no `.env.example` é um palpite, ainda não confirmado.
- **Fontes do publi:** usar como estão, sem levantar licença. **IA:** fora do MVP, não propor.

## Skills sugeridas
- `supabase`: migrations, RLS, Storage (bucket privado de fotos com URL assinada no M3), advisors
- `nuxt-ui`: componentes da barra de Ajustes e da grade de Estilos/Variações
- `tdd`: porte de cada Estilo/Variação (Motor puro) e regras das Travas
- `diagnose`: divergência entre preview e PNG ou regressão visual reprovando
- `grill-with-docs`: quando surgir decisão de domínio (Variações, Ajustes); atualiza `CONTEXT.md` e ADRs
- `product-designer` / `ui-ux-pro-max`: revisar o editor para manter a interface leiga
- `to-issues`: quebrar o M3 em fatias quando houver tracker
