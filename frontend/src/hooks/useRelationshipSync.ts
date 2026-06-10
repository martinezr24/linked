import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";

import { queryKeys } from "@/api/queryKeys";
import { useRelationship } from "@/context/RelationshipContext";
import type { WsMessage } from "@/types";

const SYNC_ACTIONS: Record<string, (readonly unknown[])[]> = {
  SYNC_RELATIONSHIP: [queryKeys.relationship, queryKeys.widgetSummary],
  SYNC_GOALS: [queryKeys.goals],
  SYNC_EVENTS: [queryKeys.events, queryKeys.widgetSummary],
  SYNC_CHECKINS: [queryKeys.checkIns, queryKeys.widgetSummary],
  SYNC_LISTS: [queryKeys.list("reunion")],
  SYNC_ASYNC_NOTES: [queryKeys.asyncNotes],
  SYNC_PHOTOS: [
    queryKeys.photoToday,
    queryKeys.photoHistory(),
    queryKeys.widgetSummary,
  ],
  SYNC_PRESENCE: [queryKeys.partnerPresence],
  SYNC_PROFILE: [queryKeys.profile, queryKeys.partnerPresence],
  SYNC_GAMES: [queryKeys.triviaGame, queryKeys.gridGame("connect4")],
  GAME_STATE: [queryKeys.gridGame("connect4")],
  GAME_OVER: [queryKeys.gridGame("connect4")],
  RELATIONSHIP_ENDED: [],
};

export function useRelationshipSync() {
  const { subscribe, relationshipId } = useRelationship();
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!relationshipId) return;

    return subscribe((msg: WsMessage) => {
      const keys = SYNC_ACTIONS[msg.action];
      if (!keys) return;

      if (msg.action === "SYNC_LISTS") {
        const listType = msg.payload.listType as string | undefined;
        const eventId = msg.payload.eventId as string | undefined;
        if (listType) {
          void queryClient.invalidateQueries({
            queryKey: queryKeys.list(listType, eventId),
          });
        }
        void queryClient.invalidateQueries({ queryKey: ["list"] });
        return;
      }

      if (msg.action === "WS_CONNECTED") {
        void queryClient.invalidateQueries();
        return;
      }

      for (const key of keys) {
        void queryClient.invalidateQueries({ queryKey: key });
      }
    });
  }, [subscribe, relationshipId, queryClient]);
}
