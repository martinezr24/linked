import { useRef, useState } from "react";
import {
  Animated,
  Keyboard,
  StyleSheet,
  View,
} from "react-native";

import { pickRandomPrompt } from "@/constants/connectionPrompts";
import { hapticLight } from "@/utils/haptics";
import type { TodayCheckIns } from "@/types";
import { AppTextInput } from "@/components/AppTextInput";
import { AppText } from "./AppText";
import { ArtifactCard } from "./ArtifactCard";
import { PrimaryButton } from "./PrimaryButton";
import { PromptShuffleButton } from "./PromptShuffleButton";
import { useTheme } from "@/theme/useTheme";

type Props = {
  checkIns: TodayCheckIns | undefined;
  note: string;
  onChangeNote: (text: string) => void;
  onSend: () => void;
  sending?: boolean;
  tzLabel: string;
};

export function CoupleProgressCard({
  checkIns,
  note,
  onChangeNote,
  onSend,
  sending,
  tzLabel,
}: Props) {
  const theme = useTheme();
  const [prompt, setPrompt] = useState(() => pickRandomPrompt());
  const scale = useRef(new Animated.Value(1)).current;

  const mineDone = Boolean(checkIns?.mine);
  const partnerDone = Boolean(checkIns?.partner);
  const bothDone = mineDone && partnerDone;
  const progress = (mineDone ? 0.5 : 0) + (partnerDone ? 0.5 : 0);

  const handleSend = () => {
    Keyboard.dismiss();
    void hapticLight();
    Animated.sequence([
      Animated.spring(scale, {
        toValue: 1.03,
        useNativeDriver: true,
        speed: 50,
        bounciness: 8,
      }),
      Animated.spring(scale, {
        toValue: 1,
        useNativeDriver: true,
        speed: 50,
        bounciness: 4,
      }),
    ]).start();
    onSend();
  };

  return (
    <Animated.View style={[styles.outer, { transform: [{ scale }] }]}>
      <ArtifactCard category="Daily check-in" featured>
        {bothDone ? (
          <View style={styles.doneBlock}>
            <AppText variant="h2" style={styles.doneTitle}>
              You're both here today
            </AppText>
            {checkIns?.mine?.note ? (
              <AppText variant="body" color="secondary">
                You: “{checkIns.mine.note}”
              </AppText>
            ) : null}
            {checkIns?.partner?.note ? (
              <AppText variant="bodySemibold" style={styles.partnerNote}>
                Partner: “{checkIns.partner.note}”
              </AppText>
            ) : checkIns?.partner ? (
              <AppText variant="body" color="secondary">
                Your partner checked in — no note today.
              </AppText>
            ) : null}
          </View>
        ) : (
          <>
            <AppText display variant="h2" style={styles.prompt}>
              {prompt}
            </AppText>
            {!mineDone ? (
              <>
                <PromptShuffleButton
                  onPress={() => setPrompt(pickRandomPrompt())}
                />
                <AppTextInput
                  style={[
                    styles.input,
                    {
                      backgroundColor: theme.colors.surface.input,
                      borderColor: theme.colors.border.subtle,
                      color: theme.colors.text.primary,
                    },
                  ]}
                  value={note}
                  onChangeText={onChangeNote}
                  placeholder="Optional note for your partner"
                  placeholderTextColor={theme.colors.text.muted}
                />
                <PrimaryButton
                  label="Send check-in"
                  onPress={handleSend}
                  loading={sending}
                />
              </>
            ) : (
              <AppText variant="bodySemibold" color="success">
                You checked in today
                {checkIns?.mine?.note ? `: “${checkIns.mine.note}”` : ""}
              </AppText>
            )}
          </>
        )}

        <View style={styles.progressTrack}>
          <View
            style={[
              styles.progressFill,
              {
                width: `${progress * 100}%`,
                backgroundColor: theme.colors.accent.primary,
              },
            ]}
          />
        </View>
        <AppText variant="caption" color="secondary" style={styles.status}>
          {bothDone
            ? "100% complete"
            : partnerDone
              ? "Partner checked in — your turn"
              : mineDone
                ? "Waiting for your partner"
                : "Neither checked in yet"}
        </AppText>
        <AppText variant="label" color="muted" style={styles.reset}>
          Resets at midnight ({tzLabel})
        </AppText>
      </ArtifactCard>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  outer: { marginHorizontal: 20, marginBottom: 8 },
  prompt: {
    marginBottom: 12,
    fontFamily: "Fraunces_600SemiBold",
    lineHeight: 28,
  },
  doneBlock: { marginBottom: 8 },
  doneTitle: { marginBottom: 10, fontFamily: "DMSans_700Bold" },
  partnerNote: { marginTop: 8, fontFamily: "Fraunces_600SemiBold", lineHeight: 24 },
  input: {
    borderWidth: 1,
    borderRadius: 10,
    padding: 12,
    marginBottom: 12,
    fontSize: 16,
  },
  progressTrack: {
    height: 4,
    backgroundColor: "rgba(255,255,255,0.1)",
    borderRadius: 2,
    marginTop: 16,
    overflow: "hidden",
  },
  progressFill: { height: 4, borderRadius: 2 },
  status: { marginTop: 8, textTransform: "none", letterSpacing: 0 },
  reset: { marginTop: 6 },
});
