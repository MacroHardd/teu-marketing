# PRD: Fase 1, Post estático sem IA

*Atualizado em 2026-10-16. O corte para vender e o checklist de aceite estão em [`mvp.md`](mvp.md). Os termos seguem o glossário em [`CONTEXT.md`](../CONTEXT.md). Escopo em [`escopo.md`](escopo.md).*

## Problema

Pequenos negócios e profissionais liberais, que são clientes de escritórios, mentores e agências, precisam postar no Instagram com frequência e com aparência profissional. Hoje eles caem em três situações: não sabem design, se perdem em ferramentas complexas (Canva) ou dependem de alguém que faça por eles. O Parceiro, por sua vez, quer oferecer um extra aos próprios clientes sem ter que produzir o conteúdo.

## Solução

Uma web app em que o Cliente escreve o que quer dizer, escolhe entre Estilos prontos (feitos pelo nosso motor de design), faz poucos Ajustes e exporta um Post pronto em 5 a 10 minutos. O Parceiro convida os Clientes e acompanha o Uso.

## Personas

| Persona | Contexto | Precisa de |
|---|---|---|
| **Cliente** | leigo em design, pouco tempo, usa o desktop para trabalhar | um post bonito e rápido, sem aprender ferramenta |
| **Parceiro** | escritório, mentor ou agência com 10 a 100 clientes | um extra com valor percebido, zero trabalho operacional, prova de que os clientes usam |
| **Admin** | nós | cadastrar Parceiros e controlar os Assentos |

## Histórias de usuário

### Entrada e conta

1. Como **Admin**, quero cadastrar um Parceiro (nome, email do responsável, nº de Assentos) para que ele possa começar a convidar.
2. Como **Parceiro**, quero entrar com um link mágico enviado ao meu email para não precisar de senha.
3. Como **Parceiro**, quero colar uma lista de emails ou subir uma planilha CSV/XLSX, ver uma prévia (válidos, duplicados, inválidos) e confirmar o envio dos Convites.
4. Como **Parceiro**, quero ser avisado antes de enviar quando o número de Convites passar dos Assentos livres.
5. Como **Cliente**, quero receber o Convite por email e entrar com um clique (link mágico).
6. Como **Cliente**, quero pular o Perfil de Marca e já criar um Post, ou preencher só o que eu quiser.

### Perfil de Marca

7. Como **Cliente**, quero informar nome exibido, @, cor da marca, logo, foto, contato e hashtags, todos opcionais.
8. Como **Cliente**, quero que os dados preenchidos já apareçam ligados como Elementos opcionais nos meus Posts.
9. Como **Cliente** sem cor definida, quero que a Plataforma escolha uma cor por mim.

### Criar Post

10. Como **Cliente**, quero escrever o texto da arte do jeito que eu quero, com a garantia de que nenhuma palavra vai ser alterada.
11. Como **Cliente**, quero anotar uma Pauta (opcional) para organizar sobre o que vou falar.
12. Como **Cliente**, quero subir uma foto (JPEG, PNG ou HEIC, até 10 MB) arrastando ou clicando.
13. Como **Cliente**, quero ver primeiro o Estilo sugerido para o meu conteúdo e, ao lado, miniaturas dos outros Estilos compatíveis, já com o meu texto.
14. Como **Cliente**, quero trocar de Variação com um clique sem perder o que já fiz.
15. Como **Cliente**, quero que o preview atualize ao vivo, sem esperar.

### Ajustes (lista fechada)

16. Editar o texto da arte direto no preview ou num campo ao lado.
17. Mudar o tamanho do texto em 3 passos (P/M/G).
18. Arrastar o bloco de texto entre as zonas topo, centro e base, com encaixe.
19. Arrastar a foto para enquadrar e dar zoom dentro do quadro.
20. Escolher uma cor da paleta derivada da cor da marca.
21. Ligar e desligar Elementos opcionais: logo, @, assinatura, contato, selo e CTA.
22. Escrever o CTA. Ele nunca vem preenchido.
23. Ver avisos das Travas ao vivo ("texto cortado", "pouco contraste", "texto em cima do rosto"), com uma ação de correção sugerida, como trocar de Variação.

### Legenda e Exportação

24. Escrever a legenda do Post.
25. Ter as hashtags do Perfil de Marca adicionadas à legenda, podendo remover cada uma.
26. Exportar o Post como PNG 1080×1350, idêntico ao preview.
27. Copiar a legenda com um clique.
28. Ver o Post passar de Rascunho para Exportado e poder editar e exportar de novo.

### Meus Posts

29. Ver meus Posts em grade, do mais recente para o mais antigo, com miniatura e estado.
30. Duplicar um Post para fazer uma série.
31. Excluir um Post, com confirmação. A exclusão é definitiva.
32. Ter tudo salvo automaticamente.

### Painel do Parceiro

33. Ver os Assentos usados e o total.
34. Ver a lista de Convites com status (pendente, aceito, expirado) e reenviar.
35. Ver a lista de Clientes com status (ativo ou desativado), se o Perfil de Marca está completo, Posts exportados no mês e último acesso.
36. Ser alertado sobre Clientes parados (sem exportar há 14 dias ou mais).
37. Ver um resumo mensal agregado e exportar em CSV.
38. Desativar um Cliente e liberar o Assento. O histórico do Cliente é preservado.
39. **Nunca** ver o conteúdo dos Posts dos Clientes.

## Requisitos funcionais

| ID | Requisito |
|---|---|
| RF01 | Ninguém se cadastra sozinho. O Parceiro é criado pelo Admin e o Cliente entra só por Convite aceito. |
| RF02 | O Assento é ocupado quando o Convite é aceito. Não é possível aceitar um Convite sem Assento livre: nesse caso aparece uma mensagem orientando o Cliente a falar com o Parceiro. |
| RF03 | O Convite expira em 7 dias e pode ser reenviado, o que gera um novo link. |
| RF04 | Cada Cliente pertence a exatamente um Parceiro. O mesmo email não pode estar ativo em dois Parceiros. |
| RF05 | O motor nunca altera o texto do Cliente. Ele só distribui o texto entre os campos do Estilo. Isso é verificado por um teste. |
| RF06 | O Estilo é sugerido pela forma do conteúdo (número, preço, data, aspas, com ou sem foto, tamanho), em código. |
| RF07 | Catálogo: os 13 Estilos do publi, em formato 4:5, cada um com pelo menos 3 Variações. |
| RF08 | Os Ajustes se limitam à lista das histórias 16 a 22. Não há fonte livre, cor livre, camadas nem movimento livre de elementos. |
| RF09 | As Travas rodam a cada mudança. Um Post que falha numa Trava bloqueante não pode ser exportado sem ação do Cliente. |
| RF10 | O preview e a Exportação usam o mesmo motor e o mesmo desenhista no browser, e o PNG sai idêntico ao preview (ADR 0001). |
| RF11 | Um Post salvo guarda o conteúdo, o Estilo, a Variação, os Ajustes e a referência da foto. O PNG não é guardado. |
| RF12 | A foto é redimensionada e convertida no browser (HEIC→JPEG, lado maior com no máximo 2160 px) antes do upload. A análise da foto (luminância por região, cor dominante, rosto) roda uma vez e é salva como metadado. |
| RF13 | O Parceiro só acessa dados agregados de Uso, e isso é garantido por RLS (ADR 0002). |
| RF14 | Cada ação relevante gera um evento de telemetria sem conteúdo do Cliente ([medição técnica](medicao/tecnico.md)). |
| RF15 | Toda a interface é em PT-BR. |

## Requisitos não funcionais

| ID | Requisito | Meta |
|---|---|---|
| RNF01 | Preview ao vivo | p95 < 50 ms do layout ao redesenho num notebook médio |
| RNF02 | Exportação | PNG gerado em < 1 s |
| RNF03 | Primeira tela útil do editor | < 2,5 s (LCP) com fontes pré-carregadas |
| RNF04 | Browsers | as duas últimas versões de Chrome, Edge, Safari e Firefox no desktop |
| RNF05 | Responsivo | utilizável a partir de 375 px de largura. O foco é desktop |
| RNF06 | Acessibilidade | componentes do Nuxt UI, navegação por teclado no editor, contraste AA na interface |
| RNF07 | Privacidade (LGPD) | dados em São Paulo, bucket privado com URL assinada, termo de uso e política de privacidade, exclusão de conta sob pedido |
| RNF08 | Segurança | RLS em todas as tabelas, com teste que comprova o isolamento entre Parceiros e que o Parceiro não lê Posts |
| RNF09 | Backup | `pg_dump` diário via GitHub Actions enquanto estivermos no plano grátis |
| RNF10 | Qualidade visual | cada Estilo portado passa no teste de regressão contra o publi |

## Critérios de aceite da Fase 1

- Um Cliente convidado sai do email de Convite até um PNG exportado em menos de 10 minutos, sem ajuda.
- Os 13 Estilos, com pelo menos 3 Variações cada, passam na regressão visual.
- O teste de RLS passa: o Parceiro A não vê nada do B e nenhum Parceiro vê Posts.
- Todos os eventos de [medição técnica](medicao/tecnico.md) são gravados.

## Questões em aberto

- Lista exata das Travas bloqueantes e das que só avisam, a partir das Travas do publi.
- Quais são as Variações de cada Estilo: é trabalho de design no publi (oráculo) antes da porta.
