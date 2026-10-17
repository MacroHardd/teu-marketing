# Infraestrutura

*Atualizado em 2026-10-16.*

## Decisão vigente

Usar **Vercel Hobby + Supabase Free + Resend Free** até o primeiro cliente pagante. Nesse momento migramos para Vercel Pro e Supabase Pro.

**Não há servidor ligado o tempo todo nem Python em produção.** O publi (Python) roda só no CI, como oráculo (ADR 0001).

## Diagrama

```
 Browser (Cliente / Parceiro / Admin)
   ├─ Nuxt app (UI, Nuxt UI v4)
   ├─ packages/motor: Motor + Desenhista Canvas → preview, Travas, Exportação PNG
   ├─ análise da foto (MediaPipe) + HEIC→JPEG (wasm, carregado sob demanda)
   └─ parse da planilha de Convites (CSV/XLSX)
        │ HTTPS
        ▼
 Vercel (Nuxt/Nitro, functions na região gru1)
   ├─ SSR + rotas /api: Convites, Admin, Uso
   ├─ Vercel Cron (1x por dia, `/api/cron/diario`): encerrar Assinaturas vencidas; depois expirar Convites, marcar Clientes parados
   ├─ /api/asaas/webhook: pagamentos da Assinatura (Asaas)
   └─ assets estáticos (fontes, recursos dos Estilos)
        │
        ▼
 Supabase (região sa-east-1)
   ├─ Auth: link mágico, SMTP próprio (Resend)
   ├─ Postgres + RLS: parceiros, clientes, convites, posts, fotos, eventos
   └─ Storage: bucket privado de fotos (URL assinada)

 Resend: emails de Convite e link mágico (domínio próprio, SPF/DKIM)
 GitHub Actions: lint, typecheck, testes do motor, regressão visual vs publi (Python + Pillow),
                 testes de RLS (Supabase CLI), pg_dump diário
 Sentry (grátis): erros do front e do servidor
```

## Repositório

Monorepo pnpm:

```
apps/web          Nuxt 4 (base: template dashboard, ver templates.md)
packages/motor    Motor + Desenhista (TS puro, sem dependência do Nuxt)
packages/oraculo  scripts que rodam o publi e geram as imagens de referência (só no CI e localmente)
supabase/         migrations, políticas RLS, seed, testes de RLS
docs/
```

**O repo precisa ficar numa conta pessoal do GitHub:** o Vercel Hobby não conecta repositório de organização.

## Limites do plano grátis que afetam a gente

| Serviço | Limite | Impacto / mitigação |
|---|---|---|
| Vercel Hobby | **uso comercial proibido** | risco aceito durante o dev e o piloto gratuito. Vira Pro no primeiro cliente pagante, **e antes de abrir a Assinatura do Cliente direto** (venda direta é uso comercial) |
| Vercel Hobby | cron no máximo 1x por dia, com variação de ±59 min | os nossos jobs são diários, então serve |
| Vercel Hobby | logs de runtime guardados por 1 h | Sentry para erros |
| Vercel Hobby | 1M de invocações, 4 h de CPU ativa e 100 GB de transferência por mês | sobra, porque o render roda no browser |
| Supabase Free | sem backup automático | `pg_dump` diário via Actions, salvo como artefato privado |
| Supabase Free | o projeto pausa depois de 7 dias sem uso | com piloto ativo não acontece. Em staging, reativa manualmente |
| Supabase Free | 500 MB de banco, 1 GB de storage, 5 GB de egress | foto redimensionada (~300 KB) → ~3 mil fotos. Acompanhar no piloto |
| Supabase Free | sem domínio próprio para o auth | o link mágico passa por `*.supabase.co`. É cosmético |
| Supabase Free | logs guardados por 1 dia | Sentry |
| Resend Free | **100 emails/dia**, 3 mil/mês | uma planilha grande estoura o dia. Fila com envio escalonado nos dias seguintes, ou assinar o Resend. Cada login de Cliente direto e cada "acesso liberado" também gastam dessa cota |

## Ambientes

| Ambiente | Front | Banco |
|---|---|---|
| local | `nuxt dev` | Supabase CLI (docker) |
| staging | preview da Vercel | 2º projeto Supabase Free |
| produção | Vercel (domínio próprio) | projeto Supabase Free (vira Pro no 1º cliente pagante) |

## Configuração de produção (painel, não código)

Variáveis do app: [`apps/web/.env.example`](../apps/web/.env.example), no formato exato da Vercel.

**Supabase** (espelho do `supabase/config.toml` local):
- Authentication → Sign In / Providers: **Allow new users to sign up = OFF** (ninguém se cadastra sozinho). Provedor **Email = ON** (desligar o provedor derruba o link mágico de todo mundo).
- Authentication → URL Configuration: Site URL = `NUXT_PUBLIC_SITE_URL`; Redirect URLs = `<NUXT_PUBLIC_SITE_URL>/**`.
- Authentication → SMTP: Resend (`smtp.resend.com`, porta 465, usuário `resend`, senha = API key). Sem isso o Supabase manda só ~2 emails/hora.
- Migrations: `pnpm exec supabase link --project-ref <ref>` + `pnpm exec supabase db push`.
- Primeiro Parceiro: `pnpm parceiro:criar --nome ... --email ... --assentos N` com as variáveis de produção no ambiente.

**Vercel:** Root Directory `apps/web`, região de functions `gru1`, variáveis do `.env.example` em Production. O cron sai do `nuxt.config.ts` (`nitro.vercel.config.crons`) e precisa da variável `CRON_SECRET`.

**Asaas** (Assinatura do Cliente direto, ADR 0005):
- Conta de sandbox para testar (https://sandbox.asaas.com) e depois a de produção. API key → `NUXT_ASAAS_API_KEY`; URL da API → `NUXT_ASAAS_URL`.
- Integrações → Webhooks: URL `<site>/api/asaas/webhook`, token de autenticação = `NUXT_ASAAS_WEBHOOK_TOKEN`, eventos de cobrança e de assinatura ligados, fila sem penalização.
- Preços: `NUXT_PUBLIC_PRECO_MENSAL` e `NUXT_PUBLIC_PRECO_ANUAL` (em reais).
- `NUXT_ASAAS_SIMULADO` nunca em produção (só vale sem chave, mas não deixe ligado).

## Custo

| Momento | US$/mês |
|---|---|
| Dev e piloto | 0 |
| 1º cliente pagante | ~45 (Vercel Pro 20 + Supabase Pro 25) + Resend se precisar + domínio |
| Assinatura (Cliente direto) | taxa do Asaas por cobrança (Pix, boleto ou cartão; ver tabela do Asaas) |

## Pontos de atenção

- **Fontes:** usar as TTF do publi como estão (decisão de 2026-10-16). Revisar a licença quando houver tração.
- **Domínio:** Teu Marketing. O domínio e o DNS (Vercel + Resend SPF/DKIM) são configurados depois.
- **Portabilidade:** manter as rotas de servidor pequenas e sem APIs específicas da Vercel. O Nitro permite trocar de provedor (Cloudflare, Netlify) se for preciso.
- **Render no servidor** (miniaturas, publicação futura): `@napi-rs/canvas` numa Vercel Function. Não é necessário na Fase 1.
