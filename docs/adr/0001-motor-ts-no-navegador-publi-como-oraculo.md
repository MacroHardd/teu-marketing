---
status: accepted
---

# Motor de render em TypeScript no navegador; publi (Python) como oráculo

O Post é gerado e desenhado por um único Motor em TypeScript. O Motor é uma função pura: recebe conteúdo, Estilo, Variação, Ajustes, Perfil de Marca e a análise da foto, e devolve uma Cena com o resultado das Travas. Um único Desenhista em Canvas transforma a Cena em imagem. O preview ao vivo e a Exportação (PNG 1080×1350) rodam no navegador, de modo que o que o Cliente vê é exatamente o que ele baixa. O mesmo Motor e Desenhista também rodam no servidor (Node, `@napi-rs/canvas`), mas só para tarefas fora do editor. O motor publi (Python/Pillow), que já tinha os 13 Estilos e as Travas, não roda em produção. Ele é a referência da porta: seus PNGs servem de imagens de referência num teste de regressão visual, e é nele que se testam Estilos novos antes de portá-los.

## Opções consideradas

- **publi como serviço de render no servidor.** Reaproveitava o código direto, mas cada Ajuste dependia de uma ida e volta ao servidor e o preview não seria ao vivo.
- **Preview no browser e Exportação pelo publi.** Seriam dois desenhistas, e quebra de linha, métrica de fonte e decisões que dependem dos pixels da foto acabariam divergindo entre o que o Cliente vê e o que ele baixa.

## Consequências

- A análise da foto (luminância por região, cor dominante, rosto) roda uma única vez, no upload, e fica guardada como metadado. O Motor nunca lê pixels.
- Os efeitos de pixel (duotom, desfoque, riscado) são feitos à mão ou em WebGL, sem depender de `ctx.filter`, que tem suporte irregular no Safari.
- Cada Estilo portado só é aceito se passar no teste de regressão contra o publi.
