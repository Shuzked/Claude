import { loadFont } from "@remotion/fonts";
import { staticFile } from "remotion";
import { FONT } from "./theme";

const faces: { weight: string; style: "normal" | "italic" }[] = [
  { weight: "600", style: "normal" },
  { weight: "700", style: "normal" },
  { weight: "800", style: "normal" },
  { weight: "900", style: "normal" },
  { weight: "800", style: "italic" },
  { weight: "900", style: "italic" },
];

for (const { weight, style } of faces) {
  loadFont({
    family: FONT,
    url: staticFile(`fonts/montserrat-latin-${weight}-${style}.woff2`),
    weight,
    style,
  });
}
