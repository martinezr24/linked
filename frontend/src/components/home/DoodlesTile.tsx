import { StyleSheet, View } from "react-native";
import { type Href, router } from "expo-router";
import { useQuery } from "@tanstack/react-query";

import { AppText } from "@/components/ui/AppText";
import { BentoTile } from "@/components/ui/BentoTile";
import { DrawingCanvas } from "@/components/DrawingCanvas";
import { queryKeys } from "@/api/queryKeys";
import { fetchDrawings } from "@/api/fetchers";
import { useRelationship } from "@/context/RelationshipContext";

export function DoodlesTile() {
  const { deviceId } = useRelationship();

  const { data: drawings = [] } = useQuery({
    queryKey: queryKeys.drawings,
    queryFn: () => fetchDrawings(deviceId!),
    enabled: Boolean(deviceId),
  });

  const latest = drawings[0];

  return (
    <BentoTile
      category="Doodles"
      accessibilityLabel="Open doodles"
      onPress={() => router.push("/draw" as Href)}
    >
      {latest ? (
        <View style={styles.previewClip}>
          <DrawingCanvas data={latest.data} />
        </View>
      ) : (
        <View style={styles.placeholder}>
          <AppText variant="caption" color="muted">
            Tap to draw
          </AppText>
        </View>
      )}
    </BentoTile>
  );
}

const styles = StyleSheet.create({
  previewClip: {
    flex: 1,
    borderRadius: 10,
    overflow: "hidden",
    justifyContent: "center",
  },
  placeholder: {
    flex: 1,
    borderRadius: 10,
    borderWidth: 1,
    borderStyle: "dashed",
    borderColor: "rgba(255,255,255,0.12)",
    alignItems: "center",
    justifyContent: "center",
  },
});
