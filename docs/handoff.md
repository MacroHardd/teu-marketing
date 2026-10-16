# Handoff: Teu Marketing (2026-10-16, fim da sessão do M2 local)

## Onde estamos
M1 aprovado e **M2 pronto local**: Admin (script) → Parceiro entra por link mágico → convida → Cliente entra pelo Convite com 1 clique → escreve → Acento → baixa PNG. Tudo na branch `m0-m1-motor-acento`. Falta staging (contas do usuário). Status em `docs/estado.md`.

**Leia nesta ordem:** `CLAUDE.md` (comandos + pegadinhas de auth) → `docs/estado.md` → `docs/mvp.md` → `CONTEXT.md` → `docs/plano.md`.

## Próxima tarefa
1. **M3** (`docs/plano.md`): upload de foto (padrão do template chat), Ajustes da lista fechada, Variações, Travas ao vivo. Exige portar mais Estilos/Variações do publi (Letra fina e Foto e legenda usam foto). Antes de Número/Herói: corrigir `_numero` no publi.
2. **Staging**, quando o usuário criar Supabase (sa-east-1), Vercel e Resend: seguir `docs/infra.md` → "Configuração de produção" e `apps/web/.env.example`. Ele mesmo preenche as chaves; nunca pedir chave no chat.
3. Rodar o CI pela 1ª vez quando houver remoto (o passo de RLS sobe Supabase em Docker no Actions; ainda não testado lá).

## Contexto que não está nos docs
- **Git:** o usuário configura remoto e contas. Commitar só em branch (nunca main); PR ele aprova.
- **Como o usuário trabalha:** rápido, respostas curtas (caveman, PT-BR), interface limpa (nunca Canva).
- **Ambiente:** Python sem `ensurepip` → `uv` para o venv do oráculo. Extensão Chrome não conecta; E2E usa `playwright-core` + `/usr/bin/google-chrome`. `pkill -f "nuxt dev"` mata o próprio shell: parar o dev pelo PID da porta (`ss -ltnp | grep :3000`).
- **Dev:** `apps/web/.env` local já existe (chaves públicas de demo do Supabase local). Supabase local guarda os dados entre `stop/start`; `pnpm exec supabase db reset` zera.
- **Editor M2** só tem texto + Acento; "Trava bloqueante" hoje = texto cortado (desabilita "Baixar imagem"). Legenda, Perfil de Marca e foto ficam para M3/M5.
- **Fontes do publi:** usar como estão; não levantar licença. **IA:** fora do MVP.
