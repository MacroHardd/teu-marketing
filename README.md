# Teu Marketing

Plataforma B2B2C de marketing faça-você-mesmo. Fase 1: post estático de Instagram, sem IA.

## Rodar e testar localmente (Parceiro e Cliente)

Tudo roda na sua máquina: o banco, o login e os emails. Nenhum email sai de verdade, porque todos caem no **Mailpit**, uma caixa de entrada local em http://127.0.0.1:54324.

### Uma vez só (preparar a máquina)

Precisa de Node 24, Docker rodando e Google Chrome.

```bash
corepack enable          # libera o pnpm na versão do projeto
pnpm install
```

### Toda vez que for testar

1. **Suba o Supabase local** (banco + login + Mailpit). Na primeira vez ele baixa as imagens e demora alguns minutos.
   ```bash
   pnpm exec supabase start
   ```
2. **Crie os usuários de teste.** Pode rodar quantas vezes quiser: não duplica nada.
   ```bash
   pnpm teste:usuarios
   ```
   Ele imprime um **link de entrada** para cada usuário:

   | Papel | Email | O que já tem |
   |---|---|---|
   | Parceiro | `parceiro@teste.dev` | Escritório Teste: 3 Assentos, 2 Clientes ativos e 1 Convite pendente (`pendente@teste.dev`) |
   | Cliente | `cliente@teste.dev` e `cliente2@teste.dev` | Clientes do Escritório Teste |
   | Outro Parceiro | `parceiro-b@teste.dev` | Agência Outra, com `cliente-b@teste.dev`. Serve para conferir que um Parceiro não vê o outro |

3. **Suba o app apontando para o Supabase local:**
   ```bash
   pnpm dev:local           # http://localhost:3000
   ```
   Use `pnpm dev:local` e **não** `pnpm dev`. O `pnpm dev` lê o `apps/web/.env`, que pode estar apontando para o Supabase hospedado, onde os usuários de teste não existem.

4. **Entre.** Use sempre `http://localhost:3000` (não `127.0.0.1:3000`: o login fica guardado por endereço). Há dois jeitos:
   - **Pelo link do passo 2 (mais rápido):** cole o link no navegador e você entra direto. Para ficar logado como Parceiro e como Cliente ao mesmo tempo, abra cada link numa **janela anônima** diferente (ou num navegador diferente).
   - **Pela tela Entrar (como o usuário de verdade):** digite o email e clique em "Enviar link de entrada". Vai aparecer **"Verifique seu email"**. A tela fica nesse ponto mesmo, esperando o clique no email. Abra o **Mailpit** (http://127.0.0.1:54324, ou pelo botão "Abrir o Mailpit" na própria tela), abra a mensagem "Your sign-in link" (o email local sai em inglês) e clique em "Sign in" **no mesmo navegador** em que você pediu o link.

### O que testar em cada papel

- **Parceiro** (`parceiro@teste.dev`): o painel mostra "2 de 3 acessos em uso", os 2 Clientes e o Convite pendente. Convide um email novo: o Convite chega no Mailpit, e o link dele entra como Cliente com 1 clique. Teste também o reenvio.
- **Cliente** (`cliente@teste.dev`):
  1. Novo Post → escreva uma frase → Enviar foto. Letra fina aparece como sugerida.
  2. Troque para Foto e legenda, arraste a foto na prévia e mexa no zoom.
  3. Baixar imagem.
  4. Recarregue a página e confira que o Post continua igual.
- **Isolamento** (`parceiro-b@teste.dev`): só vê `cliente-b@teste.dev`. Nada do Escritório Teste aparece.

### Deu problema?

| Sintoma | O que fazer |
|---|---|
| Fico parado em "Verifique seu email" | É normal: o email está no Mailpit (http://127.0.0.1:54324). Abra a mensagem e clique no link no mesmo navegador. |
| "Este link não vale mais" | O link já foi usado ou passou de ~1 h. Gere outro: `pnpm teste:usuarios parceiro@teste.dev` (ou o email que quiser). |
| "Peça acesso ao seu parceiro" | Você não rodou o passo 2, ou rodou `pnpm dev` em vez de `pnpm dev:local` (o app está olhando o Supabase hospedado). |
| Entrou como outro usuário | A janela já tinha uma sessão. Use uma janela anônima por usuário, ou "Sair" no menu. |
| Porta 3000 ocupada | Já tem um app rodando. Pare o outro (Ctrl+C no terminal dele) antes do `pnpm dev:local`. |
| `Supabase local não está rodando` | Rode `pnpm exec supabase start` (com o Docker aberto). |
| Quero zerar tudo | `pnpm exec supabase db reset` apaga os dados locais. Depois rode `pnpm teste:usuarios` de novo. |

Para parar tudo: Ctrl+C no `dev:local` e `pnpm exec supabase stop`.

## Documentação

| Doc | Conteúdo |
|---|---|
| [CONTEXT.md](CONTEXT.md) | glossário do domínio. É a fonte da verdade dos termos |
| [docs/mvp.md](docs/mvp.md) | **o que precisa funcionar para vender + critérios de aceite** |
| [docs/escopo.md](docs/escopo.md) | visão, princípios, fases, o que entra e o que fica fora |
| [docs/prd-fase1-post-estatico.md](docs/prd-fase1-post-estatico.md) | histórias de usuário e requisitos da Fase 1 |
| [docs/plano.md](docs/plano.md) | marcos de construção |
| [docs/infra.md](docs/infra.md) | infraestrutura, limites do plano grátis, ambientes, custo |
| [docs/templates.md](docs/templates.md) | o que reaproveitar dos templates Nuxt UI |
| [docs/medicao/tecnico.md](docs/medicao/tecnico.md) | eventos, métricas (SQL), saúde técnica |
| [docs/medicao/operacional.md](docs/medicao/operacional.md) | playbook do piloto, entrevistas, critérios passa/falha, insumos de marketing |
| [docs/adr/](docs/adr/) | decisões de arquitetura |
| [.agents/product-marketing.md](.agents/product-marketing.md) | posicionamento e mensagem |

## Referências externas

- `~/projetos/publi-lab/entregavel/publi.zip`: motor publi (nosso). É o oráculo da porta do motor para TS (ADR 0001).
- `~/Documents/brandsdecoded/prompts/`: produto de **terceiro**. Serve só como referência de estrutura: **não copiar conteúdo**.
