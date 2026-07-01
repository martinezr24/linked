import { StyleSheet, View } from "react-native";
import { type Href, router } from "expo-router";
import { useQuery } from "@tanstack/react-query";

import { AppText } from "@/components/ui/AppText";
import { ArtifactCard } from "@/components/ui/ArtifactCard";
import { PrimaryButton } from "@/components/ui/PrimaryButton";
import { DrawingCanvas } from "@/components/DrawingCanvas";
import { queryKeys } from "@/api/queryKeys";
import { fetchDrawings } from "@/api/fetchers";
import { useRelationship } from "@/context/RelationshipContext";
import { useProfile } from "@/hooks/useProfile";

function relativeTime(iso: string): string {
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) return "";
  const diff = Date.now() - then;
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(iso).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
  });
}

export function DrawingsCard() {
  const { deviceId } = useRelationship();
  const { partnerName } = useProfile();

  const { data: drawings = [] } = useQuery({
    queryKey: queryKeys.drawings,
    queryFn: () => fetchDrawings(deviceId!),
    enabled: Boolean(deviceId),
  });

  const latest = drawings[0];
  const partner = partnerName?.trim() || "your partner";

  return (
    <ArtifactCard category="Doodles">
      {latest ? (
        <View style={styles.body}>
          <DrawingCanvas data={latest.data} />
          <View style={styles.metaRow}>
            <AppText variant="bodySemibold">
              {latest.isMine ? "From you" : `From ${partner}`}
            </AppText>
            <AppText color="muted" variant="caption">
              {relativeTime(latest.createdAt)}
            </AppText>
          </View>
        </View>
      ) : (
        <View style={styles.empty}>
          <AppText color="secondary" style={styles.emptyText}>
            Draw something sweet and send it to {partner}.
          </AppText>
        </View>
      )}

      <PrimaryButton
        label={latest ? "Draw something new" : "Draw something"}
        onPress={() => router.push("/draw" as Href)}
        style={styles.cta}
      />

      {drawings.length > 1 ? (
        <AppText
          color="accent"
          variant="bodySemibold"
          style={styles.seeAll}
          onPress={() => router.push("/drawings" as Href)}
        >
          See all {drawings.length}
        </AppText>
      ) : null}
    </ArtifactCard>
  );
}

const styles = StyleSheet.create({
  body: { gap: 12 },
  metaRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  empty: { paddingVertical: 12 },
  emptyText: { textAlign: "center" },
  cta: { marginTop: 16 },
  seeAll: { marginTop: 14, textAlign: "center" },
});
