# Entregáveis da sessão de 2026-10-16

*Branch `m0-m1-motor-acento` (3 commits). Marcos: M1 aprovado, M2 pronto local, M0 sem staging.*

## O que foi entregue

| # | Entregável | Onde | Como comprovar |
|---|---|---|---|
| 1 | Monorepo pnpm (web + motor + oráculo + supabase) | raiz | `pnpm install` |
| 2 | Motor TS do Estilo **Acento** (Motor → Cena → Desenhista) | `packages/motor` | `pnpm test` (89 testes) |
| 3 | Oráculo: publi gera as imagens de referência | `packages/oraculo` | `packages/oraculo/.venv/bin/python packages/oraculo/gerar.py` |
| 4 | Regressão visual TS × publi (18 casos, < 1% de diferença) | `packages/motor/test/regressao.test.ts` | `pnpm test` |
| 5 | Regra "o motor nunca altera o texto do Cliente" com teste | `packages/motor/test/campos.test.ts` | `pnpm test` |
| 6 | Preview ao vivo p95 1,3 ms no Chrome (meta: 50 ms) | editor | abrir o editor e digitar |
| 7 | Banco com RLS em todas as tabelas + 24 testes de isolamento | `supabase/` | `pnpm db:test` |
| 8 | Entrada só por link mágico, sem cadastro aberto | `/entrar` | roteiro abaixo |
| 9 | Convite com 1 clique (prazo de 7 dias, Assento, outro Parceiro) | `/convite/<token>` | roteiro abaixo |
| 10 | Painel do Parceiro: Assentos, convidar com prévia, Convites, reenviar, Clientes | `/clientes` | roteiro abaixo |
| 11 | Meus Posts + editor (texto, Acento, salvamento automático, baixar PNG) | `/posts` | roteiro abaixo |
| 12 | Telemetria sem conteúdo do Cliente (6 eventos) | tabela `eventos` | Studio local |
| 13 | Script do Admin para criar Parceiro (J1) | `pnpm parceiro:criar` | roteiro abaixo |
| 14 | Teste de ponta a ponta J1 → J3 num Chrome | `apps/web/e2e/jornada.mjs` | `pnpm --filter @teu/web e2e` |
| 15 | CI: lint, typecheck, oráculo, testes do motor, testes de RLS | `.github/workflows/ci.yml` | roda no 1º push (ainda não rodou) |
| 16 | `.env.example` no formato de produção + configuração dos painéis | `apps/web/.env.example`, `docs/infra.md` | leitura |

## O que dá para testar agora (tudo local)

Pré-requisitos: Docker rodando e Node 24.

```bash
pnpm install
pnpm exec supabase start      # 1ª vez baixa as imagens (alguns minutos)
pnpm dev                      # http://localhost:3000
```

`apps/web/.env` já existe com as chaves do Supabase local. Sem Resend configurado, **todos os emails caem no Mailpit**: <http://127.0.0.1:54324>. Qualquer email inventado serve.

### Roteiro manual (~10 min)

1. **Admin cria Parceiro:** `pnpm parceiro:criar --nome "Meu Escritório" --email eu@teste.dev --assentos 2`
2. **Sem convite não entra:** em <http://localhost:3000/entrar>, digite `alguem@teste.dev`. Deve aparecer "Peça acesso ao seu parceiro".
3. **Parceiro entra:** digite `eu@teste.dev`, abra o email no Mailpit e clique no link. Você cai em **Clientes**, com "0 de 2 acessos em uso".
4. **Prévia do Convite:** cole `ana@teste.dev, ana@teste.dev, nao-e-email`. A prévia mostra 1 válido, 1 repetido e 1 inválido. Envie.
5. **Cliente entra com 1 clique:** abra uma **janela anônima** (outra sessão), abra o email de Convite da Ana no Mailpit e clique. Você cai em **Meus Posts**.
6. **Post:** clique em "Criar meu primeiro Post" e escreva. O preview muda ao vivo; use `*palavra*` para escolher o destaque. Aparece "Salvo". Clique em **Baixar imagem**: sai o PNG 1080×1350.
7. **Trava:** cole um texto bem longo. Aparece o aviso de texto cortado e o botão de baixar fica bloqueado.
8. **Voltar:** em Meus Posts, o Post aparece como "Exportado". Reabra, edite e baixe de novo.
9. **Uso:** na janela do Parceiro, recarregue. Deve mostrar "1 de 2 acessos em uso", a Ana como Cliente e o Convite "aceito".
10. **Sem Assento:** convide mais 2 emails e aceite os dois. O 2º vê "Sem vaga no momento".
11. **Banco:** no Studio, <http://127.0.0.1:54323>, tabela `eventos`: só aparecem metadados, nenhum texto.

### Testes automáticos

```bash
pnpm lint && pnpm typecheck && pnpm test   # motor, regressão visual, campos, preview = PNG, p95
pnpm db:test                               # RLS
pnpm --filter @teu/web e2e                 # jornada J1→J3 (precisa do supabase e do dev rodando)
```

## O que ainda NÃO dá para testar

- Staging/produção, emails de verdade (Resend), CI no GitHub: dependem das contas (abaixo).
- Foto, Ajustes, Variações, outros Estilos, legenda, Perfil de Marca: são do M3 e do M5.
- Expiração automática por cron, fila do limite de 100 emails/dia, desativar Cliente: são do M6.
- Safari e Edge reais (só Chrome foi testado).

## O que você precisa fazer

| Prioridade | Ação | Por quê |
|---|---|---|
| 1 | Revisar a branch `m0-m1-motor-acento`, criar o remoto e fazer push dela e de uma `main` base | Abrir o PR e rodar o CI pela 1ª vez (os testes de RLS no Actions nunca rodaram) |
| 2 | Criar o projeto **Supabase** (região São Paulo, sa-east-1) e configurar o painel como em `docs/infra.md` → "Configuração de produção" | Staging |
| 3 | Criar o projeto **Vercel Hobby** (Root Directory `apps/web`, região `gru1`) e cadastrar as variáveis do `apps/web/.env.example` | Staging |
| 4 | Conta **Resend** + domínio verificado (SPF/DKIM). Usar a mesma chave no SMTP do Supabase | Emails de verdade |
| 5 | Confirmar o domínio do app (está `app.teumarketing.com.br` como exemplo) | Links do Convite e do login |
| 6 | Confirmar os valores assumidos: Convite de 7 dias, Cliente parado após 14 dias, foto até 2160 px, Trava bloqueante impede a Exportação, corte com 5 Estilos | Estão no código e nos docs sem o seu OK |

Não mande chaves pelo chat: preencha você mesmo no painel da Vercel e no `.env`.
