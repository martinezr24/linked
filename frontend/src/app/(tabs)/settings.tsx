import { useEffect, useState } from "react";
import { Alert, Platform, ScrollView, StyleSheet } from "react-native";
import { useQueryClient } from "@tanstack/react-query";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";

import { AppText } from "@/components/ui/AppText";
import { ArtifactCard } from "@/components/ui/ArtifactCard";
import { PrimaryButton } from "@/components/ui/PrimaryButton";
import { ProfileSettingsCard } from "@/components/profile/ProfileSettingsCard";
import { ScreenBackground } from "@/components/ui/ScreenBackground";
import { queryKeys } from "@/api/queryKeys";
import { useRelationship } from "@/context/RelationshipContext";
import { syncMyPresence } from "@/utils/presenceSync";
import { getWeatherCity, setWeatherCity } from "@/utils/weatherCity";
import { apiFetch } from "@/utils/api";
import { AppTextInput } from "@/components/AppTextInput";
import { getDeviceTimezoneLabel } from "@/utils/dates";
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
  const queryClient = useQueryClient();
  const [myCity, setMyCity] = useState("");
  const [savingPresence, setSavingPresence] = useState(false);
  const tzLabel = getDeviceTimezoneLabel();

  useEffect(() => {
    getWeatherCity().then((city) => setMyCity(city ?? ""));
  }, []);

  const inputStyle = [
    styles.input,
    {
      backgroundColor: theme.colors.surface.input,
      borderColor: theme.colors.border.subtle,
      color: theme.colors.text.primary,
    },
  ];

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
        <ScrollView contentContainerStyle={styles.scroll}>
          <AppText variant="h1" style={styles.header}>
            Settings
          </AppText>

          <ProfileSettingsCard />

          <ArtifactCard category="Their world" title="Weather for your partner">
            <AppText variant="body" color="secondary" style={styles.hint}>
              We use your location when allowed, or this city, so your partner
              sees weather in your area on Home.
            </AppText>
            <AppText variant="caption" color="secondary" style={styles.fieldLabel}>
              YOUR CITY (OPTIONAL)
            </AppText>
            <AppTextInput
              style={inputStyle}
              value={myCity}
              onChangeText={setMyCity}
              placeholder="e.g. Austin, TX"
              placeholderTextColor={theme.colors.text.muted}
              autoCapitalize="words"
            />
            <PrimaryButton
              label={savingPresence ? "Saving…" : "Save location"}
              disabled={savingPresence || !deviceId}
              onPress={async () => {
                if (!deviceId) return;
                setSavingPresence(true);
                try {
                  await setWeatherCity(myCity);
                  await syncMyPresence(deviceId);
                  void queryClient.invalidateQueries({
                    queryKey: queryKeys.partnerPresence,
                  });
                  if (Platform.OS === "web") {
                    window.alert("Location saved. Your partner will see your weather.");
                  } else {
                    Alert.alert(
                      "Saved",
                      "Your partner will see weather in your area on Home.",
                    );
                  }
                } catch {
                  showMutationError("Could not save your location.");
                } finally {
                  setSavingPresence(false);
                }
              }}
            />
          </ArtifactCard>

          <ArtifactCard category="Daily rhythm" title="Photo streak">
            <AppText variant="body" color="secondary">
              Both partners must send a daily photo to grow your streak. Resets
              at midnight in your device timezone ({tzLabel}).
            </AppText>
          </ArtifactCard>

          <ArtifactCard category="Daily rhythm" title="Check-ins">
            <AppText variant="body" color="secondary">
              Optional connection prompts live in Play. They do not affect your
              photo streak.
            </AppText>
          </ArtifactCard>

          <ArtifactCard category="Account" title="Partner">
            <AppText variant="body" color="secondary" style={styles.hint}>
              Unlinking removes all shared history for both partners.
            </AppText>
            <PrimaryButton label="Unlink partner" onPress={handleUnlink} />
          </ArtifactCard>
        </ScrollView>
      </SafeAreaView>
    </ScreenBackground>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  scroll: { padding: 20, paddingBottom: 100 },
  header: {
    marginBottom: 20,
    marginTop: 8,
    fontFamily: "DMSans_700Bold",
  },
  hint: { marginBottom: 12, lineHeight: 22 },
  fieldLabel: { marginBottom: 6, marginTop: 8 },
  input: {
    borderWidth: 1,
    borderRadius: 10,
    padding: 12,
    marginBottom: 8,
    fontSize: 16,
  },
});
