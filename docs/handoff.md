# Handoff: Cliente direto / Assinatura (2026-10-17)

Este handoff cobre **só** a Assinatura do Cliente direto. O usuário deu por bom o suficiente: se o staging mostrar problema, voltamos para ajustar. Na próxima sessão ele vai tratar de **outro assunto**, então não puxe este tema sem que ele peça.

## Estado
- Branch **`m-b2c-assinatura`** (no GitHub), no topo da pilha `m0-m1-motor-acento` → `m3-foto` → `m3-ajustes` → `m3-estilos` → `m5-meus-posts` → `m-b2c-assinatura`. Os PRs são do usuário, nessa ordem. Nenhum foi mergeado.
- O que foi feito: a pessoa assina sozinha (mensal ou anual, Asaas, sem trial) e vira Cliente do **Parceiro da casa** (`parceiros.direto`). O fluxo do Parceiro não mudou. Cliente direto convidado por um Parceiro migra para ele. Detalhes em `docs/adr/0005-cliente-direto-pelo-parceiro-da-casa.md`.
- Verificado: lint, typecheck, test, db:test (109), `pnpm build`, `NITRO_PRESET=vercel pnpm build` e E2E J1→J4 + J6 contra o build. **Tudo com pagamento simulado.**
- **Ainda não rodou contra o Asaas real.** O usuário vai testar no staging. O webhook já foi criado no sandbox (v3, envio sequencial, todos os eventos de cobrança e assinatura).

## Se o usuário voltar com problema do staging
Onde olhar:
- `apps/web/server/utils/asaas.ts`: criação de cliente, assinatura e 1ª fatura (`invoiceUrl`), e o cancelamento.
- `apps/web/server/utils/assinatura.ts` (`processaWebhook`): eventos tratados:
  - `PAYMENT_CONFIRMED` e `PAYMENT_RECEIVED`: ativa ou renova
  - `PAYMENT_OVERDUE`: atrasada
  - `PAYMENT_REFUNDED` e `PAYMENT_CHARGEBACK_REQUESTED`: encerra
  - `SUBSCRIPTION_DELETED` e `SUBSCRIPTION_INACTIVATED`: cancelada

  O resto recebe 200 "ignorado". O id da assinatura sai de `payment.subscription` ou de `subscription.id`. **O payload foi deduzido da doc**: compare com o payload real que o usuário mandar.
- `apps/web/server/api/asaas/webhook.post.ts`: o token vem no header `asaas-access-token` e precisa bater com `NUXT_ASAAS_WEBHOOK_TOKEN`.
- No banco: `supabase/migrations/20261017180000_assinatura.sql` (`pagamento_confirmado`, `encerrar_assinatura`, `encerrar_assinaturas_vencidas`, `aceitar_convite`).

O que o staging precisa:
- `supabase db push`
- as variáveis `NUXT_ASAAS_API_KEY`, `NUXT_ASAAS_WEBHOOK_TOKEN`, `NUXT_ASAAS_URL` (sandbox), `NUXT_PUBLIC_PRECO_MENSAL/ANUAL` (sem elas a cobrança não é criada) e `CRON_SECRET`
- **não** definir `NUXT_ASAAS_SIMULADO`
- webhook apontando para uma URL fixa `<staging>/api/asaas/webhook`
- Redirect URL do Supabase com `<staging>/**`

Pegadinha: o `scripts/local.mjs` apaga a chave do Asaas e liga o simulado, então o `dev:local` nunca chama o sandbox. Para testar o sandbox localmente, use `pnpm dev` com o `.env`, mais um túnel para o webhook.

## Pendências do usuário (não bloqueiam a próxima sessão)
- Preços mensal e anual.
- Confirmar os valores assumidos: carência de 3 dias depois de `pago_ate`; reembolso desliga o acesso na hora; migração cancela sem reembolso proporcional; CPF no formulário.
- Antes de vender direto: Vercel Pro (o Hobby proíbe uso comercial), CNPJ/NF e textos legais (CDC, 7 dias de arrependimento).
- Ficou para depois: página pública de venda, embelezamento, trocar cartão ou plano pelo app.

## Contexto para qualquer sessão
- Leia primeiro `CLAUDE.md` → `docs/estado.md`.
- **Não mate o `dev:local` na 3000.** Para testar o build, use a 3001: `PORT=3001 node apps/web/scripts/local.mjs node apps/web/.output/server/index.mjs`, e o E2E com `BASE=http://localhost:3001`.
- Migration local: `pnpm exec supabase migration up < /dev/null` (nunca `db reset`).
- O cron diário existe (`/api/cron/diario`, configurado em `nuxt.config.ts` → `nitro.vercel.config.crons`, não no `vercel.json`). A expiração de Convites (M6a) entra nele quando chegar a vez.
- Como o usuário trabalha: caveman e PT-BR; commit só em branch, nunca na main; os PRs são dele; pronto = build + E2E; não inventar produto.
