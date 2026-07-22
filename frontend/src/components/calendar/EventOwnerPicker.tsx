import { Pressable, StyleSheet, View } from "react-native";

import { AppText } from "@/components/ui/AppText";
import { useCoupleNames } from "@/hooks/useCoupleNames";
import { useProfile } from "@/hooks/useProfile";
import { useTheme } from "@/theme/useTheme";
import { eventColorFor, ownerFilterLabel } from "@/utils/eventColors";
import type { EventOwnerType } from "@/types";

type Props = {
  value: EventOwnerType;
  onChange: (value: EventOwnerType) => void;
};

const OPTIONS: EventOwnerType[] = ["self", "partner", "shared"];

export function EventOwnerPicker({ value, onChange }: Props) {
  const theme = useTheme();
  const { mineName, partnerName } = useCoupleNames();
  const { mineColor, partnerColor, sharedColor } = useProfile();
  const profileColors = { mineColor, partnerColor, sharedColor };

  return (
    <View style={styles.wrap}>
      <AppText variant="bodySemibold" color="secondary" style={styles.label}>
        Whose event?
      </AppText>
      <View style={styles.row}>
        {OPTIONS.map((option) => {
          const selected = value === option;
          const colors = eventColorFor(option, theme, profileColors);

          return (
            <Pressable
              key={option}
              onPress={() => onChange(option)}
              style={[
                styles.option,
                {
                  backgroundColor: selected
                    ? colors.bg
                    : theme.colors.surface.input,
                  borderColor: selected
                    ? colors.bg
                    : theme.colors.border.subtle,
                },
              ]}
            >
              <AppText
                variant="bodySemibold"
                style={{
                  color: selected ? colors.text : theme.colors.text.secondary,
                }}
              >
                {ownerFilterLabel(option, mineName, partnerName)}
              </AppText>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { marginBottom: 10 },
  label: { marginBottom: 8 },
  row: {
    flexDirection: "row",
    gap: 8,
  },
  option: {
    flex: 1,
    alignItems: "center",
    paddingVertical: 12,
    borderRadius: 10,
    borderWidth: 1,
  },
});
