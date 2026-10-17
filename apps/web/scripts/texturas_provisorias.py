"""Texturas PROVISÓRIAS do catálogo (geradas aqui, sem direito de terceiro), até chegarem os arquivos do usuário.
Uso: packages/oraculo/.venv/bin/python apps/web/scripts/texturas_provisorias.py  → apps/web/public/texturas/
Determinístico: rodar de novo dá o mesmo arquivo.
"""
import json, os, random

from PIL import Image, ImageFilter

AQUI = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "public", "texturas")
W, H = 1080, 1350


def ruido(semente, w, h):
    rnd = random.Random(semente)
    im = Image.new("L", (w, h))
    im.putdata([rnd.randrange(256) for _ in range(w * h)])
    return im


def papel():  # papel claro com fibra: ruído grande desfocado + fibras finas + grão
    base = ruido(1, W // 8, H // 8).resize((W, H), Image.BICUBIC).filter(ImageFilter.GaussianBlur(6))
    fibra = ruido(2, W, H // 6).resize((W, H), Image.BILINEAR).filter(ImageFilter.GaussianBlur(1))
    grao = ruido(3, W, H)
    px = [int(232 + (a - 128) * 0.10 + (b - 128) * 0.08 + (c - 128) * 0.05)
          for a, b, c in zip(base.get_flattened_data(), fibra.get_flattened_data(), grao.get_flattened_data())]
    im = Image.new("L", (W, H))
    im.putdata(px)
    return Image.merge("RGB", (im, im.point(lambda v: v - 3), im.point(lambda v: v - 10)))


def grao():  # grão de filme: claro, com pontos escuros espalhados
    g = ruido(4, W * 2 // 3, H * 2 // 3).filter(ImageFilter.GaussianBlur(0.6))
    im = g.point(lambda v: int(200 + (v - 128) * 0.9))
    return Image.merge("RGB", (im, im, im))


if __name__ == "__main__":
    os.makedirs(AQUI, exist_ok=True)
    papel().save(os.path.join(AQUI, "papel.jpg"), quality=86)
    grao().save(os.path.join(AQUI, "grao.jpg"), quality=86)
    cat = [{"id": "papel", "nome": "Papel", "arquivo": "papel.jpg", "provisoria": True},
           {"id": "grao", "nome": "Grão", "arquivo": "grao.jpg", "provisoria": True}]
    json.dump(cat, open(os.path.join(AQUI, "catalogo.json"), "w", encoding="utf-8"), ensure_ascii=False, indent=2)
