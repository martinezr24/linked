import { Pressable, StyleSheet, View } from "react-native";

import { AppText } from "@/components/ui/AppText";
import { useTheme } from "@/theme/useTheme";
import { CALENDAR_COLOR_PRESETS } from "@/utils/eventColors";

type Props = {
  value: string;
  onChange: (color: string) => void;
};

export function ColorSwatchPicker({ value, onChange }: Props) {
  const theme = useTheme();

  return (
    <View style={styles.wrap}>
      <View style={styles.row}>
        {CALENDAR_COLOR_PRESETS.map((color) => {
          const selected = value.toUpperCase() === color.toUpperCase();
          return (
            <Pressable
              key={color}
              onPress={() => onChange(color)}
              style={[
                styles.swatch,
                { backgroundColor: color },
                selected && styles.selected,
                selected && { borderColor: theme.colors.text.primary },
              ]}
            />
          );
        })}
      </View>
      <View style={[styles.preview, { backgroundColor: value }]}>
        <AppText variant="caption" style={{ color: "#fff" }}>
          Calendar preview
        </AppText>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: 10 },
  row: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  swatch: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 2,
    borderColor: "transparent",
  },
  selected: {
    borderWidth: 3,
  },
  preview: {
    borderRadius: 10,
    paddingVertical: 10,
    paddingHorizontal: 12,
    alignSelf: "flex-start",
  },
});
