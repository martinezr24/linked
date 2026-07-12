import { useEffect, useState } from "react";
import { Alert, Pressable, ScrollView, StyleSheet, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router, useLocalSearchParams } from "expo-router";
import { useMutation, useQuery } from "@tanstack/react-query";

import { queryKeys } from "@/api/queryKeys";
import { fetchPhotoToday, sendNudge } from "@/api/fetchers";
import { AppText } from "@/components/ui/AppText";
import { FlameIcon } from "@/components/ui/FlameIcon";
import { ArrowLeftIcon, ArrowRightIcon } from "@/components/ui/icons";
import { PrimaryButton } from "@/components/ui/PrimaryButton";
import { ScreenBackground } from "@/components/ui/ScreenBackground";
import { WeekStreakTracker } from "@/components/ui/WeekStreakTracker";
import { useRelationship } from "@/context/RelationshipContext";
import { useProfile } from "@/hooks/useProfile";
import { getDeviceTimezoneLabel } from "@/utils/dates";
import { showMutationError } from "@/utils/errors";
import { useTheme } from "@/theme/useTheme";

function msUntilMidnight(): number {
  const now = new Date();
  const midnight = new Date(now);
  midnight.setHours(24, 0, 0, 0);
  return midnight.getTime() - now.getTime();
}

function formatTimer(ms: number): string {
  const totalSec = Math.max(0, Math.floor(ms / 1000));
  const h = Math.floor(totalSec / 3600);
  const m = Math.floor((totalSec % 3600) / 60);
  const s = totalSec % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

export default function StreakScreen() {
  const theme = useTheme();
  const { deviceId } = useRelationship();
  const { partnerName } = useProfile();
  const { celebrate, streak: streakParam } = useLocalSearchParams<{
    celebrate?: string;
    streak?: string;
  }>();
  const tzLabel = getDeviceTimezoneLabel();
  const [remaining, setRemaining] = useState(msUntilMidnight());
  const isCelebration = celebrate === "1";

  const { data: photoToday } = useQuery({
    queryKey: queryKeys.photoToday,
    queryFn: () => fetchPhotoToday(deviceId!),
    enabled: Boolean(deviceId),
  });

  const partner = partnerName?.trim() || "Your partner";

  const nudge = useMutation({
    mutationFn: () => sendNudge(deviceId!, "send_photo"),
    onSuccess: () => {
      Alert.alert(
        `${partner} has been notified!`,
        "They'll get a reminder to send today's photo.",
      );
    },
    onError: () => showMutationError("Could not send that nudge."),
  });

  useEffect(() => {
    const id = setInterval(() => setRemaining(msUntilMidnight()), 1000);
    return () => clearInterval(id);
  }, []);

  const count = streakParam
    ? Number(streakParam)
    : (photoToday?.currentStreak ?? 0);
  const bothSent = photoToday?.bothSentToday ?? false;

  return (
    <ScreenBackground>
      <SafeAreaView style={styles.safe} edges={["top", "bottom"]}>
        <Pressable onPress={() => router.back()} style={styles.back}>
          <ArrowLeftIcon size={24} color={theme.colors.text.primary} />
        </Pressable>

        <ScrollView
          contentContainerStyle={styles.scroll}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.flameWrap}>
            <FlameIcon
              size={72}
              outer={theme.colors.accent.flame}
              inner={theme.colors.accent.flameInner}
            />
          </View>

          <AppText display variant="displayHero" style={styles.heroNum}>
            {count}
          </AppText>
          <AppText variant="h2" style={styles.heroLabel}>
            {isCelebration ? "Streak Secured!" : "Day Streak"}
          </AppText>

          {isCelebration ? (
            <View
              style={[
                styles.celebrationBanner,
                {
                  backgroundColor: "rgba(74,222,128,0.15)",
                  borderColor: theme.colors.accent.success,
                },
              ]}
            >
              <AppText variant="bodySemibold" style={{ color: theme.colors.accent.success }}>
                You both sent today&apos;s photo — nice work!
              </AppText>
            </View>
          ) : (
            <View
              style={[
                styles.celebrationBanner,
                {
                  backgroundColor: "rgba(230,57,70,0.12)",
                  borderColor: theme.colors.border.emphasis,
                },
              ]}
            >
              <AppText variant="bodySemibold" color="accent">
                Photo sent! Keep the streak going.
              </AppText>
            </View>
          )}

          <WeekStreakTracker
            currentStreak={count}
            bothCompletedToday={bothSent}
          />

          <AppText variant="body" color="secondary" style={styles.copy}>
            Send a photo together every day to keep your streak.
            {" "}
            {bothSent
              ? "Nice work! You both sent today's photo."
              : count > 0
                ? "Send your daily photo to keep the streak alive."
                : "Start your streak by sending today's photo on Home."}
          </AppText>

          {!bothSent ? (
            <PrimaryButton
              label={`Nudge ${partner}`}
              onPress={() => {
                if (!deviceId || nudge.isPending) return;
                nudge.mutate();
              }}
              loading={nudge.isPending}
              disabled={!deviceId}
              style={styles.nudge}
            />
          ) : null}

          <Pressable onPress={() => router.push("/photos/memories")} style={styles.memories}>
            <AppText variant="bodySemibold" color="accent">
              View our photos
            </AppText>
            <ArrowRightIcon size={18} color={theme.colors.accent.primary} />
          </Pressable>

          <View
            style={[
              styles.timerBox,
              {
                borderColor: theme.colors.border.subtle,
                backgroundColor: theme.colors.surface.card,
              },
            ]}
          >
            <AppText variant="caption" color="secondary" style={styles.timerLabel}>
              NEXT PHOTO DAY RESETS IN
            </AppText>
            <AppText
              mono
              variant="h1"
              style={[styles.timer, { fontFamily: theme.fonts.mono }]}
            >
              {formatTimer(remaining)}
            </AppText>
            <AppText variant="label" color="muted">
              {tzLabel}
            </AppText>
          </View>

          {photoToday && photoToday.longestStreak > count ? (
            <AppText variant="body" color="muted" style={styles.longest}>
              Longest streak: {photoToday.longestStreak} days
            </AppText>
          ) : null}
        </ScrollView>
      </SafeAreaView>
    </ScreenBackground>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  back: { paddingHorizontal: 20, paddingVertical: 8 },
  scroll: {
    alignItems: "center",
    paddingHorizontal: 20,
    paddingBottom: 40,
  },
  flameWrap: { marginTop: 8, marginBottom: 16 },
  heroNum: {
    fontFamily: "Fraunces_700Bold",
    textAlign: "center",
  },
  heroLabel: { textAlign: "center", marginBottom: 8 },
  celebrationBanner: {
    marginTop: 8,
    marginBottom: 8,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    borderWidth: 1,
    width: "100%",
    alignItems: "center",
  },
  copy: { textAlign: "center", marginTop: 8, paddingHorizontal: 12 },
  nudge: { marginTop: 20, width: "100%" },
  timerBox: {
    marginTop: 28,
    width: "100%",
    borderRadius: 16,
    borderWidth: 1,
    padding: 20,
    alignItems: "center",
  },
  timerLabel: { marginBottom: 8 },
  timer: { letterSpacing: 2, marginBottom: 6 },
  longest: { marginTop: 20 },
  memories: {
    marginTop: 16,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
});
