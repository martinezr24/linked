import { useMemo, useState, type ReactNode } from "react";
import { StyleSheet, View, type LayoutChangeEvent } from "react-native";
import Svg, { Path } from "react-native-svg";

import { colors } from "@/theme/tokens";
import { ellipsePoints, roughClosedPath, starPath } from "@/utils/sketch";

type Props = {
  left: ReactNode;
  right: ReactNode;
  color?: string;
  /** Horizontal gap between the two avatars, where the center star sits. */
  gap?: number;
};

const PAD_X = 16;
const PAD_Y = 15;

/**
 * Orbit's signature "Shared Orbit": the two of you sit on one hand-drawn
 * elliptical orbit, with a small star at your shared center. Replaces the old
 * bow connector in the header.
 */
export function SharedOrbit({
  left,
  right,
  color = colors.accent.primary,
  gap = 26,
}: Props) {
  const [size, setSize] = useState({ w: 0, h: 0 });

  const onLayout = (e: LayoutChangeEvent) => {
    const { width, height } = e.nativeEvent.layout;
    if (Math.abs(width - size.w) > 0.5 || Math.abs(height - size.h) > 0.5) {
      setSize({ w: width, h: height });
    }
  };

  const art = useMemo(() => {
    if (size.w < 8 || size.h < 8) return null;
    const cx = size.w / 2;
    const cy = size.h / 2;
    const rx = cx - 3;
    const ry = cy - 3;
    const orbit = roughClosedPath(ellipsePoints(cx, cy, rx, ry, 14), 11, 1.6);
    const star = starPath(cx, cy, 6.5, 2.6, 23);
    return { orbit, star, cx, cy };
  }, [size.w, size.h]);

  return (
    <View style={styles.wrap} onLayout={onLayout}>
      {art ? (
        <Svg
          width={size.w}
          height={size.h}
          style={StyleSheet.absoluteFill}
          pointerEvents="none"
        >
          <Path
            d={art.orbit}
            stroke={color}
            strokeWidth={2}
            fill="none"
            strokeLinecap="round"
            strokeLinejoin="round"
            opacity={0.85}
          />
          <Path d={art.star} fill={color} />
        </Svg>
      ) : null}
      <View style={styles.row}>
        {left}
        <View style={{ width: gap }} />
        {right}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { alignItems: "center", justifyContent: "center" },
  row: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: PAD_X,
    paddingVertical: PAD_Y,
  },
});
