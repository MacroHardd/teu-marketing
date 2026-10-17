# Estado do projeto

*Atualizar ao fim de cada sessão (ver `CLAUDE.md`). Os registros mais recentes ficam no topo.*

## Agora

- **Fase:** construção. M1 aprovado; M2 pronto local; M3 feito (aguardando validação); **M5 (J4) feito** nesta sessão. Branch atual: `m5-meus-posts` (empilhada sobre `m3-estilos` → `m3-ajustes` → `m3-foto` → `m0-m1-motor-acento`; nenhum PR mergeado ainda). M0 só falta staging.
- **Restante até vender:** ~6 iterações (plano em [plano.md](plano.md#restante-até-vender-2026-10-17)). Próxima: M6a (Convites).
- **Fase E (estilização):** só visual, em paralelo, quebrada em tarefas para agentes: [estilizacao.md](estilizacao.md). Começa pelo E0 (direção visual, o usuário escolhe).
- **Desempenho fino:** fora do aceite do MVP (decisão do usuário, 2026-10-17). O teste de desempenho agora só barra piora grosseira (p95 < 150 ms); a meta de 50 ms segue no log e no backlog.
- **Handoff da última sessão:** [handoff.md](handoff.md).
- **Git / produção:**
  - `origin/main` ainda está no 1º commit (`c5ea7ad`), **sem o fix do build**: o deploy da `main` quebra até o merge do PR `m0-m1-motor-acento → main`. Na branch o build passa (`pnpm build` e `NITRO_PRESET=vercel`).
  - `m3-foto` enviada ao GitHub (PR pelo painel).
  - A branch padrão do GitHub está como `m0-m1-motor-acento`. Trocar para `main` em Settings → General → Default branch (sem `gh`/token aqui, não dá para fazer daqui).
  - Ordem sugerida: trocar a default para `main` → mergear `m0-m1-motor-acento` → abrir PR `m3-foto → main`.
- **Supabase hospedado:** projeto criado, `apps/web/.env` aponta para ele, mas as **migrations não foram aplicadas** (erro `PGRST205`). Falta `pnpm exec supabase link --project-ref <ref>` + `pnpm exec supabase db push` (6 migrations hoje; `foto` cria o bucket `fotos`) + configurar o painel (`docs/infra.md`).
- **Feito no M3 até agora:**
  - foto: upload JPEG/PNG/HEIC até 10 MB, reduzida a 2160 px no browser, analisada, bucket privado
  - Estilos: Acento, **Manchete**, Letra fina e Foto e legenda, todos passando na regressão; troca de Estilo com 1 clique (com sugestão)
  - enquadramento (arrastar) e zoom
  - **Perfil de Marca** (`/marca`): nome, @, cor e logo, todos opcionais, com "Pular"
  - **Ajustes da lista fechada:** P/M/G, posição do texto, cores (a da marca, 6 temas prontos, claro/escuro), Elementos opcionais (@/nome, logo, selo) e CTA
  - **Travas:** texto cortado e contraste, ambas bloqueantes, com correção de 1 clique
  - legenda por Post + copiar
  - telemetria: `ajuste_aplicado`, `trava_disparada`, `trava_resolvida`, `perfil_atualizado`, `legenda_copiada`
  - email de login local em PT-BR
- **Fase B (feita, aguardando validação do usuário):** Estilos da skill `tipografia-igor` (ADR 0003). Acento e Letra fina passaram a seguir a skill; Zona calma e Síncope são novos. Variações = as aprovadas na skill. A cor da marca e a palavra marcada pelo Cliente mandam.
- **Fase D (feita, aguardando validação do usuário):** **Ativos e tratamento de imagem** (ADR 0004). Aba Ativos: enviar, tratar (duotom, pixelar, envelhecer, textura por cima, recorte) sem perder o original, usar num Post. No editor: "Dos Ativos", "Tratar imagem" e o Ajuste **Textura** (no fundo ou na letra, leve/forte). Texturas atuais são **provisórias** (geradas por nós); faltam os arquivos do usuário.
- **Fase C (feita, aguardando validação do usuário):** **todos os 13 Estilos mapeados** (Riscada da skill + Número, Herói, Vazio, Foto que fala, Depoimento e Duas tintas do publi) e **arrastar o texto na prévia** com encaixe em cima / no meio / embaixo. Roteiro de teste em [handoff.md](handoff.md).
- **Falta no M3:**
  - misturas de regras da skill (decisão do usuário: depois)
  - Duas tintas "parede": espera o usuário aprovar no publi-lab
  - remover fundo e recorte do objeto: fase de IA (decisão do usuário, 2026-10-17)
  - texturas definitivas: o usuário vai fornecer os arquivos
  - Trava de rosto: adiada junto com as features de imagem (decisão do usuário, 2026-10-16), mas está no aceite do MVP. **Pergunta aberta:** fica no MVP ou vai para o backlog?
- **Teste manual local:** `pnpm teste:usuarios` + `pnpm dev:local` (ver [plano.md](plano.md#como-validamos-cada-feature)). Usuários: `parceiro@teste.dev` (Escritório Teste, 3 Assentos: `cliente@`, `cliente2@`, Convite pendente `pendente@`) e `parceiro-b@teste.dev` (Agência Outra: `cliente-b@`), todos `@teste.dev`.
- **Bloqueios:** staging e merge/default branch dependem do usuário.
- **Pendência no publi-lab (do usuário):** levar o fix do `_numero` (feito só na cópia daqui, `packages/oraculo/publi/publi.py`) e, quando aprovar, a "parede" do Blue Note.
- **Valores assumidos sem confirmação explícita do usuário:**
  - o Convite expira em 7 dias
  - um Cliente é considerado parado depois de 14 dias
  - a foto é reduzida para no máximo 2160 px (JPEG 88%); grade de luminância 32×32
  - Trava bloqueante impede a Exportação; texto que não cabe na Letra fina é bloqueante (o publi corta em 6 linhas)
  - corte do MVP com 5 Estilos (ver [mvp.md](mvp.md))
  - Ajustes:
    - "@" e "assinatura" viraram um só Elemento ("@ / nome": mostra o @ ou, sem ele, o nome)
    - Selo = iniciais da marca num círculo, no canto de cima
    - P = 80%, G = 118% da letra do publi
    - na Letra fina não há G (a letra já ocupa a largura toda)
    - a posição "zona" não existe em Foto e legenda (o layout é fixo: foto em cima)
  - Trava de contraste: contraste WCAG < 3 entre a letra e a luz média atrás dela (pelo metadado). A correção "Escurecer atrás do texto" é o véu a 85% em vez de 62%
  - o Perfil de Marca é invisível para o Parceiro (como os Posts)
  - Fase D (tratamento):
    - duotom = rampa do quase preto (a cor a 85% de preto) até a cor, contraste 1,15; cores prontas = as da skill (azul, vermelho, verde, amarelo) + a da marca
    - pixelar P/M/G = 96/48/24 blocos na largura
    - envelhecer leve/forte = sépia, contraste −12/−20%, preto lavado, vinheta e grão determinístico
    - textura = multiplicação, leve 35% / forte 70%; um efeito por vez
    - recorte com 3 formatos: Post (4:5), Quadrado, Livre
    - foto enviada no editor também vira Ativo; excluir o Ativo tira a foto dos Posts que usam (avisa quantos)
  - Fase C:
    - Foto que fala sem nome no Perfil: sem o retângulo da marca (o publi escrevia "Sua marca")
    - Riscada: a vírgula colada na palavra fica (o estático da skill tira; o Motor nunca altera o texto)
    - Riscada com cor de marca já sai na Variação "Com acento"
    - Duas tintas faixa com CTA: o CTA fica no branco, logo acima da foto
    - Trava de contraste também em Foto que fala e Depoimento (correção = véu mais forte; no Depoimento o véu vira escuro e a letra clara)
    - arrastar o texto só na vertical (3 posições) e só nos Estilos que já tinham posição (Acento, Manchete, Número, Letra fina); os botões de posição continuam

## Histórico

### 2026-10-17. M5: Meus Posts (J4) + planejamento até vender
- Decisões do usuário: desempenho fino não é preocupação agora (saiu do aceite; teste vira guarda de p95 < 150 ms); depois do MVP vêm mais controles, mais fontes e texturas e um Perfil de Marca com algo parecido com um gerador de paleta; a estilização da Plataforma é uma fase só visual, a qualquer tempo, quebrada para agentes (`docs/estilizacao.md`).
- Meus Posts: grade com **Miniatura** (cópia 270×338 da prévia, gravada pelo editor 4 s depois da última mudança, ao sair e na Exportação; mora no bucket `fotos` em `<cliente>/miniaturas/<post>.jpg`), **duplicar** (abre um Rascunho igual: texto, Estilo, Variação, Ajustes, legenda e foto; foto antiga de antes dos Ativos é copiada no Storage) e **excluir** (janela de confirmação; apaga miniatura e foto antiga, o Ativo fica). Eventos `post_duplicado {tem_foto}` e `post_excluido {exportado}`.
- **Bug achado:** a constraint `eventos_nome_check` não tinha `ativo_enviado`, `tratamento_aplicado` nem `ativo_excluido`: desde a Fase D esses eventos falhavam calados. Migration `eventos_ativos_e_posts` + pgTAP `eventos.test.sql` (todo nome do `PROPS` precisa caber). O E2E agora confere no banco que os eventos foram gravados.
- Verificado: lint, typecheck, 242 testes do motor, 74 de banco, build e o E2E J1→J4 contra o build (reabrir Exportado → corrigir → exportar de novo; duplicar; excluir; miniatura aparece; eventos no banco).

### 2026-10-17. M3 Fase D: Ativos e tratamento de imagem
- Pedido do usuário: texturas (ele fornece os arquivos), duotom, pixelar, envelhecer, remover fundo e recortar; imagens enviadas ficam numa aba de Ativos do usuário. Decisões: remover fundo fica para a fase de IA (logo, recorte do objeto também); recortar = crop agora; texturas no fundo, na letra e sobre a foto; receita não destrutiva + texturas globais (ADR 0004).
- Motor: `tratamento.ts` (corte, duotom, pixelar, envelhecer, textura; função pura, roda no Node e no browser); Cena ganhou `textura` (fundo/letra) e o Desenhista multiplica com `globalCompositeOperation`. `desenha` agora recebe um objeto de opções.
- Banco: migration `ativos` (tabela + RLS só do dono + `posts.ativo_id` com chave composta do mesmo Cliente, `on delete set null`). pgTAP: 12 testes novos (55 no total).
- App: `/ativos` (grade, envio múltiplo, tratar com prévia ao vivo e recorte arrastável), editor com "Dos Ativos"/"Tratar imagem"/Textura. Eventos novos: `ativo_enviado`, `tratamento_aplicado`, `ativo_excluido`; `ajuste_aplicado.tipo` ganhou `textura`.
- Texturas da skill `texturas-igor` são da Texturelabs: a licença proíbe redistribuir, então ficaram de fora. Duas texturas provisórias (Papel, Grão) geradas por `apps/web/scripts/texturas_provisorias.py`.
- Verificado: 241 testes do motor (sem o de desempenho), 55 de RLS, lint, typecheck, build e o E2E completo contra o build (Ativos: enviar → duotom → recorte quadrado → salvar → usar num Post → textura na letra → PNG).
- Achado: o jsonb do Postgres reordena as chaves; comparar receita por `JSON.stringify` cru dava "mudou" sempre (corrigido com chaves ordenadas).

### 2026-10-17. M3 Fase C: todos os Estilos mapeados + arrastar o texto
- Pedido do usuário: todos os Estilos da skill `tipografia-igor` e do publi, e controle simples por arrastar. Decisões (pergunta desta sessão): arrastar = texto com encaixe; Duas tintas = Blue Note faixa + janela; `_numero` corrigido na cópia daqui.
- Inventário: skill tem 5 estáticos (E1 Acento, E3 Zona, E6 Síncope, E9 Fina, E10 Riscada; regras 5 e 14 não têm estático). publi tem 13. Faltavam Riscada, Número, Herói, Vazio, Foto que fala, Depoimento, Duas tintas: todos portados.
- Oráculo:
  - `_numero` corrigido na cópia do publi (número que encosta em data/hora é pulado) e no TS
  - `publi/bluenote_src.py` (cópia do publi-lab) carregado pelo `gerar.py` para o tipo `duotom`
  - `gerar.py` passava `_campos` sem a foto (Herói com foto saía com campo `objeto`)
  - casos novos: `numero`, `heroi`, `vazio`, `selo`, `citacao`, `duotom` (51) e 7 da Riscada em `tipografia.json`
- Motor:
  - 7 Estilos novos; itens de Cena `radial` (luz do Herói) e `sombra`; texto com `traco` e `risco`
  - filtro P&B com `colorize` do Pillow (Duas tintas)
  - `MetaFoto.bordas`: grade de detalhe (FIND_EDGES do Pillow) calculada no upload; o Depoimento escolhe cima/baixo por ela, sem ler pixel
  - Riscada: `feTurbulence` da especificação em TS (`turbulencia.ts`), deslocamento e furos feitos à mão no Desenhista; achado: o Chrome encaixa a origem do filtro no pixel e amostra em (x+1, y+1). Ruído em campo guardado por semente
  - `desenha` ganhou a fábrica de tela (`FabricaTela`): o app usa `OffscreenCanvas`
- Regressão: 73 casos do publi e 32 da skill passam (< 1%; Riscada 0,02–0,09%). 231 testes do motor passam; RLS 43.
- App: 13 Estilos no editor; sugestão vem direto do `escolhe`; dicas novas; **arrastar o texto na prévia** (as 3 posições aparecem ao arrastar e ele encaixa ao soltar). E2E cobre arrastar, Riscada no browser e os 13 Estilos com foto.
- **Desempenho medido com a máquina livre (2026-10-17, load 0,9): reprova.** p95 geral 59,8 ms (meta 50, Node). Por Estilo (p50/p95 ms): Riscada 39/58, Manchete 3,9/72 (picos, caso ou GC a investigar), Foto e legenda 4,9/13, Letra fina 5,2/13, Acento 1,4/7,6, Zona calma 1,6/2,7, Síncope 2,1/4,9. Culpado principal: `riscado()` em `desenhista.ts`. Próxima sessão otimiza; não mexer no limite.

### 2026-10-17. M3 Fase B: Estilos da skill tipografia-igor
- Decisões do usuário:
  - a skill substitui o publi no Acento e na Letra fina
  - entram Acento, Zona calma, Síncope e Fina; Riscada e misturas ficam para depois
  - a palavra marcada pelo Cliente manda mesmo quebrando a regra
  - a paleta do Cliente manda (a regra é aplicada sobre a marca)
  - texto longo encolhe até caber
- Oráculo novo: `packages/oraculo/tipografia` (Remotion 4.0.530, estáticos da skill copiados sem mudança, fontes = os .ttf do Motor). 25 casos em `casos/tipografia.json`, gerados no Chrome do sistema.
- Motor:
  - novos itens de Cena: `forma` (raios, onda, pílula) e texto com `kern`/`clip`
  - filtros CSS feitos à mão
  - layout "como o CSS": `estilos/css.ts`
  - paletas da skill: `paletas.ts`
  - `VARIACOES`, `PALETAS_ESTILO`, `variacaoPadrao`
- Regressão: os 25 casos passam com < 1%. Isso inclui os exemplos aprovados da skill (E1 ×3, E3 ×3, E6 ×2, E9 ×2).
- Achados no porte:
  - o estático E9 mede a linha em minúsculas e desenha em maiúsculas (o vídeo da regra mede em maiúsculas); o oráculo passa maiúsculas
  - a pílula do E3 é `border-box`
  - na Zona calma, CTA e @ foram para dentro da pílula (sobre os raios ficavam ilegíveis)
- Testes: 165 funcionais passam. O de desempenho (p95 < 50 ms, Node) falhou nesta máquina com um jogo usando ~285% de CPU e swap: os Estilos novos medem p95 17 ms, e os antigos sem mudança, 32 ms nessa carga. Conferir no CI.
- App:
  - 6 Estilos
  - grade de Variação
  - cores por Estilo (paletas da skill + a da marca)
  - `variacao_trocada`
  - `posts.variacao` salvo
  - E2E cobre a Trava na Síncope e a troca de Variação

### 2026-10-17. Correção do usuário: contato e hashtags fora do Perfil
- Contato e hashtags tinham sido inventados no Perfil de Marca e nos Posts (estavam nos docs desde o planejamento, sem base do usuário). Hashtags são de cada Post (legenda); contato é para a Plataforma falar com o Cliente e nunca vai para Post. Removidos do Motor (Elemento `contato`), do banco (migration `perfil_sem_contato`), do app e dos docs (CONTEXT, escopo, PRD, MVP, plano).

### 2026-10-16. M3 Fase A: Perfil de Marca, Ajustes, Travas, Manchete
- Motor: `ajustes.ts` (lista fechada + `SUPORTE` por Estilo). Sem Ajuste, a Cena é idêntica à do publi, e a regressão continua passando. Elementos opcionais ficam sempre no mesmo lugar: logo em cima à esquerda, selo em cima à direita, CTA acima da base. Novo item de Cena `imagem` (logo) e a Trava `contraste`.
- Estilo **Manchete** portado: 13 casos novos na regressão passaram de primeira.
- Testes: 150 no motor (+22 de Ajustes); RLS 43 (+10: `perfis_marca` só pelo dono, Parceiro não lê, cor só `#rrggbb`).
- Banco: migration `marca` (`perfis_marca` + bucket aceita PNG para o logo).
- App:
  - `/marca`, com prévia
  - editor em 3 colunas: texto/foto/Estilo | prévia + Travas | Ajustes + legenda
  - E2E cobre Perfil → Trava → correção → Ajustes → recarregar
- Corrigido: as fixtures do pgTAP usavam `@teste.dev` e colidiam com os usuários de `pnpm teste:usuarios` (o `db:test` quebrava depois de criar os usuários de teste). Agora usam `@pgtap.dev`.
- E2E aceita `BASE=` (3001 liberada nos redirects do Auth local) para rodar com o `dev:local` do usuário ocupando a 3000.

### 2026-10-16. Passo a passo de teste local
- Usuário travou em "Verifique seu email" (o email estava no Mailpit; o fluxo funcionava). `README.md` ganhou "Rodar e testar localmente", com problemas comuns. A tela Entrar mostra "Abrir o Mailpit", só no `nuxt dev`.

### 2026-10-16. Usuários de teste locais
- `pnpm teste:usuarios` (recusa rodar fora do Supabase local; idempotente) e `pnpm dev:local` (`apps/web/scripts/local.mjs` injeta as chaves de `supabase status`). Verificado: os links entram como Parceiro A, Cliente e Parceiro B no build de produção; Parceiro B só vê o próprio Cliente.
- Parceiro do E2E renomeado para "Escritório E2E" (não confundir com o de teste manual).

### 2026-10-16. Build verificado + M3 (foto, Letra fina, Foto e legenda)
- A sessão abriu com o checkout local na `main` velha (build quebrado: `opentype.js` sem default). O fix já estava na branch; trabalho seguiu nela. Build verificado de 3 jeitos: `node .output`, preset `vercel` e clone limpo com pnpm 10 (que troca sozinho para o pnpm 11.8 do `packageManager`).
- CI ganhou o passo de **build de produção** (preset vercel): antes só lint/typecheck/testes, por isso o build quebrado passou. `.vercel/` no `.gitignore`.
- Regra registrada no `CLAUDE.md`: só é "pronto" com build de produção + E2E passando local.
- Motor: `foto.ts` (MetaFoto, `recorteCover` = `ImageOps.fit`, filtro cinza feito à mão), itens `foto` e `degrade` na Cena, Estilos `fina` e `ogilvy`. Regressão: 19 casos novos com fotos sintéticas, diff ≤ 0,9%, luminância atrás do texto ±1 do publi. p95 com foto 18,7 ms (Node).
- Banco: migration `foto` (colunas `foto_path`, `foto_meta`; bucket privado `fotos` por pasta do Cliente) + 9 testes pgTAP (Parceiro e outro Cliente não leem nem escrevem; Cliente desativado perde acesso).
- App: editor com foto, Estilos com sugestão, arrastar para enquadrar, zoom. Eventos `estilo_trocado` e `foto_enviada`. E2E cobre Post com foto (upload → Storage → recarregar → exportar), rodado contra o build de produção.
- Não verificado: HEIC (sem arquivo de teste; caminho = `createImageBitmap`, e `heic2any` carregado sob demanda se falhar), Safari/Edge reais.

### 2026-10-16. Build de produção corrigido + main
- `nuxt build` falhava: `"default" is not exported by opentype.js` (o dist ESM do 1.3.5 não tem default; o dev aceitava). Import nomeado + versão fixada. Build ok (52 s) e E2E passou contra o build rodando com `node .output/server/index.mjs`.
- `main` criada no 1º commit e enviada; a branch de trabalho foi enviada com o fix.

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
