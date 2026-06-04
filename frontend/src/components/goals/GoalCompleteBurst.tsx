import { useEffect, useRef } from "react";
import { Animated, StyleSheet, View } from "react-native";

import { useTheme } from "@/theme/useTheme";

const PARTICLE_COUNT = 10;

type Props = {
  active: boolean;
  onDone?: () => void;
};

export function GoalCompleteBurst({ active, onDone }: Props) {
  const theme = useTheme();
  const anims = useRef(
    Array.from({ length: PARTICLE_COUNT }, () => ({
      opacity: new Animated.Value(0),
      translateY: new Animated.Value(0),
      translateX: new Animated.Value(0),
      scale: new Animated.Value(0.3),
    })),
  ).current;

  useEffect(() => {
    if (!active) return;

    const sequences = anims.map((p, i) => {
      const angle = (i / PARTICLE_COUNT) * Math.PI * 2;
      const dist = 28 + (i % 3) * 8;
      return Animated.parallel([
        Animated.timing(p.opacity, {
          toValue: 1,
          duration: 80,
          useNativeDriver: true,
        }),
        Animated.timing(p.scale, {
          toValue: 1,
          duration: 120,
          useNativeDriver: true,
        }),
        Animated.timing(p.translateX, {
          toValue: Math.cos(angle) * dist,
          duration: 420,
          useNativeDriver: true,
        }),
        Animated.timing(p.translateY, {
          toValue: Math.sin(angle) * dist - 20,
          duration: 420,
          useNativeDriver: true,
        }),
        Animated.sequence([
          Animated.delay(200),
          Animated.timing(p.opacity, {
            toValue: 0,
            duration: 220,
            useNativeDriver: true,
          }),
        ]),
      ]);
    });

    Animated.parallel(sequences).start(() => {
      anims.forEach((p) => {
        p.opacity.setValue(0);
        p.translateX.setValue(0);
        p.translateY.setValue(0);
        p.scale.setValue(0.3);
      });
      onDone?.();
    });
  }, [active, anims, onDone]);

  if (!active) return null;

  return (
    <View style={styles.wrap} pointerEvents="none">
      {anims.map((p, i) => (
        <Animated.View
          key={i}
          style={[
            styles.particle,
            {
              backgroundColor: theme.colors.accent.primary,
              opacity: p.opacity,
              transform: [
                { translateX: p.translateX },
                { translateY: p.translateY },
                { scale: p.scale },
              ],
            },
          ]}
        />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    ...StyleSheet.absoluteFillObject,
    alignItems: "center",
    justifyContent: "center",
    overflow: "visible",
  },
  particle: {
    position: "absolute",
    width: 6,
    height: 6,
    borderRadius: 3,
  },
});
