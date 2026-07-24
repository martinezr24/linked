import { useEffect } from "react";
import Animated, {
  Easing,
  useAnimatedProps,
  useSharedValue,
  withDelay,
  withRepeat,
  withTiming,
} from "react-native-reanimated";
import Svg, { Path } from "react-native-svg";

import { colors } from "@/theme/tokens";
import { starPath } from "@/utils/sketch";

const AnimatedPath = Animated.createAnimatedComponent(Path);

export type OrnamentVariant = "sparkles" | "shootingStar";

type Star = {
  cx: number;
  cy: number;
  outer: number;
  inner: number;
  seed: number;
  delay: number;
  color: string;
};

function TwinkleStar({ cx, cy, outer, inner, seed, delay, color }: Star) {
  const v = useSharedValue(0);
  useEffect(() => {
    v.value = withDelay(
      delay,
      withRepeat(
        withTiming(1, { duration: 1500, easing: Easing.inOut(Easing.ease) }),
        -1,
        true,
      ),
    );
  }, [v, delay]);
  const animatedProps = useAnimatedProps(() => ({ opacity: 0.45 + v.value * 0.55 }));
  return (
    <AnimatedPath
      d={starPath(cx, cy, outer, inner, seed)}
      fill={color}
      animatedProps={animatedProps}
    />
  );
}

const SPARKLES: Star[] = [
  { cx: 24, cy: 15, outer: 8, inner: 3.2, seed: 5, delay: 0, color: colors.accent.primary },
  { cx: 10, cy: 9, outer: 5, inner: 2, seed: 11, delay: 320, color: colors.accent.flame },
  { cx: 11, cy: 27, outer: 4, inner: 1.6, seed: 19, delay: 640, color: colors.accent.primary },
];

/**
 * A small hand-drawn celestial ornament for a card corner — twinkling sketch
 * stars or a shooting star. Ties card decoration into Orbit's star/orbit motif.
 */
export function SketchOrnament({
  variant = "sparkles",
  size = 44,
}: {
  variant?: OrnamentVariant;
  size?: number;
}) {
  if (variant === "shootingStar") {
    return (
      <Svg width={size} height={size} viewBox="0 0 40 40">
        <Path
          d="M6 32 L26 12"
          stroke={colors.accent.primary}
          strokeWidth={2.2}
          strokeDasharray="3 5"
          strokeLinecap="round"
          opacity={0.7}
        />
        <Path d={starPath(29, 11, 6.5, 2.6, 5)} fill={colors.accent.primary} />
      </Svg>
    );
  }
  return (
    <Svg width={size} height={size} viewBox="0 0 40 40">
      {SPARKLES.map((s, i) => (
        <TwinkleStar key={i} {...s} />
      ))}
    </Svg>
  );
}
