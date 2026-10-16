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

- Portar os outros 12 Estilos, cada um passando na regressão.
- Pelo menos 3 Variações por Estilo (o design nasce no publi e depois é portado).
- Sugestão de Estilo por código + grade de Estilos compatíveis com miniaturas ao vivo.

**Pronto quando:** os 13 Estilos × 3 Variações estão verdes no CI.

### M5. Cliente completo

- Perfil de Marca, com todos os campos opcionais e Elementos ligados automaticamente.
- Legenda + hashtags do Perfil + copiar.
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

- **M4 entra reduzido:** 5 Estilos × 3 Variações.
- **M5 entra completo.**
- **M6 entra sem resumo mensal e sem exportação CSV.**
- **M7 entra reduzido:** termos, backup, Sentry e os 7 eventos.

O resto vai para o backlog depois do primeiro Parceiro pagante. O piloto (M8) pode ser feito já com Parceiros pagantes.

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
