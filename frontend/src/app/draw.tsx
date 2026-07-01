import { useRef, useState } from "react";
import {
  LayoutChangeEvent,
  PanResponder,
  Pressable,
  StyleSheet,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import Svg, { Path } from "react-native-svg";
import { router } from "expo-router";
import { useMutation, useQueryClient } from "@tanstack/react-query";

import { AppText } from "@/components/ui/AppText";
import { PrimaryButton } from "@/components/ui/PrimaryButton";
import { ScreenBackground } from "@/components/ui/ScreenBackground";
import { queryKeys } from "@/api/queryKeys";
import { createDrawing } from "@/api/fetchers";
import { useRelationship } from "@/context/RelationshipContext";
import { showMutationError } from "@/utils/errors";
import type { DrawStroke } from "@/types";
import { colors } from "@/theme/tokens";

const DRAW_BG = colors.surface.card;

const PALETTE = [
  "#F5F0F1",
  "#E63946",
  "#FF7AA2",
  "#FFD166",
  "#4ADE80",
  "#4DA3FF",
  "#B983FF",
  "#0F0C0D",
];

const SIZES = [3, 6, 11];

export default function DrawScreen() {
  const { deviceId } = useRelationship();
  const queryClient = useQueryClient();

  const [strokes, setStrokes] = useState<DrawStroke[]>([]);
  const [currentPath, setCurrentPath] = useState("");
  const [color, setColor] = useState(PALETTE[1]);
  const [width, setWidth] = useState(SIZES[1]);
  const [isEraser, setIsEraser] = useState(false);
  const [canvas, setCanvas] = useState({ w: 0, h: 0 });

  const strokesRef = useRef<DrawStroke[]>([]);
  const currentRef = useRef("");
  const toolRef = useRef({ color: PALETTE[1], width: SIZES[1] });
  toolRef.current = { color: isEraser ? DRAW_BG : color, width };

  const responder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: (e) => {
        const { locationX, locationY } = e.nativeEvent;
        currentRef.current = `M ${Math.round(locationX)} ${Math.round(locationY)}`;
        setCurrentPath(currentRef.current);
      },
      onPanResponderMove: (e) => {
        const { locationX, locationY } = e.nativeEvent;
        currentRef.current += ` L ${Math.round(locationX)} ${Math.round(locationY)}`;
        setCurrentPath(currentRef.current);
      },
      onPanResponderRelease: () => {
        if (currentRef.current.includes("L")) {
          const stroke: DrawStroke = {
            color: toolRef.current.color,
            width: toolRef.current.width,
            path: currentRef.current,
          };
          strokesRef.current = [...strokesRef.current, stroke];
          setStrokes(strokesRef.current);
        }
        currentRef.current = "";
        setCurrentPath("");
      },
    }),
  ).current;

  const onCanvasLayout = (e: LayoutChangeEvent) => {
    const { width: w, height: h } = e.nativeEvent.layout;
    setCanvas({ w, h });
  };

  const undo = () => {
    strokesRef.current = strokesRef.current.slice(0, -1);
    setStrokes(strokesRef.current);
  };

  const clear = () => {
    strokesRef.current = [];
    currentRef.current = "";
    setStrokes([]);
    setCurrentPath("");
  };

  const share = useMutation({
    mutationFn: () =>
      createDrawing(deviceId!, {
        width: Math.round(canvas.w),
        height: Math.round(canvas.h),
        background: DRAW_BG,
        strokes: strokesRef.current,
      }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.drawings });
      router.back();
    },
    onError: () => showMutationError("Could not send your drawing. Try again."),
  });

  const activeColor = isEraser ? DRAW_BG : color;
  const canShare = strokes.length > 0 && canvas.w > 0 && !share.isPending;

  return (
    <ScreenBackground>
      <SafeAreaView style={styles.safe} edges={["top", "bottom"]}>
        <View style={styles.header}>
          <Pressable
            onPress={() => router.back()}
            hitSlop={12}
            accessibilityRole="button"
            accessibilityLabel="Go back"
          >
            <AppText style={styles.back}>‹</AppText>
          </Pressable>
          <AppText variant="h2">Draw</AppText>
          <Pressable onPress={clear} hitSlop={12}>
            <AppText color="secondary">Clear</AppText>
          </Pressable>
        </View>

        <View
          style={styles.canvas}
          onLayout={onCanvasLayout}
          {...responder.panHandlers}
        >
          <Svg style={StyleSheet.absoluteFill}>
            {strokes.map((s, i) => (
              <Path
                key={i}
                d={s.path}
                stroke={s.color}
                strokeWidth={s.width}
                fill="none"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            ))}
            {currentPath ? (
              <Path
                d={currentPath}
                stroke={activeColor}
                strokeWidth={width}
                fill="none"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            ) : null}
          </Svg>
        </View>

        <View style={styles.tools}>
          <View style={styles.swatchRow}>
            {PALETTE.map((c) => {
              const selected = !isEraser && c === color;
              return (
                <Pressable
                  key={c}
                  onPress={() => {
                    setColor(c);
                    setIsEraser(false);
                  }}
                  style={[
                    styles.swatch,
                    { backgroundColor: c },
                    selected && styles.swatchSelected,
                  ]}
                  accessibilityRole="button"
                  accessibilityLabel={`Color ${c}`}
                />
              );
            })}
          </View>

          <View style={styles.actionRow}>
            <View style={styles.sizeGroup}>
              {SIZES.map((s) => (
                <Pressable
                  key={s}
                  onPress={() => setWidth(s)}
                  style={[styles.sizeBtn, width === s && styles.sizeBtnActive]}
                  accessibilityRole="button"
                  accessibilityLabel={`Brush size ${s}`}
                >
                  <View
                    style={{
                      width: s + 4,
                      height: s + 4,
                      borderRadius: (s + 4) / 2,
                      backgroundColor: colors.text.primary,
                    }}
                  />
                </Pressable>
              ))}
            </View>

            <View style={styles.spacer} />

            <Pressable
              onPress={undo}
              disabled={strokes.length === 0}
              style={[styles.toolBtn, strokes.length === 0 && styles.disabled]}
              accessibilityRole="button"
              accessibilityLabel="Undo"
            >
              <AppText variant="bodySemibold">↩</AppText>
            </Pressable>
            <Pressable
              onPress={() => setIsEraser((v) => !v)}
              style={[styles.toolBtn, isEraser && styles.toolBtnActive]}
              accessibilityRole="button"
              accessibilityLabel="Eraser"
            >
              <AppText variant="bodySemibold">⌫</AppText>
            </Pressable>
          </View>

          <PrimaryButton
            label="Share"
            onPress={() => share.mutate()}
            disabled={!canShare}
            loading={share.isPending}
          />
        </View>
      </SafeAreaView>
    </ScreenBackground>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, paddingHorizontal: 20 },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 12,
  },
  back: { fontSize: 34, lineHeight: 34, color: colors.text.primary },
  canvas: {
    flex: 1,
    borderRadius: 20,
    backgroundColor: DRAW_BG,
    borderWidth: 1,
    borderColor: colors.border.subtle,
    overflow: "hidden",
    marginBottom: 16,
  },
  tools: { paddingBottom: 8, gap: 14 },
  swatchRow: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  swatch: {
    width: 30,
    height: 30,
    borderRadius: 15,
    borderWidth: 2,
    borderColor: "transparent",
  },
  swatchSelected: { borderColor: colors.text.primary },
  actionRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  sizeGroup: { flexDirection: "row", gap: 8 },
  sizeBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.surface.card,
    borderWidth: 1,
    borderColor: colors.border.subtle,
  },
  sizeBtnActive: { borderColor: colors.accent.primary },
  spacer: { flex: 1 },
  toolBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.surface.card,
    borderWidth: 1,
    borderColor: colors.border.subtle,
  },
  toolBtnActive: { borderColor: colors.accent.primary },
  disabled: { opacity: 0.4 },
});
