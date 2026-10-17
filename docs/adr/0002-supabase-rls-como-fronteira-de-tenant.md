---
status: accepted
---

# Supabase com RLS como fronteira entre Parceiros e Clientes; entrada só por link mágico

A stack é Nuxt 4 + Nuxt UI v4 sobre Supabase (Auth, Postgres, Storage). O isolamento entre Parceiros e entre Clientes é garantido por Row Level Security no Postgres, não pelo código do app. Assim, um Parceiro nunca lê dados de outro Parceiro, e nenhum Parceiro lê o conteúdo dos Posts dos próprios Clientes: ele só enxerga o Uso, por meio de views agregadas. As fotos ficam num bucket privado, acessadas por URL assinada. A entrada é só por link mágico, sem senha nem Google por enquanto. Ninguém se cadastra sozinho: o Cliente chega por Convite ou por Assinatura paga ([ADR 0005](0005-cliente-direto-pelo-parceiro-da-casa.md)), sempre com o usuário criado no servidor, e o Parceiro é criado pelo Admin.

## Opções consideradas

- **`nuxt-auth-utils` + drizzle/NuxtHub**, a stack do template `chat`. Exigiria fazer à mão o isolamento entre tenants e o storage privado.

## Consequências

- Toda tabela nova precisa ter uma política RLS. Um teste automatizado deve garantir que um Parceiro não lê Posts.
- A regra "o Parceiro vê só o Uso" é aplicada no banco, de modo que um bug no front não vaza conteúdo de Cliente.
