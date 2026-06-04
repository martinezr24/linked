import { useRef, useState } from "react";
import { Animated, StyleSheet, TouchableOpacity, View } from "react-native";

import { AppText } from "@/components/ui/AppText";
import { GoalCompleteBurst } from "@/components/goals/GoalCompleteBurst";
import { hapticLight, hapticSuccess } from "@/utils/haptics";
import type { WeeklyGoal } from "@/types";

type Props = {
  goal: WeeklyGoal;
  onToggle: () => void;
  onDelete: () => void;
};

export function GoalRow({ goal, onToggle, onDelete }: Props) {
  const scale = useRef(new Animated.Value(1)).current;
  const glow = useRef(new Animated.Value(0)).current;
  const [burst, setBurst] = useState(false);

  const runCompleteAnim = () => {
    void hapticSuccess();
    setBurst(true);
    Animated.parallel([
      Animated.sequence([
        Animated.spring(scale, {
          toValue: 1.04,
          useNativeDriver: true,
          speed: 50,
          bounciness: 10,
        }),
        Animated.spring(scale, {
          toValue: 1,
          useNativeDriver: true,
          speed: 50,
          bounciness: 4,
        }),
      ]),
      Animated.sequence([
        Animated.timing(glow, {
          toValue: 1,
          duration: 200,
          useNativeDriver: false,
        }),
        Animated.timing(glow, {
          toValue: 0,
          duration: 400,
          useNativeDriver: false,
        }),
      ]),
    ]).start();
  };

  const handleToggle = () => {
    if (!goal.done) runCompleteAnim();
    else void hapticLight();
    onToggle();
  };

  const glowBg = glow.interpolate({
    inputRange: [0, 1],
    outputRange: ["rgba(230,57,70,0)", "rgba(230,57,70,0.2)"],
  });

  return (
    <Animated.View style={[styles.rowWrap, { transform: [{ scale }] }]}>
      <Animated.View
        style={[StyleSheet.absoluteFill, styles.glowLayer, { backgroundColor: glowBg }]}
      />
      <View style={styles.row}>
        <TouchableOpacity style={styles.checkArea} onPress={handleToggle}>
          <AppText style={styles.checkbox}>{goal.done ? "🔥" : "○"}</AppText>
          <AppText
            variant="body"
            style={goal.done ? styles.goalDone : undefined}
          >
            {goal.goalText}
          </AppText>
        </TouchableOpacity>
        <TouchableOpacity onPress={onDelete} hitSlop={8}>
          <AppText color="accent">✕</AppText>
        </TouchableOpacity>
      </View>
      <GoalCompleteBurst active={burst} onDone={() => setBurst(false)} />
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  rowWrap: {
    borderRadius: 10,
    overflow: "hidden",
    marginBottom: 4,
  },
  glowLayer: { borderRadius: 10 },
  row: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 10,
    paddingHorizontal: 4,
  },
  checkArea: { flexDirection: "row", alignItems: "center", flex: 1, gap: 10 },
  checkbox: { fontSize: 18, width: 24 },
  goalDone: {
    textDecorationLine: "line-through",
    opacity: 0.55,
  },
});
