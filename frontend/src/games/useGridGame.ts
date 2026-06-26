import { useCallback, useEffect } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { queryKeys } from "@/api/queryKeys";
import {
  createGridGame,
  endGridGame,
  fetchGridGame,
  joinGridGame,
  moveGridGame,
} from "@/api/fetchers";
import { useRelationship } from "@/context/RelationshipContext";

export function useGridGame(gameType: string) {
  const { deviceId, subscribe, sendWs } = useRelationship();
  const queryClient = useQueryClient();
  const key = queryKeys.gridGame(gameType);

  const { data: game, isLoading } = useQuery({
    queryKey: key,
    queryFn: () => fetchGridGame(deviceId!, gameType),
    enabled: Boolean(deviceId),
  });

  useEffect(() => {
    if (!game?.id) return;
    sendWs("GAME_JOIN", { gameId: game.id });
  }, [game?.id, sendWs]);

  useEffect(() => {
    return subscribe((msg) => {
      if (
        msg.action === "GAME_STATE" ||
        msg.action === "GAME_OVER" ||
        msg.action === "SYNC_GAMES"
      ) {
        void queryClient.invalidateQueries({ queryKey: key });
      }
    });
  }, [subscribe, queryClient, key]);

  const startGame = useMutation({
    mutationFn: () => createGridGame(deviceId!, gameType),
    onSuccess: (created) => {
      queryClient.setQueryData(key, created);
      sendWs("GAME_JOIN", { gameId: created.id });
    },
  });

  const joinGame = useMutation({
    mutationFn: (gameId: string) => joinGridGame(deviceId!, gameId),
    onSuccess: (joined) => {
      queryClient.setQueryData(key, joined);
      sendWs("GAME_JOIN", { gameId: joined.id });
    },
  });

  const endGame = useMutation({
    mutationFn: (gameId: string) => endGridGame(deviceId!, gameId),
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: key }),
  });

  const makeMove = useCallback(
    (move: unknown) => {
      if (!game?.id || !game.isMyTurn) return;
      sendWs("GAME_MOVE", { gameId: game.id, move });
      void moveGridGame(deviceId!, game.id, move).then((updated) => {
        queryClient.setQueryData(key, updated);
      });
    },
    [deviceId, game, queryClient, sendWs, key],
  );

  return {
    game,
    isLoading,
    startGame,
    joinGame,
    endGame,
    makeMove,
  };
}
