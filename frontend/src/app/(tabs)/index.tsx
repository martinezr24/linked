import { useState } from "react";
import {
  ActivityIndicator,
  Platform,
  ScrollView,
  StyleSheet,
  View,
} from "react-native";
import {
  SafeAreaView,
  useSafeAreaInsets,
} from "react-native-safe-area-context";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { DailyPhotoCard } from "@/components/photos/DailyPhotoCard";
import { PartnerPresenceCard } from "@/components/presence/PartnerPresenceCard";
import { VisitCountdownHero } from "@/components/VisitCountdownHero";
import { VisitEditSheet } from "@/components/VisitEditSheet";
import { useCoupleNames } from "@/hooks/useCoupleNames";
import { useProfile } from "@/hooks/useProfile";
import { initialFromName } from "@/utils/coupleNames";
import { AppText } from "@/components/ui/AppText";
import { TreatsModal } from "@/components/treats/TreatsModal";
import { ConnectedHeader } from "@/components/ui/ConnectedHeader";
import { TreatButton } from "@/components/ui/TreatButton";
import { ScreenBackground } from "@/components/ui/ScreenBackground";
import { queryKeys } from "@/api/queryKeys";
import { fetchRelationship, fetchPhotoToday } from "@/api/fetchers";
import { useRelationship } from "@/context/RelationshipContext";
import { apiFetch } from "@/utils/api";
import { dateToIso, getDeviceTimezoneLabel } from "@/utils/dates";
import { showMutationError } from "@/utils/errors";
import { useTheme } from "@/theme/useTheme";

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
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const { deviceId } = useRelationship();
  const scrollBottomPad = TAB_BAR_HEIGHT + insets.bottom + 24;
  const queryClient = useQueryClient();
  const [visitDraft, setVisitDraft] = useState<Date | null>(null);
  const [visitSheetOpen, setVisitSheetOpen] = useState(false);
  const [treatsOpen, setTreatsOpen] = useState(false);
  const tzLabel = getDeviceTimezoneLabel();
  const { mineName, partnerName } = useCoupleNames();
  const { mineAvatarUrl, partnerAvatarUrl, mineColor, partnerColor } =
    useProfile();

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
          <ActivityIndicator size="large" color={theme.colors.accent.primary} />
        </SafeAreaView>
      </ScreenBackground>
    );
  }

  return (
    <ScreenBackground>
      <SafeAreaView style={styles.safe} edges={["top"]}>
        <View style={styles.flex}>
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
          />
          <TreatsModal
            visible={treatsOpen}
            onClose={() => setTreatsOpen(false)}
            partnerName={partnerName ?? undefined}
          />

          <ScrollView
            style={styles.flex}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={[
              styles.scroll,
              { paddingBottom: scrollBottomPad },
            ]}
            keyboardShouldPersistTaps="handled"
            keyboardDismissMode="on-drag"
          >
            {bothSentPhotoToday ? (
              <View
                style={[
                  styles.celebration,
                  {
                    backgroundColor: "rgba(230,57,70,0.12)",
                    borderColor: theme.colors.border.emphasis,
                  },
                ]}
              >
                <AppText variant="bodySemibold" color="accent">
                  Both sent today's photo — streak secured!
                </AppText>
              </View>
            ) : null}

            <PartnerPresenceCard />

            <DailyPhotoCard />

            <VisitCountdownHero
              nextVisitAt={nextVisitAt}
              tzLabel={tzLabel}
              formatCountdown={formatCountdown}
              countdownDays={countdownDays}
              onPress={() => setVisitSheetOpen(true)}
            />
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
  centered: { flex: 1, justifyContent: "center", alignItems: "center" },
  scroll: { paddingTop: 8 },
  celebration: {
    marginHorizontal: 20,
    marginBottom: 16,
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
  },
});
