/**
 * Renders Orbit app icon + splash from the AppMark motif (AppMark.tsx).
 * Run: node scripts/render-brand-assets.mjs
 */
import sharp from "sharp";
import { dirname, join } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const outDir = join(__dirname, "../assets/images");

const BG = "#3D1528";
const RING = "#F5F0F1";
const ACCENT = "#E63946";

function appMarkSvg(size, strokeWidth, dotR, contentScale = 1) {
  const markSize = size * contentScale;
  const offset = (size - markSize) / 2;
  const scale = markSize / 32;
  const cx = offset + 16 * scale;
  const cy = offset + 16 * scale;
  const rx = 13 * scale;
  const ry = 6.2 * scale;
  const r = dotR * scale;
  const sw = strokeWidth * scale;

  // Bodies at opposite ends of the ellipse (t=0 and t=PI), group rotated -20°.
  const ax = cx + Math.cos(0) * rx;
  const ay = cy + Math.sin(0) * ry;
  const bx = cx + Math.cos(Math.PI) * rx;
  const by = cy + Math.sin(Math.PI) * ry;

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
  <rect width="${size}" height="${size}" fill="${BG}"/>
  <g transform="translate(${cx} ${cy}) rotate(-20) translate(${-cx} ${-cy})">
    <ellipse cx="${cx}" cy="${cy}" rx="${rx}" ry="${ry}" fill="none" stroke="${RING}" stroke-width="${sw}"/>
    <circle cx="${ax}" cy="${ay}" r="${r}" fill="${ACCENT}"/>
    <circle cx="${bx}" cy="${by}" r="${r}" fill="${RING}"/>
  </g>
</svg>`;
}

async function renderPng(filename, size, strokeWidth, dotR, contentScale) {
  const svg = Buffer.from(appMarkSvg(size, strokeWidth, dotR, contentScale));
  const out = join(outDir, filename);
  await sharp(svg).png().toFile(out);
  console.log(`wrote ${out}`);
}

await renderPng("icon.png", 1024, 2.6, 4.0, 0.62);
await renderPng("splash-icon.png", 256, 2.2, 3.5, 0.8);

// Favicon
await sharp(join(outDir, "icon.png")).resize(32, 32).png().toFile(join(outDir, "favicon.png"));
console.log(`wrote ${join(outDir, "favicon.png")}`);
