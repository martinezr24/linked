// Helpers for Orbit's hand-drawn ("sketch") signature: deterministic wobble so
// shapes look drawn by hand but stay stable across re-renders.

/** Deterministic PRNG (mulberry32). */
export function mulberry32(seed: number) {
  return () => {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export type Pt = [number, number];

/** Jitter points and smooth them into a closed path (quadratic via midpoints). */
export function roughClosedPath(pts: Pt[], seed: number, jitter: number): string {
  const rnd = mulberry32(seed);
  const j = () => (rnd() - 0.5) * 2 * jitter;
  const p = pts.map(([x, y]) => [x + j(), y + j()] as Pt);
  let d = `M ${p[0][0].toFixed(1)} ${p[0][1].toFixed(1)} `;
  for (let i = 0; i < p.length; i++) {
    const cur = p[i];
    const next = p[(i + 1) % p.length];
    const mx = (cur[0] + next[0]) / 2;
    const my = (cur[1] + next[1]) / 2;
    d += `Q ${cur[0].toFixed(1)} ${cur[1].toFixed(1)} ${mx.toFixed(1)} ${my.toFixed(1)} `;
  }
  return `${d}Z`;
}

/** Sample points around an ellipse. */
export function ellipsePoints(
  cx: number,
  cy: number,
  rx: number,
  ry: number,
  step = 16,
): Pt[] {
  const circ = Math.PI * (3 * (rx + ry) - Math.sqrt((3 * rx + ry) * (rx + 3 * ry)));
  const n = Math.max(16, Math.round(circ / step));
  const pts: Pt[] = [];
  for (let i = 0; i < n; i++) {
    const a = (i / n) * 2 * Math.PI;
    pts.push([cx + Math.cos(a) * rx, cy + Math.sin(a) * ry]);
  }
  return pts;
}

/** A slightly hand-drawn 5-point star path. */
export function starPath(
  cx: number,
  cy: number,
  outer: number,
  inner: number,
  seed: number,
  jitter = 0.6,
): string {
  const rnd = mulberry32(seed);
  const j = () => (rnd() - 0.5) * 2 * jitter;
  let d = "";
  for (let i = 0; i < 10; i++) {
    const r = i % 2 === 0 ? outer : inner;
    const a = -Math.PI / 2 + (i * Math.PI) / 5;
    const x = cx + Math.cos(a) * r + j();
    const y = cy + Math.sin(a) * r + j();
    d += `${i === 0 ? "M" : "L"} ${x.toFixed(1)} ${y.toFixed(1)} `;
  }
  return `${d}Z`;
}
