import React from "react";
import { Still } from "remotion";
import casos from "../../casos/tipografia.json";
import { Oraculo, type Caso } from "./casos";
import { SH, SW } from "./presets";

export const Root: React.FC = () => (
  <>
    {(casos as Caso[]).map((c) => (
      <Still key={c.id} id={`${c.estilo}-${c.id}`} component={Oraculo} width={SW} height={SH} defaultProps={{ c }} />
    ))}
  </>
);
