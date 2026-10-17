# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Estado atual

Monorepo, spike do motor (M1, Estilo Acento) e fatia vertical local (M2: Admin → Parceiro → Convite → Cliente → PNG) prontos; M3 em andamento (foto, Ajustes, Travas e todos os 13 Estilos mapeados feitos). Falta staging. O status vivo (o que está feito, o que está em andamento e o próximo passo) fica em [`docs/estado.md`](docs/estado.md). **Leia esse arquivo primeiro.**

Produto: **Teu Marketing**, uma plataforma B2B2C. O Parceiro (escritório, mentor ou agência) distribui o acesso aos seus Clientes, e o Cliente cria sozinho posts estáticos de Instagram. O objetivo é **vender o mais rápido possível**: o MVP precisa funcionar, não precisa estar perfeito. O alvo de construção é [`docs/mvp.md`](docs/mvp.md) (jornadas + checklist de aceite + corte), e não o PRD inteiro.

Idioma: docs, UI, commits e comunicação com o usuário em **PT-BR**.

## Manutenção da documentação (toda sessão)

O usuário quer a documentação sempre atualizada. Ao fim de cada sessão ou iteração:

1. **`docs/estado.md`**: atualizar o que foi feito, o que está em andamento, os bloqueios e o próximo passo, com a data absoluta.
2. **`docs/mvp.md`**: marcar `[x]` nos critérios de aceite cumpridos, e só nos que foram verificados.
3. **`CONTEXT.md`**: é só um glossário, sem nenhum detalhe de implementação. Termo novo ou com sentido alterado vai para lá na hora. Use os termos canônicos no código e na UI (Parceiro, Cliente, Assento, Convite, Perfil de Marca, Pauta, Estilo, Variação, Trava, Ajuste, Post, Exportação...) e nunca os listados em `_Evitar_`.
4. **`docs/adr/NNNN-*.md`**: registrar uma decisão só se ela for difícil de reverter, surpreendente sem contexto **e** resultado de um trade-off real.
5. Se uma decisão do usuário contradiz um doc, corrigir o doc, sem deixar as duas versões coexistindo.
6. **Handoff** sempre em `docs/handoff.md` (sobrescrever). Nunca em pasta temporária: precisa sobreviver a um restart da máquina.

O trabalho fica restrito a este diretório. Configurações de outras ferramentas na máquina (Gemini, Codex etc.) não fazem parte do projeto. A única exceção são as fontes de leitura `publi-lab` e `brandsdecoded` citadas abaixo, e o que for preciso extrair delas vai para dentro do repo.

## Decisões que moldam o código

- **Motor de render (ADR 0001):** `packages/motor` é TypeScript puro, sem dependência do Nuxt. É uma função pura: recebe conteúdo, Estilo, Variação, Ajustes, Perfil de Marca e os metadados da foto, e devolve uma Cena com o resultado das Travas. Um único Desenhista Canvas transforma a Cena em imagem. O preview ao vivo **e** a Exportação PNG 1080×1350 rodam no browser com o mesmo código, de modo que o PNG sai idêntico ao preview. O Motor nunca lê pixels: a foto é analisada uma vez no upload (luminância por região, cor dominante, rosto) e o resultado vira metadado. Não use `ctx.filter`, que tem suporte irregular no Safari: efeitos de pixel são feitos à mão ou em WebGL.
- **Oráculos: nunca rodam em produção (ADR 0001 e 0003).** A porta para TS é validada por regressão visual (< 1% de pixels) contra PNGs gerados no CI (`packages/oraculo`).
  - **Skill `tipografia-igor`** (`~/.claude/skills/tipografia-igor`, kit Remotion) é o oráculo de **Acento, Zona calma, Síncope, Letra fina e Riscada**. Os estáticos estão copiados sem mudança em `packages/oraculo/tipografia`. Variações = as variantes aprovadas na skill. Misturas de regras ficam para depois.
  - **publi** (Python/Pillow, `~/projetos/publi-lab/entregavel/publi.zip`, extraído em `packages/oraculo/publi/`) é o oráculo de **Manchete, Número, Foto que fala, Vazio, Foto e legenda, Herói e Depoimento**. **Duas tintas** = o Blue Note em revisão no publi-lab (`publi/bluenote_src.py`, só faixa e janela). A cópia daqui tem o fix do `_numero` (ver `packages/oraculo/README.md`). Também é a fonte da escolha de Estilo por regex (`_escolhe`) e da separação de campos sem alterar o texto (`_campos`).
  - A palavra marcada pelo Cliente (`*assim*`) e a cor da marca dele valem mais que a regra do Estilo (decisão do usuário).
- **Regras invioláveis do produto:**
  - o motor **nunca altera o texto do Cliente**, só distribui entre os campos (com teste)
  - o CTA é sempre escrito pelo Cliente
  - os Ajustes ficam numa lista fechada, ver `docs/mvp.md`: nada de fonte livre, color picker, camadas ou mover elementos livremente. A interface é limpa e leiga: **nunca virar Canva**
- **Sem IA no MVP.** A IA será tratada separadamente depois. Quando entrar, será sempre opcional, sob demanda e marcada como IA na interface. Remover fundo e recorte do objeto esperam essa fase (decisão do usuário, 2026-10-17).
- **Ativos (ADR 0004):** imagem do Cliente = original no Storage + receita (`tratamento.ts`, função pura) aplicada no browser, fora do Motor; o Motor recebe o metadado da imagem tratada. Texturas = catálogo global em `apps/web/public/texturas/catalogo.json` (as atuais são provisórias, geradas por `apps/web/scripts/texturas_provisorias.py`). Não usar texturas da Texturelabs (skill `texturas-igor`): a licença proíbe redistribuir.
- **Tenancy (ADR 0002):** Supabase com RLS é a fronteira entre tenants. O Parceiro só lê o Uso agregado, **nunca Posts nem fotos**, e isso é garantido no banco e testado no CI. Toda tabela nova precisa de política RLS. Fotos ficam num bucket privado com URL assinada. Entrada **só por link mágico** e só por Convite (o Parceiro é criado pelo Admin). Não existe signup.
- **Telemetria:** a tabela `eventos` nunca recebe conteúdo do Cliente (texto, legenda, foto). O schema de `props` é validado com zod. Eventos e métricas estão em `docs/medicao/tecnico.md`.

## Stack e estrutura planejadas

Monorepo pnpm (ver `docs/infra.md`):

```
apps/web          Nuxt 4 + Nuxt UI v4. Base: template nuxt-ui-templates/dashboard (MIT)
packages/motor    Motor + Desenhista (TS puro, roda no browser e em Node via @napi-rs/canvas)
packages/oraculo  roda o publi (Python + Pillow) para gerar as imagens de referência (CI/local)
supabase/         migrations, RLS, seed, testes de RLS, metricas/*.sql
```

- Templates reaproveitados e o que adaptar de cada um: `docs/templates.md`. Login vem do template `saas` (`UAuthForm`, só o campo de email). Upload vem do template `chat` (`useFileUpload`). Manter as licenças MIT.
- Infra: **Vercel Hobby + Supabase Free + Resend Free** até o primeiro cliente pagante. Limites que afetam o código: cron no máximo 1x por dia, Resend com 100 emails/dia (Convites em fila), Supabase sem backup (`pg_dump` via Actions). Regiões: São Paulo (gru1 / sa-east-1). As rotas de servidor ficam pequenas e sem APIs específicas da Vercel.
## Pronto = build de produção passando

Nenhuma iteração é dada como concluída (nem se pede para o usuário olhar) sem rodar, localmente: `pnpm lint && pnpm typecheck && pnpm test && pnpm db:test`, **`pnpm build`** e o E2E contra o build (`node apps/web/.output/server/index.mjs` na porta 3000). O deploy é Vercel: `NITRO_PRESET=vercel pnpm build` é o que o CI roda. Build quebrado no início da sessão se corrige antes de qualquer outra coisa.

## Comandos

```bash
pnpm install
pnpm exec supabase start     # Docker. Copiar apps/web/.env.example → apps/web/.env com as chaves locais (supabase status)
pnpm dev                     # apps/web em http://localhost:3000 com apps/web/.env; emails no Mailpit :54324
pnpm dev:local               # idem, mas forçando as chaves do Supabase local (ignora o .env, que pode ser do hospedado)
pnpm teste:usuarios          # (só local) Parceiros/Clientes de teste + link de entrada de cada um; `pnpm teste:usuarios <email>` = link novo
pnpm parceiro:criar --nome "Escritório X" --email x@teste.dev --assentos 5   # J1: Admin cria Parceiro (sem `--`)
pnpm lint && pnpm typecheck && pnpm test
pnpm db:test                 # testes de RLS (pgTAP, supabase/tests)
pnpm db:tipos                # regenera apps/web/app/types/database.types.ts depois de migration
pnpm --filter @teu/web e2e   # jornada J1→J3 (+ Post com foto) num Chrome headless (precisa supabase + app na :3000)
pnpm --filter @teu/motor exec vitest run test/campos.test.ts   # um arquivo
pnpm --filter @teu/motor exec vitest run -t "curta"            # um teste pelo nome
# referências do oráculo (precisa antes da regressão visual; sem elas os testes de regressão pulam)
packages/oraculo/.venv/bin/python packages/oraculo/gerar.py
```

- `supabase migration new <nome>` **lê o stdin** como corpo da migration: nunca rodar com heredoc/pipe na mesma linha (cria migration vazia). Criar o arquivo e escrever depois. Comandos da CLI em script: `< /dev/null`.
- Para rodar o build/E2E contra o Supabase local sem mexer no `apps/web/.env` (que pode apontar para o hospedado): exportar `NUXT_PUBLIC_SUPABASE_URL/KEY`, `NUXT_SUPABASE_SECRET_KEY` e `NUXT_MAILPIT_URL` a partir de `pnpm exec supabase status -o env`. Variável do processo vence o `.env`.

Venv do oráculo: ver `packages/oraculo/README.md` (usar `uv`: o Python do sistema não tem `ensurepip`). Diferenças visuais que reprovam ficam em `packages/motor/test/__diff__/`.

## Auth e Convite (pegadinhas)

- `supabase/config.toml`: `[auth] enable_signup = false` bloqueia cadastro; `[auth.email] enable_signup` tem que ficar **true** (é o provedor de email; false derruba o link mágico).
- Link do Convite = `/convite/<token>` (rota de servidor). Aceita no banco (`aceitar_convite`: prazo, Assento, outro Parceiro), gera o link mágico no servidor e entra direto via `/confirmar?token_hash=`. Um clique, sem segundo email.
- `@nuxtjs/supabase` importa `h3` sem declarar: o `pnpm-workspace.yaml` força h3 v1 (`packageExtensions`). Sem isso: `event.req.headers.get is not a function`.
- Escritas sensíveis (Convite, aceite, eventos) só no servidor com a chave secreta; o browser só lê/escreve o que a RLS deixa.

## Motor: como a paridade com o publi funciona

- Medidas e decisões em **2x** e com `round` do Python (meio vai pro par), como o publi: `packages/motor/src/py.ts`.
- Métrica de fonte **linear** (opentype.js), sem hinting; o oráculo é ajustado para medir igual (`packages/oraculo/README.md`).
- O Desenhista desenha texto como **contorno de glifo** (não usa `ctx.font`): sai igual em qualquer browser e no Node.
- Trava de área de cor é calculada pela geometria dos glifos, sem ler pixel.
- Foto: analisada uma vez no upload (`analisaFoto` → grade 32×32 de luminância, `MetaFoto`, salva em `posts.foto_meta`). Decisões que o publi tira do pixel (ex.: letra clara/escura na Letra fina) saem da grade. O recorte é o `ImageOps.fit` do Pillow (`recorteCover`) + enquadramento/zoom. Filtro de pixel (`aplicaFiltro`) roda fora do Motor, no provedor de foto do app/teste, com cache por filtro.
- Caso de regressão com foto: `"foto": "clara.png"` (fotos sintéticas em `packages/oraculo/fotos`, geradas por `gerar_fotos.py`).
- `\b` do Python é Unicode; no TS ele é emulado em `campos.ts`. Porte regex do publi sempre por ali.

## Referência de terceiro

`~/Documents/brandsdecoded/prompts/` é um produto de **terceiro**. Pode-se observar a estrutura e as funcionalidades para inspirar ideias de depois, mas **não se copia conteúdo**.
