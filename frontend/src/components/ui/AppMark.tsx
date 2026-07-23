import { useEffect } from "react";
import Animated, {
  Easing,
  useAnimatedProps,
  useSharedValue,
  withRepeat,
  withTiming,
} from "react-native-reanimated";
import Svg, { Circle, Ellipse, G } from "react-native-svg";

import { useTheme } from "@/theme/useTheme";

type Props = { size?: number; animated?: boolean };

const AnimatedCircle = Animated.createAnimatedComponent(Circle);

const CX = 16;
const CY = 16;
const RX = 13;
const RY = 6.2;

/**
 * Orbit logo: two bodies on one shared, tilted orbit — the couple circling a
 * single path, at opposite ends (long-distance). One accent, one light. When
 * animated, the two bodies slowly travel the orbit: the app's name, in motion.
 */
export function AppMark({ size = 28, animated = true }: Props) {
  const theme = useTheme();
  const ring = theme.colors.text.primary;
  const accent = theme.colors.accent.primary;

  const t = useSharedValue(0);

  useEffect(() => {
    if (!animated) return;
    t.value = withRepeat(
      withTiming(Math.PI * 2, { duration: 16000, easing: Easing.linear }),
      -1,
      false,
    );
  }, [animated, t]);

  const accentProps = useAnimatedProps(() => ({
    cx: CX + Math.cos(t.value) * RX,
    cy: CY + Math.sin(t.value) * RY,
  }));
  const ringProps = useAnimatedProps(() => ({
    cx: CX + Math.cos(t.value + Math.PI) * RX,
    cy: CY + Math.sin(t.value + Math.PI) * RY,
  }));

  return (
    <Svg width={size} height={size} viewBox="0 0 32 32">
      <G rotation={-20} origin="16, 16">
        <Ellipse
          cx={CX}
          cy={CY}
          rx={RX}
          ry={RY}
          fill="none"
          stroke={ring}
          strokeWidth={1.9}
        />
        <AnimatedCircle animatedProps={accentProps} r={3.3} fill={accent} />
        <AnimatedCircle animatedProps={ringProps} r={3.3} fill={ring} />
      </G>
    </Svg>
  );
}
