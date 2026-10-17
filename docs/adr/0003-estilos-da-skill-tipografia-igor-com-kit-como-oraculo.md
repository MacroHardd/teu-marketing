---
status: accepted
---

# Estilos da skill tipografia-igor, com o kit Remotion como oráculo

Os Estilos Acento, Zona calma, Síncope e Letra fina seguem as regras da skill `tipografia-igor` (v0.1.0), aprovadas pelo usuário, e não mais o publi. O publi continua como oráculo de Manchete e Foto e legenda. O oráculo desses quatro é o próprio kit da skill: os estáticos 4:5 (`estaticos.tsx`, copiados sem mudança para `packages/oraculo/tipografia`) são renderizados pelo Remotion no Chrome. Os PNGs servem de referência para a regressão visual do Motor, com o mesmo limite de 1% de pixels diferentes. O Motor continua TypeScript puro no navegador (ADR 0001): o Remotion só roda no CI e localmente, nunca em produção.

Decisões do usuário que moldam a porta (2026-10-16):
- a palavra marcada pelo Cliente vale mais que a regra, mesmo quando a quebra;
- a cor da marca do Cliente vale mais que a paleta aprovada, e a regra é aplicada sobre ela;
- texto longo encolhe até caber, em vez de travar no tamanho do estático;
- as misturas de regras ficam para depois;
- a Riscada espera as features de tratamento de imagem.

## Opções consideradas

- **Portar a skill para o publi e manter um oráculo só.** Teria sido preciso reescrever as regras em Pillow. Além disso, a referência deixaria de ser o que o usuário aprovou (o render do kit) e passaria a ser uma tradução dele.
- **Sem oráculo, com aprovação visual manual.** Seria mais rápido no começo, mas qualquer mudança no Motor passaria a depender do olho de alguém.

## Consequências

- O kit desenha com CSS. O Motor imita o navegador: quebra de linha gulosa, linha de base dentro da caixa de `line-height` pelas métricas da fonte, kerning ligado, filtros CSS (`grayscale`, `contrast`, `brightness`, `saturate`, `multiply`) feitos à mão sobre os pixels da foto, `box-sizing: border-box`.
- As fontes do oráculo são os mesmos .ttf do Motor (as famílias são as mesmas do Google Fonts usado pela skill).
- O CI instala o Remotion (`npm ci` em `packages/oraculo/tipografia`) e gera as referências no Chrome do runner.
- Atualizar a skill (nova versão) exige copiar de novo os estáticos e rodar a regressão.
