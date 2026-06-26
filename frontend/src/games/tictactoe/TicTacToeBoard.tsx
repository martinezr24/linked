import { Pressable, StyleSheet, View } from "react-native";
import Svg, { Circle, Line } from "react-native-svg";

import { registerGameRenderer } from "@/games/registry";
import { useProfile } from "@/hooks/useProfile";
import type { TicTacToeBoardState } from "@/types";

type Props = {
  state: unknown;
  isMyTurn: boolean;
  myPlayerNumber: number;
  onMove: (move: unknown) => void;
  disabled?: boolean;
};

const CELL = 96;
const MARK = 52;

function XMark({ color }: { color: string }) {
  const pad = (CELL - MARK) / 2 + 6;
  const end = CELL - pad;
  return (
    <Svg width={CELL} height={CELL}>
      <Line
        x1={pad}
        y1={pad}
        x2={end}
        y2={end}
        stroke={color}
        strokeWidth={9}
        strokeLinecap="round"
      />
      <Line
        x1={end}
        y1={pad}
        x2={pad}
        y2={end}
        stroke={color}
        strokeWidth={9}
        strokeLinecap="round"
      />
    </Svg>
  );
}

function OMark({ color }: { color: string }) {
  return (
    <Svg width={CELL} height={CELL}>
      <Circle
        cx={CELL / 2}
        cy={CELL / 2}
        r={MARK / 2 - 4}
        stroke={color}
        strokeWidth={9}
        fill="none"
      />
    </Svg>
  );
}

export function TicTacToeBoard({
  state,
  isMyTurn,
  myPlayerNumber,
  onMove,
  disabled,
}: Props) {
  const board = state as TicTacToeBoardState;
  const { mineColor, partnerColor } = useProfile();

  const mark = (cell: number) => {
    if (cell === 0) return null;
    const mine = cell === myPlayerNumber;
    const color = mine ? mineColor : partnerColor;
    return cell === 1 ? <XMark color={color} /> : <OMark color={color} />;
  };

  return (
    <View style={styles.board}>
      {board.cells.map((cell, i) => (
        <Pressable
          key={i}
          style={styles.cell}
          disabled={disabled || !isMyTurn || cell !== 0}
          onPress={() => onMove({ cell: i })}
        >
          {mark(cell)}
        </Pressable>
      ))}
    </View>
  );
}

registerGameRenderer("tictactoe", TicTacToeBoard);

const styles = StyleSheet.create({
  board: {
    width: CELL * 3,
    flexDirection: "row",
    flexWrap: "wrap",
    borderRadius: 20,
    overflow: "hidden",
    backgroundColor: "#3C4A5E",
  },
  cell: {
    width: CELL,
    height: CELL,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.12)",
  },
});
