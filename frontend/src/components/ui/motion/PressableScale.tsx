import type { ReactNode } from "react";
import {
  Pressable,
  type PressableProps,
  type StyleProp,
  type ViewStyle,
} from "react-native";
import Animated, {
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withSpring,
} from "react-native-reanimated";

import { PRESS_SCALE, PRESS_SPRING } from "./motion";

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

type Props = Omit<PressableProps, "style"> & {
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
  /** Scale the element shrinks to while pressed. Defaults to 0.96. */
  scaleTo?: number;
};

/**
 * A Pressable that springs down on press and back on release on the native
 * thread via reanimated. The reusable building block for buttons, cards, and
 * rows. Respects the OS "Reduce Motion" setting.
 */
export function PressableScale({
  children,
  style,
  scaleTo = PRESS_SCALE,
  onPressIn,
  onPressOut,
  disabled,
  ...rest
}: Props) {
  const scale = useSharedValue(1);
  const reduced = useReducedMotion();

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  return (
    <AnimatedPressable
      {...rest}
      disabled={disabled}
      onPressIn={(e) => {
        if (!reduced && !disabled) {
          scale.value = withSpring(scaleTo, PRESS_SPRING);
        }
        onPressIn?.(e);
      }}
      onPressOut={(e) => {
        if (!reduced) {
          scale.value = withSpring(1, PRESS_SPRING);
        }
        onPressOut?.(e);
      }}
      style={[style, animatedStyle]}
    >
      {children}
    </AnimatedPressable>
  );
}

