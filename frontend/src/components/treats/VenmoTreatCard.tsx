import { Linking, StyleSheet, Text, View } from "react-native";

import { AppText } from "@/components/ui/AppText";
import { PrimaryButton } from "@/components/ui/PrimaryButton";
import { hapticLight } from "@/utils/haptics";
import { useTheme } from "@/theme/useTheme";

const VENMO_BLUE = "#3D95CE";

type Props = {
  /** The partner's Venmo username (set by them in Profile). */
  username?: string;
  partnerName: string;
};

/** Opens Venmo to pay the partner. Falls back to the web profile if the app
 *  isn't installed. Disabled until the partner has added their handle. */
export function VenmoTreatCard({ username, partnerName }: Props) {
  const theme = useTheme();
  const handle = username?.trim().replace(/^@/, "");

  const openVenmo = async () => {
    if (!handle) return;
    void hapticLight();
    const note = encodeURIComponent("A little treat 🧡");
    const appUrl = `venmo://paycharge?txn=pay&recipients=${handle}&note=${note}`;
    const webUrl = `https://venmo.com/u/${handle}`;
    try {
      await Linking.openURL(appUrl);
    } catch {
      await Linking.openURL(webUrl).catch(() => {});
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
      <View style={[styles.iconWrap, { backgroundColor: VENMO_BLUE }]}>
        <Text style={styles.dollar}>$</Text>
      </View>
      <View style={styles.copy}>
        <AppText variant="bodySemibold">Send Venmo</AppText>
        <AppText variant="caption" color="secondary" style={styles.subtitle}>
          {handle
            ? `@${handle}`
            : `Ask ${partnerName} to add their Venmo in Profile`}
        </AppText>
      </View>
      <PrimaryButton
        label="Send"
        onPress={() => void openVenmo()}
        disabled={!handle}
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
  iconWrap: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: "center",
    justifyContent: "center",
  },
  dollar: { color: "#fff", fontSize: 18, fontWeight: "700" },
  copy: { flex: 1 },
  subtitle: { marginTop: 2, letterSpacing: 0 },
  btn: { minWidth: 88 },
});
