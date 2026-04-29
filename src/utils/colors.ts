/** Generate a Tailwind-like 50-900 palette from a base hex color. */

function hexToRgb(hex: string): [number, number, number] {
  const h = hex.replace("#", "");
  const v = h.length === 3 ? h.split("").map((c) => c + c).join("") : h;
  return [
    parseInt(v.substring(0, 2), 16),
    parseInt(v.substring(2, 4), 16),
    parseInt(v.substring(4, 6), 16),
  ];
}

function rgbToHex(r: number, g: number, b: number): string {
  const c = (n: number) => Math.max(0, Math.min(255, Math.round(n))).toString(16).padStart(2, "0");
  return `#${c(r)}${c(g)}${c(b)}`;
}

/** Mix color with white (lighten) or black (darken). amount: 0..1 */
function mix(hex: string, target: [number, number, number], amount: number): string {
  const [r, g, b] = hexToRgb(hex);
  return rgbToHex(
    r + (target[0] - r) * amount,
    g + (target[1] - g) * amount,
    b + (target[2] - b) * amount,
  );
}

/** Generate a 50-900 palette where 600 is the base color. */
export function generatePalette(baseHex: string): Record<number, string> {
  const WHITE: [number, number, number] = [255, 255, 255];
  const BLACK: [number, number, number] = [0, 0, 0];
  return {
    50:  mix(baseHex, WHITE, 0.92),
    100: mix(baseHex, WHITE, 0.82),
    200: mix(baseHex, WHITE, 0.66),
    300: mix(baseHex, WHITE, 0.46),
    400: mix(baseHex, WHITE, 0.22),
    500: mix(baseHex, WHITE, 0.10),
    600: baseHex,
    700: mix(baseHex, BLACK, 0.18),
    800: mix(baseHex, BLACK, 0.36),
    900: mix(baseHex, BLACK, 0.55),
  };
}

/** Apply colors as CSS variables on document root. */
export function applyTheme(primaryHex: string, secondaryHex: string) {
  const palette = generatePalette(primaryHex);
  const root = document.documentElement;
  Object.entries(palette).forEach(([shade, hex]) => {
    root.style.setProperty(`--color-primary-${shade}`, hex);
  });
  root.style.setProperty("--color-secondary", secondaryHex);
  // Override the navy-400 specifically so blue accents follow secondary color
  root.style.setProperty("--color-primary-400", secondaryHex);
}
