import { useEffect, useState } from "react";
import { ActivityIndicator, Modal, Pressable, ScrollView, StyleSheet, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useMutation, useQueryClient } from "@tanstack/react-query";

import { AppText } from "@/components/ui/AppText";
import { PrimaryButton } from "@/components/ui/PrimaryButton";
import { CloseIcon } from "@/components/ui/icons";
import { ColorSwatchPicker } from "@/components/profile/ColorSwatchPicker";
import { queryKeys } from "@/api/queryKeys";
import { updateProfile } from "@/api/fetchers";
import { useProfile } from "@/hooks/useProfile";
import { useGoogleCalendar } from "@/hooks/useGoogleCalendar";
import { useRelationship } from "@/context/RelationshipContext";
import { blendHexColors } from "@/utils/eventColors";
import { showMutationError } from "@/utils/errors";
import { useTheme } from "@/theme/useTheme";

type Props = { visible: boolean; onClose: () => void };

export function CalendarSettingsSheet({ visible, onClose }: Props) {
  const theme = useTheme();
  const { deviceId } = useRelationship();
  const queryClient = useQueryClient();
  const { mineColor, partnerColor, sharedColor } = useProfile();
  const { isConnected, email, isLoading: gcalLoading, connect, disconnect, isDisconnecting } = useGoogleCalendar();

  const [myColor, setMyColor] = useState(mineColor);
  const [bothColor, setBothColor] = useState(
    sharedColor ?? blendHexColors(mineColor, partnerColor),
  );

  useEffect(() => {
    if (!visible) return;
    setMyColor(mineColor);
    setBothColor(sharedColor ?? blendHexColors(mineColor, partnerColor));
  }, [visible, mineColor, partnerColor, sharedColor]);

  const save = useMutation({
    mutationFn: () =>
      updateProfile(deviceId!, {
        calendarColor: myColor,
        sharedCalendarColor: bothColor,
      }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.profile });
      onClose();
    },
    onError: () => showMutationError("Could not save colors."),
  });

  return (
    <Modal visible={visible} transparent animationType="slide">
      <Pressable style={styles.overlay} onPress={onClose}>
        <Pressable
          style={[styles.sheet, { backgroundColor: theme.colors.surface.card }]}
          onPress={(e) => e.stopPropagation()}
        >
          <SafeAreaView edges={["bottom"]}>
            <View style={styles.header}>
              <AppText variant="h2">Calendar colors</AppText>
              <Pressable onPress={onClose} hitSlop={12}>
                <CloseIcon size={22} color={theme.colors.text.secondary} />
              </Pressable>
            </View>
            <ScrollView
              contentContainerStyle={styles.body}
              showsVerticalScrollIndicator={false}
            >
              <AppText variant="caption" color="secondary" style={styles.label}>
                YOUR EVENTS
              </AppText>
              <ColorSwatchPicker value={myColor} onChange={setMyColor} />

              <AppText variant="caption" color="secondary" style={styles.label}>
                BOTH OF US
              </AppText>
              <ColorSwatchPicker value={bothColor} onChange={setBothColor} />

              <AppText variant="caption" color="muted" style={styles.note}>
                Your partner picks their own color. The “both of us” color is
                shared — you’ll both see it on shared events.
              </AppText>

              <PrimaryButton
                label={save.isPending ? "Saving…" : "Save colors"}
                disabled={save.isPending || !deviceId}
                onPress={() => save.mutate()}
                style={styles.save}
              />

              {/* ── Google Calendar ── */}
              <View style={styles.divider} />
              <AppText variant="caption" color="secondary" style={styles.label}>
                GOOGLE CALENDAR
              </AppText>
              {gcalLoading ? (
                <ActivityIndicator style={styles.gcalSpinner} />
              ) : isConnected ? (
                <View style={styles.gcalConnected}>
                  <View style={styles.gcalInfo}>
                    <View style={[styles.gcalDot, { backgroundColor: "#4285F4" }]} />
                    <AppText variant="bodySemibold" style={styles.gcalEmail}>
                      {email ?? "Connected"}
                    </AppText>
                  </View>
                  <Pressable
                    onPress={disconnect}
                    disabled={isDisconnecting}
                    style={styles.disconnectBtn}
                  >
                    <AppText variant="caption" color="secondary">
                      {isDisconnecting ? "Disconnecting…" : "Disconnect"}
                    </AppText>
                  </Pressable>
                </View>
              ) : (
                <PrimaryButton
                  label="Connect Google Calendar"
                  onPress={() => void connect()}
                  style={styles.gcalBtn}
                />
              )}
              <AppText variant="caption" color="muted" style={styles.gcalNote}>
                Your Google events appear as a read-only overlay. New Orbit
                events are also added to an "Orbit" calendar in Google.
              </AppText>
            </ScrollView>
          </SafeAreaView>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: "flex-end",
    backgroundColor: "rgba(0,0,0,0.5)",
  },
  sheet: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 20,
    paddingTop: 16,
    maxHeight: "85%",
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  body: { paddingBottom: 24 },
  label: { marginTop: 16, marginBottom: 8 },
  note: { marginTop: 12, lineHeight: 18 },
  save: { marginTop: 24 },
  divider: { height: 1, backgroundColor: "rgba(128,128,128,0.15)", marginTop: 28 },
  gcalSpinner: { marginVertical: 8 },
  gcalConnected: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 4,
  },
  gcalInfo: { flexDirection: "row", alignItems: "center", gap: 8, flex: 1 },
  gcalDot: { width: 10, height: 10, borderRadius: 5 },
  gcalEmail: { flex: 1 },
  disconnectBtn: { paddingHorizontal: 8, paddingVertical: 4 },
  gcalBtn: { marginTop: 4 },
  gcalNote: { marginTop: 10, lineHeight: 18 },
});
