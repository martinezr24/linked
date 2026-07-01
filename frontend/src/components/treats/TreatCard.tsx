import { Linking, StyleSheet, View } from "react-native";

import { AppText } from "@/components/ui/AppText";
import { PrimaryButton } from "@/components/ui/PrimaryButton";
import type { TreatLink } from "@/constants/treatLinks";
import { hapticLight } from "@/utils/haptics";
import { useTheme } from "@/theme/useTheme";

type Props = {
  treat: TreatLink;
};

export function TreatCard({ treat }: Props) {
  const theme = useTheme();

  const openLink = async () => {
    void hapticLight();
    const can = await Linking.canOpenURL(treat.url);
    if (can) {
      await Linking.openURL(treat.url);
    }
  };

  return (
    <View
      style={[
        styles.card,
        {
          backgroundColor: theme.colors.surface.cardElevated,
          borderColor: theme.colors.border.subtle,
        },
      ]}
    >
      <View style={styles.iconWrap}>
        <treat.icon size={28} color={theme.colors.accent.primary} />
      </View>
      <View style={styles.copy}>
        <AppText variant="bodySemibold">{treat.title}</AppText>
        <AppText variant="caption" color="secondary" style={styles.subtitle}>
          {treat.subtitle}
        </AppText>
      </View>
      <PrimaryButton
        label="Send"
        onPress={() => void openLink()}
        style={styles.btn}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 14,
    borderWidth: 1,
    padding: 14,
    gap: 12,
  },
  emoji: { fontSize: 28 },
  iconWrap: { width: 28, alignItems: "center" },
  copy: { flex: 1 },
  subtitle: { marginTop: 2, letterSpacing: 0 },
  btn: { minWidth: 88 },
});
