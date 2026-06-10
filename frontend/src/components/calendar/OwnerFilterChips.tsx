import { ScrollView, Pressable, StyleSheet } from "react-native";

import { AppText } from "@/components/ui/AppText";
import { useCoupleNames } from "@/hooks/useCoupleNames";
import { useProfile } from "@/hooks/useProfile";
import { useTheme } from "@/theme/useTheme";
import { eventColorFor, ownerFilterLabel } from "@/utils/eventColors";
import type { EventOwnerType } from "@/types";

type Props = {
  value: EventOwnerType | "all";
  onChange: (value: EventOwnerType | "all") => void;
};

const FILTERS: (EventOwnerType | "all")[] = [
  "all",
  "self",
  "partner",
  "shared",
];

export function OwnerFilterChips({ value, onChange }: Props) {
  const theme = useTheme();
  const { mineName, partnerName } = useCoupleNames();
  const { mineColor, partnerColor } = useProfile();
  const profileColors = { mineColor, partnerColor };

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.row}
    >
      {FILTERS.map((filter) => {
        const selected = value === filter;
        const chipColors =
          filter === "all"
            ? { bg: theme.colors.surface.input, text: theme.colors.text.primary }
            : eventColorFor(filter, theme, profileColors);

        return (
          <Pressable
            key={filter}
            onPress={() => onChange(filter)}
            style={[
              styles.chip,
              {
                backgroundColor: selected ? chipColors.bg : theme.colors.surface.input,
                borderColor: selected ? chipColors.bg : theme.colors.border.subtle,
                opacity: selected ? 1 : 0.85,
              },
            ]}
          >
            <AppText
              variant="caption"
              style={{
                color: selected ? chipColors.text : theme.colors.text.secondary,
                letterSpacing: 0.4,
              }}
            >
              {ownerFilterLabel(filter, mineName, partnerName)}
            </AppText>
          </Pressable>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    gap: 8,
    paddingVertical: 4,
  },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 999,
    borderWidth: 1,
  },
});
