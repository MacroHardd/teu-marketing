// Cópia do presets.ts da skill tipografia-igor v0.1.0, só com o que os estáticos usam.
// ÚNICA mudança: as fontes vêm dos MESMOS arquivos do Motor (packages/motor/fontes), não do Google Fonts.
// São as mesmas famílias (Anton, Inter, Antonio, Reenie Beanie); assim o oráculo e o Motor desenham com o mesmo glifo.
import { loadFont } from "@remotion/fonts";
import { staticFile } from "remotion";

export const SW = 1080; // post estático 4:5
export const SH = 1350;

const fonte = (family: string, arquivo: string, weight: string) =>
  loadFont({ family, url: staticFile(`fontes/${arquivo}.ttf`), weight });
export const fontesProntas = Promise.all([
  fonte("Anton", "cut", "400"),
  fonte("Inter", "grot-med", "500"),
  fonte("Antonio", "thin", "100"),
  fonte("Antonio", "thin-reg", "400"),
  fonte("Reenie Beanie", "hand", "400"),
]);
export const CUT = "Anton";
export const GROT = "Inter";
export const THIN = "Antonio";
export const HAND = "Reenie Beanie";

// ---- paletas medidas (analysis/cor.py) + as aprovadas no teste de estáticos (13/10) ----
export const PAL = {
  // regra 1 / 6 — Villela, Elenco 1963 (M)
  villela: { paper: "#efefef", ink: "#050505", acc: "#e10e1b" },
  noite: { paper: "#0f1720", ink: "#ece8df", acc: "#ffd400" }, // E1b: amarelo pede menos área
  verde: { paper: "#e6e2d3", ink: "#1d2b22", acc: "#00a65a" }, // E1c
  // regra 3 — Duarte/Gil 1968 (M) e variação neon (E3b)
  gil: { dark: "#0e0503", a: "#59891c", b: "#fef701", wave: "#dc1812", white: "#fcf5fc", acc: "#fef701" },
  neon: { dark: "#120024", a: "#7b2cff", b: "#ff8a00", wave: "#ff2e88", white: "#f6f1ff", acc: "#ff8a00" },
  // regra 5 — Müller-Brockmann (M): fundo 84–99%
  mb: { paper: "#e8e9e3", ink: "#131b1e" },
  mb57: { paper: "#ca5042", ink: "#19080b" }, // fundo saturado → 1 tinta (C6)
  // regra 6 sem bloco, fundo saturado → 1 tinta (E6b)
  azul: { paper: "#2b3cff", ink: "#f4f1ea" },
  // regra 10 — Se7en (preto + branco sujo)
  se7en: { bg: "#070707", ink: "#e9e6dc" },
};
