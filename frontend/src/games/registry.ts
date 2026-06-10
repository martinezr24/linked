import type { ComponentType } from "react";

type GameRendererProps = {
  state: unknown;
  isMyTurn: boolean;
  myPlayerNumber: number;
  onMove: (move: unknown) => void;
  disabled?: boolean;
};

const renderers: Record<string, ComponentType<GameRendererProps>> = {};

export function registerGameRenderer(
  type: string,
  renderer: ComponentType<GameRendererProps>,
) {
  renderers[type] = renderer;
}

export function getGameRenderer(type: string) {
  return renderers[type];
}
