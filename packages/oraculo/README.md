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
