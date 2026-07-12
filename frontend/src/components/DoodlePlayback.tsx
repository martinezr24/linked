import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Pressable,
  StyleSheet,
  View,
  type StyleProp,
  type ViewStyle,
} from "react-native";
import Svg, { Path, Rect } from "react-native-svg";

import { AppText } from "@/components/ui/AppText";
import { UndoIcon } from "@/components/ui/icons";
import type { DrawingData } from "@/types";
import { colors } from "@/theme/tokens";

type Props = {
  data: DrawingData;
  style?: StyleProp<ViewStyle>;
  autoPlay?: boolean;
};

type Point = { x: number; y: number };

function parsePoints(path: string): Point[] {
  const nums = path.match(/-?\d+(?:\.\d+)?/g);
  if (!nums) return [];
  const points: Point[] = [];
  for (let i = 0; i + 1 < nums.length; i += 2) {
    points.push({ x: parseFloat(nums[i]), y: parseFloat(nums[i + 1]) });
  }
  return points;
}

function buildPath(points: Point[], count: number): string {
  const n = Math.min(count, points.length);
  if (n <= 0) return "";
  let d = `M ${points[0].x} ${points[0].y}`;
  for (let i = 1; i < n; i++) {
    d += ` L ${points[i].x} ${points[i].y}`;
  }
  return d;
}

/**
 * Replays a saved drawing point-by-point so you can watch how it was drawn,
 * with a Replay control. Falls back to a static render when autoPlay is off.
 */
export function DoodlePlayback({ data, style, autoPlay = true }: Props) {
  const width = data.width || 1;
  const height = data.height || 1;

  const strokes = useMemo(
    () => data.strokes.map((s) => ({ ...s, points: parsePoints(s.path) })),
    [data.strokes],
  );
  const totalPoints = useMemo(
    () => strokes.reduce((sum, s) => sum + s.points.length, 0),
    [strokes],
  );

  const [visible, setVisible] = useState(totalPoints);
  const rafRef = useRef<number | null>(null);
  const startRef = useRef(0);

  const play = useCallback(() => {
    if (totalPoints <= 0) return;
    if (rafRef.current != null) cancelAnimationFrame(rafRef.current);
    const duration = Math.min(4200, Math.max(900, totalPoints * 6));
    startRef.current = 0;
    const tick = (ts: number) => {
      if (!startRef.current) startRef.current = ts;
      const elapsed = ts - startRef.current;
      const t = Math.min(1, elapsed / duration);
      setVisible(Math.round(t * totalPoints));
      if (t < 1) {
        rafRef.current = requestAnimationFrame(tick);
      } else {
        rafRef.current = null;
      }
    };
    setVisible(0);
    rafRef.current = requestAnimationFrame(tick);
  }, [totalPoints]);

  // Keep the resting state on the fully-rendered drawing so it never shows
  // blank (e.g. if the animation frame loop doesn't fire). Auto-play animates
  // the strokes in once when requested; otherwise render the finished drawing.
  useEffect(() => {
    if (autoPlay) {
      play();
    } else {
      setVisible(totalPoints);
    }
    return () => {
      if (rafRef.current != null) cancelAnimationFrame(rafRef.current);
    };
  }, [autoPlay, totalPoints, play]);

  let remaining = visible;
  const paths = strokes.map((stroke, i) => {
    const count = Math.max(0, Math.min(stroke.points.length, remaining));
    remaining -= stroke.points.length;
    const d = buildPath(stroke.points, count);
    if (!d) return null;
    return (
      <Path
        key={i}
        d={d}
        stroke={stroke.color}
        strokeWidth={stroke.width}
        fill="none"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    );
  });

  return (
    <View style={style}>
      <View style={[styles.canvas, { aspectRatio: width / height }]}>
        <Svg
          width="100%"
          height="100%"
          viewBox={`0 0 ${width} ${height}`}
          preserveAspectRatio="xMidYMid meet"
        >
          <Rect
            x={0}
            y={0}
            width={width}
            height={height}
            fill={data.background}
          />
          {paths}
        </Svg>
      </View>
      <Pressable
        onPress={play}
        style={styles.replayBtn}
        accessibilityRole="button"
        accessibilityLabel="Replay drawing"
      >
        <UndoIcon size={18} color={colors.text.primary} />
        <AppText variant="bodySemibold">Replay</AppText>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  canvas: {
    width: "100%",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border.subtle,
    overflow: "hidden",
  },
  replayBtn: {
    marginTop: 14,
    alignSelf: "center",
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: colors.border.subtle,
    backgroundColor: colors.surface.card,
  },
});
