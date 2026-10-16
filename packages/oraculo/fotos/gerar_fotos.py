"""Fotos de teste da regressão (sintéticas, sem direito de imagem). Determinísticas: rodar de novo dá o mesmo PNG.

Uso: .venv/bin/python fotos/gerar_fotos.py
Suaves de propósito: o Pillow (LANCZOS) e o Canvas reamostram diferente, e o que a regressão confere é o
layout e as decisões (recorte, letra clara/escura), não o filtro de reamostragem.
"""
import os

from PIL import Image, ImageDraw, ImageFilter

AQUI = os.path.dirname(os.path.abspath(__file__))


def degrade(w, h, topo, base):
    g = Image.linear_gradient("L").resize((w, h))
    return Image.composite(Image.new("RGB", (w, h), base), Image.new("RGB", (w, h), topo), g)


def mancha(im, box, cor, blur):
    m = Image.new("L", im.size, 0)
    ImageDraw.Draw(m).ellipse(box, fill=255)
    m = m.filter(ImageFilter.GaussianBlur(blur))
    im.paste(Image.new("RGB", im.size, cor), (0, 0), m)


def clara():  # retrato 4:5 claro: céu de dia, pessoa/objeto bege no centro
    im = degrade(1200, 1500, (214, 232, 246), (246, 240, 228))
    mancha(im, (380, 620, 820, 1380), (196, 160, 128), 60)
    mancha(im, (480, 380, 720, 640), (210, 176, 146), 40)
    return im


def escura():  # paisagem 4:3 noturna: horizonte com luz quente
    im = degrade(1600, 1200, (12, 16, 34), (40, 30, 46))
    mancha(im, (1000, 520, 1400, 900), (232, 150, 70), 90)
    mancha(im, (-200, 900, 1800, 1500), (8, 8, 12), 50)
    return im


def mista():  # quadrada: metade de cima clara, de baixo escura (rosto contra a luz)
    im = degrade(1200, 1200, (236, 230, 220), (34, 38, 44))
    mancha(im, (420, 300, 780, 760), (120, 92, 76), 50)
    return im


if __name__ == "__main__":
    for nome, fn in (("clara", clara), ("escura", escura), ("mista", mista)):
        fn().save(os.path.join(AQUI, nome + ".png"), "PNG", optimize=True)
