import { useMemo, useRef, useState } from "react";
import { PanResponder, Pressable, StyleSheet, View } from "react-native";

import { AppText } from "@/components/ui/AppText";
import { PrimaryButton } from "@/components/ui/PrimaryButton";
import { registerGameRenderer } from "@/games/registry";
import { useTheme } from "@/theme/useTheme";
import type { BattleshipBoardState } from "@/types";

type Props = {
  state: unknown;
  isMyTurn: boolean;
  myPlayerNumber: number;
  onMove: (move: unknown) => void;
  disabled?: boolean;
};

type Placement = {
  id: number;
  row: number;
  col: number;
  length: number;
  dir: number; // 0=E, 1=S, 2=W, 3=N — ship extends from the anchor cell
};

// Cells a ship occupies given its anchor (bow) cell and direction.
const shipCells = (
  row: number,
  col: number,
  length: number,
  dir: number,
): [number, number][] => {
  const cells: [number, number][] = [];
  for (let i = 0; i < length; i++) {
    if (dir === 0) cells.push([row, col + i]);
    else if (dir === 1) cells.push([row + i, col]);
    else if (dir === 2) cells.push([row, col - i]);
    else cells.push([row - i, col]);
  }
  return cells;
};

// Convert a 4-direction placement to the backend's top-left + horizontal form.
const toBackendPlacement = (p: Placement) => {
  const horizontal = p.dir === 0 || p.dir === 2;
  let row = p.row;
  let col = p.col;
  if (p.dir === 2) col = p.col - (p.length - 1);
  if (p.dir === 3) row = p.row - (p.length - 1);
  return { row, col, length: p.length, horizontal };
};

const FLEET = [
  { length: 5, name: "Carrier" },
  { length: 4, name: "Battleship" },
  { length: 3, name: "Cruiser" },
  { length: 3, name: "Submarine" },
  { length: 2, name: "Destroyer" },
];

const CELL = 26;
const GAP = 2;

const WATER = "rgba(255,255,255,0.06)";
const SHIP = "#5A6473";

function randomFleet(size: number): Placement[] {
  const result: Placement[] = [];
  const occ = Array.from({ length: size }, () => Array(size).fill(0));
  FLEET.forEach((ship, id) => {
    for (let attempt = 0; attempt < 1000; attempt++) {
      const horizontal = Math.random() < 0.5;
      const row = horizontal
        ? Math.floor(Math.random() * size)
        : Math.floor(Math.random() * (size - ship.length + 1));
      const col = horizontal
        ? Math.floor(Math.random() * (size - ship.length + 1))
        : Math.floor(Math.random() * size);
      const cells: [number, number][] = [];
      let ok = true;
      for (let i = 0; i < ship.length; i++) {
        const r = horizontal ? row : row + i;
        const c = horizontal ? col + i : col;
        if (occ[r][c] !== 0) {
          ok = false;
          break;
        }
        cells.push([r, c]);
      }
      if (!ok) continue;
      cells.forEach(([r, c]) => {
        occ[r][c] = id + 1;
      });
      result.push({ id, row, col, length: ship.length, dir: horizontal ? 0 : 1 });
      break;
    }
  });
  return result;
}

export function BattleshipBoard({
  state,
  isMyTurn,
  myPlayerNumber,
  onMove,
  disabled,
}: Props) {
  const theme = useTheme();
  const board = state as BattleshipBoardState;
  const { size, boards } = board;
  const phase = board.phase ?? "play";

  const myIdx = myPlayerNumber === 2 ? 1 : 0;
  const oppIdx = myIdx === 0 ? 1 : 0;
  const mine = boards[myIdx];
  const enemy = boards[oppIdx];
  const myPlaced = board.placed?.[myIdx] ?? false;

  const hit = theme.colors.accent.primary;
  const miss = "rgba(255,255,255,0.28)";
  const selectedColor = theme.colors.accent.primaryMuted;

  // ---- Placement (setup) local state ----
  const [placements, setPlacements] = useState<Placement[]>([]);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [dir, setDir] = useState(0);

  const occ = useMemo(() => {
    const g = Array.from({ length: size }, () => Array(size).fill(0));
    placements.forEach((p) => {
      shipCells(p.row, p.col, p.length, p.dir).forEach(([r, c]) => {
        if (r >= 0 && r < size && c >= 0 && c < size) g[r][c] = p.id + 1;
      });
    });
    return g;
  }, [placements, size]);

  // Latest-value refs so the drag gesture handlers avoid stale closures.
  const dirRef = useRef(dir);
  dirRef.current = dir;
  const selectedIdRef = useRef(selectedId);
  selectedIdRef.current = selectedId;
  const occRef = useRef(occ);
  occRef.current = occ;
  const placementsRef = useRef(placements);
  placementsRef.current = placements;
  const dragIdRef = useRef<number | null>(null);
  const gridRef = useRef<View>(null);
  const gridOffset = useRef({ x: 0, y: 0 });

  const cellFromXY = (x: number, y: number) => {
    const step = CELL + GAP;
    const c = Math.floor((x - 6) / step); // 6 = grid padding
    const r = Math.floor((y - 6) / step);
    if (r < 0 || r >= size || c < 0 || c >= size) return null;
    return { r, c };
  };

  const fits = (
    length: number,
    row: number,
    col: number,
    d: number,
    excludeId: number,
  ) => {
    const o = occRef.current;
    for (const [r, c] of shipCells(row, col, length, d)) {
      if (r < 0 || r >= size || c < 0 || c >= size) return false;
      const v = o[r][c];
      if (v !== 0 && v - 1 !== excludeId) return false;
    }
    return true;
  };

  const canPlace = (
    length: number,
    row: number,
    col: number,
    d: number,
    excludeId: number,
  ) => {
    for (const [r, c] of shipCells(row, col, length, d)) {
      if (r < 0 || r >= size || c < 0 || c >= size) return false;
      const v = occ[r][c];
      if (v !== 0 && v - 1 !== excludeId) return false;
    }
    return true;
  };

  const putShip = (id: number, row: number, col: number, d: number) => {
    setPlacements((prev) => [
      ...prev.filter((p) => p.id !== id),
      { id, row, col, length: FLEET[id].length, dir: d },
    ]);
  };

  const selectShip = (id: number) => {
    setSelectedId(id);
    const existing = placements.find((p) => p.id === id);
    if (existing) setDir(existing.dir);
  };

  const onPlacementCell = (r: number, c: number) => {
    const occupant = occ[r][c] > 0 ? occ[r][c] - 1 : null;
    if (selectedId != null) {
      if (canPlace(FLEET[selectedId].length, r, c, dir, selectedId)) {
        putShip(selectedId, r, c, dir);
        setSelectedId(null);
        return;
      }
      if (occupant != null && occupant !== selectedId) selectShip(occupant);
      return;
    }
    if (occupant != null) selectShip(occupant);
  };

  // Drag-to-place: claims the gesture only once the finger moves, so a plain
  // tap still falls through to the Pressable cells (tap-to-place).
  const dragResponder = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => false,
        onMoveShouldSetPanResponder: (_evt, g) =>
          Math.abs(g.dx) > 6 || Math.abs(g.dy) > 6,
        onPanResponderGrant: (_evt, g) => {
          const cell = cellFromXY(
            g.x0 - gridOffset.current.x,
            g.y0 - gridOffset.current.y,
          );
          let id = selectedIdRef.current;
          if (id == null && cell) {
            const v = occRef.current[cell.r]?.[cell.c] ?? 0;
            if (v > 0) {
              id = v - 1;
              setSelectedId(id);
              const ex = placementsRef.current.find((p) => p.id === id);
              if (ex) setDir(ex.dir);
            }
          }
          dragIdRef.current = id;
        },
        onPanResponderMove: (_evt, g) => {
          const id = dragIdRef.current;
          if (id == null) return;
          const cell = cellFromXY(
            g.moveX - gridOffset.current.x,
            g.moveY - gridOffset.current.y,
          );
          if (!cell) return;
          if (fits(FLEET[id].length, cell.r, cell.c, dirRef.current, id)) {
            putShip(id, cell.r, cell.c, dirRef.current);
          }
        },
        onPanResponderRelease: () => {
          dragIdRef.current = null;
          setSelectedId(null);
        },
        onPanResponderTerminate: () => {
          dragIdRef.current = null;
        },
      }),
    [],
  );

  const rotateSelected = () => {
    if (selectedId == null) {
      setDir((d) => (d + 1) % 4);
      return;
    }
    const existing = placements.find((p) => p.id === selectedId);
    if (!existing) {
      setDir((d) => (d + 1) % 4);
      return;
    }
    // Advance clockwise to the next direction that still fits at this anchor.
    for (let step = 1; step <= 4; step++) {
      const next = (existing.dir + step) % 4;
      if (next === existing.dir) break;
      if (canPlace(existing.length, existing.row, existing.col, next, selectedId)) {
        putShip(selectedId, existing.row, existing.col, next);
        setDir(next);
        return;
      }
    }
  };

  const randomize = () => {
    setPlacements(randomFleet(size));
    setSelectedId(null);
  };

  const clearAll = () => {
    setPlacements([]);
    setSelectedId(null);
  };

  const allPlaced = placements.length === FLEET.length;

  const commitFleet = () => {
    if (!allPlaced) return;
    onMove({
      type: "place",
      ships: placements.map(toBackendPlacement),
    });
  };

  const renderStaticGrid = (
    label: string,
    cells: (r: number, c: number) => React.ReactNode,
    onCell?: (r: number, c: number) => void,
    cellDisabled?: boolean,
  ) => (
    <View style={styles.gridBlock}>
      <AppText variant="label" color="secondary" style={styles.gridLabel}>
        {label}
      </AppText>
      <View style={styles.grid}>
        {Array.from({ length: size }).map((_, r) => (
          <View key={r} style={styles.gridRow}>
            {Array.from({ length: size }).map((__, c) => (
              <Pressable
                key={c}
                disabled={!onCell || cellDisabled}
                onPress={() => onCell?.(r, c)}
                style={styles.cellTap}
              >
                {cells(r, c)}
              </Pressable>
            ))}
          </View>
        ))}
      </View>
    </View>
  );

  const renderFleetCells = (r: number, c: number) => {
    const ship = mine.ships[r][c] > 0;
    const shot = mine.shots[r][c];
    let bg = WATER;
    if (ship && shot === 2) bg = hit;
    else if (ship) bg = SHIP;
    return (
      <View style={[styles.cell, { backgroundColor: bg }]}>
        {!ship && shot === 1 ? (
          <View style={[styles.dot, { backgroundColor: miss }]} />
        ) : null}
      </View>
    );
  };

  // ---- SETUP PHASE ----
  if (phase === "setup") {
    // Waiting: fleet locked in, or it's the opponent's turn to place first.
    if (myPlaced || !isMyTurn || disabled) {
      return (
        <View style={styles.wrap}>
          <AppText variant="bodySemibold" style={styles.waitTitle}>
            {myPlaced
              ? "Fleet locked in!"
              : "Your opponent is placing their fleet"}
          </AppText>
          <AppText variant="caption" color="secondary" style={styles.waitSub}>
            {myPlaced
              ? "Waiting for your opponent to place their ships…"
              : "You'll place your ships next — hang tight."}
          </AppText>
          {myPlaced ? renderStaticGrid("YOUR FLEET", renderFleetCells) : null}
        </View>
      );
    }

    // Active placement UI.
    return (
      <View style={styles.wrap}>
        <AppText variant="label" color="secondary" style={styles.gridLabel}>
          PLACE YOUR FLEET
        </AppText>
        <AppText variant="caption" color="secondary" style={styles.placeHint}>
          Tap a ship then tap the grid, or drag it into place. Tap a placed ship
          to move or rotate it.
        </AppText>

        <View
          ref={gridRef}
          onLayout={() =>
            gridRef.current?.measureInWindow((x, y) => {
              gridOffset.current = { x, y };
            })
          }
          style={styles.grid}
          {...dragResponder.panHandlers}
        >
          {Array.from({ length: size }).map((_, r) => (
            <View key={r} style={styles.gridRow}>
              {Array.from({ length: size }).map((__, c) => {
                const occupant = occ[r][c] > 0 ? occ[r][c] - 1 : null;
                let bg = WATER;
                if (occupant != null) {
                  bg = occupant === selectedId ? selectedColor : SHIP;
                }
                return (
                  <Pressable
                    key={c}
                    onPress={() => onPlacementCell(r, c)}
                    style={styles.cellTap}
                  >
                    <View style={[styles.cell, { backgroundColor: bg }]} />
                  </Pressable>
                );
              })}
            </View>
          ))}
        </View>

        <View style={styles.palette}>
          {FLEET.map((ship, id) => {
            const placed = placements.some((p) => p.id === id);
            const selected = selectedId === id;
            return (
              <Pressable
                key={id}
                onPress={() => selectShip(id)}
                style={[
                  styles.paletteChip,
                  {
                    borderColor: selected
                      ? theme.colors.accent.primary
                      : theme.colors.border.subtle,
                    backgroundColor: placed
                      ? "rgba(90,100,115,0.25)"
                      : theme.colors.surface.input,
                  },
                ]}
              >
                <AppText
                  variant="caption"
                  color={placed ? "muted" : "secondary"}
                >
                  {ship.name} ({ship.length})
                </AppText>
              </Pressable>
            );
          })}
        </View>

        <View style={styles.controls}>
          <Pressable
            onPress={rotateSelected}
            style={[styles.control, { borderColor: theme.colors.border.subtle }]}
          >
            <AppText variant="caption" color="secondary">
              Rotate
            </AppText>
          </Pressable>
          <Pressable
            onPress={randomize}
            style={[styles.control, { borderColor: theme.colors.border.subtle }]}
          >
            <AppText variant="caption" color="secondary">
              Randomize
            </AppText>
          </Pressable>
          <Pressable
            onPress={clearAll}
            style={[styles.control, { borderColor: theme.colors.border.subtle }]}
          >
            <AppText variant="caption" color="secondary">
              Clear
            </AppText>
          </Pressable>
        </View>

        <PrimaryButton
          label={
            allPlaced
              ? "Lock in fleet"
              : `Place ${FLEET.length - placements.length} more`
          }
          onPress={commitFleet}
          disabled={!allPlaced}
          style={styles.commit}
        />
      </View>
    );
  }

  // ---- PLAY PHASE ----
  const locked = disabled || !isMyTurn;

  const fire = (r: number, c: number) => {
    if (locked) return;
    if (enemy.shots[r][c] !== 0) return;
    onMove({ type: "fire", row: r, col: c });
  };

  return (
    <View style={styles.wrap}>
      {renderStaticGrid(
        "ENEMY WATERS — TAP TO FIRE",
        (r, c) => {
          const shot = enemy.shots[r][c];
          const bg = shot === 2 ? hit : WATER;
          return (
            <View style={[styles.cell, { backgroundColor: bg }]}>
              {shot === 1 ? (
                <View style={[styles.dot, { backgroundColor: miss }]} />
              ) : null}
            </View>
          );
        },
        fire,
        locked,
      )}

      {renderStaticGrid("YOUR FLEET", renderFleetCells)}
    </View>
  );
}

registerGameRenderer("battleship", BattleshipBoard);

const styles = StyleSheet.create({
  wrap: { gap: 20, alignItems: "center" },
  gridBlock: { gap: 8, alignItems: "center" },
  gridLabel: { textAlign: "center" },
  placeHint: { textAlign: "center", maxWidth: 260 },
  waitTitle: { textAlign: "center" },
  waitSub: { textAlign: "center", maxWidth: 260 },
  grid: {
    padding: 6,
    borderRadius: 14,
    backgroundColor: "#26303D",
    gap: GAP,
  },
  gridRow: { flexDirection: "row", gap: GAP },
  cellTap: {},
  cell: {
    width: CELL,
    height: CELL,
    borderRadius: 5,
    alignItems: "center",
    justifyContent: "center",
  },
  dot: { width: 8, height: 8, borderRadius: 4 },
  palette: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "center",
    gap: 8,
  },
  paletteChip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
    borderWidth: 1,
  },
  controls: { flexDirection: "row", gap: 8, justifyContent: "center" },
  control: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
  },
  commit: { alignSelf: "stretch" },
});
