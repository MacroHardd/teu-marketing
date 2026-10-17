# Copiado de ~/projetos/publi-lab/render/bluenote_src.py (2026-10-16, sem commit lá) SEM MUDANÇA.
# Só as composições faixa e janela são usadas aqui (aprovadas); parede está em revisão no publi-lab.
# ------------------------------------------------------------------ P6 nova · 2 tintas + branco — Blue Note (Reid Miles / Francis Wolff)
# Em revisão (2026-10-16): substitui p_duotom se o Igor aprovar. Carregado por cima do motor em teste/bluenote.py.
# Trava: fundo branco (3ª tinta), preto + 1 cor da marca, foto P&B. Nunca caixa/fundo atrás do texto.
# Composições: faixa (texto em cima, foto sangrada embaixo) · janela (foto em bloco no canto) ·
# parede (foto inteira, texto na área clara da própria foto — só se a foto tiver essa área).

PAPEL = (250, 249, 246)


def _pb(im, contraste=1.3):
    g = ImageEnhance.Contrast(ImageOps.grayscale(im)).enhance(contraste)
    return ImageOps.colorize(g, black=(14, 14, 14), white=PAPEL)


def _area_calma(caminho, W, H):
    """Foto inteira cortada no quadro: onde o texto cai (70% da largura, terço de cima) é claro e liso o bastante?"""
    im = ImageOps.grayscale(foto_cover(caminho, W // 4, H // 4))
    st = ImageStat.Stat(im.crop((0, 0, int(im.width * 0.7), int(im.height * 0.34))))
    return st.mean[0] > 215 and st.stddev[0] < 45


def _textos(p, av):
    tit = limpa_texto(p.get("titulo") or p.get("texto", ""), av)
    sub = limpa_texto(p.get("subtitulo", ""), av)
    return tit, sub


def _assina_dir(tela, marca, x1, y, cor=(18, 18, 18)):
    """Assinatura alinhada à direita (onde a Blue Note põe o selo), em preto."""
    s = (marca.get("perfil") or marca.get("nome") or "").upper()
    if not s:
        return
    f = fonte("grot-semi", px(26))
    tr = 0.08 * px(26)
    xx = px(x1) - (sum(largura(f, ch) + tr for ch in s) - tr)
    for ch in s:
        tela.d.text((xx, px(y)), ch, font=f, fill=cor, anchor="ls")
        xx += largura(f, ch) + tr


def _blocos(tit, sub, w, h, story, grande):
    smax = (150 if story else 128) if grande else (124 if story else 112)
    b = Bloco(tit, "grot-bold", w, h - (70 if sub else 0), smax, 44, lh=1.02, max_linhas=4, avisos=None)
    s = Bloco(sub.upper(), "grot-med", w, 120, 34 if story else 30, 22, lh=1.2, max_linhas=3, equilibrar=False) if sub else None
    return b, s, b.alto + (22 + s.alto if s else 0)


def _pinta(tela, b, s, x, y, w, tinta, cor_tit, acc, alinhar="esq"):
    """Título (cor da marca; com *destaque*: tinta + destaque na cor) e linha de baixo na tinta. Nada atrás."""
    tem_dest = any(st == "a" for l in b.linhas for _, st in l)
    b.desenha(tela, x, y, tinta if tem_dest else cor_tit, cor_a=acc, alinhar=alinhar, wbox=w)
    if s:
        s.desenha(tela, x, y + b.alto + 22, tinta, alinhar=alinhar, wbox=w, track=0.02)


def _escreve(tela, t, tit, sub, x, y, w, h, story, acc, grande):
    b, s, alto = _blocos(tit, sub, w, h, story, grande)
    _pinta(tela, b, s, x, y, w, (18, 18, 18), acc, acc)
    return b, y + alto


def _parede(tela, p, W, H, formato, t, tit, sub, marca, story):
    """Gettin' Around: foto inteira, texto direto na área mais calma dela. Sem caixa: o contraste vem só do tom
    da foto inteira (sobe o preto para texto escuro, baixa o branco para texto claro) e da escolha da tinta."""
    x0, y0, x1, y1 = area(H, formato)
    src = ImageOps.exif_transpose(Image.open(p["imagem"])).convert("L")
    mini = src.copy()
    mini.thumbnail((720, 720))
    pw, ph = W // 8, H // 8
    esc = pw / W
    hr = (y1 - y0) * (0.3 if story else 0.34)
    wc = (x1 - x0) * 0.58
    passos = 6
    cands = {}
    for i in range(passos + 1):  # faixas deslizando de cima a baixo: inteira, esquerda, direita
        ty = y0 + (y1 - y0 - hr) * i / passos
        cands[f"{i}"] = (x0, ty, x1, ty + hr)
        cands[f"{i}_esq"] = (x0, ty, x0 + wc, ty + hr)
        cands[f"{i}_dir"] = (x1 - wc, ty, x1, ty + hr)

    def pct(r, q):
        hist, n, a = r.histogram(), r.width * r.height, 0
        for v, c in enumerate(hist):
            a += c
            if a >= q * n:
                return v
        return 255

    # posicionamento: o corte da foto também se move (assunto encostado de um lado abre espaço do outro)
    # ...mas sem perder o assunto: o corte tem que guardar quase toda a "massa de bordas" que o corte central guarda
    tudo = mini.filter(ImageFilter.GaussianBlur(2)).filter(ImageFilter.FIND_EDGES)
    cw, ch = (mini.width, int(mini.width * H / W)) if mini.width * H / W <= mini.height else (int(mini.height * W / H), mini.height)

    def guarda(cen):
        cx, cy = int((mini.width - cw) * cen[0]), int((mini.height - ch) * cen[1])
        return ImageStat.Stat(tudo.crop((cx, cy, cx + cw, cy + ch))).sum[0]

    base = guarda((0.5, 0.5))
    melhor = None
    for cen in ((0.5, 0.5), (0.2, 0.5), (0.8, 0.5), (0.5, 0.2), (0.5, 0.8)):
        if cen != (0.5, 0.5) and guarda(cen) < 0.95 * base:
            continue
        peq = ImageEnhance.Contrast(ImageOps.fit(mini, (pw, ph), method=Image.BILINEAR, centering=cen)).enhance(1.15)
        # "ocupado" = bordas com desfoque grande: textura fina (mato, tecido) some, forma grande (pessoa, prato) fica
        bordas = peq.filter(ImageFilter.GaussianBlur(3)).filter(ImageFilter.FIND_EDGES)
        for nome, box in cands.items():
            bb = tuple(int(v * esc) for v in box)
            r = peq.crop(bb)
            st = ImageStat.Stat(r)
            i = int(nome.split("_")[0])
            custo = (ImageStat.Stat(bordas.crop(bb)).mean[0] + 0.25 * st.stddev[0]
                     + (0 if i in (0, passos) else 1.0)  # texto nas pontas (como nas capas) leva vantagem
                     - (1.0 if "_" not in nome else 0)  # faixa inteira: letra maior
                     + (0 if cen == (0.5, 0.5) else 0.8))  # corte central se empatar
            if melhor is None or custo < melhor[0]:
                melhor = (custo, cen, nome, (st.stddev[0], st.mean[0], pct(r, 0.15), pct(r, 0.85)))
    custo, cen, nome, medida = melhor
    custo_final = round(custo, 1)
    g = ImageEnhance.Contrast(ImageOps.fit(src, (px(W), px(H)), method=Image.LANCZOS, centering=cen)).enhance(1.15)
    medidas = {nome: medida}
    dp, media, p15, p85 = medidas[nome]
    claro = media >= 128
    tinta = (18, 18, 18) if claro else PAPEL
    # tom da foto inteira: até a área do texto dar 4,5:1 com a tinta
    lo, hi = 0, 255
    if claro:
        while lo < 120 and contraste(tinta, (lo + p15 * (255 - lo) // 255,) * 3) < 4.5:
            lo += 10
    else:
        while hi > 110 and contraste(tinta, (p85 * hi // 255,) * 3) < 4.5:
            hi -= 10
    g = g.point(lambda v: lo + v * (hi - lo) // 255)
    tela.im.paste(ImageOps.colorize(g, black=(14, 14, 14), white=PAPEL), (0, 0))
    tela.redesenha()
    tom = lo + media * (hi - lo) / 255
    fundo_txt = (int(tom),) * 3
    acc = t["acento"] if contraste(t["acento"], fundo_txt) >= 3 else tinta
    bx0, by0, bx1, by1 = cands[nome]
    larga = "_" not in nome
    topo = int(nome.split("_")[0]) <= passos // 2
    w = (bx1 - bx0) * (0.9 if larga else 1)
    b, s, alto = _blocos(tit, sub, w, by1 - by0, story, larga)
    alinhar = "dir" if nome.endswith("_dir") else "esq"
    bx = bx1 - w if alinhar == "dir" else bx0
    y = by0 + 6 if topo else by1 - alto - 10
    _pinta(tela, b, s, bx, y, w, tinta, acc, acc, alinhar)
    # assinatura logo abaixo/acima do bloco de texto, na mesma tinta (fica na área que já foi medida como calma)
    ay = y + alto + 64 if topo else y - 40
    if alinhar == "dir":
        _assina_dir(tela, marca, bx + w, ay, cor=tinta)
    else:
        assinatura(tela, t, marca, bx, ay, cor=tinta)
    return b, nome, custo_final


def p_bluenote(p, W, H, formato, t, av):
    story = formato == "story"
    x0, y0, x1, y1 = area(H, formato)
    tela = Tela(W, H, PAPEL)
    acc = acento_sobre(t, PAPEL)
    tit, sub = _textos(p, av)
    foto = tem_foto(p)
    comp = p.get("composicao")
    if not foto:
        av.append("este formato pede foto: sem foto, ficou só o texto no branco")
        comp = "so_texto"
    elif not comp:
        comp = "parede" if _area_calma(p["imagem"], W, H) else "faixa"
    marca = p.get("marca") or {}

    if comp == "parede":
        b, onde, ocupado = _parede(tela, p, W, H, formato, t, tit, sub, marca, story)
        comp = "parede-" + onde
    elif comp == "janela":
        fw, fh = W * 0.56, H * (0.42 if story else 0.46)
        fx, fy = W - fw, 0 if not story else y0 - 60
        tela.im.paste(_pb(foto_cover(p["imagem"], px(fw), px(fh))), (px(fx), px(fy)))
        tela.redesenha()
        ty = fy + fh + 64
        b, _ = _escreve(tela, t, tit, sub, x0, ty, x1 - x0, y1 - ty - 60, story, acc, True)
        assinatura(tela, t, marca, x0, y0 + 30, cor=(18, 18, 18))
    elif comp == "faixa":
        faixa = (y0 - 72) + H * (0.36 if story else 0.34)
        b, yy = _escreve(tela, t, tit, sub, x0, y0 + 6, (x1 - x0) * 0.9, faixa - y0 - 80, story, acc, False)
        topo = max(faixa, yy + 80)
        tela.im.paste(_pb(foto_cover(p["imagem"], px(W), px(H - topo))), (0, px(topo)))
        tela.redesenha()
        _assina_dir(tela, marca, x1, topo - 28)
    else:  # so_texto
        b, _ = _escreve(tela, t, tit, sub, x0, y0 + (y1 - y0) * 0.45, x1 - x0, (y1 - y0) * 0.5, story, acc, True)
        assinatura(tela, t, marca, x0, y0 + 30, cor=(18, 18, 18))
    if b.cortado:
        av.append("título longo demais para este formato: foi cortado — encurtar ou dividir")
    return tela, {"titulo_px": b.tam, "composicao": comp, **({"ocupado": ocupado} if comp.startswith("parede") else {})}


NATIVOS.update({"bluenote": p_bluenote})
