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
import { useCoupleNames } from "@/hooks/useCoupleNames";
import { useTheme } from "@/theme/useTheme";

type Props = {
  checkIns: TodayCheckIns | undefined;
  note: string;
  onChangeNote: (text: string) => void;
  onSend: (prompt: string) => void;
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
  const { partnerName } = useCoupleNames();
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
    onSend(prompt);
  };

  return (
    <Animated.View style={[styles.outer, { transform: [{ scale }] }]}>
      <ArtifactCard
        category="Daily check-in"
        featured
        ornament="sparkles"
        style={styles.card}
      >
        {bothDone ? (
          <View style={styles.doneBlock}>
            <AppText variant="h2" style={styles.doneTitle}>
              You&apos;re both here today
            </AppText>

            <AppText variant="caption" color="muted">
              You
            </AppText>
            {checkIns?.mine?.prompt ? (
              <AppText variant="caption" color="secondary" style={styles.promptLine}>
                {checkIns.mine.prompt}
              </AppText>
            ) : null}
            <AppText variant="body" color="secondary">
              {checkIns?.mine?.note
                ? `“${checkIns.mine.note}”`
                : "Checked in — no note today."}
            </AppText>

            <AppText variant="caption" color="muted" style={styles.partnerLabel}>
              {partnerName?.trim() || "Partner"}
            </AppText>
            {checkIns?.partner?.prompt ? (
              <AppText variant="caption" color="secondary" style={styles.promptLine}>
                {checkIns.partner.prompt}
              </AppText>
            ) : null}
            <AppText variant="bodySemibold" style={styles.partnerNote}>
              {checkIns?.partner?.note
                ? `“${checkIns.partner.note}”`
                : "Checked in — no note today."}
            </AppText>
          </View>
        ) : (
          <>
            <AppText variant="h2" style={styles.prompt}>
              {prompt}
            </AppText>
            {!mineDone ? (
              <>
                <AppText
                  variant="caption"
                  color="secondary"
                  style={styles.explainer}
                >
                  Your daily check-in — answer today&apos;s prompt or just leave
                  a note. You&apos;ll each see the other&apos;s once you&apos;ve
                  both checked in.
                </AppText>
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
  outer: {},
  card: { marginBottom: 0 },
  prompt: {
    marginBottom: 12,
  },
  doneBlock: { marginBottom: 8 },
  doneTitle: { marginBottom: 10, fontFamily: "DMSans_700Bold" },
  partnerLabel: { marginTop: 12 },
  promptLine: { marginTop: 2, marginBottom: 4 },
  explainer: { marginBottom: 12 },
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
