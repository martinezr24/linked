import { useEffect, useRef } from "react";
import { Animated, StyleSheet, View } from "react-native";
import Svg, { Circle } from "react-native-svg";

import { AppText } from "@/components/ui/AppText";
import { useTheme } from "@/theme/useTheme";

const SIZE = 56;
const STROKE = 4;
const R = (SIZE - STROKE) / 2;
const CIRCUMFERENCE = 2 * Math.PI * R;

type Props = {
  completed: number;
  total: number;
};

export function WeeklyScoreRing({ completed, total }: Props) {
  const theme = useTheme();
  const glow = useRef(new Animated.Value(0)).current;
  const percent = total > 0 ? Math.round((completed / total) * 100) : 0;
  const progress = total > 0 ? completed / total : 0;
  const offset = CIRCUMFERENCE * (1 - progress);
  const complete = total > 0 && completed === total;

  useEffect(() => {
    if (!complete) {
      glow.setValue(0);
      return;
    }
    Animated.sequence([
      Animated.timing(glow, {
        toValue: 1,
        duration: 400,
        useNativeDriver: false,
      }),
      Animated.timing(glow, {
        toValue: 0.6,
        duration: 600,
        useNativeDriver: false,
      }),
    ]).start();
  }, [complete, glow]);

  const glowOpacity = glow.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 0.35],
  });

  return (
    <View style={styles.wrap}>
      {complete ? (
        <Animated.View
          style={[
            styles.glow,
            {
              backgroundColor: theme.colors.accent.primary,
              opacity: glowOpacity,
            },
          ]}
        />
      ) : null}
      <Svg width={SIZE} height={SIZE}>
        <Circle
          cx={SIZE / 2}
          cy={SIZE / 2}
          r={R}
          stroke={theme.colors.border.subtle}
          strokeWidth={STROKE}
          fill="none"
        />
        <Circle
          cx={SIZE / 2}
          cy={SIZE / 2}
          r={R}
          stroke={theme.colors.accent.primary}
          strokeWidth={STROKE}
          fill="none"
          strokeDasharray={`${CIRCUMFERENCE} ${CIRCUMFERENCE}`}
          strokeDashoffset={offset}
          strokeLinecap="round"
          rotation="-90"
          origin={`${SIZE / 2}, ${SIZE / 2}`}
        />
      </Svg>
      <View style={styles.label}>
        <AppText variant="caption" color="accent" style={styles.percent}>
          {percent}%
        </AppText>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    width: SIZE,
    height: SIZE,
    alignItems: "center",
    justifyContent: "center",
  },
  glow: {
    position: "absolute",
    width: SIZE + 12,
    height: SIZE + 12,
    borderRadius: (SIZE + 12) / 2,
  },
  label: {
    ...StyleSheet.absoluteFillObject,
    alignItems: "center",
    justifyContent: "center",
  },
  percent: { letterSpacing: 0, fontSize: 11 },
});
