"""publi.py — motor do Publi: post 4:5 (1080x1350) e story 9:16 (1080x1920). Só precisa de Pillow.
Fica na pasta da skill publi, com fontes/ e ESTILOS.png ao lado. A conversa usa só: criar, opcao, usar, estilos, ver,
pronto, ultima_foto (ver SKILL.md). Fontes: SIL Open Font License 1.1 (licenças em fontes/).
"""
import json, os, re

from PIL import Image, ImageDraw, ImageFilter, ImageFont, ImageOps, ImageEnhance, ImageStat

VERSAO = "0.5.0"

AQUI = os.path.dirname(os.path.abspath(__file__))
FONTES = ("cut", "grot", "grot-med", "grot-semi", "grot-bold", "grot-xbold", "thin", "thin-reg", "hand")

FORMATOS = {
    # (largura, altura, zona segura topo, zona segura base) — story: a interface do Instagram cobre topo e base
    "post": (1080, 1350, 0, 0),
    "story": (1080, 1920, 250, 340),
}

# ------------------------------------------------------------------ fontes e texto
_fontes = {}


def fonte(nome: str, tam: int) -> ImageFont.FreeTypeFont:
    chave = (nome, max(1, int(tam)))
    if chave in _fontes:
        return _fontes[chave]
    basic = ImageFont.Layout.BASIC if hasattr(ImageFont, "Layout") else ImageFont.LAYOUT_BASIC
    # BASIC em todo lugar: o resultado não muda entre o Pillow do ChatGPT, do Claude e o nosso
    _fontes[chave] = ImageFont.truetype(os.path.join(AQUI, "fontes", nome + ".ttf"), chave[1], layout_engine=basic)
    return _fontes[chave]


def largura(f, s: str) -> float:
    return f.getlength(s) if hasattr(f, "getlength") else f.getsize(s)[0]


TOPO, BAIXO = set("ÁÀÂÃÉÊÍÓÔÕÚÜ"), set("Ç")


def _limpa(p: str) -> str:
    return "".join(c for c in p.lower() if c.isalnum())


def quebra(palavras, f, w_max):
    """Quebra gulosa por largura. Devolve lista de linhas (listas de palavras)."""
    linhas, atual = [], []
    for p in palavras:
        teste = atual + [p]
        if atual and largura(f, " ".join(teste)) > w_max:
            linhas.append(atual)
            atual = [p]
        else:
            atual = teste
    if atual:
        linhas.append(atual)
    return linhas


def hexrgb(h: str):
    h = h.lstrip("#")
    return tuple(int(h[i:i + 2], 16) for i in (0, 2, 4))


def lum(rgb) -> float:
    def c(v):
        v = v / 255
        return v / 12.92 if v <= 0.03928 else ((v + 0.055) / 1.055) ** 2.4
    r, g, b = (c(v) for v in rgb[:3])
    return 0.2126 * r + 0.7152 * g + 0.0722 * b


def contraste(a, b) -> float:
    la, lb = sorted((lum(a), lum(b)), reverse=True)
    return (la + 0.05) / (lb + 0.05)


def saturacao(rgb) -> float:
    mx, mn = max(rgb[:3]) / 255, min(rgb[:3]) / 255
    return 0 if mx == 0 else (mx - mn) / mx


# ------------------------------------------------------------------ imagem
def foto_cover(caminho, w, h):
    im = Image.open(caminho)
    im = ImageOps.exif_transpose(im).convert("RGB")
    return ImageOps.fit(im, (w, h), method=Image.LANCZOS, centering=(0.5, 0.5))


# ================================================================== FORMATOS NATIVOS DO FEED
# Desenho em 2x (S) e reduzido no fim: borda, sombra e texto ficam lisos em qualquer Pillow.
# Nada aqui presume habilidade do usuário: texto de qualquer tamanho cabe (ou volta aviso),
# foto é opcional, cor da marca é opcional.

S = 2


def px(v):
    return int(round(v * S))


# ------------------------------------------------------------------ cor e tema
def mistura(a, b, t):
    """t=0 -> a, t=1 -> b"""
    return tuple(int(round(x + (y - x) * t)) for x, y in zip(a, b))


BRANCO, PRETO = (255, 255, 255), (0, 0, 0)

# temas curados: todos conferidos com contraste de texto >= 7:1 na superfície
TEMAS = {
    "creme": dict(fundo="#f2ede3", sup="#ffffff", tinta="#171512", sutil="#7a736a", acento="#e0472b"),
    "noite": dict(fundo="#0e1014", sup="#1a1d23", tinta="#f3f1ec", sutil="#8e939c", acento="#ffcf40"),
    "salvia": dict(fundo="#dfe5d8", sup="#ffffff", tinta="#16211a", sutil="#66715f", acento="#2f6b4f"),
    "cobalto": dict(fundo="#2443d6", sup="#ffffff", tinta="#10131c", sutil="#6a7080", acento="#2443d6"),
    "rosa": dict(fundo="#f5dcd5", sup="#ffffff", tinta="#2a1612", sutil="#8a6a63", acento="#c2185b"),
    "papel": dict(fundo="#eceae6", sup="#ffffff", tinta="#111111", sutil="#7b7b78", acento="#111111"),
}


def tema(p):
    """Tema curado, ou derivado de 1 cor da marca com contraste garantido."""
    cor = (p.get("marca") or {}).get("cor") or p.get("cor")
    escuro = p.get("modo") == "escuro"
    if cor:
        a = hexrgb(cor)
        if escuro:
            t = dict(fundo=mistura(a, PRETO, 0.86), sup=mistura(a, PRETO, 0.78), tinta=(243, 241, 236))
        else:
            t = dict(fundo=mistura(a, BRANCO, 0.86), sup=BRANCO, tinta=mistura(a, PRETO, 0.9))
        t["sutil"] = mistura(t["tinta"], t["sup"], 0.5)
        t["acento"] = a
    else:
        nome = p.get("tema") or ("noite" if escuro else "creme")
        t = {k: hexrgb(v) for k, v in TEMAS.get(nome, TEMAS["creme"]).items()}
    # acento usado como TEXTO precisa de contraste >= 3 com a superfície e com o fundo
    at = t["acento"]
    for base in (t["sup"], t["fundo"]):
        alvo = PRETO if lum(base) > 0.4 else BRANCO
        k = 0
        while contraste(at, base) < 3 and k < 20:
            at = mistura(at, alvo, 0.12)
            k += 1
    t["acento_txt"] = at
    quase_preto = (18, 18, 18)
    t["sobre_acento"] = BRANCO if contraste(BRANCO, t["acento"]) >= contraste(quase_preto, t["acento"]) else quase_preto
    t["escuro"] = lum(t["sup"]) < 0.2  # superfície escura = tema escuro (fundo saturado não conta)
    return t


# ------------------------------------------------------------------ tela 2x
class Tela:
    def __init__(self, W, H, cor):
        self.W, self.H = W, H
        self.im = Image.new("RGB", (px(W), px(H)), tuple(cor[:3]))
        self.d = ImageDraw.Draw(self.im)

    def redesenha(self):
        self.d = ImageDraw.Draw(self.im)

    def ret(self, box, r, cor, borda=None, larg=2):
        x0, y0, x1, y1 = box
        self.d.rounded_rectangle([px(x0), px(y0), px(x1), px(y1)], radius=px(r), fill=cor,
                                 outline=borda, width=px(larg) if borda else 0)

    def sombra(self, box, r, alpha=0.18, blur=36, dy=22):
        """Sombra suave: desenha só na região em volta (rápido no celular)."""
        x0, y0, x1, y1 = box
        m = px(blur * 3)
        rx0, ry0 = max(0, px(x0) - m), max(0, px(y0 + dy) - m)
        rx1, ry1 = min(self.im.width, px(x1) + m), min(self.im.height, px(y1 + dy) + m)
        reg = self.im.crop((rx0, ry0, rx1, ry1))
        mask = Image.new("L", reg.size, 0)
        ImageDraw.Draw(mask).rounded_rectangle(
            [px(x0) - rx0, px(y0 + dy) - ry0, px(x1) - rx0, px(y1 + dy) - ry0], radius=px(r), fill=int(255 * alpha))
        mask = mask.filter(ImageFilter.GaussianBlur(px(blur)))
        reg.paste(Image.new("RGB", reg.size, PRETO), (0, 0), mask)
        self.im.paste(reg, (rx0, ry0))
        self.redesenha()

    def circulo(self, cx, cy, r, cor):
        self.d.ellipse([px(cx - r), px(cy - r), px(cx + r), px(cy + r)], fill=cor)

    def foto(self, caminho, box, escurece=0.0, r=0):
        x0, y0, x1, y1 = box
        im = foto_cover(caminho, px(x1 - x0), px(y1 - y0))
        if escurece:
            im = Image.blend(im, Image.new("RGB", im.size, PRETO), escurece)
        if r:
            m = Image.new("L", im.size, 0)
            ImageDraw.Draw(m).rounded_rectangle([0, 0, im.width, im.height], radius=px(r), fill=255)
            self.im.paste(im, (px(x0), px(y0)), m)
        else:
            self.im.paste(im, (px(x0), px(y0)))
        self.redesenha()

    def degrade(self, box, c0, c1):
        x0, y0, x1, y1 = box
        g = Image.linear_gradient("L").resize((px(x1 - x0), px(y1 - y0)))
        bloco = Image.composite(Image.new("RGB", g.size, tuple(c1[:3])), Image.new("RGB", g.size, tuple(c0[:3])), g)
        self.im.paste(bloco, (px(x0), px(y0)))
        self.redesenha()

    def final(self):
        return self.im.resize((self.W, self.H), Image.LANCZOS)


# ------------------------------------------------------------------ texto com marcação
# *palavra* = destaque (acento) · ~~palavra~~ = riscado · \n = quebra forçada
_EMOJI = re.compile("[\U0001F000-\U0001FAFF☀-➿️‍⬀-⯿]")


def limpa_texto(s, avisos):
    s2 = _EMOJI.sub("", s or "")
    if s2 != (s or ""):
        avisos.append("emoji removido (a fonte não desenha emoji; o visual fica mais limpo sem)")
    s2 = re.sub(r"[ \t]+", " ", s2).strip()
    return s2


def fichas(txt):
    """Texto -> lista de (palavra, estilo). estilo: '' | 'a' (acento) | 'r' (riscado) | '\\n'."""
    out = []
    for i, par in enumerate(txt.split("\n")):
        if i:
            out.append(("\n", "\n"))
        cola = False
        for seg in re.split(r"(\*[^*]+\*|~~[^~]+~~)", par):
            if not seg:
                continue
            # pontuação logo depois de um destaque ("*acabar*.") gruda na palavra, sem espaço
            if cola and not seg[0].isspace() and out and out[-1][1] != "\n":
                m = re.match(r"^(\S+)(.*)$", seg, re.S)
                out[-1] = (out[-1][0] + m.group(1), out[-1][1])
                seg = m.group(2)
            cola = not seg[-1:].isspace() if seg else True
            if not seg.strip():
                continue
            st = ""
            if seg.startswith("~~") and seg.endswith("~~") and len(seg) > 4:
                seg, st = seg[2:-2], "r"
            elif seg.startswith("*") and seg.endswith("*") and len(seg) > 2:
                seg, st = seg[1:-1], "a"
            for w in seg.split():
                out.append((w, st))
    return out


def quebra_fichas(fs, f, wmax):
    linhas, atual, larg = [], [], 0.0
    esp = largura(f, " ")
    for w, st in fs:
        if st == "\n":
            linhas.append(atual)
            atual, larg = [], 0.0
            continue
        lw = largura(f, w)
        if atual and larg + esp + lw > wmax:
            linhas.append(atual)
            atual, larg = [], 0.0
        larg += (esp if atual else 0) + lw
        atual.append((w, st))
    linhas.append(atual)
    while linhas and not linhas[-1]:
        linhas.pop()
    return linhas


def larg_linha(l, f):
    return largura(f, " ".join(w for w, _ in l)) if l else 0


def uma_linha(s, nome, tam, wmax, smin=None):
    """Linha única: encolhe até smin e, se ainda não couber, corta com reticências."""
    tam = float(tam)
    while smin and tam > smin and largura(fonte(nome, px(tam)), s) > px(wmax):
        tam -= 1
    f = fonte(nome, px(tam))
    if largura(f, s) > px(wmax):
        while s and largura(f, s + "…") > px(wmax):
            s = s[:-1]
        s = s.rstrip() + "…"
    return s, f, tam


class Bloco:
    """Texto já quebrado num tamanho que cabe na caixa (medido em unidades base, não 2x)."""

    def __init__(self, txt, nome, wmax, hmax, smax, smin, lh=1.25, max_linhas=None, avisos=None, maiusc=False, equilibrar=True):
        self.nome, self.lh = nome, lh
        txt = txt.upper() if maiusc else txt
        fs = fichas(txt)
        self.cortado = False
        tam = smax
        while True:
            f = fonte(nome, px(tam))
            linhas = quebra_fichas(fs, f, px(wmax))
            alto = len(linhas) * tam * lh
            cabe = alto <= hmax and all(larg_linha(l, f) <= px(wmax) for l in linhas)
            if max_linhas:
                cabe = cabe and len(linhas) <= max_linhas
            if cabe or tam <= smin:
                break
            tam -= 1
        if not cabe:  # nem no mínimo: corta e avisa (o modelo deve dividir o texto)
            n = max(1, int(hmax // (tam * lh)))
            if max_linhas:
                n = min(n, max_linhas)
            if len(linhas) > n:
                linhas = linhas[:n]
                if linhas[-1]:
                    w, st = linhas[-1][-1]
                    linhas[-1][-1] = (w.rstrip(".,;:") + "…", st)
                self.cortado = True
                if avisos is not None:
                    avisos.append("texto longo demais para este formato: foi cortado — dividir em 2 posts ou encurtar")
        f = fonte(nome, px(tam))
        # quebra equilibrada: menor largura que mantém o nº de linhas (sem palavra sobrando sozinha)
        if equilibrar and len(linhas) > 1 and not self.cortado and not any(st == "\n" for _, st in fs):
            n, lo, hi = len(linhas), px(wmax) * 0.5, px(wmax)
            for _ in range(14):
                mid = (lo + hi) / 2
                if len(quebra_fichas(fs, f, mid)) == n:
                    hi = mid
                else:
                    lo = mid
            linhas = quebra_fichas(fs, f, hi + 1)
        self.tam, self.linhas, self.f = tam, linhas, f
        _, t, _, _ = f.getbbox("ÁÉHg", anchor="ls")
        self.sobe = -t / S
        # linhas de base medidas: abre só onde acento de baixo tocaria descida/cedilha de cima
        self.bases = [0.0]
        for i in range(1, len(linhas)):
            _, _, _, desce = f.getbbox(" ".join(w for w, _ in linhas[i - 1]) or "x", anchor="ls")
            _, sobe, _, _ = f.getbbox(" ".join(w for w, _ in linhas[i]) or "x", anchor="ls")
            self.bases.append(self.bases[-1] + max(tam * lh, (desce - sobe) / S + tam * 0.05))
        self.alto = self.bases[-1] + self.sobe + tam * 0.24
        self.largura = max((larg_linha(l, f) for l in linhas), default=0) / S

    def desenha(self, tela, x, y, cor, cor_a=None, alinhar="esq", wbox=None, marca=None, risco=None, track=0.0):
        """marca = cor de marca-texto atrás das palavras *destacadas* (em vez de pintar a letra)."""
        d, f = tela.d, self.f
        esp = largura(f, " ")
        for i, l in enumerate(self.linhas):
            yb = px(y + self.sobe + self.bases[i])
            lw = larg_linha(l, f) + track * px(self.tam) * max(0, sum(len(w) for w, _ in l))
            if alinhar == "centro":
                xx = px(x) + (px(wbox) - lw) / 2
            elif alinhar == "dir":
                xx = px(x) + px(wbox) - lw
            else:
                xx = px(x)
            for k, (w, st) in enumerate(l):
                ww = largura(f, w)
                if st == "a" and marca is not None:
                    d.rectangle([xx - px(6), yb - px(self.tam * 0.62), xx + ww + px(6), yb + px(self.tam * 0.14)], fill=marca)
                c = cor_a if (st == "a" and cor_a is not None and marca is None) else cor
                if track:
                    cx = xx
                    for ch in w:
                        d.text((cx, yb), ch, font=f, fill=c, anchor="ls")
                        cx += largura(f, ch) + track * px(self.tam)
                    ww = cx - xx
                else:
                    d.text((xx, yb), w, font=f, fill=c, anchor="ls")
                if st == "r":
                    yy = yb - px(self.tam * 0.3)
                    d.line([xx - px(4), yy, xx + ww + px(4), yy], fill=risco or c, width=px(max(3, self.tam * 0.07)))
                xx += ww + esp


# ------------------------------------------------------------------ peças comuns
def area(H, formato):
    """Retângulo útil (x0, y0, x1, y1): margem 72; no story, fora da interface do Instagram."""
    if formato == "story":
        return (72, 250, 1008, 1920 - 340)
    return (72, 72, 1008, H - 72)


def assinatura(tela, t, marca, x, y, cor=None, centro_w=None):
    s = marca.get("perfil") or marca.get("nome")
    if not s:
        return
    f = fonte("grot-semi", px(26))
    s = s.upper()
    tr = 0.08 * px(26)
    w = sum(largura(f, ch) + tr for ch in s) - tr
    xx = px(x) + ((px(centro_w) - w) / 2 if centro_w else 0)
    for ch in s:
        tela.d.text((xx, px(y)), ch, font=f, fill=cor or t["sutil"], anchor="ls")
        xx += largura(f, ch) + tr


def tem_foto(p):
    return bool(p.get("imagem")) and os.path.exists(p["imagem"])


# ------------------------------------------------------------------ A1 · post de rede (tipo tweet)
NATIVOS = {}  # tipo -> função que desenha (os estilos se registram com NATIVOS.update)


def render_nativo(p):
    tipo = p.get("tipo")
    formato = p.get("formato", "post")
    W, H = 1080, (1920 if formato == "story" else 1350)
    t = tema(p)
    avisos = []
    tela, info = NATIVOS[tipo](p, W, H, formato, t, avisos)
    return tela.final(), {**info, "avisos": sorted(set(avisos))}


# ================================================================== BLOCO PUBLICITÁRIO
# Princípios de peças reconhecidas, com a cor e o texto do usuário. Nunca imita marca, bordão ou peça específica.


def neutros(t):
    """2 neutros (fundo + tinta) do tema; se o fundo do tema for cor saturada, usa a superfície."""
    fundo = t["fundo"] if saturacao(t["fundo"]) < 0.3 else t["sup"]
    return fundo, t["tinta"] if contraste(t["tinta"], fundo) >= 7 else (PRETO if lum(fundo) > 0.4 else BRANCO)


def acento_sobre(t, fundo):
    a = t["acento"]
    if contraste(a, fundo) >= 3:
        return a
    return t["acento_txt"] if contraste(t["acento_txt"], fundo) >= 3 else (PRETO if lum(fundo) > 0.4 else BRANCO)


# ------------------------------------------------------------------ P1 · acento raro (sem foto) — César Villela
def p_acento(p, W, H, formato, t, av):
    fundo, tinta = neutros(t)
    acc = acento_sobre(t, fundo)
    tela = Tela(W, H, fundo)
    x0, y0, x1, y1 = area(H, formato)
    texto = limpa_texto(p.get("texto", ""), av)
    story = formato == "story"
    hmax = (y1 - y0) * (0.62 if story else 0.6)
    b = Bloco(texto, "cut", x1 - x0, hmax, 190 if story else 168, 76, lh=0.98, avisos=av, maiusc=True)
    by = y0 + ((y1 - y0) - b.alto) / 2 - (20 if story else 30)
    b.desenha(tela, x0, by, tinta, cor_a=acc)
    # 3 pontos de acento, longe do texto (~0,3% da área)
    pts = [(x1 - 40, y0 + 70), (x0 + 50, by + b.alto + 150), (x1 - 80, y1 - 70)]
    for (cx, cy) in pts:
        if cy < by - 40 or cy > by + b.alto + 40:
            tela.circulo(cx, cy, 20, acc)
    assinatura(tela, t, p.get("marca") or {}, x0, y1 - 6, cor=mistura(tinta, fundo, 0.35))
    im = tela.final()
    n = W * H
    area_acc = sum(k for k, c in im.getcolors(n) if contraste(c, acc) < 1.15 and contraste(c, fundo) > 1.6) / n * 100
    if area_acc > 7:
        av.append("destaque grande demais: marcar só 1 palavra curta")
    return tela, {"acento_area_pct": round(area_acc, 2)}


# ------------------------------------------------------------------ P2 · só manchete (sem foto) — The Economist (princípio)
def p_manchete(p, W, H, formato, t, av):
    fundo = t["acento"]
    tinta = t["sobre_acento"]
    if p.get("modo") == "escuro":  # inversão: fundo quase preto tingido, letra clara
        fundo, tinta = mistura(t["acento"], PRETO, 0.86), (243, 241, 236)
    tela = Tela(W, H, fundo)
    x0, y0, x1, y1 = area(H, formato)
    x0 += 8
    texto = limpa_texto(p.get("texto", ""), av)
    if len(texto.split()) > 22:
        av.append("manchete longa: funciona melhor com até 12 palavras")
    story = formato == "story"
    b = Bloco(texto, "grot-xbold", x1 - x0, (y1 - y0) * 0.72, 132 if story else 118, 54, lh=1.06, avisos=av)
    by = y0 + ((y1 - y0) - b.alto) / 2 - 30
    b.desenha(tela, x0, by, tinta, cor_a=None)
    marca = p.get("marca") or {}
    s = marca.get("perfil") or marca.get("nome") or ""
    if s:
        f = fonte("grot-bold", px(30))
        tela.d.text((px(x1), px(y1 - 6)), s, font=f, fill=mistura(tinta, fundo, 0.25), anchor="rs")
    return tela, {"corpo_px": b.tam}


# ------------------------------------------------------------------ P3 · número (sem foto) — dado vira frase (Spotify, princípio)
def p_numero(p, W, H, formato, t, av):
    fundo = t["acento"]
    tinta = t["sobre_acento"]
    if p.get("modo") == "escuro":  # inversão: fundo quase preto tingido, letra clara
        fundo, tinta = mistura(t["acento"], PRETO, 0.86), (243, 241, 236)
    tela = Tela(W, H, fundo)
    x0, y0, x1, y1 = area(H, formato)
    num = limpa_texto(p.get("numero", ""), av)
    texto = limpa_texto(p.get("texto", ""), av)
    if not num:
        av.append("falta o número (ex.: \"1.200\", \"98%\", \"15 anos\")")
    story = formato == "story"
    bn = Bloco(num, "cut", x1 - x0, (y1 - y0) * 0.42, 520 if story else 440, 120, lh=0.92, max_linhas=2, avisos=av, maiusc=True)
    bt = Bloco(texto, "grot-bold", x1 - x0, (y1 - y0) * 0.36, 76 if story else 66, 40, lh=1.16, avisos=av) if texto else None
    gap = 48
    total = bn.alto + (gap + bt.alto if bt else 0)
    yy = y0 + ((y1 - y0) - total) / 2 - 20
    bn.desenha(tela, x0 - 6, yy, tinta)
    if bt:
        bt.desenha(tela, x0, yy + bn.alto + gap, tinta, cor_a=None)
    assinatura(tela, t, p.get("marca") or {}, x0, y1 - 6, cor=mistura(tinta, fundo, 0.3))
    return tela, {"numero_px": bn.tam}


# ------------------------------------------------------------------ P4 · letra fina sobre foto (com foto) — Pablo Ferro
def p_fina(p, W, H, formato, t, av):
    tela = Tela(W, H, PRETO)
    x0, y0, x1, y1 = area(H, formato)
    if tem_foto(p):
        im = foto_cover(p["imagem"], px(W), px(H))
        g = ImageEnhance.Contrast(ImageOps.grayscale(im)).enhance(1.3)
        if p.get("cor_foto"):  # duotom na cor da marca
            im = ImageOps.colorize(g, black=mistura(t["acento"], PRETO, 0.8), white=mistura(t["acento"], BRANCO, 0.75))
        else:
            im = ImageEnhance.Brightness(g).enhance(0.85).convert("RGB")
        tela.im.paste(im, (0, 0))
        tela.redesenha()
    else:
        av.append("este formato pede foto: sem foto, usei fundo escuro")
        tela.degrade((0, 0, W, H), mistura(t["acento"], PRETO, 0.55), PRETO)
    palavras = limpa_texto(p.get("texto", ""), av).upper().split()
    linhas, atual = [], ""
    for w in palavras:  # linhas curtas: cada uma vira um bloco que ocupa a largura
        if atual and len(atual) + 1 + len(w) > 11:
            linhas.append(atual)
            atual = w
        else:
            atual = (atual + " " + w).strip()
    if atual:
        linhas.append(atual)
    if len(linhas) > 6:
        av.append("texto longo para letra fina: até ~8 palavras fica melhor")
        linhas = linhas[:6]
    wmax = x1 - x0
    tams = []
    for k, l in enumerate(linhas):
        nome = "thin" if k % 2 == 0 else "thin-reg"
        tt = 420.0
        while tt > 40 and largura(fonte(nome, px(tt)), l) > px(wmax):
            tt -= 4
        tams.append((nome, tt * 0.86))

    def empilha(esc):
        bases, y, desc_ant = [], y0 + 30, None
        for (nome, tt), l in zip(tams, linhas):
            _, sobe, _, desce = fonte(nome, px(tt * esc)).getbbox(l, anchor="ls")
            sobe, desce = sobe / S, desce / S
            y = y - sobe if desc_ant is None else y + max(tt * esc * 0.9, desc_ant - sobe + tt * esc * 0.04)
            bases.append(y)
            desc_ant = desce
        return bases, (y + desc_ant) if bases else y0
    esc = 1.0
    bases, fim = empilha(esc)
    while fim > y1 - 60 and esc > 0.3:
        esc *= 0.95
        bases, fim = empilha(esc)
    # foto de leigo tem claro e escuro misturados atrás do texto: véu suave de cima até o fim do texto,
    # letra sempre clara (legível em qualquer foto, sem caixa nem sombra)
    vh = min(H, fim + 160)
    veu = Image.linear_gradient("L").rotate(180).resize((px(W), px(vh))).point(lambda v: int(v * 0.62))
    tela.im.paste(Image.new("RGB", veu.size, PRETO), (0, 0), veu)
    tela.redesenha()
    reg = tela.im.crop((px(x0), px(y0), px(x1), px(max(y0 + 10, fim)))).convert("L")
    fundo_l = ImageStat.Stat(reg).mean[0]
    clara = fundo_l < 150
    tinta = (246, 244, 238) if clara else (14, 16, 20)
    for (nome, tt), l, yb in zip(tams, linhas, bases):
        tela.d.text((px(x0), px(yb)), l, font=fonte(nome, px(tt * esc)), fill=tinta, anchor="ls")
    assinatura(tela, t, p.get("marca") or {}, x0, y1 - 6, cor=tinta)
    return tela, {"letra": "clara" if clara else "escura", "luminancia_atras": round(fundo_l)}


# ------------------------------------------------------------------ P5 · a foto fala (com foto) — Toscani / Serpa (princípio)
def p_selo(p, W, H, formato, t, av):
    tela = Tela(W, H, t["fundo"])
    x0, y0, x1, y1 = area(H, formato)
    if tem_foto(p):
        tela.foto(p["imagem"], (0, 0, W, H))
    else:
        av.append("este formato pede foto: sem foto, usei a cor da marca")
        tela.degrade((0, 0, W, H), t["acento"], mistura(t["acento"], PRETO, 0.4))
    texto = limpa_texto(p.get("texto", ""), av)
    if len(texto.split()) > 8:
        av.append("aqui a foto é a mensagem: texto de até 6–8 palavras fica melhor")
    marca = p.get("marca") or {}
    # véu escuro só na base, para a frase ler em qualquer foto
    vh = H * 0.42
    veu = Image.linear_gradient("L").resize((px(W), px(vh)))
    veu = veu.point(lambda v: int(v * 0.72))
    tela.im.paste(Image.new("RGB", veu.size, PRETO), (0, px(H - vh)), veu)
    tela.redesenha()
    # selo: retângulo na cor da marca com o nome
    nome = (marca.get("nome") or "Sua marca")
    sn, fs, _ = uma_linha(nome, "grot-bold", 34, (x1 - x0) * 0.7, 24)
    sw = largura(fs, sn) / S + 56
    sy1 = y1 - 6
    tela.ret((x0, sy1 - 76, x0 + sw, sy1), 0, t["acento"])
    tela.d.text((px(x0 + 28), px(sy1 - 26)), sn, font=fs, fill=t["sobre_acento"], anchor="ls")
    if texto:
        b = Bloco(texto, "grot-xbold", x1 - x0, 300, 84 if formato == "story" else 74, 44, lh=1.1, max_linhas=3, avisos=av)
        b.desenha(tela, x0, sy1 - 76 - 40 - b.alto, BRANCO, cor_a=None)
    return tela, {"tem_foto": tem_foto(p)}


# ------------------------------------------------------------------ P6 · duas tintas (com foto) — Reid Miles / Blue Note (princípio)
def p_duotom(p, W, H, formato, t, av):
    escuro = (16, 16, 18)
    tela = Tela(W, H, escuro)
    x0, y0, x1, y1 = area(H, formato)
    story = formato == "story"
    foto_h = H * (0.56 if not story else 0.5)
    if tem_foto(p):
        im = foto_cover(p["imagem"], px(W), px(foto_h))
        g = ImageEnhance.Contrast(ImageOps.grayscale(im)).enhance(1.25)
        im = ImageOps.colorize(g, black=(12, 12, 14), white=mistura(t["acento"], BRANCO, 0.82))
        tela.im.paste(im, (0, 0))
        tela.redesenha()
    else:
        av.append("este formato pede foto: sem foto, usei bloco de cor")
        tela.ret((0, 0, W, foto_h), 0, t["acento"])
    titulo = limpa_texto(p.get("titulo") or p.get("texto", ""), av)
    sub = limpa_texto(p.get("subtitulo", ""), av)
    acc = t["acento"] if contraste(t["acento"], escuro) >= 3 else mistura(t["acento"], BRANCO, 0.45)
    ty0 = foto_h + 50
    ty1 = y1 - (80 if sub else 20)
    b = Bloco(titulo, "cut", x1 - x0, ty1 - ty0, 210 if story else 170, 70, lh=0.96, max_linhas=3, avisos=av, maiusc=True)
    b.desenha(tela, x0, ty0, BRANCO, cor_a=acc)
    if sub:
        f = fonte("grot-semi", px(32))
        s = sub.upper()
        xx = px(x0)
        sy = min(y1 - 10, ty0 + b.alto + 64)
        for ch in s:
            if xx > px(x1 - 20):
                break
            tela.d.text((xx, px(sy)), ch, font=f, fill=acc, anchor="ls")
            xx += largura(f, ch) + 0.1 * px(32)
    # faixa fina na cor: a 2ª tinta costurando foto e texto
    tela.ret((0, foto_h, W, foto_h + 14), 0, t["acento"])
    return tela, {"titulo_px": b.tam}


NATIVOS.update({
    "acento": p_acento, "manchete": p_manchete, "numero": p_numero,
    "fina": p_fina, "selo": p_selo, "duotom": p_duotom,
})


# ================================================================== BLOCO PUBLICITÁRIO · F2b (7 referências novas)
# Mesmo contrato dos p_*: (p, W, H, formato, t, av) -> (tela, info). Cor e texto sempre do usuário.
import colorsys


def gira_matiz(c, graus, sat=None, val=None):
    h, s, v = colorsys.rgb_to_hsv(*(x / 255 for x in c[:3]))
    h = (h + graus / 360) % 1
    s = s if sat is None else sat
    v = v if val is None else val
    return tuple(int(round(x * 255)) for x in colorsys.hsv_to_rgb(h, s, v))


def vivo(c):
    """Versão saturada e clara da cor da marca (para fundos 'cheios')."""
    h, s, v = colorsys.rgb_to_hsv(*(x / 255 for x in c[:3]))
    return tuple(int(round(x * 255)) for x in colorsys.hsv_to_rgb(h, max(s, 0.75), max(v, 0.82)))


def energia(im):
    """Quanto 'detalhe' tem a região (média das bordas): baixa = área calma para texto."""
    g = ImageOps.grayscale(im).filter(ImageFilter.FIND_EDGES)
    return ImageStat.Stat(g).mean[0]


def separa_frase(texto):
    """1ª frase (até . ! ? : ou quebra de linha) e o resto, sem trocar palavra."""
    m = re.search(r"^(.+?[.!?:])\s+(\S.*)$", texto.strip(), re.S)
    if "\n" in texto.strip():
        a, b = texto.strip().split("\n", 1)
        return a.strip(), " ".join(b.split())
    if m:
        return m.group(1).strip(), m.group(2).strip()
    return texto.strip(), ""


# ------------------------------------------------------------------ P7 · vazio (com foto) — VW "Think Small", DDB 1959 (princípio)
def p_vazio(p, W, H, formato, t, av):
    fundo, tinta = neutros(t)
    tela = Tela(W, H, fundo)
    x0, y0, x1, y1 = area(H, formato)
    story = formato == "story"
    # objeto pequeno (≤ ~8% da área) no terço de cima; o resto é vazio
    lado = W * (0.26 if story else 0.27)
    cx, cy = W / 2, y0 + (y1 - y0) * (0.26 if story else 0.28)
    if tem_foto(p):
        tela.foto(p["imagem"], (cx - lado / 2, cy - lado / 2, cx + lado / 2, cy + lado / 2))
    else:
        av.append("este formato pede foto do produto: sem foto, usei um ponto na cor da marca")
        tela.circulo(cx, cy, lado * 0.18, t["acento"])
    texto = limpa_texto(p.get("texto", ""), av)
    if len(texto.split()) > 8:
        av.append("aqui o vazio é a mensagem: frase de até ~5 palavras fica melhor")
    hy = y0 + (y1 - y0) * (0.62 if story else 0.66)
    b = Bloco(texto, "grot-xbold", (x1 - x0) * 0.86, y1 - hy - 90, 64 if story else 58, 34, lh=1.12, max_linhas=3, avisos=av)
    b.desenha(tela, x0 + (x1 - x0) * 0.07, hy, tinta, cor_a=acento_sobre(t, fundo), alinhar="centro", wbox=(x1 - x0) * 0.86)
    marca = p.get("marca") or {}
    assinatura(tela, t, marca, x0, y1 - 6, cor=mistura(tinta, fundo, 0.4), centro_w=x1 - x0)
    area_obj = (lado * lado) / (W * H) * 100
    return tela, {"objeto_area_pct": round(area_obj, 1)}


# ------------------------------------------------------------------ P8 · ordem de leitura (com foto) — Ogilvy 1983 (princípio)
def p_ogilvy(p, W, H, formato, t, av):
    fundo, tinta = neutros(t)
    tela = Tela(W, H, fundo)
    x0, y0, x1, y1 = area(H, formato)
    story = formato == "story"
    foto_y1 = (y0 + (y1 - y0) * 0.66) if story else H * 0.62
    if tem_foto(p):
        tela.foto(p["imagem"], (0, 0 if not story else 0, W, foto_y1))
    else:
        av.append("este formato pede foto: sem foto, usei bloco de cor")
        tela.ret((0, 0, W, foto_y1), 0, t["acento"])
    texto = limpa_texto(p.get("texto", ""), av)
    tit, leg = separa_frase(texto)
    marca = p.get("marca") or {}
    if not leg:  # a legenda sempre existe: na falta, é quem assina
        leg = marca.get("nome") or marca.get("perfil") or ""
        leg_marca = True
    else:
        leg_marca = False
    ty = foto_y1 + 50
    bt = Bloco(tit, "grot-xbold", x1 - x0, 250 if not story else 320, 84 if story else 74, 40, lh=1.12, max_linhas=3, avisos=av)
    bt.desenha(tela, x0, ty, tinta, cor_a=acento_sobre(t, fundo))
    ly = ty + bt.alto + 26
    if leg:
        tl = max(32, bt.tam * 0.5)
        bl = Bloco(leg, "grot-med" if not leg_marca else "grot-semi", x1 - x0, max(40, y1 - ly - 10), tl, 26, lh=1.35,
                   max_linhas=5, avisos=av)
        bl.desenha(tela, x0, ly, mistura(tinta, fundo, 0.3))
    return tela, {"titulo_px": bt.tam}


# ------------------------------------------------------------------ P9 · objeto-herói (com ou sem foto) — Absolut, TBWA 1980 (princípio)
def p_heroi(p, W, H, formato, t, av):
    escuro = mistura(t["acento"], PRETO, 0.88)
    tela = Tela(W, H, escuro)
    x0, y0, x1, y1 = area(H, formato)
    story = formato == "story"
    # luz no centro (o objeto "iluminado")
    luz = Image.radial_gradient("L").resize((px(W * 1.1), px(W * 1.1)))
    luz = luz.point(lambda v: int((255 - v) * 0.30))
    cx, cy = W / 2, y0 + (y1 - y0) * 0.44
    tela.im.paste(Image.new("RGB", luz.size, mistura(t["acento"], BRANCO, 0.25)),
                  (px(cx - W * 0.55), px(cy - W * 0.55)), luz)
    tela.redesenha()
    texto = limpa_texto(p.get("texto", ""), av)
    obj = p.get("objeto") or ""
    if tem_foto(p):
        oh = (y1 - y0) * (0.5 if not story else 0.46)
        ow = oh * 0.8
        tela.sombra((cx - ow / 2, cy - oh / 2, cx + ow / 2, cy + oh / 2), 0, alpha=0.5, blur=40, dy=30)
        tela.foto(p["imagem"], (cx - ow / 2, cy - oh / 2, cx + ow / 2, cy + oh / 2))
        legenda = texto
    else:
        # sem foto, o objeto-herói é o preço/valor que a pessoa trouxe
        obj = obj or _numero(texto) or ""
        legenda = texto.replace(obj, "", 1).strip(" ,.:;-–—") if obj else texto
        if not obj:
            av.append("falta o objeto: mande uma foto do produto ou um preço/valor")
            obj, legenda = texto, ""
        bo = Bloco(obj, "cut", x1 - x0, (y1 - y0) * 0.42, 420 if story else 360, 90, lh=0.95, max_linhas=2, avisos=av, maiusc=True)
        bo.desenha(tela, x0, cy - bo.alto / 2, BRANCO, alinhar="centro", wbox=x1 - x0)
    if len(legenda.split()) > 6:
        av.append("legenda longa: aqui funciona com 2–3 palavras")
    if legenda:
        bl = Bloco(legenda, "grot-xbold", x1 - x0, 160, 54 if story else 48, 30, lh=1.15, max_linhas=2, avisos=av, maiusc=True)
        bl.desenha(tela, x0, y1 - 70 - bl.alto, (245, 243, 238), alinhar="centro", wbox=x1 - x0,
                   cor_a=vivo(t["acento"]) if contraste(vivo(t["acento"]), escuro) >= 3 else None)
    marca = p.get("marca") or {}
    assinatura(tela, t, marca, x0, y1 - 6, cor=mistura((245, 243, 238), escuro, 0.45), centro_w=x1 - x0)
    return tela, {"tem_foto": tem_foto(p)}


# ------------------------------------------------------------------ P10 · retrato + citação (com foto) — "got milk?", Bozell 1995 (princípio)
_FALA = re.compile(r"^\s*[\"“”']?(.+?)[\"“”']?\s*(?:\n|\s)[—–-]\s*(.{2,60})$", re.S)


def p_citacao(p, W, H, formato, t, av):
    tela = Tela(W, H, PRETO)
    x0, y0, x1, y1 = area(H, formato)
    texto = limpa_texto(p.get("texto", ""), av)
    quem = p.get("quem") or ""
    m = _FALA.match(texto)
    if m and not quem:
        texto, quem = m.group(1).strip(), m.group(2).strip()
    texto = texto.strip("\"“”' ")
    marca = p.get("marca") or {}
    quem = quem or marca.get("nome") or ""
    if len(texto.split()) > 25:
        av.append("citação longa: até ~25 palavras fica melhor")
    if tem_foto(p):
        tela.foto(p["imagem"], (0, 0, W, H))
    else:
        av.append("este formato pede o retrato de quem fala: sem foto, usei a cor da marca")
        tela.degrade((0, 0, W, H), mistura(t["acento"], PRETO, 0.2), mistura(t["acento"], PRETO, 0.6))
    # a citação mora na faixa mais calma (cima ou baixo), nunca no meio (rosto)
    fh = (y1 - y0) * 0.36
    cima = tela.im.crop((0, px(y0), px(W), px(y0 + fh)))
    baixo = tela.im.crop((0, px(y1 - fh), px(W), px(y1)))
    em_cima = energia(cima) < energia(baixo) * 0.8
    reg = cima if em_cima else baixo
    clara = ImageStat.Stat(ImageOps.grayscale(reg)).mean[0] > 140
    # véu suave do lado da citação (legibilidade em foto amadora), sem caixa
    vh = H * 0.48
    veu = Image.linear_gradient("L").resize((px(W), px(vh)))
    if em_cima:
        veu = veu.rotate(180)
    veu = veu.point(lambda v: int(v * 0.55))
    cor_veu = BRANCO if clara else PRETO
    tela.im.paste(Image.new("RGB", veu.size, cor_veu), (0, 0 if em_cima else px(H - vh)), veu)
    tela.redesenha()
    tinta = (18, 18, 18) if clara else (246, 244, 238)
    acc = acento_sobre(t, cor_veu)
    story = formato == "story"
    wq = (x1 - x0) * 0.9
    b = Bloco("“" + texto + "”", "grot-bold", wq, fh - 90, 72 if story else 64, 32, lh=1.22, avisos=av)
    fq = fonte("grot-semi", px(32))
    alto = b.alto + 24 + 32
    by = (y0 + 10) if em_cima else (y1 - alto - 10)
    b.desenha(tela, x0, by, tinta, cor_a=acc)
    if quem:
        tela.ret((x0, by + b.alto + 22, x0 + 40, by + b.alto + 26), 0, acc)
        tela.d.text((px(x0 + 54), px(by + b.alto + 34)), quem, font=fq, fill=tinta, anchor="ls")
    area_txt = b.largura * b.alto / (W * H) * 100
    return tela, {"citacao_em": "cima" if em_cima else "baixo", "citacao_area_pct": round(area_txt, 1), "quem": quem}


# ------------------------------------------------------------------ P11 · zona calma (com ou sem foto) — Rogério Duarte, capa de Gil 1968
def p_zona(p, W, H, formato, t, av):
    a = vivo(t["acento"])
    b2 = gira_matiz(a, 60, val=1.0)
    onda = gira_matiz(a, -40, sat=0.9, val=0.9)
    escuro = mistura(a, PRETO, 0.9)
    claro = (250, 246, 240)
    tela = Tela(W, H, escuro)
    story = formato == "story"
    if tem_foto(p):
        im = foto_cover(p["imagem"], px(W), px(H))
        im = ImageEnhance.Contrast(ImageEnhance.Color(im).enhance(1.7)).enhance(1.15)
        tela.im.paste(im, (0, 0))
        tela.redesenha()
    else:
        N = 28
        cx, cy, R = px(W / 2), px(H * 0.5), px(max(W, H) * 1.3)
        import math
        for j in range(N):
            a0, a1 = 2 * math.pi * j / N + 0.07, 2 * math.pi * (j + 1) / N + 0.07
            tela.d.polygon([(cx, cy), (cx + R * math.cos(a0), cy + R * math.sin(a0)),
                            (cx + R * math.cos(a1), cy + R * math.sin(a1))], fill=a if j % 2 else b2)
        # onda grossa no topo, com filete claro
        yw = (250 if story else 0) + 150
        pts = []
        for k in range(0, W + 1, 6):
            import math as _m
            pts.append((px(k), px(yw + 46 * _m.sin(k / 90 * _m.pi))))
        tela.d.line(pts, fill=onda, width=px(56), joint="curve")
        tela.d.line(pts, fill=claro, width=px(12), joint="curve")
    # a zona: pílula escura, borda viva, onde a letra mora
    x0, y0, x1, y1 = area(H, formato)
    zw, zh = W - 2 * 84, (620 if story else 560)
    zy = (y0 + y1) / 2 - zh / 2 + (40 if not story else 0)
    tela.ret((84, zy, 84 + zw, zy + zh), zh / 2, escuro, borda=onda, larg=12)
    texto = limpa_texto(p.get("texto", ""), av)
    pad = zh * 0.32
    b = Bloco(texto, "cut", zw - 2 * pad, zh - 140, 110 if story else 96, 44, lh=1.0, max_linhas=4, avisos=av, maiusc=True)
    b.desenha(tela, 84 + pad, zy + (zh - b.alto) / 2, claro, cor_a=b2 if contraste(b2, escuro) >= 3 else claro,
              alinhar="centro", wbox=zw - 2 * pad)
    marca = p.get("marca") or {}
    s = marca.get("perfil") or marca.get("nome")
    if s:
        assinatura(tela, t, marca, 84, zy + zh + 60, cor=claro if tem_foto(p) else escuro, centro_w=zw)
    return tela, {"zona_px": [zw, zh]}


# ------------------------------------------------------------------ P12 · síncope (sem foto) — Villela, capa de Lennie Dale 1963
def contratempo(palavras):
    """Palavras que saem da coluna: as de conteúdo, uma sim uma não, no máximo 1/3 (nunca todas)."""
    fora, alterna = set(), False
    for i, w in enumerate(palavras):
        n = _limpa(w)
        if i == 0 or len(n) < 3 or n in _STOP:
            continue
        if alterna:
            fora.add(i)
        alterna = not alterna
    lim = max(1, len(palavras) // 3)
    fora = set(sorted(fora)[:lim])
    if not fora and len(palavras) > 1:  # sem desvio não há síncope: a última de conteúdo sai da coluna
        cand = [i for i in range(1, len(palavras)) if _limpa(palavras[i]) not in _STOP] or [len(palavras) - 1]
        fora = {cand[-1]}
    return fora


def p_sincope(p, W, H, formato, t, av):
    escuro_modo = p.get("modo") == "escuro"
    if escuro_modo:  # fundo saturado -> 1 tinta, sem bloco
        papel, tinta, bloco = t["acento"], t["sobre_acento"], False
    else:
        papel, tinta = neutros(t)
        bloco = True
    tela = Tela(W, H, papel)
    x0, y0, x1, y1 = area(H, formato)
    texto = limpa_texto(p.get("texto", ""), av)
    linhas_usuario = [l.split() for l in texto.split("\n") if l.strip()]
    if len(linhas_usuario) > 1:  # a pessoa já quebrou: cada linha dela é um "tempo"
        linhas = [" ".join(l) for l in linhas_usuario]
    else:
        ws = texto.split()
        por = 1 if len(ws) <= 8 else 2
        linhas = [" ".join(ws[i:i + por]) for i in range(0, len(ws), por)]
    if len(linhas) > 9:
        av.append("texto longo para síncope: até ~8 palavras fica melhor")
        linhas = linhas[:9]
    fora = contratempo(linhas)
    desloc = (x1 - x0) * 0.24
    passo_y = (y1 - y0 - 80) / max(len(linhas), 5)
    tam = min(150, passo_y * 0.92)
    f = fonte("cut", px(tam))
    wmax = (x1 - x0) - desloc
    while tam > 40 and max(largura(f, l.upper()) for l in linhas) > px(wmax):
        tam -= 2
        f = fonte("cut", px(tam))
    passo_y = min(passo_y, tam * 1.04)
    alto = passo_y * len(linhas)
    ytop = y0 + 20
    bx, by = W * 0.52, ytop + alto * 0.55

    def escreve(cor):
        for i, l in enumerate(linhas):
            x = x0 + (desloc if i in fora else 0)
            tela.d.text((px(x), px(ytop + (i + 1) * passo_y)), l.upper(), font=f, fill=cor, anchor="ls")
    if bloco:
        escreve(tinta)
        # bloco no canto inferior direito; a letra que cai dentro inverte (recorte exato)
        tela.ret((bx, by, W, H), 0, tinta)
        sub = Tela(W, H, papel)
        sub.d = ImageDraw.Draw(sub.im)
        tela_d, tela.d = tela.d, sub.d
        escreve(papel)
        tela.d = tela_d
        mask = Image.new("L", tela.im.size, 0)
        ImageDraw.Draw(mask).rectangle([px(bx), px(by), px(W), px(H)], fill=255)
        letras = Image.new("L", tela.im.size, 0)
        dl = ImageDraw.Draw(letras)
        for i, l in enumerate(linhas):
            x = x0 + (desloc if i in fora else 0)
            dl.text((px(x), px(ytop + (i + 1) * passo_y)), l.upper(), font=f, fill=255, anchor="ls")
        from PIL import ImageChops
        m = ImageChops.multiply(mask, letras)
        tela.im.paste(Image.new("RGB", tela.im.size, papel), (0, 0), m)
        tela.redesenha()
    else:
        escreve(tinta)
    marca = p.get("marca") or {}
    assinatura(tela, t, marca, x0, y1 - 6, cor=papel if bloco else mistura(tinta, papel, 0.3))
    return tela, {"contratempo": sorted(fora), "linhas": len(linhas)}


# ------------------------------------------------------------------ P13 · letra riscada (sem foto) — Kyle Cooper, Se7en 1995 (princípio)
def risca(tela, box, cor_fundo, semente):
    """Scratchboard: riscos horizontais finos 'roendo' a letra + tremor de borda."""
    import random
    rnd = random.Random(semente)
    x0, y0, x1, y1 = [px(v) for v in box]
    for _ in range(int((y1 - y0) / px(3.2))):
        y = rnd.uniform(y0, y1)
        xa = rnd.uniform(x0, x1)
        xb = min(x1, xa + rnd.uniform(px(40), px(260)))
        tela.d.line([(xa, y), (xb, y + rnd.uniform(-px(1.5), px(1.5)))], fill=cor_fundo, width=max(1, int(rnd.uniform(1, px(2.2)))))


def p_riscada(p, W, H, formato, t, av):
    preto, branco = (7, 7, 7), (233, 230, 220)
    tela = Tela(W, H, preto)
    x0, y0, x1, y1 = area(H, formato)
    story = formato == "story"
    texto = limpa_texto(p.get("texto", ""), av)
    if len(texto.split()) > 14:
        av.append("texto longo para letra riscada: até ~10 palavras fica melhor")
    if "*" in texto:
        marcado = texto
    else:
        m = _ESCURO.search(texto)
        marcado = (texto[:m.start()] + "*" + m.group(0) + "*" + texto[m.end():]) if m else _destaque(texto)
    # chaves = palavra(s) em *destaque*; o resto em grotesca pequena e quieta
    blocos = []
    for seg in re.split(r"(\*[^*]+\*)", marcado):
        if not seg.strip():
            continue
        chave = seg.startswith("*") and seg.endswith("*")
        blocos.append((seg.strip("* ").strip(), chave))
    acc = vivo(t["acento"]) if p.get("modo") != "sem_acento" else branco
    if contraste(acc, preto) < 3:
        acc = branco
    # medir
    tam_mao = 480 if story else 420
    itens = []
    for k, (s, chave) in enumerate(blocos):
        if chave:
            tt = tam_mao
            while tt > 80 and largura(fonte("hand", px(tt)), s) > px((x1 - x0) * 0.9):
                tt -= 6
            itens.append(("mao", s, tt))
        else:
            b = Bloco(s.lower(), "grot-med", (x1 - x0) * 0.8, 400, 42, 28, lh=1.35, avisos=av)
            itens.append(("grot", b, b.tam))
    alturas = [(it[2] * 0.95 if it[0] == "mao" else it[1].alto + 24) for it in itens]
    total = sum(alturas)
    y = y0 + max(40, ((y1 - y0) - total) / 2)
    n_mao = 0
    for (tipo, obj, tt), h in zip(itens, alturas):
        if tipo == "mao":
            dx = [0, 0.16, 0.06, 0.2][n_mao % 4] * (x1 - x0)
            n_mao += 1
            f = fonte("hand", px(tt))
            cor = acc
            # traço engrossado (mão pesada) e depois riscado
            for ox in (-1.5, 0, 1.5):
                for oy in (-1.5, 0, 1.5):
                    tela.d.text((px(x0 + dx + ox), px(y + tt * 0.78 + oy)), obj, font=f, fill=cor, anchor="ls")
            risca(tela, (x0 + dx - 10, y, x0 + dx + largura(f, obj) / S + 10, y + tt * 0.95), preto, semente=len(obj) * 31 + n_mao)
        else:
            obj.desenha(tela, x0, y + 10, branco, track=0.04)
        y += h
    marca = p.get("marca") or {}
    assinatura(tela, t, marca, x0, y1 - 6, cor=mistura(branco, preto, 0.5))
    return tela, {"chaves": [s for s, c in blocos if c]}


NATIVOS.update({
    "vazio": p_vazio, "ogilvy": p_ogilvy, "heroi": p_heroi, "citacao": p_citacao,
    "zona": p_zona, "sincope": p_sincope, "riscada": p_riscada,
})


# ================================================================== CONDUÇÃO (kit v0.5)
# O assistente decide quase nada: publi.criar() escolhe o estilo, marca o destaque, desenha e devolve a
# MENSAGEM pronta + as opções já montadas. O assistente só repassa o texto da pessoa e cola a mensagem.

ESTILOS = [
    # n = número que a pessoa vê e digita ("usar 3", "ver 3"); mande/origem = o que ela lê em "ver N" e no ESTILOS.png.
    # O porquê de cada um, para o assistente: REFERENCIAS.md.
    dict(n=1, tipo="acento", nome="Acento", foto=False, pra="uma palavra salta, o resto fica quieto",
         mande="frase curta e forte, até ~9 palavras", origem="capas de disco de César Villela (Elenco, 1963)"),
    dict(n=2, tipo="manchete", nome="Manchete", foto=False, pra="só a frase, grande, como cartaz",
         mande="uma frase de até ~20 palavras", origem="cartazes só de texto da The Economist (1988→)"),
    dict(n=3, tipo="numero", nome="Número", foto=False, pra="um número gigante vira a peça",
         mande="um texto com um número exato (1.200, 98%, 15 anos)", origem="\"Thanks 2016\" do Spotify (Cannes 2017)"),
    dict(n=4, tipo="fina", nome="Letra fina", foto=True, pra="a foto manda e a frase vira parte dela",
         mande="foto + frase curta, até ~10 palavras", origem="títulos de Pablo Ferro (Dr. Fantástico, 1964)"),
    dict(n=5, tipo="selo", nome="Foto que fala", foto=True, pra="a foto sozinha, quase sem texto",
         mande="foto forte + até 3 palavras", origem="Toscani (Benetton) e \"Umbigo\" da DM9 (1993)"),
    dict(n=6, tipo="duotom", nome="Duas tintas", foto=True, pra="título forte sobre a foto em duas cores",
         mande="um título + data, hora ou detalhe em outra linha", origem="capas da Blue Note (Reid Miles, 1956–67)"),
    dict(n=7, tipo="vazio", nome="Vazio", foto=True, pra="objeto pequeno num campo enorme",
         mande="foto de um objeto + até ~5 palavras", origem="\"Think Small\" da Volkswagen (DDB, 1959)"),
    dict(n=8, tipo="ogilvy", nome="Foto e legenda", foto=True, pra="foto em cima, frase embaixo",
         mande="foto + um texto mais longo", origem="ordem de leitura de David Ogilvy (1983)"),
    dict(n=9, tipo="heroi", nome="Herói", foto=False, pra="um objeto ou um valor no centro, iluminado",
         mande="um valor (R$, %) ou foto de um objeto + 2 a 3 palavras", origem="anúncios da Absolut (TBWA, 1980)"),
    dict(n=10, tipo="citacao", nome="Depoimento", foto=True, pra="retrato e uma fala, com quem disse",
         mande="retrato + fala entre aspas — nome de quem disse", origem="\"got milk?\" (Bozell, 1995)"),
    dict(n=11, tipo="zona", nome="Zona calma", foto=False, pra="fundo vibrante e a frase numa ilha calma",
         mande="frase curta, com ou sem foto colorida", origem="capa de Rogério Duarte para Gilberto Gil (1968)"),
    dict(n=12, tipo="sincope", nome="Ritmo", foto=False, pra="uma palavra por linha, com ginga",
         mande="frase curta, uma ou duas palavras por linha", origem="capa de Villela para Lennie Dale (Elenco, 1963)"),
    dict(n=13, tipo="riscada", nome="Riscada", foto=False, pra="palavra escrita à mão e riscada, tom tenso",
         mande="frase curta de tom sério ou tenso", origem="títulos de Kyle Cooper para Se7en (1995)"),
]
CARTAO = (340, 550)  # ESTILOS.png: altura do topo e de cada cartão (render/estilos_png.py desenha com estes números)
_POR_TIPO = {e["tipo"]: e for e in ESTILOS}

_STOP = set("""a o as os um uma uns umas de do da dos das no na nos nas em por pra para pro com sem e ou que se
não nao é e foi ser ter tem mais menos muito muita seu sua seus suas meu minha nosso nossa você voce vocês voces
eu ele ela eles elas isso isto esse essa este esta aquele aquela ao aos à às já ja só so também tambem quando
como onde porque mas nem até ate lhe te me nós nos vai vou está esta estão estao""".split())
_MESES = r"jan|fev|mar|abr|mai|jun|jul|ago|set|out|nov|dez"
_DATA = re.compile(
    r"\b\d{1,2}/\d{1,2}(?:/\d{2,4})?\b|\b\d{1,2}h\d{0,2}\b|\b\d{1,2}:\d{2}\b|"
    r"\b(?:segunda|terça|terca|quarta|quinta|sexta|sábado|sabado|domingo)(?:-feira)?\b|"
    r"\b\d{1,2}\s+de\s+(?:" + _MESES + r")[a-zç]*\b", re.I)
_DATA_FORTE = re.compile(r"\b\d{1,2}/\d{1,2}\b|\b\d{1,2}h\d{0,2}\b|\b\d{1,2}:\d{2}\b|\b\d{1,2}\s+de\s+(?:" + _MESES + r")", re.I)
_NUM = re.compile(r"(?:R\$\s?)?\d[\d.,]*\s?(?:%|mil\b|mi\b|k\b|anos\b|meses\b|dias\b|horas\b|kg\b|km\b|x\b)?", re.I)
_PRECO = re.compile(r"R\$\s?\d|\d+\s?%\s?(?:off|de desconto)|\bleve\s+\d+\b|\bpor apenas\b|\bpromo", re.I)
_ESCURO = re.compile(r"\b(?:medo|cansa[çc]o|cansad[ao]|dor|dores|raiva|ansiedade|ansios[ao]|sozinh[ao]|solid[ãa]o|luto|"
                     r"chorei|chorar|perdi|morte|escuro|desisti[ru]?|exaust[ao]|burnout|culpa|vergonha)\b", re.I)
_ASPAS = re.compile(r"^\s*[\"“].+[\"”]|\s[—–-]\s*\S+.{0,40}$", re.S)
_IMG = (".jpg", ".jpeg", ".png", ".webp", ".heic", ".gif")


def _pasta_estado():  # a pasta de saída é da conversa: o estado não vaza para outra conversa
    return pasta_saida()


def _salva_estado(d):
    try:
        with open(os.path.join(_pasta_estado(), ".publi-ultimo.json"), "w", encoding="utf-8") as fh:
            json.dump(d, fh, ensure_ascii=False)
    except OSError:
        pass


def _le_estado():
    global _ULTIMO
    if _ULTIMO:
        return _ULTIMO
    try:
        with open(os.path.join(_pasta_estado(), ".publi-ultimo.json"), encoding="utf-8") as fh:
            _ULTIMO = json.load(fh)
    except (OSError, ValueError):
        _ULTIMO = None
    return _ULTIMO


_ULTIMO = None
_N = 0


def _palavras(s):
    s = re.sub(r"[*~]", "", s or "")
    return sorted(_limpa(w) for w in s.split() if _limpa(w))


def _destaque(texto):
    """Escolhe 1 palavra da própria pessoa para o acento: a mais longa que não é palavra vazia (empate: a última)."""
    if "*" in texto:
        return texto
    ws = texto.split()
    melhor = None
    for i, w in enumerate(ws):
        n = _limpa(w)
        if len(n) < 4 or n in _STOP or n.isdigit():
            continue
        if melhor is None or len(n) >= len(_limpa(ws[melhor])):
            melhor = i
    if melhor is None:
        return texto
    w = ws[melhor]
    m = re.match(r"^([^\wÀ-ÿ]*)([\wÀ-ÿ-]+)(.*)$", w)
    ws[melhor] = f"{m.group(1)}*{m.group(2)}*{m.group(3)}" if m else f"*{w}*"
    return " ".join(ws)


def _numero(texto):
    """Primeiro número exato do texto (com unidade curta), ou None."""
    datas = [d.span() for d in _DATA.finditer(texto)]
    for m in _NUM.finditer(texto):
        s = m.group(0).strip().rstrip(".,")
        # teu-marketing: pula número dentro de data/hora ("20/11" não vira "11"); o original só olhava o início
        if re.search(r"\d", s) and not any(a < m.end() and m.start() < b for a, b in datas):
            return s
    return None


def _escolhe(texto, foto):
    n = len(texto.split())
    linhas = [l for l in texto.split("\n") if l.strip()]
    aspas = bool(_ASPAS.search(texto)) and n >= 4
    if foto and aspas:
        return "citacao"
    if _PRECO.search(texto):
        return "heroi"
    if _DATA_FORTE.search(texto) or (_DATA.search(texto) and not aspas and n <= 12):
        return "duotom"
    if foto:
        if n <= 3:
            return "selo"
        return "fina" if n <= 10 else "ogilvy"
    if _ESCURO.search(texto) and n <= 14:
        return "riscada"
    if _numero(texto) and n <= 25:
        return "numero"
    if len(linhas) >= 3 and all(len(l.split()) <= 3 for l in linhas):
        return "sincope"
    return "acento" if n <= 9 else "manchete"


def _campos(tipo, texto, destaque, foto_=None):
    """Texto da pessoa -> campos do formato. Só separa; nunca troca palavra."""
    if tipo == "numero":
        num = _numero(texto) or ""
        resto = texto.replace(num, "", 1).strip(" ,.:;-–—") if num else texto
        return {"numero": num, "texto": resto}
    if tipo == "duotom":
        linhas = [l.strip() for l in texto.split("\n") if l.strip()]
        if len(linhas) > 1:
            tit, sub = linhas[0], " · ".join(linhas[1:])
        else:
            m = _DATA.search(texto)
            ini = m.start() if m else len(texto)
            # puxa junto preposição/artigo e dia da semana logo antes da data ("no sábado 20/11")
            antes = texto[:ini]
            k = re.search(r"(?:\b(?:no|na|nos|nas|dia|em|neste|nesta|próximo|próxima|proximo|proxima|às|as|a partir de)\s+)+$", antes, re.I)
            if k:
                ini = k.start()
            tit, sub = texto[:ini].strip(" ,.:;-–—"), texto[ini:].strip()
            if not tit:
                tit, sub = texto, ""
        if destaque:
            tit = _destaque(tit)
        return {"titulo": tit, "subtitulo": sub}
    if tipo == "heroi" and not foto_:
        num = _numero(texto) or ""
        return {"objeto": num, "texto": texto.replace(num, "", 1).strip(" ,.:;-–—") if num else texto}
    if tipo in ("acento", "vazio", "zona", "ogilvy") and destaque:
        texto = _destaque(texto)
    return {"texto": texto}


def _confere(texto, campos):
    usado = " ".join(str(v) for k, v in campos.items() if k in ("texto", "titulo", "subtitulo", "numero", "objeto"))
    return _palavras(usado) == _palavras(texto)


def ultima_foto(depois_de=None):
    """Foto mais recente que a pessoa mandou (ignora as imagens que o próprio publi gerou)."""
    achadas = []
    for raiz in ("/mnt", os.getcwd()):
        for dirpath, dirs, files in os.walk(raiz):
            # skills (esta e as do Claude) trazem imagens próprias: nunca são a foto da pessoa
            dirs[:] = [x for x in dirs if os.path.join(dirpath, x) not in ("/mnt/skills", AQUI)]
            for f in files:
                if f.lower().endswith(_IMG) and not f.startswith(("publi-", "teste-", "ESTILO")):
                    c = os.path.join(dirpath, f)
                    try:
                        achadas.append((os.path.getmtime(c), c))
                    except OSError:
                        pass
    achadas.sort()
    if not achadas or (depois_de and achadas[-1][0] < depois_de):
        return None
    return achadas[-1][1]


def _proximo_estilo(tipo, foto, texto):
    if foto:
        ordem = ["fina", "selo", "vazio", "ogilvy", "citacao", "zona", "duotom", "heroi"]
    else:
        ordem = ["acento", "manchete", "sincope", "zona"]
        ordem += [x for x, ok in (("numero", _numero(texto)), ("heroi", _PRECO.search(texto) or _numero(texto)),
                                  ("duotom", _DATA.search(texto)), ("riscada", _ESCURO.search(texto))) if ok]
    if tipo not in ordem:
        return ordem[0]
    return ordem[(ordem.index(tipo) + 1) % len(ordem)]


_AVISOS_SIMPLES = [
    ("cortado", "Dica: o texto ficou grande pra esse estilo e uma parte foi cortada. Mande uma versão mais curta ou digite 2."),
    ("pede foto", "Esse estilo fica melhor com foto. Se tiver, manda que eu refaço."),
    ("emoji", "Tirei os emojis (eles não combinam com esse acabamento)."),
    ("falta o número", "Não achei um número no texto pra esse estilo."),
    ("longa", "Dica: esse estilo fica mais forte com menos palavras. Se quiser, mande uma versão mais curta."),
    ("texto longo", "Dica: esse estilo fica mais forte com menos palavras. Se quiser, mande uma versão mais curta."),
    ("destaque grande", "A palavra em destaque ficou grande demais; posso destacar outra."),
    ("pede o retrato", "Esse estilo fica melhor com o retrato de quem fala. Se tiver, manda que eu refaço."),
    ("falta o objeto", "Esse estilo pede uma foto do produto ou um valor. Se tiver, manda que eu refaço."),
    ("fica melhor", "Dica: esse estilo fica mais forte com menos palavras. Se quiser, mande uma versão mais curta."),
]


def _avisos_simples(avs):
    out = []
    for a in avs:
        for chave, frase in _AVISOS_SIMPLES:
            if chave in a and frase not in out:
                out.append(frase)
                break
    return out[:2]


def criar(texto="", foto=None, marca=None, formato="post", estilo=None, destaque=True, modo=None, cor_foto=False,
          mostrar=True):
    """Entrada única do assistente. texto = EXATAMENTE o que a pessoa escreveu. foto = caminho ou None.
    marca = {"nome","perfil","cor"?,"logo"?}. estilo = número (1–13) ou nome; None = o motor escolhe."""
    global _ULTIMO
    texto = (texto or "").replace("\r", "").strip()
    st = _le_estado() or {}
    if marca is None:
        marca = st.get("marca") or {}
    if estilo is None and st.get("pendente"):  # a pessoa pediu "usar N" antes de mandar o texto
        estilo = st["pendente"]
    if foto and not os.path.exists(str(foto)):
        foto = None
    e = _estilo(estilo) if estilo is not None else None
    tipo = e["tipo"] if e else _escolhe(texto, foto)
    campos = _campos(tipo, texto, destaque, foto)
    if not _confere(texto, campos):  # nunca deveria acontecer: o motor só separa
        campos = {"texto": texto} if tipo != "duotom" else {"titulo": texto, "subtitulo": ""}
    global _N
    _N += 1
    import time
    pedido = {"tipo": tipo, "formato": formato, "marca": marca, **campos,
              "nome": f"publi-{tipo}-{formato}-{time.strftime('%H%M%S')}{_N}"}
    if foto:
        pedido["imagem"] = foto
    if modo:
        pedido["modo"] = modo
    if cor_foto:
        pedido["cor_foto"] = True
    r = render(pedido)
    e = _POR_TIPO[tipo]
    outro_fmt = "post" if formato == "story" else "story"
    prox = _POR_TIPO[_proximo_estilo(tipo, bool(foto), texto)]
    base = dict(texto=texto, foto=foto, marca=marca, formato=formato, estilo=tipo, destaque=destaque, modo=modo,
                cor_foto=cor_foto)
    opcoes = {"1": {**base, "formato": outro_fmt}, "2": {**base, "estilo": prox["tipo"]}}
    rot = {"1": f"versão {outro_fmt}", "2": f"estilo {prox['n']} · {prox['nome']}"}
    if tipo in ("acento", "manchete", "numero", "sincope", "vazio", "ogilvy"):
        opcoes["3"] = {**base, "modo": None if modo == "escuro" else "escuro"}
        rot["3"] = "versão clara" if modo == "escuro" else "versão escura"
    elif tipo == "duotom":
        opcoes["3"] = {**base, "destaque": not destaque}
        rot["3"] = "sem destaque" if destaque else "com destaque"
    elif tipo == "fina" and foto:
        opcoes["3"] = {**base, "cor_foto": not cor_foto}
        rot["3"] = "foto em preto e branco" if cor_foto else "foto na cor da marca"
    linhas = [f"Estilo {e['n']} · {e['nome']} — {e['pra']}."]
    linhas += _avisos_simples(r["travas"].get("avisos", []))
    linhas.append("  ".join(f"{k}) {v}" for k, v in rot.items()))
    linhas.append(f"Digite {'1, 2 ou 3' if '3' in rot else '1 ou 2'} · *ver exemplos* · *novo* pra fazer outra · *ajuda*")
    r["estilo"] = e["n"]
    r["mensagem"] = "\n".join(linhas)
    r["opcoes"] = opcoes
    _ULTIMO = {"marca": marca, "ultimo": base, "opcoes": opcoes}
    _salva_estado(_ULTIMO)
    if mostrar:
        _mostra(r["png"])
    _diz(r["mensagem"], r["png"])
    return r


def opcao(n):
    """A pessoa respondeu um número (1, 2 ou 3) depois de uma imagem."""
    st = _le_estado()
    if not st or str(n) not in st.get("opcoes", {}):
        print("SEM_HISTORICO: chame publi.criar() de novo com o mesmo texto da pessoa.")
        return None
    return criar(**st["opcoes"][str(n)])


def usar(n=None, formato=None):
    """A pessoa pediu um estilo pelo número/nome ("usar 3"), com o último texto."""
    global _ULTIMO
    st = _le_estado() or {}
    if not st.get("ultimo"):
        e = _estilo(n)
        if not e:
            return estilos()
        _ULTIMO = {**st, "pendente": e["n"]}
        _salva_estado(_ULTIMO)
        _diz(f"Estilo {e['n']} · {e['nome']}. Me manda o texto que vai na imagem"
             + (" e a foto (ele fica melhor com foto)." if e["foto"] else ".") + " Eu não mudo nenhuma palavra.")
        return None
    b = dict(st["ultimo"])
    if n is not None:
        b["estilo"] = n
    if formato:
        b["formato"] = formato
    return criar(**b)


def _mostra(caminho):
    try:
        from IPython.display import Image as _I, display
        display(_I(filename=caminho))
    except Exception:
        pass


def _diz(mensagem, arquivo=None):
    """Tudo o que o assistente repassa sai daqui: o arquivo para mostrar e a mensagem igual."""
    if arquivo:
        print("\nMOSTRAR À PESSOA (imagem + arquivo para baixar): " + arquivo)
    print("\nMENSAGEM PARA A PESSOA (colar exatamente assim, sem acrescentar nada):\n" + mensagem)


def _estilo(n):
    s = _limpa(str(n))
    return next((x for x in ESTILOS if str(x["n"]) == s or x["tipo"] == s or _limpa(x["nome"]) == s), None)


def _copia_estilos(cartao=None):
    """Copia o ESTILOS.png do projeto para a pasta de saída (inteiro ou só o cartão de um estilo)."""
    p = os.path.join(AQUI, "ESTILOS.png")
    if not os.path.isfile(p):
        return None
    im = Image.open(p)
    nome = "ESTILOS-publi.png"
    if cartao:
        topo, alt = CARTAO
        y = topo + (cartao - 1) * alt
        im = im.crop((0, y, im.width, y + alt))
        nome = f"ESTILO-{cartao}.png"
    out = os.path.join(pasta_saida(), nome)
    im.save(out)
    return out


def estilos(mostrar=True):
    """"ver exemplos": a imagem com os 13 estilos + a lista curta."""
    linhas = ["Os 13 estilos do Publi:"]
    for e in ESTILOS:
        linhas.append(f"{e['n']} · {e['nome']}{' (com foto)' if e['foto'] else ''} — {e['pra']}.")
    linhas.append("")
    linhas.append("Digite *ver* + o número pra ver um de perto e de onde ele vem (ex.: ver 7).")
    if (_le_estado() or {}).get("ultimo"):
        linhas.append("Pra refazer o último post num desses, digite *usar* + o número (ex.: usar 7).")
    else:
        linhas.append("Pra fazer um post num desses, digite *usar* + o número (ex.: usar 7). Ou digite *post*.")
    txt = "\n".join(linhas)
    arq = _copia_estilos()
    if mostrar and arq:
        _mostra(arq)
    _diz(txt, arq)
    return txt


def ver(n):
    """"ver N": o cartão do estilo (exemplo real) + o que mandar + de onde vem."""
    e = _estilo(n)
    if not e:
        return estilos()
    arq = _copia_estilos(e["n"])
    if arq:
        _mostra(arq)
    usar_ = "refazer o último post nele" if (_le_estado() or {}).get("ultimo") else "fazer um post nele"
    txt = "\n".join([
        f"Estilo {e['n']} · {e['nome']} — {e['pra']}.",
        f"Mande: {e['mande']}.",
        f"De onde vem: {e['origem']}. O Publi usa só o princípio, sempre com a sua cor e o seu texto.",
        f"Digite *usar {e['n']}* pra {usar_} · *ver exemplos* · *ajuda*"])
    _diz(txt, arq)
    return txt


def pronto():
    """Portão: confere o ambiente em ~1 s (sem desenhar peça)."""
    import PIL
    falta = [n + ".ttf" for n in FONTES if not os.path.isfile(os.path.join(AQUI, "fontes", n + ".ttf"))]
    falta += [] if os.path.isfile(os.path.join(AQUI, "ESTILOS.png")) else ["ESTILOS.png"]
    if falta:
        print("PUBLI_FALTA " + ", ".join(falta))
        return {"ok": False, "falta": falta}
    for nome in FONTES:
        fonte(nome, 20)
    d = {"publi": VERSAO, "pillow": PIL.__version__, "saida": pasta_saida(), "ok": True}
    print("PUBLI_OK " + json.dumps(d, ensure_ascii=False))
    return d


# ------------------------------------------------------------------ saída
def pasta_saida():
    for c in ("/mnt/user-data/outputs", "/mnt/data"):
        if os.path.isdir(c) and os.access(c, os.W_OK):
            return c
    return os.getcwd()


def render(pedido: dict) -> dict:
    tipo = pedido.get("tipo", "acento")
    formato = pedido.get("formato", "post")
    W, H, top, bot = FORMATOS[formato]
    im, travas = render_nativo({**pedido, "tipo": tipo})
    nome = pedido.get("nome") or f"publi-{tipo}-{formato}"
    caminho = os.path.join(pedido.get("pasta") or pasta_saida(), nome + ".png")
    im.save(caminho, "PNG", optimize=True)
    res = {"png": caminho, "tipo": tipo, "formato": formato, "tamanho": [W, H], "travas": travas}
    print(json.dumps(res, ensure_ascii=False))
    return res
