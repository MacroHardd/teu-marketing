# MVP vendável: o que precisa funcionar

*Atualizado em 2026-10-16. Este é o documento de referência para "está pronto para vender?". Detalhes em [PRD](prd-fase1-post-estatico.md). Os termos seguem o [`CONTEXT.md`](../CONTEXT.md).*

**Regra:** não precisa estar perfeito, precisa **funcionar**. Tudo o que não está nesta página espera o primeiro Parceiro pagante.

## Jornadas que precisam funcionar de ponta a ponta

### J1. Admin libera um Parceiro
1. O Admin cadastra o Parceiro (nome, email do responsável, nº de Assentos). Pode ser uma tela mínima ou um script.
2. O Parceiro recebe um link mágico e entra.

### J2. Parceiro convida Clientes
1. O Parceiro cola emails ou sobe um CSV.
2. Vê uma prévia com os válidos, os duplicados, os inválidos e quantos Assentos estão livres, e confirma.
3. A Plataforma envia os Convites e o Parceiro acompanha o status (pendente, aceito, expirado) e pode reenviar.

### J3. Cliente faz o primeiro Post
1. O Cliente clica no Convite e entra com o link mágico.
2. Preenche o Perfil de Marca (opcional) ou pula.
3. Escreve o texto e, se quiser, sobe uma foto.
4. Vê o Estilo sugerido e troca de Estilo ou de Variação com um clique.
5. Faz os Ajustes, com preview ao vivo e avisos de Trava.
6. Escreve a legenda, com as hashtags do Post, se quiser.
7. Exporta o PNG 1080×1350 e copia a legenda.

### J4. Cliente volta
1. Abre "Meus Posts", reabre um Post Exportado, corrige e exporta de novo.
2. Duplica um Post para fazer outro do mesmo jeito.

### J5. Parceiro acompanha
1. Vê os Assentos usados e o total, a lista de Clientes (status, Posts exportados no mês, último acesso) e um destaque nos Clientes parados.
2. Desativa um Cliente para liberar o Assento.

## Critérios de aceite

### Gerais
- [ ] As jornadas J1 a J5 rodam em produção, com emails de verdade, sem intervenção manual nossa (exceto no J1).
- [ ] Um Cliente novo vai do email do Convite até o PNG exportado **sem ajuda, em menos de 10 min** (testado com 3 pessoas de fora).
- [ ] Interface em PT-BR, sem textos de template ("Lorem", "Acme", inglês).
- [ ] Funciona nas versões atuais de Chrome, Safari e Edge no desktop, e não quebra em 375 px de largura.

### Entrada e Convites
- [x] Ninguém se cadastra sozinho. Um email que não foi convidado vê a mensagem "peça acesso ao seu parceiro".
- [x] O Convite aceito ocupa um Assento. Sem Assento livre, o Convite não pode ser aceito e aparece uma mensagem clara.
- [ ] O Convite expira em 7 dias, o reenvio gera um link novo e o mesmo email não pode estar ativo em dois Parceiros.
- [ ] O envio respeita o limite do Resend: o excedente fica na fila para o dia seguinte, e o status mostra "agendado".

### Motor e editor
- [x] Os Estilos do corte (abaixo) têm as suas Variações e passam na regressão visual contra o oráculo (skill tipografia-igor ou publi).
- [ ] O PNG exportado é idêntico ao preview (teste automatizado).
- [x] O texto do Cliente nunca é alterado pelo motor (teste automatizado).
- [ ] O preview atualiza ao vivo (p95 < 50 ms) em todo Ajuste.
- [x] Os Ajustes disponíveis são só: texto, P/M/G, zona (topo/centro/base, por botão ou arrastando o texto na prévia, que encaixa numa das 3), enquadramento e zoom da foto, cor da paleta, Elementos opcionais (logo, @ ou nome, selo, CTA) e CTA escrito pelo Cliente.
- [ ] As Travas avisam quando o texto é cortado, quando falta contraste e quando há texto em cima de um rosto, e sugerem uma correção. Uma Trava bloqueante impede a Exportação até ser resolvida.
- [ ] Foto: JPEG, PNG e HEIC de até 10 MB, redimensionada no browser.
- [x] Ativos: o Cliente envia imagens para a aba Ativos, trata (duotom, pixelar, envelhecer, textura por cima, recorte) sem perder o original e usa nos Posts; a textura também entra no fundo ou na letra do Post. O Parceiro não vê Ativos (teste de RLS).
- [ ] O salvamento é automático: fechar a aba e voltar não perde nada.

### Parceiro e dados
- [ ] O Parceiro **não consegue** ler Posts nem fotos de Clientes, nem dados de outro Parceiro (teste de RLS no CI).
- [ ] Os números do painel de Uso batem com os eventos.

### Operação mínima para vender
- [ ] Termo de uso + política de privacidade publicados e aceitos no 1º acesso.
- [ ] Backup diário do banco (`pg_dump` via Actions).
- [ ] Sentry capturando erros.
- [ ] Eventos gravados: `convite_enviado`, `convite_aceito`, `post_criado`, `estilo_trocado`, `variacao_trocada`, `post_exportado` (com `tempo_ativo_ms`), `erro_motor`.

## Corte para vender mais rápido

| Item | No MVP vendável | Depois (backlog) |
|---|---|---|
| Estilos | Todos os mapeados: os 13 do publi (Acento, Manchete, Número, Letra fina, Foto que fala, Duas tintas, Vazio, Foto e legenda, Herói, Depoimento, Zona calma, Síncope, Riscada), com Acento, Zona calma, Síncope, Letra fina e Riscada pela skill tipografia-igor. Variações = as aprovadas na fonte (Zona: raios/foto; Síncope: com/sem bloco; Fina: P&B/duotom; Riscada: sem cor/com acento; Duas tintas: faixa/janela) | misturas de regras da skill; Duas tintas "parede" (em revisão no publi-lab) |
| Planilha de Convites | colar emails + **CSV** | XLSX |
| Painel do Parceiro | Assentos, Convites, lista de Clientes, destaque de Cliente parado, desativar | resumo mensal, exportação CSV, gráficos |
| Admin | tela mínima ou script | painel completo |
| Telemetria | os 7 eventos acima | todos os eventos de [medição técnica](medicao/tecnico.md) + painel de métricas |
| Perfil de Marca | todos os campos | mesmo conjunto |
| Tratamento de imagem | Ativos com duotom, pixelar, envelhecer, textura (foto, fundo, letra) e recorte | remover fundo e recorte do objeto (fase de IA); texturas por Parceiro |
| Meus Posts | grade, abrir, duplicar, excluir | busca e filtros |

Estilos: decisão do usuário (2026-10-17) de ter todos os Estilos mapeados na skill tipografia-igor e no publi, em vez do corte de 7.

## Fora do MVP (confirmado)

IA (será tratada separadamente) · carrossel · stories · publicar ou agendar no Instagram · white-label · Parceiro vendo Posts · aprovação · login com Google ou senha · billing automático · app nativo. Ver [escopo](escopo.md).
