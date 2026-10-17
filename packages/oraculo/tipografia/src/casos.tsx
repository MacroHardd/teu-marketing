// Caso de regressão (packages/oraculo/casos/tipografia.json) → props do estático da skill, como o Igor passaria à mão.
// O texto do caso usa a marcação do Cliente: *palavra* = palavra escolhida (acento, ou fora da coluna na Síncope).
import React, { useEffect, useState } from "react";
import { continueRender, delayRender } from "remotion";
import { EAcento, EFina, ERiscada, ESincope, EZona } from "./estaticos";
import { PAL, fontesProntas } from "./presets";

export type Caso = {
  id: string;
  estilo: "acento" | "zona" | "sincope" | "fina" | "riscada";
  variacao?: string;
  texto: string;
  paleta?: keyof typeof PAL;
  foto?: string;
  ink?: string;
  marca?: { perfil?: string; nome?: string };
};

const marcadas = (t: string) => [...t.matchAll(/\*([^*]+)\*/g)].map((m) => m[1]);
const limpo = (t: string) => t.replace(/\*/g, "");
const palavras = (t: string) => t.split(/\s+/).filter(Boolean);

// regra 9: linhas de até 9 letras (R.fina.maxLetrasLinha, rowsOf do kit), já em maiúsculas como no vídeo da regra
// (FinaSobreImagem mede o texto em maiúsculas; o EFina mede o que recebe, então recebe maiúsculas)
const linhasFina = (t: string) => {
  const rows: string[] = [];
  for (const w of palavras(t)) {
    const r = rows[rows.length - 1];
    if (r === undefined || r.length + 1 + w.length > 9) rows.push(w);
    else rows[rows.length - 1] = r + " " + w;
  }
  return rows.map((r) => r.toUpperCase());
};

const Peca: React.FC<{ c: Caso }> = ({ c }) => {
  const t = limpo(c.texto);
  const pal = (padrao: keyof typeof PAL) => PAL[c.paleta ?? padrao] as never;
  switch (c.estilo) {
    case "acento":
      return <EAcento texto={t} acento={marcadas(c.texto)} paleta={pal("villela")} credito={c.marca?.perfil || c.marca?.nome} />;
    case "zona":
      return <EZona texto={t} acento={marcadas(c.texto)} paleta={pal("gil")} imagem={c.variacao === "foto" ? { src: `fotos/${c.foto}` } : undefined} />;
    case "sincope": {
      const ws = palavras(c.texto);
      let fora = ws.map((w, k) => (w.includes("*") ? k : -1)).filter((k) => k >= 0);
      if (!fora.length) fora = ws.map((_, k) => k).filter((k) => k % 2 === 1); // sem marcação: contratempo alternado
      const semBloco = c.variacao === "sem-bloco";
      return <ESincope texto={t} fora={fora} paleta={pal(semBloco ? "azul" : "villela")} bloco={!semBloco} />;
    }
    case "fina": {
      const duotom = c.variacao === "duotom";
      return <EFina linhas={linhasFina(t)} imagem={{ src: `fotos/${c.foto}` }} ink={duotom ? "#ffe14d" : c.ink ?? "#f4f4f0"} tint={duotom ? "#2a3cff" : undefined} />;
    }
    case "riscada": // chave = palavras marcadas (à mão e riscadas); Variação "acento" = a chave também na cor
      return <ERiscada texto={t} chave={marcadas(c.texto)} acento={c.variacao === "acento" ? marcadas(c.texto) : []} paleta={pal("se7en")} />;
  }
};

/** Espera as fontes locais antes de liberar o quadro. */
export const Oraculo: React.FC<{ c: Caso }> = ({ c }) => {
  const [h] = useState(() => delayRender("fontes"));
  const [ok, setOk] = useState(false);
  useEffect(() => {
    fontesProntas.then(() => {
      setOk(true);
      continueRender(h);
    });
  }, [h]);
  return ok ? <Peca c={c} /> : null;
};
