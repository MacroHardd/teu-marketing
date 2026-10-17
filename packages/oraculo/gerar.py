"""Gera as imagens de referência do publi para a regressão visual do Motor TS.

Uso: .venv/bin/python gerar.py [casos/acento.json ...]   (padrão: todos os casos/*.json)
Caso com "foto": "<arquivo>" usa fotos/<arquivo> (fotos de teste: fotos/gerar_fotos.py).
Saída: saida/<arquivo>/<id>.png + saida/<arquivo>/<id>.json (campos e travas).

Métrica linear: o publi mede o texto com o avanço do FreeType com hinting, que não existe no
browser. Aqui a fonte do publi é trocada por uma subclasse que mede com o avanço e a caixa
lineares (unidades da fonte × tamanho / unitsPerEm), a mesma conta do Motor TS. Assim as
decisões de layout (tamanho, quebra de linha, posição) batem 1:1; só a rasterização difere.
"""
import glob, json, os, sys

AQUI = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, os.path.join(AQUI, "publi"))

from fontTools.ttLib import TTFont  # noqa: E402
from PIL import ImageFont  # noqa: E402

import publi  # noqa: E402

_metricas = {}


def _metrica(caminho):
    if caminho not in _metricas:
        tt = TTFont(caminho)
        glyf = tt["glyf"]
        caixas = {}
        for nome in tt.getGlyphOrder():
            g = glyf[nome]
            caixas[nome] = (g.yMin, g.yMax) if g.numberOfContours else None
        _metricas[caminho] = dict(upm=tt["head"].unitsPerEm, cmap=tt.getBestCmap(), hmtx=tt["hmtx"],
                                  notdef=tt.getGlyphOrder()[0], caixas=caixas)
    return _metricas[caminho]


class FonteLinear(ImageFont.FreeTypeFont):
    def _glifos(self, s):
        m = _metrica(self.path)
        return m, [m["cmap"].get(ord(c), m["notdef"]) for c in s]

    def getlength(self, text, *a, **k):
        m, gs = self._glifos(text)
        return sum(m["hmtx"][g][0] for g in gs) * self.size / m["upm"]

    def getbbox(self, text, *a, anchor=None, **k):
        assert anchor == "ls", anchor
        m, gs = self._glifos(text)
        cx = [m["caixas"][g] for g in gs if m["caixas"][g]]
        if not cx:
            return (0, 0, 0, 0)
        esc = self.size / m["upm"]
        return (0, -max(c[1] for c in cx) * esc, self.getlength(text), -min(c[0] for c in cx) * esc)


def _fonte(nome, tam):
    chave = (nome, max(1, int(tam)))
    if chave not in publi._fontes:
        publi._fontes[chave] = FonteLinear(os.path.join(publi.AQUI, "fontes", nome + ".ttf"), chave[1],
                                           layout_engine=ImageFont.Layout.BASIC)
    return publi._fontes[chave]


publi.fonte = _fonte
# estilo 6 novo (Blue Note) entra por cima do motor, como no publi-lab (teste/bluenote.py)
exec(open(os.path.join(AQUI, "publi", "bluenote_src.py"), encoding="utf-8").read(), publi.__dict__)


def gera(arquivo):
    casos = json.load(open(arquivo, encoding="utf-8"))
    pasta = os.path.join(AQUI, "saida", os.path.splitext(os.path.basename(arquivo))[0])
    os.makedirs(pasta, exist_ok=True)
    for c in casos:
        texto = c["texto"]
        foto = os.path.join(AQUI, "fotos", c["foto"]) if c.get("foto") else None
        tipo = c.get("tipo") or publi._escolhe(texto, "f" if foto else None)
        campos = publi._campos(tipo, texto, c.get("destaque", True), "f" if foto else None)
        assert publi._confere(texto, campos), c["id"]
        pedido = {"tipo": tipo, "formato": c.get("formato", "post"), "marca": c.get("marca") or {}, **campos,
                  "nome": c["id"], "pasta": pasta}
        if foto:
            pedido["imagem"] = foto
        if tipo == "duotom":  # Duas tintas = Blue Note; Variação = composição (faixa | janela)
            pedido["tipo"] = "bluenote"
            if foto:
                pedido["composicao"] = c.get("variacao", "faixa")
        for k in ("modo", "tema"):
            if c.get(k):
                pedido[k] = c[k]
        r = publi.render(pedido)
        json.dump({"id": c["id"], "tipo": tipo, "escolhido": publi._escolhe(texto, "f" if foto else None), "campos": campos,
                   "travas": r["travas"]}, open(os.path.join(pasta, c["id"] + ".json"), "w", encoding="utf-8"),
                  ensure_ascii=False, indent=2)


TIPOS = [e["tipo"] for e in publi.ESTILOS]


def gera_campos(arquivo):
    """Para cada texto: Estilo escolhido (com e sem foto) e os campos em todos os Estilos."""
    out = []
    for texto in json.load(open(arquivo, encoding="utf-8")):
        out.append({"texto": texto, "escolhido": publi._escolhe(texto, None), "escolhido_foto": publi._escolhe(texto, "f"),
                    "numero": publi._numero(texto), "destaque": publi._destaque(texto),
                    "campos": {t: publi._campos(t, texto, True) for t in TIPOS}})
    os.makedirs(os.path.join(AQUI, "saida"), exist_ok=True)
    json.dump(out, open(os.path.join(AQUI, "saida", "textos.json"), "w", encoding="utf-8"), ensure_ascii=False, indent=1)


if __name__ == "__main__":
    for a in sys.argv[1:] or sorted(glob.glob(os.path.join(AQUI, "casos", "*.json"))):
        (gera_campos if os.path.basename(a) == "textos.json" else gera)(a)
