import type { ReactNode } from "react";
import type { StyleProp, ViewStyle } from "react-native";
import Animated, {
  FadeInDown,
  useReducedMotion,
} from "react-native-reanimated";

import { STAGGER_STEP } from "./motion";

type Props = {
  children: ReactNode;
  /** Position in a list; used to stagger entrances (index * STAGGER_STEP ms). */
  index?: number;
  /** Extra delay in ms before the entrance begins. */
  delay?: number;
  style?: StyleProp<ViewStyle>;
};

/**
 * Fades and slides its children in on mount using a soft spring on the native
 * thread. Pass an `index` for staggered list entrances. Respects the OS
 * "Reduce Motion" setting (renders instantly when enabled).
 */
export function MountFade({ children, index = 0, delay = 0, style }: Props) {
  const reduced = useReducedMotion();

  const entering = reduced
    ? undefined
    : FadeInDown.springify()
        .damping(18)
        .mass(0.8)
        .delay(delay + index * STAGGER_STEP);

  return (
    <Animated.View entering={entering} style={style}>
      {children}
    </Animated.View>
  );
}

