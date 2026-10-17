# Plano de construção: Fase 1

*Atualizado em 2026-10-16. A ordem foi pensada para atacar primeiro o maior risco técnico (a porta do motor, ADR 0001) e entregar cedo uma fatia de ponta a ponta. Cada marco termina em algo demonstrável.*

## Marcos

### M0. Fundação

- Monorepo pnpm: `apps/web` a partir do template dashboard ([templates.md](templates.md)), mais `packages/motor` e `packages/oraculo`.
- Supabase local (CLI), primeiras migrations, CI com lint e typecheck.
- Deploy de staging na Vercel Hobby + Supabase Free.

**Pronto quando:** um "hello" autenticado aparece em staging.

### M1. Spike do motor (o risco do ADR 0001)

- Portar **um Estilo** (Acento) para TS: Motor (função pura → Cena) + Desenhista Canvas.
- `packages/oraculo`: rodar o publi no CI e gerar as imagens de referência para um conjunto de textos de teste.
- Teste de regressão visual (pixel diff) entre TS e publi.
- Teste de divergência entre o preview e o PNG exportado.
- Página de teste com preview ao vivo e medição de p95.

**Pronto quando:** Acento passa na regressão e o p95 fica abaixo de 50 ms. Se não passar, reabrimos o ADR 0001 antes de seguir.

### M2. Fatia vertical fina (de ponta a ponta)

- Admin cria um Parceiro (tela mínima ou seed) → Parceiro cola **1 email** → Convite via Resend → Cliente entra com link mágico → escreve texto → Estilo Acento → exporta PNG.
- RLS básica + teste de isolamento.
- Telemetria: `convite_*`, `post_criado`, `post_exportado`.

**Pronto quando:** essa jornada inteira funciona em staging com um Cliente de verdade.

### M3. Editor e Ajustes

- Upload de foto (padrão do template chat): HEIC→JPEG, redimensionamento, análise (luminância, cor, rosto).
- Ajustes: texto, P/M/G, zona com encaixe, enquadramento e zoom da foto, paleta, Elementos opcionais, CTA.
- Variações (com um clique) e Travas ao vivo com ação de correção.
- Salvamento automático, Rascunho e Exportado.
- Telemetria do editor.

**Pronto quando:** um Post com foto sai em menos de 10 min numa sessão de teste interna.

### M4. Catálogo

- Estilos e Variações vêm da skill `tipografia-igor` (ADR 0003: Acento, Zona calma, Síncope, Letra fina, Riscada; misturas de regras quando o usuário pedir) e do publi (os outros 8). Variações = as aprovadas na fonte, sem número fixo por Estilo.
- Sugestão de Estilo por código + grade de Estilos compatíveis com miniaturas ao vivo.

**Pronto quando:** todo Estilo do catálogo está verde na regressão contra o seu oráculo no CI.

### M5. Cliente completo

- Perfil de Marca, com todos os campos opcionais e Elementos ligados automaticamente.
- Legenda (com as hashtags do Post) + copiar.
- Meus Posts: grade, duplicar, excluir.

### M6. Parceiro completo

- Convite em lote (colar emails ou subir CSV/XLSX) com prévia e checagem de Assentos.
- Fila de envio respeitando o limite de 100/dia do Resend Free.
- Status dos Convites, reenvio e expiração (cron diário).
- Painel de Uso: Assentos, lista de Clientes, alerta de Cliente parado, resumo do mês e CSV.
- Desativar Cliente e liberar Assento.

### M7. Prontidão para o piloto

- Todos os eventos de [medição técnica](medicao/tecnico.md) + views de métricas + painel do Admin.
- Termo de uso e política de privacidade. Fluxo de exclusão de conta.
- `pg_dump` diário via Actions. Sentry.
- Revisão de UX com a skill product-designer: limpeza da interface, textos e estados vazios.
- Teste de ponta a ponta das jornadas principais.

### M8. Piloto

Seguir [medição operacional](medicao/operacional.md).

## Corte para vender

O alvo é o [MVP vendável](mvp.md), e não o PRD inteiro. Na prática:

- **M4:** os 13 Estilos mapeados já estão portados (2026-10-17).
- **M5 entra completo.**
- **M6 entra sem resumo mensal e sem exportação CSV.**
- **M7 entra reduzido:** termos, backup, Sentry e os 7 eventos.

O resto vai para o backlog depois do primeiro Parceiro pagante. O piloto (M8) pode ser feito já com Parceiros pagantes.

## Restante até vender (2026-10-17)

Prioridade do usuário: **todas as features do MVP bem feitas e funcionando**. Desempenho fino fica para depois (o p95 < 50 ms saiu do aceite; o teste de desempenho continua como medida, sem bloquear). Cada iteração fecha com lint, typecheck, test, `db:test`, build e E2E.

| It. | Conteúdo | Jornada / aceite |
|---|---|---|
| 1 | **M5:** Meus Posts com duplicar, excluir e miniatura; eventos `post_duplicado`/`post_excluido` | J4 |
| 2 | **M6a, Convites:** CSV, fila do Resend (100/dia, "agendado"), expiração em 7 dias por cron, reenvio com link novo, mesmo email não ativo em dois Parceiros | J2 |
| 3 | **M6b, painel:** Posts exportados no mês, último acesso, destaque de Cliente parado, desativar libera Assento; números do Uso batem com os eventos (teste) | J5 |
| 4 | **Fechamento do editor:** teste automático PNG = prévia, salvamento ao fechar a aba (teste), HEIC conferido, 375 px sem quebrar, varredura de texto em inglês | J3, Motor e editor |
| 5 | **M7 reduzido:** termo de uso e privacidade com aceite no 1º acesso (texto vem do usuário), `pg_dump` diário via Actions, Sentry, conferência dos 7 eventos | Operação mínima |
| 6 | **Produção:** staging/produção (precisa do usuário: `supabase link`, Vercel, Resend com domínio), J1–J5 com emails de verdade, Chrome/Safari/Edge | Gerais |
| 7 | **Teste com 3 pessoas de fora** (< 10 min sem ajuda) e correções | Gerais |

**Em paralelo, a qualquer momento:** [Fase E, estilização](estilizacao.md) (só visual, quebrada em tarefas para agentes).

**Depois do MVP (backlog, pedido do usuário):** mais controles; mais opções de fonte e textura no Post; **Perfil de Marca 2** com algo parecido com um gerador de paleta. Isso é feature (mexe no Motor e na regressão), não estilização. Junto ficam: desempenho fino (Riscada e picos da Manchete, ver `docs/estado.md`), misturas de regras da skill, Duas tintas "parede", IA.

## Dependências

```
M0 → M1 → M2 → M3 → M4
              ↘ M5 ↘
               M6 → M7 → M8
```

M4 (catálogo) e M5/M6 podem andar em paralelo depois do M3.

## Como validamos cada feature

Toda feature termina com um roteiro curto de teste manual **dos dois lados**, Parceiro e Cliente, que o usuário roda antes de aprovar o PR:

1. **Local, a cada feature:** `pnpm exec supabase start` → `pnpm teste:usuarios` (cria Escritório Teste e Agência Outra com Clientes e um Convite pendente, e imprime um link de entrada por usuário) → `pnpm dev:local`. Cada link numa janela anônima.
2. **Staging, a cada PR mergeado** (quando o M0 fechar): mesmo roteiro no preview da Vercel, com emails de verdade.

O roteiro de cada feature vai no fim do handoff da sessão e na descrição do PR.

## Próximo passo

Quebrar M0 a M2 em issues de fatias verticais (skill `to-issues`) depois que este plano for aprovado.
