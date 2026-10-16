# Medição: técnica

*Atualizado em 2026-10-16. Lado operacional: [`operacional.md`](operacional.md).*

Este documento define **o que é gravado, onde e como cada métrica é calculada**. O objetivo é que os números do piloto sejam confiáveis e reproduzíveis por SQL.

## Princípios

1. **Nenhum conteúdo do Cliente entra em evento.** Nem texto, nem legenda, nem foto. Só IDs, tipos, contagens e tempos.
2. **Todo evento tem Parceiro e Cliente**, para permitir corte por Parceiro.
3. **Os eventos são só acrescentados**: nunca são editados nem apagados (exceto pedido de exclusão via LGPD).
4. **Medimos com SQL, sem ferramenta externa** na Fase 1.

## Tabela `eventos`

| Coluna | Tipo | Nota |
|---|---|---|
| `id` | uuid | |
| `ocorrido_em` | timestamptz | hora do servidor |
| `parceiro_id` | uuid | |
| `cliente_id` | uuid, nulo | nulo em eventos do Parceiro ou do Admin |
| `post_id` | uuid, nulo | |
| `sessao_id` | uuid | uma sessão do editor (abrir → fechar ou ficar inativo por 30 min) |
| `nome` | text | lista abaixo |
| `props` | jsonb | só metadados |
| `versao_app` | text | |

RLS: Cliente e Parceiro **não leem** a tabela. Quem grava é o servidor (ou uma RPC com `security definer`). Quem lê é o Admin e as views agregadas.

## Eventos

| Nome | Quando dispara | `props` |
|---|---|---|
| `convite_enviado` | o Convite sai pelo Resend | `{lote_id, origem: manual\|planilha}` |
| `convite_aceito` | o Cliente entra pela 1ª vez pelo link | `{horas_desde_envio}` |
| `convite_expirado` | job diário | |
| `perfil_atualizado` | salva o Perfil de Marca | `{campos_preenchidos: [..]}` (nomes dos campos, sem os valores) |
| `editor_aberto` | abre o editor | `{novo: bool}` |
| `editor_inativo` | 30 min sem interação, ou a aba é fechada | `{tempo_ativo_ms}` |
| `post_criado` | 1º salvamento de um Post | `{tem_foto, tem_pauta, n_palavras}` |
| `estilo_sugerido` | o motor sugere um Estilo | `{estilo}` |
| `estilo_trocado` | o Cliente troca o Estilo | `{de, para, posicao_na_lista}` |
| `variacao_trocada` | troca de Variação | `{estilo, de, para}` |
| `ajuste_aplicado` | cada Ajuste (com debounce de 1 s) | `{tipo: texto\|tamanho\|zona\|foto_enquadre\|cor\|elemento\|cta}` |
| `trava_disparada` | uma Trava acende | `{estilo, variacao, trava, bloqueante}` |
| `trava_resolvida` | a Trava apaga | `{trava, acao: variacao\|estilo\|ajuste}` |
| `foto_enviada` | upload concluído | `{formato_origem, bytes, ms_processamento, rosto_detectado}` |
| `post_exportado` | PNG gerado | `{estilo, variacao, n_trocas_estilo, n_ajustes, tempo_ativo_ms, ms_export, reexport: bool}` |
| `legenda_copiada` | clique em copiar | `{n_hashtags}` |
| `post_duplicado` / `post_excluido` | | |
| `cliente_desativado` | ação do Parceiro | |
| `erro_motor` | exceção no layout ou no desenho | `{estilo, variacao, etapa, mensagem_curta}` |

`tempo_ativo_ms` conta só o tempo com a aba visível e com alguma interação nos últimos 60 s. Isso evita inflar a métrica com aba esquecida aberta.

## Métricas do piloto (definição exata)

| Métrica | Definição | Meta |
|---|---|---|
| **TTFP**: tempo até o 1º Post | mediana de (`post_exportado` mais antigo − `convite_aceito`), por Cliente, considerando só o **tempo ativo** somado nesse intervalo | < 10 min |
| **Tempo por Post** | mediana de `post_exportado.tempo_ativo_ms` com `reexport = false` | 5–10 min |
| **Ativação** | Clientes com pelo menos 1 `post_exportado` em até 7 dias depois de `convite_aceito`, divididos pelos Convites aceitos | ≥ 70% |
| **Retenção do mês 2** | Clientes com pelo menos 4 Exportações (não reexportações) entre os dias 31 e 60, divididos pelos Clientes ativos no dia 30 | ≥ 50% |
| **Acerto da sugestão** | Exportações com `n_trocas_estilo ≤ 2`, divididas pelo total de Exportações | ≥ 60% |
| **Aceitação do Convite** | `convite_aceito` dividido por `convite_enviado`, por Parceiro | acompanhar |
| **Atrito das Travas** | `trava_disparada` bloqueante por Exportação, e a ação que resolveu | acompanhar. Se for alta, ajustar o Estilo |
| **Uso de Ajustes** | distribuição de `ajuste_aplicado.tipo` | descobrir quais Ajustes nunca são usados (candidatos a sair) |
| **Estilos** | Exportações por Estilo e Variação | orienta o catálogo |

As queries ficam em `supabase/metricas/*.sql`, uma por métrica, versionadas. O Admin vê um painel simples que lê essas views.

## Saúde técnica

| Métrica | Fonte | Meta |
|---|---|---|
| p95 do layout + desenho | amostra de 1% das interações (`ajuste_aplicado.ms_render`) | < 50 ms |
| p95 da Exportação | `post_exportado.ms_export` | < 1 s |
| Taxa de erro do motor | `erro_motor` / `editor_aberto` | < 0,5% |
| Falha no processamento da foto | `foto_enviada` com erro / tentativas | < 2% |
| Divergência preview × PNG | teste no CI (pixel diff) | 0 |
| Regressão contra o publi | teste no CI | todos os Estilos passam |
| Erros do front e do servidor | Sentry | acompanhar |

## Privacidade

- O pedido de exclusão (LGPD) apaga o Cliente, os Posts, as fotos e os eventos dele, ou anonimiza os eventos (troca `cliente_id` por um hash).
- `props` nunca recebe texto livre. O schema é validado com zod no servidor e rejeita chaves fora da lista.
