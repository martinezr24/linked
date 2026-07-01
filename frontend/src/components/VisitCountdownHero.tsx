import { Pressable, StyleSheet } from "react-native";

import { AppText } from "@/components/ui/AppText";
import { ArtifactCard } from "@/components/ui/ArtifactCard";
import { formatLocalDateLabel } from "@/utils/dates";

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
      <ArtifactCard category="Visit" title="Next visit" stacked style={styles.card}>
        {nextVisitAt ? (
          <>
            <AppText display variant="displayHero" style={styles.days}>
              {countdownDays(nextVisitAt)}
            </AppText>
            <AppText variant="caption" color="secondary" style={styles.label}>
              DAYS UNTIL YOU&apos;RE TOGETHER
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
  wrap: { flex: 1 },
  card: { flex: 1, marginBottom: 0 },
  days: { fontFamily: "Fraunces_700Bold", marginBottom: 4 },
  label: { marginBottom: 8 },
  sub: { marginBottom: 6 },
  tap: { marginTop: 12 },
});
