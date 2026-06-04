import { Pressable, StyleSheet } from "react-native";

import { AppText } from "@/components/ui/AppText";
import { ArtifactCard } from "@/components/ui/ArtifactCard";
import {
  formatLocalDateLabel,
  formatMMDDYYYY,
} from "@/utils/dates";

type Props = {
  nextVisitAt: string | null;
  tzLabel: string;
  formatCountdown: (iso: string) => string;
  countdownDays: (iso: string) => string;
  onPress: () => void;
};

export function VisitCountdownHero({
  nextVisitAt,
  tzLabel,
  formatCountdown,
  countdownDays,
  onPress,
}: Props) {
  return (
    <Pressable onPress={onPress} style={styles.wrap}>
      <ArtifactCard category="Visit" title="Next visit" stacked>
        {nextVisitAt ? (
          <>
            <AppText display variant="displayHero" style={styles.days}>
              {countdownDays(nextVisitAt)}
            </AppText>
            <AppText variant="caption" color="secondary" style={styles.label}>
              DAYS UNTIL YOU'RE TOGETHER
            </AppText>
            <AppText variant="body" style={styles.sub}>
              {formatCountdown(nextVisitAt)}
            </AppText>
            <AppText variant="label" color="muted">
              {formatLocalDateLabel(nextVisitAt)} · {tzLabel}
            </AppText>
            <AppText variant="caption" color="accent" style={styles.tap}>
              Tap to edit date
            </AppText>
          </>
        ) : (
          <>
            <AppText variant="body" color="muted">
              Set your next visit to start the countdown
            </AppText>
            <AppText variant="caption" color="accent" style={styles.tap}>
              Tap to set a date
            </AppText>
          </>
        )}
      </ArtifactCard>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  wrap: { marginHorizontal: 20, marginBottom: 8 },
  days: { fontFamily: "Fraunces_700Bold", marginBottom: 4 },
  label: { marginBottom: 8 },
  sub: { marginBottom: 6 },
  tap: { marginTop: 12 },
});
