import { useMemo, useState } from "react";
import {
  StyleSheet,
  View,
  type LayoutChangeEvent,
  type StyleProp,
  type ViewStyle,
} from "react-native";
import Svg, { Path } from "react-native-svg";

import { colors } from "@/theme/tokens";

type Props = {
  children: React.ReactNode;
  color?: string;
  strokeWidth?: number;
  radius?: number;
  /** How much the outline wobbles, in px. Higher = more hand-drawn. */
  jitter?: number;
  style?: StyleProp<ViewStyle>;
};

// Deterministic PRNG (mulberry32) so the frame is drawn once and doesn't
// re-wobble on every render.
function mulberry32(seed: number) {
  return () => {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// Sample points around a rounded rectangle (straight edges + arc corners).
function roundedRectPoints(
  w: number,
  h: number,
  r: number,
  inset: number,
  step: number,
): [number, number][] {
  const x0 = inset;
  const y0 = inset;
  const x1 = w - inset;
  const y1 = h - inset;
  const rr = Math.max(0, Math.min(r, (x1 - x0) / 2, (y1 - y0) / 2));
  const pts: [number, number][] = [];
  const line = (ax: number, ay: number, bx: number, by: number) => {
    const n = Math.max(1, Math.round(Math.hypot(bx - ax, by - ay) / step));
    for (let i = 0; i < n; i++) {
      const t = i / n;
      pts.push([ax + (bx - ax) * t, ay + (by - ay) * t]);
    }
  };
  const arc = (cx: number, cy: number, a0: number, a1: number) => {
    const n = Math.max(2, Math.round((Math.abs(a1 - a0) * rr) / step));
    for (let i = 0; i < n; i++) {
      const t = a0 + (a1 - a0) * (i / n);
      pts.push([cx + Math.cos(t) * rr, cy + Math.sin(t) * rr]);
    }
  };
  line(x0 + rr, y0, x1 - rr, y0);
  arc(x1 - rr, y0 + rr, -Math.PI / 2, 0);
  line(x1, y0 + rr, x1, y1 - rr);
  arc(x1 - rr, y1 - rr, 0, Math.PI / 2);
  line(x1 - rr, y1, x0 + rr, y1);
  arc(x0 + rr, y1 - rr, Math.PI / 2, Math.PI);
  line(x0, y1 - rr, x0, y0 + rr);
  arc(x0 + rr, y0 + rr, Math.PI, Math.PI * 1.5);
  return pts;
}

// Jitter the points and smooth them into a closed path (quadratic through
// midpoints) so the stroke looks drawn by hand rather than jagged.
function roughPath(
  pts: [number, number][],
  seed: number,
  jitter: number,
): string {
  const rnd = mulberry32(seed);
  const j = () => (rnd() - 0.5) * 2 * jitter;
  const p = pts.map(([x, y]) => [x + j(), y + j()] as [number, number]);
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

/**
 * Wraps children in a hand-drawn "marker" frame — a signature Orbit element.
 * Two overlaid wobbly strokes give the sketched, drawn-twice look.
 */
export function SketchFrame({
  children,
  color = colors.accent.primary,
  strokeWidth = 2.5,
  radius = 22,
  jitter = 2,
  style,
}: Props) {
  const [size, setSize] = useState({ w: 0, h: 0 });

  const onLayout = (e: LayoutChangeEvent) => {
    const { width, height } = e.nativeEvent.layout;
    if (Math.abs(width - size.w) > 0.5 || Math.abs(height - size.h) > 0.5) {
      setSize({ w: width, h: height });
    }
  };

  const paths = useMemo(() => {
    if (size.w < 8 || size.h < 8) return null;
    const pts = roundedRectPoints(size.w, size.h, radius, strokeWidth + 2, 20);
    return [roughPath(pts, 7, jitter), roughPath(pts, 42, jitter * 0.8)];
  }, [size.w, size.h, radius, strokeWidth, jitter]);

  return (
    <View style={style} onLayout={onLayout}>
      {paths ? (
        <Svg
          width={size.w}
          height={size.h}
          style={StyleSheet.absoluteFill}
          pointerEvents="none"
        >
          <Path
            d={paths[0]}
            stroke={color}
            strokeWidth={strokeWidth}
            fill="none"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <Path
            d={paths[1]}
            stroke={color}
            strokeWidth={strokeWidth * 0.7}
            opacity={0.6}
            fill="none"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </Svg>
      ) : null}
      {children}
    </View>
  );
}
