# Oráculo (publi)

`publi/` é o motor original (Python + Pillow), extraído de `~/projetos/publi-lab/entregavel/publi.zip`. **Nunca roda em produção** (ADR 0001): só gera as imagens de referência para a regressão visual do `packages/motor`.

```bash
uv venv packages/oraculo/.venv            # ou python -m venv
uv pip install --python packages/oraculo/.venv/bin/python -r packages/oraculo/requirements.txt
packages/oraculo/.venv/bin/python packages/oraculo/gerar.py   # todos os casos/*.json → saida/
```

- `casos/<estilo>.json`: casos de render (texto, marca, modo, tema, formato). Saída: `saida/<estilo>/<id>.png` + `.json` (campos e Travas).
- `casos/textos.json`: corpus para escolha de Estilo e separação de campos. Saída: `saida/textos.json`.

## Métrica linear (por que o publi é ligeiramente modificado aqui)

O publi mede texto com o avanço do FreeType **com hinting**, que não existe no browser. `gerar.py` troca a fonte por uma subclasse que mede com avanço e caixa **lineares** (unidades da fonte × tamanho ÷ unitsPerEm), a mesma conta do Motor TS. Assim tamanho, quebra de linha e posição batem 1:1; só a rasterização difere (borda de 1 px dentro da palavra, < 1% da peça).

## Bugs conhecidos do publi

- `_numero` pega pedaço de data/hora: "20/11" → "11", "8:30" → "30", e corta a palavra. O `criar` do publi esconde isso com fallback; o Motor TS também (`separa`). **Corrigir no publi antes de portar os Estilos Número e Herói.**

## Oráculo da skill tipografia-igor (`tipografia/`)

Os Estilos **Acento, Zona calma, Síncope e Letra fina** seguem as regras da skill `tipografia-igor` (v0.1.0), não o publi (decisão do usuário, 2026-10-16; ADR 0003). O oráculo deles é o próprio kit Remotion da skill: `tipografia/src/estaticos.tsx` é cópia **sem mudança** dos estáticos 4:5 aprovados. Ao redor dele:

- `presets.ts`: as paletas da skill; as fontes vêm dos **mesmos .ttf do Motor** (mesmas famílias do Google Fonts que a skill usa), para os dois desenharem o mesmo glifo.
- `casos.tsx`: caso → props, como o Igor passaria à mão. `*palavra*` = palavra escolhida (acento, ou fora da coluna na Síncope). As linhas da Fina vão em maiúsculas, como o vídeo da regra 9 mede.

```bash
npm ci --prefix packages/oraculo/tipografia
node packages/oraculo/tipografia/gerar.mjs [estilo ...]   # casos/tipografia.json → saida/tipografia/<estilo>/<id>.png (usa o Chrome do sistema; CHROME=...)
```

Diferenças conhecidas e aceitas: rasterização (borda de 1 px) e a opacidade do crédito; tudo abaixo de 1% da peça.
