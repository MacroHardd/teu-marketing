# Handoff: Teu Marketing (2026-10-17, Cliente direto)

## Onde estamos
Branch **`m-b2c-assinatura`** (só local), empilhada sobre `m5-meus-posts` → `m3-estilos` → `m3-ajustes` → `m3-foto` → `m0-m1-motor-acento`. Nenhum PR mergeado.

- **Feito nesta sessão:** Cliente direto (ADR 0005). A pessoa assina sozinha (mensal ou anual, Asaas, sem trial) e vira Cliente do **Parceiro da casa** (`parceiros.direto`). O fluxo do Parceiro não muda: mesma RLS, mesmo `parceiro_id`, mesmo Convite. A única mudança no Convite é a migração: Cliente direto que aceita um Convite passa para o Parceiro.
- **Testado só com pagamento simulado** (`NUXT_ASAAS_SIMULADO=1`, posto pelo `scripts/local.mjs`). O caminho real do Asaas (`server/utils/asaas.ts`) foi escrito pela documentação da API v3 e **ainda não rodou contra o sandbox**.
- Antes desta sessão: M5 (Meus Posts) feito; M3 aguardando validação. Ver `docs/estado.md`.

Decisões do usuário nesta sessão (não presumir de novo):
- assinatura mensal ou anual; todo Cliente tem o mesmo acesso (de Parceiro ou direto)
- sem trial
- Asaas
- Cliente direto convidado por Parceiro **migra**
- páginas públicas de venda e embelezamento ficam para depois: `/assinar` é mínima, só para funcionar e testar
- termos "Cliente direto" e "Assinatura" (em `CONTEXT.md`)

Assumido sem confirmação (está em `docs/estado.md`):
- 3 dias de carência depois de `pago_ate`
- reembolso desliga na hora
- Pix/boleto/cartão na fatura
- migração cancela sem reembolso proporcional
- CPF no formulário

Verificado:
- lint, typecheck, 242 testes do motor, 109 de banco
- `pnpm build` e `NITRO_PRESET=vercel pnpm build`
- E2E J1→J4 + J6 contra o build na 3001

**Leia nesta ordem:** `CLAUDE.md` → `docs/estado.md` → `docs/adr/0005-*.md` → `docs/plano.md` → `docs/mvp.md`.

## Roteiro de teste para o usuário (J6: Cliente direto)
Preparar: `pnpm exec supabase migration up < /dev/null` (migration `assinatura`) → **reiniciar `pnpm dev:local`** (precisa das variáveis novas do `local.mjs`).

1. Janela anônima → `/entrar` → embaixo, "Assine o Teu Marketing".
2. Escolha **Anual**. Use um email novo (ex.: `direto@teste.dev`), qualquer nome e o CPF `529.982.247-25`. Clique em **Ir para o pagamento**. Cai na tela "Pagamento simulado" (no lugar da fatura do Asaas) → **Confirmar pagamento**.
3. No Mailpit (http://127.0.0.1:54324): "Seu acesso ao Teu Marketing está liberado" → **Entrar**. Você cai em Meus Posts e usa tudo igual a um Cliente de Parceiro.
4. Menu **Assinatura**: "Plano anual · Ativa" → **Cancelar Assinatura** → confirma → "Não renova mais. Seu acesso continua até …".
5. Bloqueio: em `/assinar`, tente com `cliente@teste.dev` → "Este email já tem acesso pelo seu parceiro".
6. **Migração:** assine com outro email novo, entre e crie um Post. Como `parceiro@teste.dev`, convide esse email. Abra o Convite: o Post continua lá, o menu Assinatura some e o painel do Parceiro conta um Assento a mais.

**Parceiro:** nada muda no painel, nos Convites ou no Uso (o Parceiro não vê Clientes diretos nem Assinaturas, pgTAP).

## Pendências do usuário
- **Preços** mensal e anual (hoje aparece "preço a definir": `NUXT_PUBLIC_PRECO_MENSAL/ANUAL`).
- **Conta de sandbox do Asaas** + API key, para validar o caminho real: fatura, webhook, renovação, atraso, reembolso e cancelamento. O webhook precisa de URL pública, ou seja, staging.
- Confirmar os valores assumidos acima (carência de 3 dias, reembolso na migração).
- **Vercel Pro antes de vender direto:** o Hobby proíbe uso comercial.
- CNPJ/NF e textos legais de venda ao consumidor (CDC: arrependimento em 7 dias). O termo do M7 precisa cobrir o Cliente direto.
- Seguem as pendências antigas:
  - Trava de rosto: fica no MVP ou vai para o backlog?
  - E0 da estilização
  - push e PRs (agora com `m-b2c-assinatura` no fim da fila)
  - publi-lab
  - staging
  - arquivos de textura
  - textos de termo/privacidade

## Próximo passo
1. **Abrir:** `git branch` (deve estar em `m-b2c-assinatura`) → `pnpm build`. Se quebrar, corrigir antes de tudo.
2. Retorno do usuário (preços, sandbox, valores assumidos). Com a chave do sandbox:
   - rodar `/assinar` sem `NUXT_ASAAS_SIMULADO`
   - expor o webhook (staging, ou túnel para teste)
   - conferir os payloads reais de `PAYMENT_CONFIRMED`, `PAYMENT_RECEIVED`, `PAYMENT_OVERDUE`, `PAYMENT_REFUNDED` e `SUBSCRIPTION_DELETED` contra `server/utils/assinatura.ts` (`processaWebhook`)
3. Seguir o plano: **M6a, Convites** (ver o handoff anterior: `git show m5-meus-posts:docs/handoff.md`). O cron diário já existe (`/api/cron/diario`): a expiração dos Convites entra nele.

Fora até o usuário pedir: página pública de venda, embelezamento, trocar cartão/plano pelo app, desempenho fino, misturas de regras, IA.

## Contexto que não está nos docs
- **O usuário deixa o `dev:local` rodando na 3000.** Não mate. Teste:
  - `pnpm build`
  - `PORT=3001 node apps/web/scripts/local.mjs node apps/web/.output/server/index.mjs` (em background)
  - `PORT=3001 BASE=http://localhost:3001 node apps/web/scripts/local.mjs pnpm --filter @teu/web e2e`
  - parar pelo PID da porta (`ss -ltnp | grep :3001`)
- O J6 do E2E **precisa** das chaves do Supabase no ambiente (usa o cliente admin para vencer a Assinatura) e do cron com `Bearer local`. O `local.mjs` já põe as duas coisas.
- Migration nova no local: `pnpm exec supabase migration up < /dev/null` (não `db reset`).
- Sem `psql`: `docker exec supabase_db_teu-marketing psql -U postgres -c '...'`.
- Asaas:
  - o webhook autentica pelo header `asaas-access-token`
  - devolve 200 para o que não é nosso, porque erros repetidos pausam a fila no Asaas
  - idempotência por `pagamento_eventos.id`
  - renovação não gera link mágico novo, porque invalidaria um link que a pessoa acabou de pedir
- O Checkout do Asaas (`/v3/checkouts`) foi descartado: o webhook dele não traz o id da assinatura.
- O `vercel.json` não serve com o preset do Nitro (o cron não ia para o `config.json`). O cron fica em `nuxt.config.ts` → `nitro.vercel.config.crons`.
- Nome interno × nome na tela: `selo` = Foto que fala, `duotom` = Duas tintas, `citacao` = Depoimento, `ogilvy` = Foto e legenda, `heroi` = Herói.
- **Não inventar produto:** campo ou comportamento que o usuário não disse vira pergunta.
- **Como o usuário trabalha:** rápido e curto (caveman, PT-BR); interface leiga, nunca virar Canva; pronto = build + E2E; roteiro de teste como Parceiro e Cliente; commit só em branch, sem push, o PR é dele.

## Skills sugeridas
- `supabase`: RLS/cron
- `tdd`: M6a
- `landing-page-machine` / `copywriting`: quando chegar a página pública de venda
