# Medição: operacional e marketing

*Atualizado em 2026-10-16. Lado técnico: [`tecnico.md`](tecnico.md).*

Os números dizem **o quê**. As conversas dizem **por quê**. Este documento organiza o piloto para produzir os dois, além dos insumos de venda.

## Objetivo do piloto

Responder com evidência a quatro perguntas:

1. O **Cliente** consegue fazer um Post bom sozinho, em 5 a 10 min?
2. O **Cliente** volta (o hábito se forma)?
3. O **Parceiro** percebe valor a ponto de pagar ou renovar?
4. O que falta para valer a pena investir na Fase 2 (IA)?

## Formato

| Item | Definição |
|---|---|
| Parceiros | 2 a 3, com perfis diferentes (ex.: 1 mentor, 1 escritório contábil ou jurídico, 1 agência) |
| Clientes | 5 a 10 por Parceiro, com nichos variados |
| Duração | 6 semanas: 1 de entrada + 4 de uso + 1 de fechamento |
| Preço | gratuito ou simbólico, com contrato simples de piloto |
| Contrapartida | o Parceiro faz 2 entrevistas e autoriza o uso do caso (com aprovação dele) |

**Critérios para escolher os Parceiros:** têm clientes que já tentam postar sozinhos, aceitam dar feedback e têm pelo menos 1 pessoa que responde mensagem.

**Critérios para os Clientes:** postam ou querem postar no Instagram da empresa e não têm designer.

## Cronograma

| Semana | Ação | Responsável |
|---|---|---|
| 0 | Recrutar Parceiros, assinar o piloto, Admin cria Parceiros e Assentos | nós |
| 1 | Parceiro sobe os emails → Convites enviados. **Sessão observada** com 3 Clientes (assistimos o 1º Post, sem ajudar) | Parceiro / nós |
| 2 | 1º check-in com o Parceiro (15 min). Revisão das métricas de ativação | nós |
| 3 | Entrevista curta com 3 a 5 Clientes (20 min) | nós |
| 4 | 2º check-in com o Parceiro | nós |
| 5 | Leitura das métricas de retenção e de Uso de Ajustes/Estilos | nós |
| 6 | Entrevista de fechamento com cada Parceiro + decisão passa/falha | nós |

Ritmo interno: **revisão semanal de métricas** (30 min) com as queries de [`tecnico.md`](tecnico.md), registrando as decisões em `docs/medicao/diario-piloto.md`.

## Sessão observada (semana 1)

- O Cliente compartilha a tela, e nós ficamos só observando.
- Tarefa: "faça um post sobre algo que você queria postar esta semana".
- Anotar: onde travou, o que procurou e não achou, quais palavras usou para descrever o que queria, tempo total e se ficou satisfeito com o resultado.
- Pergunta final: "Você postaria isso? O que mudaria?"

## Roteiro: entrevista com o Cliente (20 min)

1. Como você fazia os posts antes? Quanto tempo levava?
2. Conta do último post que você fez aqui. O que foi fácil? O que irritou?
3. Teve alguma coisa que você quis mudar e não conseguiu? (sinal de Ajuste faltando ou de Ajuste demais)
4. Você postou o que exportou? Como foi a reação?
5. Se isso sumisse amanhã, o que você faria? (sinal de valor)
6. Com que palavras você explicaria isso para um amigo? (**anotar ao pé da letra**)

## Roteiro: entrevista com o Parceiro

**Check-in (15 min):** os Clientes estão usando? Alguém reclamou ou elogiou? Convidar e acompanhar está dando trabalho?

**Fechamento (40 min):**
1. Que valor isso agregou ao seu serviço? Algum cliente comentou?
2. O painel de Uso te ajudou? Você agiu com base nele (por exemplo, com o alerta de Cliente parado)?
3. Quanto você pagaria por Cliente por mês? Por um pacote de 10 / 30 / 100?
4. O que te faria oferecer para **todos** os seus clientes?
5. O que te faria cancelar?
6. Indicaria para outro mentor, escritório ou agência? Para quem?

## Critérios passa/falha para liberar a Fase 2

| Sinal | Passa | Falha |
|---|---|---|
| Ativação | ≥ 70% | < 50% |
| Tempo por Post | mediana ≤ 10 min | > 15 min |
| Retenção do mês 2 | ≥ 50% | < 30% |
| Acerto da sugestão de Estilo | ≥ 60% | < 40% |
| Parceiro | ≥ 2 de 3 dizem que pagariam, com valor indicado | nenhum pagaria |

- **Tudo passa** → Fase 2 (IA) + início da venda.
- **Passa só parcialmente** → corrigir o ponto que falhou (Estilos, Ajustes, onboarding) e rodar mais 4 semanas.
- **Falha em ativação ou retenção** → rever a proposta antes de investir em IA.

Os dados qualitativos desempatam. Exemplo: retenção baixa porque "eu não sei o que postar" é sinal **a favor** da Fase 2 (IA de Pauta).

## Insumos para marketing e venda

Coletar durante o piloto, com consentimento:

| Insumo | Uso | Fonte |
|---|---|---|
| Frases dos usuários, ao pé da letra | copy do site e do pitch para Parceiros (`.agents/product-marketing.md`, seção Customer Language) | entrevistas e sessão observada |
| Antes e depois (post antigo × post feito na Plataforma) | prova visual no site e no deck | Clientes que autorizarem |
| Números do piloto (tempo por Post, nº de Posts, % de Clientes ativos) | prova para o Parceiro: "seus clientes postam X vezes mais" | [`tecnico.md`](tecnico.md) |
| Depoimento do Parceiro | case comercial | entrevista de fechamento |
| Objeções ouvidas | seção Objections do product-marketing e FAQ | entrevistas com Parceiros |
| Preço que o Parceiro aceita pagar | modelo de pricing (pendente) | fechamento |

Tudo isso vai para `docs/medicao/insumos-marketing.md` à medida que for coletado. As frases ao pé da letra também alimentam `.agents/product-marketing.md`.
