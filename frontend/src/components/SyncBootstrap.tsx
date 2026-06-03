import { useEffect } from "react";
import { AppState } from "react-native";
import { useQueryClient } from "@tanstack/react-query";

import { fetchWidgetSummary } from "@/api/fetchers";
import { useRelationshipSync } from "@/hooks/useRelationshipSync";
import { useRelationship } from "@/context/RelationshipContext";
import { syncWidgetData } from "@/services/widgetSync";

export function SyncBootstrap() {
  useRelationshipSync();
  const { deviceId, relationshipId } = useRelationship();
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!deviceId || !relationshipId) return;

    const sync = async () => {
      try {
        const summary = await fetchWidgetSummary(deviceId);
        await syncWidgetData(summary);
      } catch {
        // widget sync is best-effort
      }
    };

    void sync();

    const sub = AppState.addEventListener("change", (state) => {
      if (state === "active") {
        void sync();
        void queryClient.invalidateQueries();
      }
    });

    return () => sub.remove();
  }, [deviceId, relationshipId, queryClient]);

  return null;
}
