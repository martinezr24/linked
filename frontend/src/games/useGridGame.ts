import { useCallback, useEffect } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { queryKeys } from "@/api/queryKeys";
import {
  createGridGame,
  fetchGridGame,
  joinGridGame,
  moveGridGame,
} from "@/api/fetchers";
import { useRelationship } from "@/context/RelationshipContext";
import type { Connect4BoardState, GridGame } from "@/types";

const GAME_TYPE = "connect4";

export function useGridGame() {
  const { deviceId, subscribe, sendWs } = useRelationship();
  const queryClient = useQueryClient();

  const { data: game, isLoading } = useQuery({
    queryKey: queryKeys.gridGame(GAME_TYPE),
    queryFn: () => fetchGridGame(deviceId!, GAME_TYPE),
    enabled: Boolean(deviceId),
  });

  useEffect(() => {
    if (!game?.id) return;
    sendWs("GAME_JOIN", { gameId: game.id });
  }, [game?.id, sendWs]);

  useEffect(() => {
    return subscribe((msg) => {
      if (msg.action === "GAME_STATE" || msg.action === "GAME_OVER") {
        void queryClient.invalidateQueries({
          queryKey: queryKeys.gridGame(GAME_TYPE),
        });
      }
    });
  }, [subscribe, queryClient]);

  const startGame = useMutation({
    mutationFn: () => createGridGame(deviceId!, GAME_TYPE),
    onSuccess: (created) => {
      queryClient.setQueryData(queryKeys.gridGame(GAME_TYPE), created);
      sendWs("GAME_JOIN", { gameId: created.id });
    },
  });

  const joinGame = useMutation({
    mutationFn: (gameId: string) => joinGridGame(deviceId!, gameId),
    onSuccess: (joined) => {
      queryClient.setQueryData(queryKeys.gridGame(GAME_TYPE), joined);
      sendWs("GAME_JOIN", { gameId: joined.id });
    },
  });

  const makeMove = useCallback(
    (column: number) => {
      if (!game?.id || !game.isMyTurn) return;
      sendWs("GAME_MOVE", { gameId: game.id, move: { column } });
      void moveGridGame(deviceId!, game.id, { column }).then((updated) => {
        queryClient.setQueryData(queryKeys.gridGame(GAME_TYPE), updated);
      });
    },
    [deviceId, game, queryClient, sendWs],
  );

  const board = game?.boardState as Connect4BoardState | undefined;

  return {
    game,
    board,
    isLoading,
    startGame,
    joinGame,
    makeMove,
  };
}
