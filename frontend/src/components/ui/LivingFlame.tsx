import { useEffect, useRef } from "react";
import Animated, {
  Easing,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withRepeat,
  withSequence,
  withSpring,
  withTiming,
} from "react-native-reanimated";

import { FlameIcon } from "./FlameIcon";

type Props = {
  count: number;
  baseSize?: number;
  outer?: string;
  inner?: string;
  /** Elastic pop when the streak ticks up. Disable if a parent already pops. */
  pop?: boolean;
};

/**
 * A streak flame that's alive: it flickers like a candle, grows a little as the
 * streak gets longer, and pops when it ticks up. Respects "Reduce Motion".
 */
export function LivingFlame({
  count,
  baseSize = 14,
  outer,
  inner,
  pop = true,
}: Props) {
  const reduced = useReducedMotion();
  const size = baseSize + Math.min(count, 40) * 0.12;

  const flick = useSharedValue(0);
  const popV = useSharedValue(1);
  const prev = useRef(count);

  useEffect(() => {
    if (reduced) return;
    flick.value = withRepeat(
      withTiming(1, { duration: 850, easing: Easing.inOut(Easing.ease) }),
      -1,
      true,
    );
  }, [flick, reduced]);

  useEffect(() => {
    if (pop && count > prev.current) {
      popV.value = withSequence(
        withSpring(1.35, { damping: 6, stiffness: 220 }),
        withSpring(1, { damping: 12, stiffness: 190 }),
      );
    }
    prev.current = count;
  }, [count, pop, popV]);

  const style = useAnimatedStyle(() => ({
    transform: [
      { scale: popV.value * (0.97 + flick.value * 0.06) },
      { rotate: `${(flick.value - 0.5) * 4}deg` },
    ],
    opacity: 0.92 + flick.value * 0.08,
  }));

  return (
    <Animated.View style={style}>
      <FlameIcon size={size} outer={outer} inner={inner} />
    </Animated.View>
  );
}
