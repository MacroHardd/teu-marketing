// Post estático (feed 4:5, 1080×1350) das regras aprovadas — o que sobra de cada regra parada. Todos aprovados 13/10 como
// referência; o Igor dirige cada publicação. Regra 5 e 14 não têm estático (5 perde o elo com a música; 14 não existe parada).
// Regra 6 parada: o contratempo vem de `fora` (índices das palavras fora da coluna) — sem música, a síncope é escolha.
import React from "react";
import { AbsoluteFill } from "remotion";
import { fitText } from "@remotion/layout-utils";
import { CUT, GROT, HAND, PAL, SH, SW, THIN } from "./presets";
import { bare } from "./musica";
import { Imagem, ImagemFundo, Scratch } from "./base";
import { PaletaAcento } from "./regras/acento";
import { PaletaZona } from "./regras/zona";

const palavras = (t: string) => t.split(/\s+/).filter(Boolean);
const has = (list: string[]) => { const s = new Set(list.map(bare)); return (w: string) => s.has(bare(w)); };
const Credito: React.FC<{ texto?: string; color: string }> = ({ texto, color }) => texto ? (
  <div style={{ position: "absolute", left: 80, bottom: 70, fontFamily: GROT, fontWeight: 500, fontSize: 26, letterSpacing: "0.08em", textTransform: "uppercase", color, opacity: 0.7 }}>{texto}</div>
) : null;

// ---------------------------------------------------------------- regra 1
export type E1Props = { texto: string; acento: string[]; paleta?: PaletaAcento; credito?: string };
export const EAcento: React.FC<E1Props> = ({ texto, acento, paleta = PAL.villela, credito }) => {
  const { paper, ink, acc } = paleta;
  const isAcc = has(acento);
  return (
    <AbsoluteFill style={{ background: paper }}>
      {[{ x: 860, y: 170 }, { x: 120, y: 1040 }, { x: 900, y: 1150 }].map((d, k) => (
        <div key={k} style={{ position: "absolute", left: d.x, top: d.y, width: 40, height: 40, borderRadius: 20, background: acc }} />
      ))}
      <div style={{ position: "absolute", left: 80, top: 380, width: 900, fontFamily: CUT, fontSize: 150, lineHeight: 0.98, textTransform: "uppercase", color: ink }}>
        {palavras(texto).map((w, k) => <span key={k} style={{ color: isAcc(w) ? acc : ink }}>{w} </span>)}
      </div>
      <Credito texto={credito} color={ink} />
    </AbsoluteFill>
  );
};

// ---------------------------------------------------------------- regra 3 (fundo desenhado OU imagem)
export type E3Props = { texto: string; acento?: string[]; paleta?: PaletaZona; imagem?: Imagem };
export const EZona: React.FC<E3Props> = ({ texto, acento = [], paleta = PAL.gil, imagem }) => {
  const { dark, a, b, wave, white, acc } = paleta;
  const isAcc = has(acento);
  const N = 28;
  const p = (ang: number) => `${50 + 120 * Math.cos((ang * Math.PI) / 180)}% ${50 + 120 * Math.sin((ang * Math.PI) / 180)}%`;
  const path = (y: number) => `M0 ${y} ` + Array.from({ length: 13 }, (_, j) => `Q ${j * 90 + 45} ${y + (j % 2 ? 60 : -60)} ${(j + 1) * 90} ${y}`).join(" ");
  return (
    <AbsoluteFill style={{ background: dark, overflow: "hidden" }}>
      {imagem ? <ImagemFundo img={imagem} filter="saturate(1.6) contrast(1.15)" /> : (
        <>
          <AbsoluteFill style={{ transform: "rotate(4deg) scale(1.6)" }}>
            {Array.from({ length: N }, (_, j) => (
              <div key={j} style={{ position: "absolute", inset: 0, background: j % 2 ? a : b, clipPath: `polygon(50% 50%, ${p((j / N) * 360)}, ${p(((j + 1) / N) * 360)})` }} />
            ))}
          </AbsoluteFill>
          <svg width={SW} height={SH} style={{ position: "absolute", inset: 0 }}>
            <path d={path(250)} stroke={wave} strokeWidth={60} fill="none" />
            <path d={path(250)} stroke={white} strokeWidth={14} fill="none" />
          </svg>
        </>
      )}
      <div style={{ position: "absolute", left: 90, top: 430, width: 900, height: 600, borderRadius: 450, background: dark, border: `12px solid ${wave}` }} />
      <div style={{ position: "absolute", left: 190, top: 500, width: 700, height: 460, display: "flex", alignItems: "center", justifyContent: "center", textAlign: "center", fontFamily: CUT, fontSize: 84, lineHeight: 1.0, textTransform: "uppercase", color: white }}>
        <div>{palavras(texto).map((w, k) => <span key={k} style={{ color: isAcc(w) ? acc : white }}>{w} </span>)}</div>
      </div>
    </AbsoluteFill>
  );
};

// ---------------------------------------------------------------- regra 9 (linhas curtas, 1 por linha)
export type E9Props = { linhas: string[]; imagem: Imagem; ink: string; tint?: string; blend?: React.CSSProperties["mixBlendMode"] };
export const EFina: React.FC<E9Props> = ({ linhas, imagem, ink, tint, blend = "multiply" }) => (
  <AbsoluteFill style={{ background: "#000" }}>
    <ImagemFundo img={imagem} filter="grayscale(1) contrast(1.35) brightness(0.75)" />
    {tint ? <AbsoluteFill style={{ background: tint, mixBlendMode: blend }} /> : null}
    <AbsoluteFill style={{ padding: "50px 60px" }}>
      {linhas.map((r, k) => {
        const weight = k % 2 ? "400" : "100";
        const fs = Math.min(fitText({ text: r, withinWidth: SW - 120, fontFamily: THIN, fontWeight: weight }).fontSize, 420);
        return <div key={k} style={{ fontFamily: THIN, fontWeight: weight, fontSize: fs * 0.8, lineHeight: 0.9, color: ink, whiteSpace: "nowrap" }}>{r.toUpperCase()}</div>;
      })}
    </AbsoluteFill>
  </AbsoluteFill>
);

// ---------------------------------------------------------------- regra 6 (síncope congelada)
export type E6Props = { texto: string; fora: number[]; paleta?: { paper: string; ink: string }; bloco?: boolean; credito?: string };
export const ESincope: React.FC<E6Props> = ({ texto, fora, paleta = PAL.villela, bloco = true, credito }) => {
  const { paper, ink } = paleta;
  const ws = palavras(texto);
  const off = new Set(fora);
  const COL = 220, ROW = Math.min(150, (SH - 100 - 140 - 170) / Math.max(ws.length - 1, 1)), X0 = 80, Y0 = 170, B = { l: 540, t: 760 };
  const words = (color: string) => ws.map((w, k) => (
    <div key={k} style={{ position: "absolute", left: X0 + (off.has(k) ? COL : 0), top: Y0 + k * ROW, fontFamily: CUT, fontSize: 140 * (ROW / 150), lineHeight: 1, textTransform: "uppercase", whiteSpace: "nowrap", color }}>{w}</div>
  ));
  return (
    <AbsoluteFill style={{ background: paper }}>
      {bloco ? (
        <>
          <div style={{ position: "absolute", left: B.l, top: B.t, right: 0, bottom: 0, background: ink }} />
          <AbsoluteFill style={{ clipPath: `polygon(0 0, 100% 0, 100% ${B.t}px, ${B.l}px ${B.t}px, ${B.l}px 100%, 0 100%)` }}>{words(ink)}</AbsoluteFill>
          <AbsoluteFill style={{ clipPath: `inset(${B.t}px 0 0 ${B.l}px)` }}>{words(paper)}</AbsoluteFill>
        </>
      ) : words(ink)}
      <Credito texto={credito} color={bloco ? paper : ink} />
    </AbsoluteFill>
  );
};

// ---------------------------------------------------------------- regra 10 (só o risco; o tremor se perde)
export type E10Props = { texto: string; chave: string[]; paleta?: { bg: string; ink: string }; acento?: string[]; corAcento?: string; maior?: string[] };
export const ERiscada: React.FC<E10Props> = ({ texto, chave, paleta = PAL.se7en, acento = [], corAcento = PAL.villela.acc, maior = acento }) => {
  const { bg, ink } = paleta;
  const isKey = has(chave), isAcc = has(acento), isBig = has(maior); // maior = chave que manda (padrão: as de acento)
  const blocks: { key: boolean; ws: string[] }[] = [];
  for (const w of palavras(texto)) {
    const key = isKey(w);
    const last = blocks[blocks.length - 1];
    if (!key && last && !last.key) last.ws.push(w);
    else blocks.push({ key, ws: [w] });
  }
  return (
    <AbsoluteFill style={{ background: bg, padding: "110px 80px", display: "flex", flexDirection: "column", justifyContent: "center" }}>
      <Scratch id="s10" seed={3} />
      {blocks.map((b, j) => {
        const t = b.ws.map((w) => w.replace(/,$/, "")).join(" ");
        if (!b.key) return <div key={j} style={{ fontFamily: GROT, fontWeight: 500, fontSize: 42, letterSpacing: "0.04em", lineHeight: 1.3, color: ink, textTransform: "lowercase", margin: "10px 0" }}>{t}</div>;
        const acc = b.ws.some(isAcc);
        const col = acc ? corAcento : ink;
        return <div key={j} style={{ fontFamily: HAND, fontSize: b.ws.some(isBig) ? 300 : 230, lineHeight: 0.92, color: col, WebkitTextStroke: `6px ${col}`, filter: "url(#s10)", marginLeft: (j * 137) % 160 }}>{t}</div>;
      })}
    </AbsoluteFill>
  );
};
