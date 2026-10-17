// Da skill (base.tsx): só as peças que os estáticos usam (Scratch e ImagemFundo), sem mudança.
import React from "react";
import { Img, staticFile } from "remotion";

// regra 10: letra arranhada (scratchboard) — warp + riscos horizontais que comem o traço
export const Scratch: React.FC<{ id: string; seed: number }> = ({ id, seed }) => (
  <svg width={0} height={0} style={{ position: "absolute" }}>
    <filter id={id} x="-10%" y="-20%" width="120%" height="140%">
      <feTurbulence type="fractalNoise" baseFrequency="0.03" numOctaves={2} seed={seed} result="warp" />
      <feDisplacementMap in="SourceGraphic" in2="warp" scale={10} xChannelSelector="R" yChannelSelector="G" result="d" />
      <feTurbulence type="fractalNoise" baseFrequency="0.02 0.7" numOctaves={1} seed={seed + 7} result="grain" />
      <feColorMatrix in="grain" type="matrix" values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 -3.2 2.5" result="holes" />
      <feComposite in="d" in2="holes" operator="in" />
    </filter>
  </svg>
);
// imagem de fundo (regras 3 e 9). No oráculo só foto (o kit também aceita vídeo).
export type Imagem = { src: string; video?: boolean; startFrom?: number; filter?: string };
export const ImagemFundo: React.FC<{ img: Imagem; filter?: string }> = ({ img, filter }) => {
  const style: React.CSSProperties = { width: "100%", height: "100%", objectFit: "cover", filter: img.filter ?? filter };
  return <Img src={staticFile(img.src)} style={style} />;
};
