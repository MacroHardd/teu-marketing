---
status: accepted
---

# Ativos com receita de tratamento não destrutiva, aplicada no browser

O Cliente envia imagens para a aba Ativos e as trata ali: um efeito por vez (duotom, pixelar, envelhecer), textura por cima e recorte. O Ativo guarda o **original** no Storage e uma **receita** (jsonb na tabela `ativos`), e não uma imagem nova. A receita é aplicada no browser por uma função pura do pacote do Motor (`trata`, em `packages/motor/src/tratamento.ts`), fora do Motor, no provedor de foto, como os filtros dos Estilos. A imagem tratada é analisada na hora para virar `MetaFoto`, e o Motor continua sem ler pixel (ADR 0001). O Post aponta para o Ativo (`posts.ativo_id`, chave composta com `cliente_id`), e o tratamento muda em todos os Posts que usam aquele Ativo.

As texturas são um catálogo global da Plataforma (`apps/web/public/texturas/catalogo.json` + arquivos), igual para todos os Clientes. No Post, a textura entra como Ajuste (no fundo ou na letra), multiplicada pelo Desenhista (`globalCompositeOperation = 'multiply'`, que funciona no Safari; `ctx.filter` continua proibido).

Decisões do usuário (2026-10-17): receita, não imagem nova; texturas globais fornecidas pela Plataforma; remover fundo (IA) e o recorte do objeto ficam para a fase de IA.

## Opções consideradas

- **Imagem nova a cada tratamento.** Desfazer seria trivial só enquanto o original existisse, e cada versão gastaria Storage (Supabase Free: 1 GB). Trocar a cor da marca não atualizaria os duotons já feitos.
- **Tratamento no servidor (sharp).** Seria uma segunda implementação de pixel, e o PNG deixaria de sair idêntico ao preview. Também gastaria a função da Vercel Hobby.
- **Texturas por Parceiro.** Pedem upload, moderação e Storage por Parceiro. Ficam para depois, se alguém pedir.

## Consequências

- Abrir um Post com Ativo custa aplicar a receita no original (até 2160 px). O resultado fica em cache por sessão.
- O metadado salvo no Ativo (`ativos.meta`) é o da imagem tratada no momento do save. O editor recalcula ao abrir, porque o duotom na cor da marca muda quando o Perfil muda.
- Apagar o Ativo deixa os Posts sem foto (`on delete set null`): o Post nunca é apagado junto.
- O Parceiro não lê `ativos` (RLS + pgTAP), como já acontece com os Posts e as fotos.
