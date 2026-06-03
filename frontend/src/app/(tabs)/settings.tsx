import { Alert, Platform, StyleSheet, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";

import { AppText } from "@/components/ui/AppText";
import { ArtifactCard } from "@/components/ui/ArtifactCard";
import { PrimaryButton } from "@/components/ui/PrimaryButton";
import { ScreenBackground } from "@/components/ui/ScreenBackground";
import { useRelationship } from "@/context/RelationshipContext";
import { apiFetch } from "@/utils/api";
import { showMutationError } from "@/utils/errors";
import { useTheme } from "@/theme/useTheme";

function confirmUnlink(): Promise<boolean> {
  const title = "Unlink partner?";
  const message =
    "This will disconnect you from your partner and permanently delete all shared data — shared plans, countdown, goals, and events. This cannot be undone.";

  if (Platform.OS === "web") {
    return Promise.resolve(window.confirm(`${title}\n\n${message}`));
  }

  return new Promise((resolve) => {
    Alert.alert(title, message, [
      { text: "Cancel", style: "cancel", onPress: () => resolve(false) },
      {
        text: "Unlink",
        style: "destructive",
        onPress: () => resolve(true),
      },
    ]);
  });
}

export default function SettingsScreen() {
  const theme = useTheme();
  const { deviceId, clearPaired } = useRelationship();

  const handleUnlink = async () => {
    const confirmed = await confirmUnlink();
    if (!confirmed || !deviceId) return;

    try {
      const res = await apiFetch("/api/pairing/unlink", deviceId, {
        method: "POST",
      });
      if (!res.ok) {
        const text = await res.text();
        showMutationError(text || "Failed to unlink.");
        return;
      }
      await clearPaired();
      router.replace("/pair");
    } catch (error) {
      console.error("Failed to unlink:", error);
      showMutationError("Failed to unlink.");
    }
  };

  return (
    <ScreenBackground>
      <SafeAreaView style={styles.safe} edges={["top"]}>
        <AppText variant="h1" style={styles.header}>
          Settings
        </AppText>

        <View style={styles.section}>
          <ArtifactCard category="Account" title="Partner">
            <AppText variant="body" color="secondary" style={styles.hint}>
              Unlinking removes all shared history for both partners.
            </AppText>
            <PrimaryButton
              label="Unlink partner"
              onPress={handleUnlink}
              style={[
                styles.unlinkBtn,
                {
                  borderColor: theme.colors.accent.primaryMuted,
                },
              ]}
            />
          </ArtifactCard>
        </View>
      </SafeAreaView>
    </ScreenBackground>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, padding: 20 },
  header: {
    marginBottom: 24,
    marginTop: 8,
    fontFamily: "DMSans_700Bold",
  },
  section: {},
  hint: { marginBottom: 16, lineHeight: 22 },
  unlinkBtn: { marginTop: 4 },
});
