import { Alert, Platform, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";

import { useRelationship } from "@/context/RelationshipContext";
import { apiFetch } from "@/utils/api";
import { showMutationError } from "@/utils/errors";

function confirmUnlink(): Promise<boolean> {
  const title = "Unlink partner?";
  const message =
    "This will disconnect you from your partner and permanently delete all shared data — trip plans, reunion list, countdown, goals, and events. This cannot be undone.";

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
    <SafeAreaView style={styles.container} edges={["top"]}>
      <Text style={styles.header}>Settings</Text>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Account</Text>
        <Text style={styles.hint}>
          Unlinking removes all shared history for both partners.
        </Text>
        <TouchableOpacity style={styles.unlinkButton} onPress={handleUnlink}>
          <Text style={styles.unlinkText}>Unlink partner</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f9f9f9", padding: 20 },
  header: { fontSize: 26, fontWeight: "800", marginBottom: 24, marginTop: 8 },
  section: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: "#eee",
  },
  sectionTitle: { fontSize: 17, fontWeight: "700", marginBottom: 8 },
  hint: { color: "#666", marginBottom: 16, lineHeight: 20 },
  unlinkButton: {
    backgroundColor: "#fce8e6",
    borderColor: "#f5b7b1",
    borderWidth: 1,
    padding: 14,
    borderRadius: 10,
    alignItems: "center",
  },
  unlinkText: { color: "#b03a2e", fontWeight: "700" },
});
