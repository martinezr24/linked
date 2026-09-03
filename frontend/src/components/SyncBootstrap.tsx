import { useEffect } from "react";
import { AppState } from "react-native";
import { useQuery, useQueryClient } from "@tanstack/react-query";

import { queryKeys } from "@/api/queryKeys";
import { fetchWidgetSummary } from "@/api/fetchers";
import { useRelationshipSync } from "@/hooks/useRelationshipSync";
import { usePushRegistration } from "@/hooks/usePushRegistration";
import { useRelationship } from "@/context/RelationshipContext";
import { registerPresenceBackgroundTask } from "@/services/backgroundPresence";
import { syncWidgetData } from "@/services/widgetSync";
import { syncMyPresence } from "@/utils/presenceSync";

export function SyncBootstrap() {
  useRelationshipSync();
  usePushRegistration();
  const { deviceId, relationshipId } = useRelationship();
  const queryClient = useQueryClient();

  // Keep App Group in sync whenever widgetSummary is fetched (launch, focus,
  // photo/check-in invalidations, websocket SYNC_*).
  const { data: widgetSummary } = useQuery({
    queryKey: queryKeys.widgetSummary,
    queryFn: () => fetchWidgetSummary(deviceId!),
    enabled: Boolean(deviceId && relationshipId),
  });

  useEffect(() => {
    if (!widgetSummary) return;
    void syncWidgetData(widgetSummary);
  }, [widgetSummary]);

  useEffect(() => {
    if (!deviceId || !relationshipId) return;

    const sync = async () => {
      try {
        await syncMyPresence(deviceId);
        void queryClient.invalidateQueries({
          queryKey: queryKeys.partnerPresence,
        });
      } catch {
        // presence sync is best-effort
      }
      void queryClient.invalidateQueries({ queryKey: queryKeys.widgetSummary });
    };

    void sync();

    void registerPresenceBackgroundTask();

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
