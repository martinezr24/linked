import { useEffect, useState } from "react";
import { Alert, Platform, StyleSheet } from "react-native";
import { useMutation, useQueryClient } from "@tanstack/react-query";

import { queryKeys } from "@/api/queryKeys";
import { updateProfile } from "@/api/fetchers";
import { AppTextInput } from "@/components/AppTextInput";
import { AppText } from "@/components/ui/AppText";
import { ArtifactCard } from "@/components/ui/ArtifactCard";
import { PrimaryButton } from "@/components/ui/PrimaryButton";
import { ProfileAvatarPicker } from "@/components/profile/ProfileAvatarPicker";
import { useProfile } from "@/hooks/useProfile";
import { useRelationship } from "@/context/RelationshipContext";
import { getMyDisplayName } from "@/utils/coupleNames";
import { showMutationError } from "@/utils/errors";
import { useTheme } from "@/theme/useTheme";

export function ProfileSettingsCard() {
  const theme = useTheme();
  const { deviceId } = useRelationship();
  const queryClient = useQueryClient();
  const { mine, partner, isLoading } = useProfile();
  const [displayName, setDisplayName] = useState("");
  const [calendarColor, setCalendarColor] = useState("#C44B6E");
  const [venmo, setVenmo] = useState("");

  useEffect(() => {
    if (!mine) return;
    setDisplayName(mine.displayName ?? "");
    setCalendarColor(mine.calendarColor ?? "#C44B6E");
    setVenmo(mine.venmoUsername ?? "");
  }, [mine]);

  const save = useMutation({
    mutationFn: async () => {
      let name = displayName.trim();
      if (!name) {
        const local = await getMyDisplayName();
        if (local) name = local;
      }
      return updateProfile(deviceId!, {
        displayName: name || undefined,
        venmoUsername: venmo.trim(),
      });
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.profile });
      void queryClient.invalidateQueries({ queryKey: queryKeys.partnerPresence });
      if (Platform.OS === "web") {
        window.alert("Profile saved.");
      } else {
        Alert.alert("Saved", "Your profile is updated for both of you.");
      }
    },
    onError: () => showMutationError("Could not save profile."),
  });

  const inputStyle = [
    styles.input,
    {
      backgroundColor: theme.colors.surface.input,
      borderColor: theme.colors.border.subtle,
      color: theme.colors.text.primary,
    },
  ];

  if (isLoading) return null;

  return (
    <ArtifactCard category="Profile" title="Your profile">
      <AppText variant="body" color="secondary" style={styles.hint}>
        Your nickname and avatar sync with your partner. Add your Venmo so they
        can treat you. Manage event colors from the Calendar tab.
        {partner?.displayName ? ` Partner: ${partner.displayName}.` : ""}
      </AppText>

      <ProfileAvatarPicker
        displayName={displayName}
        avatarUrl={mine?.profilePictureUrl}
        calendarColor={calendarColor}
      />

      <AppText variant="caption" color="secondary" style={styles.fieldLabel}>
        NICKNAME
      </AppText>
      <AppTextInput
        style={inputStyle}
        value={displayName}
        onChangeText={setDisplayName}
        placeholder="e.g. Gio"
        placeholderTextColor={theme.colors.text.muted}
      />

      <AppText variant="caption" color="secondary" style={styles.fieldLabel}>
        VENMO USERNAME (TO SEND TREATS)
      </AppText>
      <AppTextInput
        style={inputStyle}
        value={venmo}
        onChangeText={setVenmo}
        placeholder="e.g. gio-martinez"
        placeholderTextColor={theme.colors.text.muted}
        autoCapitalize="none"
        autoCorrect={false}
      />

      <PrimaryButton
        label={save.isPending ? "Saving…" : "Save profile"}
        disabled={save.isPending || !deviceId}
        onPress={() => save.mutate()}
        style={styles.saveButton}
      />
    </ArtifactCard>
  );
}

const styles = StyleSheet.create({
  hint: { marginBottom: 12, lineHeight: 22 },
  fieldLabel: { marginBottom: 6, marginTop: 12 },
  input: {
    borderWidth: 1,
    borderRadius: 10,
    padding: 12,
    marginBottom: 8,
    fontSize: 16,
  },
  saveButton: { marginTop: 20 },
});
