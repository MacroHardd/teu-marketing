# Handoff: Teu Marketing (2026-10-16, fim da sessão do spike)

## Onde estamos
M1 (spike do motor) aprovado; M0 parcial. Trabalho na branch `m0-m1-motor-acento` (main vazia, sem remoto: o usuário configura). Status completo em `docs/estado.md`.

**Leia nesta ordem:** `CLAUDE.md` (agora com comandos e como a paridade com o publi funciona) → `docs/estado.md` → `docs/mvp.md` → `CONTEXT.md` → `docs/plano.md`.

## Próxima tarefa (terminar M0, depois M2)
1. Git: o usuário configura remoto e contas. Commitar só em branch (nunca main); PR ele aprova. Trabalho atual na branch `m0-m1-motor-acento`. Para staging, pedir só o que estiver em `docs/estado.md` (Bloqueios).
2. Supabase local: `pnpm dlx supabase init/start` (Docker funciona). Primeiras migrations com RLS, auth por link mágico.
3. Staging + "hello" autenticado.
4. M2: fatia vertical (Admin→Parceiro→Convite→Cliente→texto→Acento→PNG). Limpar páginas de demo do template (Inbox, Customers, textos em inglês) quando mexer no layout.

## Contexto que não está nos docs
- **Como o usuário trabalha:** quer rapidez, respostas curtas (caveman, PT-BR), interface limpa (nunca Canva).
- **Ambiente:** Python do sistema sem `ensurepip` → usar `uv` para o venv do oráculo. Extensão Chrome não estava conectada; testei `/spike` com Playwright + `/usr/bin/google-chrome` headless (script descartável, fora do repo).
- **Motor:** só `acento` está portado (`estilosPortados()`); outros Estilos lançam erro. Ao portar um Estilo novo: criar `packages/oraculo/casos/<tipo>.json`, rodar `gerar.py`, adicionar o conjunto no laço de `test/regressao.test.ts`.
- **Limite da regressão** 1% de pixels; densidade de texto é o que mais pesa (caso `longo` = 0,51%). Se um Estilo com texto pequeno estourar, olhar `test/__diff__/` antes de subir o limite.
- **Ainda não testado:** Safari/Edge reais (o Desenhista não usa `ctx.font` nem `ctx.filter`, então o risco é baixo).
- **Fontes do publi:** usar como estão; não levantar licença. **IA:** fora do MVP.
