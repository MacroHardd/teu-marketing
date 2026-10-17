---
status: accepted
---

# Cliente direto entra como Cliente do "Parceiro da casa", com Assinatura no Asaas

Uma pessoa pode assinar a Plataforma sozinha, sem vir de um Parceiro (decisão do usuário, 2026-10-17). Ela vira um **Cliente direto**: um Cliente comum de um Parceiro especial que é a própria Plataforma (`parceiros.direto = true`, sem usuário, então ninguém abre o painel dele). Todos os Clientes têm acesso às mesmas coisas.

Assim nada do fluxo do Parceiro muda: `clientes.parceiro_id` e `eventos.parceiro_id` continuam obrigatórios, e a RLS, o bucket por pasta, os Ativos e os Posts ficam como estão. A **Assinatura** só liga e desliga `clientes.ativo`, que a RLS já respeita. Quando ela termina, o histórico fica guardado, como acontece quando o Parceiro desativa um Cliente.

Pagamento: assinatura mensal ou anual no **Asaas**, sem trial. O servidor cria o cliente e a assinatura pela API, com `externalReference` = o id da nossa Assinatura, e manda a pessoa para a fatura hospedada do Asaas. Nenhum dado de cartão passa por nós. O webhook (token no header `asaas-access-token`, idempotente pelo id do evento) ativa, renova e encerra. O acesso vale até `pago_ate` + 3 dias, e um cron diário desliga quem passou disso. Nunca há signup no Auth: o usuário é criado no servidor, como no Convite (ADR 0002).

Migração (decisão do usuário): um Cliente direto que aceita Convite de um Parceiro passa para o Parceiro, mantendo Posts e Ativos, e a Assinatura é cancelada. Um ex-Cliente de Parceiro (desativado) que assina passa para o Parceiro da casa com o histórico. Quem é Cliente ativo de um Parceiro não pode assinar.

## Opções consideradas

- **`clientes.parceiro_id` opcional + tipo de Cliente.** Mexe em toda política RLS, em `eventos`, no aceite do Convite e nas métricas. Risco alto, sem ganho.
- **Checkout do Asaas (`/v3/checkouts`).** Menos código, mas o webhook do Checkout não traz o id da assinatura nem do pagamento: ligar o pagamento à pessoa ficaria frágil.
- **Plataformas de infoproduto (Hotmart, Kiwify).** Mais rápido de vender, mas a taxa é ~10% e o controle da recorrência fica fora do app.

## Consequências

- O CPF é pedido no formulário de assinatura: o Asaas exige CPF para cobrar. Ele vai direto para o Asaas e não fica no nosso banco.
- Uso comercial direto obriga a sair do Vercel Hobby (os termos proíbem uso comercial).
- Cada login de Cliente direto gasta um email do Resend (100/dia no plano grátis, a mesma cota dos Convites).
- O webhook só é testável de verdade com URL pública (staging). No local existe um modo simulado (`NUXT_ASAAS_SIMULADO=1`) que passa pelo mesmo código de ativação.
- As métricas separam Parceiros reais do Parceiro da casa por `parceiros.direto`.
