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

type Props = { size?: number };

const AnimatedCircle = Animated.createAnimatedComponent(Circle);

const CX = 16;
const CY = 16;
const RX = 13;
const RY = 6.2;

/**
 * Orbit's loading spinner: the two bodies race around the shared orbit. On-brand
 * replacement for the default ActivityIndicator in loading states.
 */
export function OrbitSpinner({ size = 40 }: Props) {
  const theme = useTheme();
  const t = useSharedValue(0);

  useEffect(() => {
    t.value = withRepeat(
      withTiming(Math.PI * 2, { duration: 1200, easing: Easing.linear }),
      -1,
      false,
    );
  }, [t]);

  const accentProps = useAnimatedProps(() => ({
    cx: CX + Math.cos(t.value) * RX,
    cy: CY + Math.sin(t.value) * RY,
  }));
  const lightProps = useAnimatedProps(() => ({
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
          stroke={theme.colors.border.subtle}
          strokeWidth={1.4}
          opacity={0.6}
        />
        <AnimatedCircle
          animatedProps={accentProps}
          r={3}
          fill={theme.colors.accent.primary}
        />
        <AnimatedCircle
          animatedProps={lightProps}
          r={3}
          fill={theme.colors.text.primary}
        />
      </G>
    </Svg>
  );
}
