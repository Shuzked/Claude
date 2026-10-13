import { loadFont } from "@remotion/fonts";
import { staticFile } from "remotion";

export const FONT = "Inter";

const weights = { "600": "SemiBold", "800": "ExtraBold", "900": "Black" } as const;

for (const [weight, name] of Object.entries(weights)) {
  loadFont({ family: FONT, url: staticFile(`fonts/Inter-${name}.otf`), weight });
}
