import { useCallback, useEffect, useRef, useState } from "react";
import {
  Platform,
  RefreshControl,
  ScrollView,
  StyleSheet,
  View,
} from "react-native";
import {
  SafeAreaView,
  useSafeAreaInsets,
} from "react-native-safe-area-context";
import { router } from "expo-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { DailyPhotoCard } from "@/components/photos/DailyPhotoCard";
import { DoodlesTile } from "@/components/home/DoodlesTile";
import { DistanceCard } from "@/components/distance/DistanceCard";
import { PlayTile } from "@/components/home/PlayTile";
import { StreakTile } from "@/components/home/StreakTile";
import { GoalsSummaryCard } from "@/components/goals/GoalsSummaryCard";
import { PartnerPresenceCard } from "@/components/presence/PartnerPresenceCard";
import { CoupleProgressCard } from "@/components/ui/CoupleProgressCard";
import { VisitCountdownHero } from "@/components/VisitCountdownHero";
import { VisitEditSheet } from "@/components/VisitEditSheet";
import { useCoupleNames } from "@/hooks/useCoupleNames";
import { useDailyCheckIn } from "@/hooks/useDailyCheckIn";
import { useProfile } from "@/hooks/useProfile";
import { useTabReload } from "@/hooks/useTabReload";
import { initialFromName } from "@/utils/coupleNames";
import {
  markStreakBannerSeen,
  wasStreakBannerSeenToday,
} from "@/utils/streakBannerStorage";
import { AppText } from "@/components/ui/AppText";
import { StreakBanner } from "@/components/ui/StreakBanner";
import { MountFade } from "@/components/ui/motion";
import { TreatsModal } from "@/components/treats/TreatsModal";
import { ConnectedHeader } from "@/components/ui/ConnectedHeader";
import { TreatButton } from "@/components/ui/TreatButton";
import { HeartHint } from "@/components/ui/HeartHint";
import { OrbitSpinner } from "@/components/ui/OrbitSpinner";
import { ScreenBackground } from "@/components/ui/ScreenBackground";
import { queryKeys } from "@/api/queryKeys";
import { fetchRelationship, fetchPhotoToday, sendPulse } from "@/api/fetchers";
import { useRelationship } from "@/context/RelationshipContext";
import { apiFetch } from "@/utils/api";
import { dateToIso, getDeviceTimezoneLabel } from "@/utils/dates";
import { showMutationError } from "@/utils/errors";
import {
  markHeartHintSeen,
  wasHeartHintSeen,
} from "@/utils/heartHintStorage";

function formatCountdown(targetIso: string): string {
  const diff = new Date(targetIso).getTime() - Date.now();
  if (diff <= 0) return "You're together now!";
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
  if (days > 0) {
    return `${days} day${days === 1 ? "" : "s"}, ${hours} hour${hours === 1 ? "" : "s"}`;
  }
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
  return `${hours} hour${hours === 1 ? "" : "s"}, ${minutes} min`;
}

function countdownDays(targetIso: string): string {
  const diff = new Date(targetIso).getTime() - Date.now();
  if (diff <= 0) return "0";
  return String(Math.floor(diff / (1000 * 60 * 60 * 24)));
}

const TAB_BAR_HEIGHT = Platform.OS === "ios" ? 88 : 64;

export default function HomeScreen() {
  const insets = useSafeAreaInsets();
  const { deviceId, bothHere, emitLocal } = useRelationship();
  const scrollBottomPad = TAB_BAR_HEIGHT + insets.bottom + 24;
  const queryClient = useQueryClient();
  const [visitDraft, setVisitDraft] = useState<Date | null>(null);
  const [visitSheetOpen, setVisitSheetOpen] = useState(false);
  const [treatsOpen, setTreatsOpen] = useState(false);
  const [heartHintVisible, setHeartHintVisible] = useState(false);
  const heartHintTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const firstHintShown = useRef(false);
  const revealHeartHint = useCallback(() => {
    if (heartHintTimer.current) clearTimeout(heartHintTimer.current);
    setHeartHintVisible(true);
    heartHintTimer.current = setTimeout(() => setHeartHintVisible(false), 2800);
  }, []);
  const tzLabel = getDeviceTimezoneLabel();
  const { scrollRef, refreshing, onRefresh } = useTabReload(() =>
    queryClient.invalidateQueries(),
  );
  const { mineName, partnerName } = useCoupleNames();
  const { mineAvatarUrl, partnerAvatarUrl, mineColor, partnerColor } =
    useProfile();
  const {
    checkIns,
    note,
    setNote,
    sendCheckIn,
    sending,
    isLoading: checkInLoading,
  } = useDailyCheckIn();

  const enabled = Boolean(deviceId);

  const { data: relationship, isLoading: relLoading } = useQuery({
    queryKey: queryKeys.relationship,
    queryFn: () => fetchRelationship(deviceId!),
    enabled,
  });

  const { data: photoToday, isLoading: photoLoading } = useQuery({
    queryKey: queryKeys.photoToday,
    queryFn: () => fetchPhotoToday(deviceId!),
    enabled,
  });

  const nextVisitAt = relationship?.nextVisitAt ?? null;
  const loading = relLoading || photoLoading;
  const streakCount = photoToday?.currentStreak ?? 0;
  const bothSentPhotoToday = photoToday?.bothSentToday ?? false;

  const [streakBannerDismissed, setStreakBannerDismissed] = useState(true);
  const bannerTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const dismissStreakBanner = () => {
    if (bannerTimer.current) clearTimeout(bannerTimer.current);
    setStreakBannerDismissed(true);
    void markStreakBannerSeen();
  };

  useEffect(() => {
    let active = true;
    if (bannerTimer.current) clearTimeout(bannerTimer.current);

    if (!bothSentPhotoToday) {
      setStreakBannerDismissed(true);
      return;
    }

    void wasStreakBannerSeenToday().then((seen) => {
      if (!active) return;
      if (seen) {
        setStreakBannerDismissed(true);
        return;
      }
      setStreakBannerDismissed(false);
      bannerTimer.current = setTimeout(() => {
        setStreakBannerDismissed(true);
        void markStreakBannerSeen();
      }, 6000);
    });

    return () => {
      active = false;
      if (bannerTimer.current) clearTimeout(bannerTimer.current);
    };
  }, [bothSentPhotoToday]);

  const showStreakBanner = bothSentPhotoToday && !streakBannerDismissed;

  // Reveal the "hold to send a heart" hint once, after the home content loads.
  useEffect(() => {
    if (loading || firstHintShown.current) return;
    firstHintShown.current = true;
    void (async () => {
      if (await wasHeartHintSeen()) return;
      revealHeartHint();
      void markHeartHintSeen();
    })();
  }, [loading, revealHeartHint]);

  const invalidateRelationship = () =>
    queryClient.invalidateQueries({ queryKey: queryKeys.relationship });

  const saveVisit = useMutation({
    mutationFn: async (date: Date) => {
      const res = await apiFetch("/api/relationship/visit", deviceId!, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ nextVisitAt: dateToIso(date) }),
      });
      if (!res.ok) throw new Error("Failed to save visit");
      return res.json();
    },
    onSuccess: () => {
      setVisitDraft(null);
      void invalidateRelationship();
    },
    onError: () => showMutationError("Could not save visit date."),
  });

  const clearVisit = useMutation({
    mutationFn: async () => {
      const res = await apiFetch("/api/relationship/visit", deviceId!, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ nextVisitAt: null }),
      });
      if (!res.ok) throw new Error("Failed to clear visit");
    },
    onSuccess: () => {
      setVisitDraft(null);
      void invalidateRelationship();
    },
    onError: () => showMutationError("Could not clear visit date."),
  });

  if (loading) {
    return (
      <ScreenBackground>
        <SafeAreaView style={[styles.centered, styles.safe]}>
          <OrbitSpinner size={48} />
        </SafeAreaView>
      </ScreenBackground>
    );
  }

  return (
    <ScreenBackground>
      <SafeAreaView style={styles.safe} edges={["top"]}>
        <View style={styles.flex}>
          <TreatsModal
            visible={treatsOpen}
            onClose={() => setTreatsOpen(false)}
            partnerName={partnerName ?? undefined}
          />

          {refreshing ? (
            <View pointerEvents="none" style={styles.refreshSpinner}>
              <OrbitSpinner size={30} />
            </View>
          ) : null}

          <HeartHint visible={heartHintVisible} />

          <ScrollView
            ref={scrollRef}
            style={styles.flex}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={[
              styles.scroll,
              { paddingBottom: scrollBottomPad },
            ]}
            keyboardShouldPersistTaps="handled"
            keyboardDismissMode="on-drag"
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={onRefresh}
                tintColor="transparent"
              />
            }
          >
            <View style={styles.headerScroll}>
              <ConnectedHeader
                streakCount={streakCount}
                mineInitial={initialFromName(mineName, "M")}
                partnerInitial={initialFromName(partnerName, "Y")}
                mineAvatarUrl={mineAvatarUrl}
                partnerAvatarUrl={partnerAvatarUrl}
                mineColor={mineColor}
                partnerColor={partnerColor}
                minePhotoSent={Boolean(photoToday?.mine)}
                partnerPhotoSent={Boolean(photoToday?.partner)}
                headerRight={<TreatButton onPress={() => setTreatsOpen(true)} />}
                energized={bothHere}
                onPartnerPress={revealHeartHint}
                onPartnerLongPress={() => {
                  if (!deviceId) return;
                  // Play the ripple immediately (optimistic); don't wait on the
                  // server echo, which can be slow or dropped.
                  emitLocal({ action: "PULSE", payload: { local: true } });
                  void sendPulse(deviceId).catch(() => {});
                }}
                onMinePress={() => router.push("/account")}
              />
            </View>
            {showStreakBanner ? (
              <StreakBanner
                title="Streak secured"
                subtitle="You both sent today’s photo — nice work."
                onDismiss={dismissStreakBanner}
              />
            ) : null}

            <MountFade index={0}>
              <PartnerPresenceCard />
            </MountFade>

            <MountFade index={1}>
              <DistanceCard />
            </MountFade>

            <MountFade index={1} style={styles.bentoRow}>
              <View style={styles.heroCol}>
                <VisitCountdownHero
                  nextVisitAt={nextVisitAt}
                  tzLabel={tzLabel}
                  formatCountdown={formatCountdown}
                  countdownDays={countdownDays}
                  onPress={() => setVisitSheetOpen(true)}
                />
              </View>
              <View style={styles.sideCol}>
                <DoodlesTile />
                <PlayTile />
              </View>
            </MountFade>

            <MountFade index={2}>
              <DailyPhotoCard />
            </MountFade>

            {!checkInLoading ? (
              <MountFade index={3}>
                <CoupleProgressCard
                  checkIns={checkIns}
                  note={note}
                  onChangeNote={setNote}
                  onSend={sendCheckIn}
                  sending={sending}
                  tzLabel={tzLabel}
                />
              </MountFade>
            ) : null}

            <MountFade index={4} style={styles.bentoRow}>
              <View style={styles.heroCol}>
                <GoalsSummaryCard />
              </View>
              <View style={styles.sideCol}>
                <StreakTile streak={streakCount} />
              </View>
            </MountFade>
          </ScrollView>

          <VisitEditSheet
            visible={visitSheetOpen}
            onClose={() => setVisitSheetOpen(false)}
            visitDraft={visitDraft}
            onChangeDraft={setVisitDraft}
            hasVisit={Boolean(nextVisitAt)}
            saving={saveVisit.isPending}
            onSave={() => {
              if (visitDraft) {
                saveVisit.mutate(visitDraft, {
                  onSuccess: () => setVisitSheetOpen(false),
                });
              }
            }}
            onClear={() => {
              clearVisit.mutate(undefined, {
                onSuccess: () => setVisitSheetOpen(false),
              });
            }}
          />
        </View>
      </SafeAreaView>
    </ScreenBackground>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  flex: { flex: 1 },
  headerScroll: { marginHorizontal: -20, marginTop: -8 },
  centered: { flex: 1, justifyContent: "center", alignItems: "center" },
  refreshSpinner: {
    position: "absolute",
    top: 8,
    left: 0,
    right: 0,
    alignItems: "center",
    zIndex: 5,
  },
  scroll: { paddingTop: 8, paddingHorizontal: 20, rowGap: 16 },
  bentoRow: { flexDirection: "row", gap: 12 },
  heroCol: { flex: 3 },
  sideCol: { flex: 2, gap: 12 },
});
