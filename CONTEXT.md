# Teu Marketing

Plataforma B2B2C de marketing faça-você-mesmo. Vendida a Parceiros, que a distribuem aos seus Clientes como um extra do serviço que já prestam.

## Atores

**Plataforma**:
Nós. A empresa que constrói, mantém e vende o produto, e o conhecimento de marketing embutido nele.
_Evitar_: sistema, admin

**Admin**:
Pessoa da Plataforma que cadastra Parceiros e define quantos Assentos cada um tem.
_Evitar_: superusuário, operador

**Parceiro**:
Escritório, mentor ou agência que compra o acesso à Plataforma e o oferece aos próprios clientes. Não produz conteúdo pelo Cliente.
_Evitar_: revenda, revendedor, tenant, cliente B2B

**Cliente**:
Cliente de um Parceiro: o usuário final que cria e publica o próprio conteúdo de marketing, sozinho. Pertence a exatamente um Parceiro. O produto usa a marca da Plataforma, e no máximo indica qual Parceiro ofereceu o acesso.
_Evitar_: usuário final, assinante, lead

## Conteúdo

**Perfil de Marca**:
Dados de marca do Cliente que aparecem nos Posts: nome exibido, @, cor da marca, logo, foto, contato e hashtags. Todos os campos são opcionais. Quando um dado existe, o Elemento opcional correspondente já vem ligado. A tipografia não faz parte: ela vem do Estilo.
_Evitar_: briefing, perfil, branding

**Pauta**:
Tema de um Post, ou seja, sobre o que ele vai falar. Quem decide é o Cliente: ele escreve as próprias Pautas, e as sugestões da Plataforma são só apoio.
_Evitar_: ideia, tema, sugestão, briefing do post

**Estilo**:
Direção visual pronta que o Cliente escolhe antes de gerar um Post. Define layout, tipografia e hierarquia.
_Evitar_: template, tema, layout, modelo

**Trava**:
Regra de qualidade de um Estilo, que reprova um Post quebrado: texto cortado, falta de contraste, texto em cima de rosto. Quando uma Trava acende, o Cliente vê o aviso com uma correção de 1 clique, e a Exportação fica bloqueada até resolver.
_Evitar_: validação, checagem, regra

**Variação**:
Versão alternativa de layout dentro do mesmo Estilo. Trocar de Variação é um clique e mantém o conteúdo do Post.
_Evitar_: versão, opção, layout alternativo

**Post**:
Peça estática de Instagram com uma única imagem, feita de uma Pauta e um Estilo: a arte, mais a legenda e as hashtags.
_Evitar_: publicação, criativo, arte, peça

**Elemento opcional**:
Item de marca que o Cliente liga ou desliga em um Post (logo, @ ou nome, contato, selo, CTA), sem mexer na posição.

**Selo**:
Elemento opcional: círculo com as iniciais da marca, no canto de cima.
_Evitar_: carimbo, badge
_Evitar_: camada, componente

**CTA**:
Chamada para ação do Post. Quem escreve é sempre o Cliente: a Plataforma nunca gera nem preenche um CTA sozinha.
_Evitar_: chamada, botão

**Ajuste**:
Mudança que o Cliente faz num Post já gerado, sempre dentro de um conjunto pequeno de controles essenciais (regra 80/20). A Plataforma não é um editor de design livre.
_Evitar_: edição, customização

**Rascunho**:
Post que ainda não foi exportado nenhuma vez. Fica salvo automaticamente.
_Evitar_: draft, pendente

**Exportado**:
Post que já teve pelo menos uma Exportação. Continua editável e pode ser exportado de novo.
_Evitar_: publicado, finalizado, concluído

**Sugestão de IA**:
Texto proposto pela IA (Pauta, texto da arte, legenda) quando o Cliente pede. É sempre opcional, aparece claramente marcado como IA e pode ser editado. Nunca preenche um campo sozinho.
_Evitar_: geração automática, conteúdo gerado

**Exportação**:
Entrega do Post pronto ao Cliente: os arquivos de imagem e a legenda copiável. É aqui que a responsabilidade da Plataforma termina. Quem publica no Instagram é o Cliente, por conta própria.
_Evitar_: publicação, envio, download

## Comercial

**Assento**:
Vaga paga que permite a um Parceiro manter um Cliente ativo. O Parceiro compra Assentos em pacotes. O Cliente nunca paga.
_Evitar_: licença, seat, slot

**Convite**:
Chamado para um Cliente entrar na Plataforma. O Parceiro informa os emails (manualmente ou por planilha) e a Plataforma envia. O Assento só é ocupado quando o Convite é aceito.
_Evitar_: invite, cadastro, indicação

**Uso**:
O que o Parceiro consegue ver de cada Cliente: situação, atividade e volume de Posts exportados. O conteúdo dos Posts nunca entra no Uso.
_Evitar_: relatório, analytics, acompanhamento

**Cliente ativo**:
Cliente que ocupa um Assento e consegue usar a Plataforma. Quando desativado, libera o Assento, mas o histórico continua guardado.
_Evitar_: cliente habilitado, conta ativa

## Construção

**Motor**:
Parte que decide como o Post fica: recebe o texto do Cliente, o Estilo, a Variação, os Ajustes e o Perfil de Marca, e devolve a Cena com o resultado das Travas. Nunca altera o texto do Cliente.
_Evitar_: engine, gerador, renderizador

**Cena**:
Descrição completa de um Post pronto para desenhar: fundo, textos, formas e cores, nas posições finais.
_Evitar_: layout, template

**Desenhista**:
Parte que transforma a Cena em imagem. É a mesma para o preview e para a Exportação.
_Evitar_: renderer

**Oráculo**:
O publi original, usado só para conferir que o Motor desenha igual a ele. Nunca roda em produção.
_Evitar_: referência, legado
