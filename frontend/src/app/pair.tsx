import { useEffect, useRef, useState } from "react";
import { Share, StyleSheet, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";

import { AppTextInput } from "@/components/AppTextInput";
import { DismissKeyboardView } from "@/components/DismissKeyboardView";
import { AppMark } from "@/components/ui/AppMark";
import { AppText } from "@/components/ui/AppText";
import { ArtifactCard } from "@/components/ui/ArtifactCard";
import { ConnectionLink } from "@/components/ui/ConnectionLink";
import { PrimaryButton } from "@/components/ui/PrimaryButton";
import { ScreenBackground } from "@/components/ui/ScreenBackground";
import { getApiBase } from "@/constants/api";
import { useRelationship } from "@/context/RelationshipContext";
import { getOrCreateDeviceId } from "@/utils/deviceId";
import { useTheme } from "@/theme/useTheme";

export default function PairScreen() {
  const theme = useTheme();
  const { setPaired } = useRelationship();
  const [deviceId, setDeviceId] = useState<string | null>(null);
  const [generatedCode, setGeneratedCode] = useState<string | null>(null);
  const [secondsLeft, setSecondsLeft] = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const [enteredCode, setEnteredCode] = useState("");
  const [linking, setLinking] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    getOrCreateDeviceId().then(setDeviceId);
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  useEffect(() => {
    if (!deviceId) return;

    const interval = setInterval(async () => {
      try {
        const res = await fetch(`${getApiBase()}/api/pairing/status`, {
          method: "GET",
          headers: { "X-Device-Id": deviceId },
        });

        if (!res.ok) return;

        const data: { relationshipId: string | null } = await res.json();

        if (data.relationshipId) {
          await setPaired(data.relationshipId);
          router.replace("/");
        }
      } catch {
        // Ignore transient network errors during polling.
      }
    }, 2000);

    return () => clearInterval(interval);
  }, [deviceId]);

  async function handleGenerate() {
    if (!deviceId) return;
    setError(null);

    const res = await fetch(`${getApiBase()}/api/pairing/generate`, {
      method: "POST",
      headers: { "X-Device-Id": deviceId },
    });

    if (!res.ok) {
      const text = await res.text();
      setError(text || "Failed to generate code.");
      return;
    }

    const data = await res.json();
    setGeneratedCode(data.code);

    if (timerRef.current) clearInterval(timerRef.current);
    setSecondsLeft(600);
    timerRef.current = setInterval(() => {
      setSecondsLeft((s) => {
        if (s <= 1) {
          clearInterval(timerRef.current!);
          setGeneratedCode(null);
          return 0;
        }
        return s - 1;
      });
    }, 1000);
  }

  async function handleShareCode() {
    if (!generatedCode) return;
    try {
      await Share.share({
        message:
          `Join me on Orbit \u2728 Download the app, then enter pairing code ` +
          `${generatedCode} to connect with me. (Code expires in 10 minutes.)`,
      });
    } catch {
      // User dismissed the share sheet — nothing to do.
    }
  }

  async function handleLink() {
    if (!deviceId || enteredCode.length !== 6) return;
    setError(null);
    setLinking(true);

    const res = await fetch(`${getApiBase()}/api/pairing/link`, {
      method: "POST",
      headers: {
        "X-Device-Id": deviceId,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ code: enteredCode }),
    });

    setLinking(false);

    if (!res.ok) {
      const text = await res.text();
      setError(text || "Invalid or expired code.");
      return;
    }

    const data = await res.json();
    await setPaired(data.relationshipId);
    router.replace("/");
  }

  const minutes = Math.floor(secondsLeft / 60);
  const secs = String(secondsLeft % 60).padStart(2, "0");

  const inputStyle = [
    styles.input,
    {
      backgroundColor: theme.colors.surface.input,
      borderColor: theme.colors.border.subtle,
      color: theme.colors.text.primary,
    },
  ];

  return (
    <ScreenBackground>
      <SafeAreaView style={styles.safe}>
        <DismissKeyboardView
          scrollProps={{ automaticallyAdjustKeyboardInsets: true }}
        >
          <View style={styles.brandRow}>
            <AppMark size={36} />
            <AppText variant="h1" style={styles.title}>
              Get in Orbit
            </AppText>
          </View>

          <View style={styles.linkVisual}>
            <View
              style={[
                styles.deviceDot,
                { backgroundColor: theme.colors.avatar.mine },
              ]}
            />
            <ConnectionLink length={80} />
            <View
              style={[
                styles.deviceDot,
                { backgroundColor: theme.colors.avatar.partner },
              ]}
            />
          </View>

          {error ? (
            <View
              style={[
                styles.errorBanner,
                {
                  backgroundColor: theme.colors.surface.card,
                  borderColor: theme.colors.accent.primary,
                },
              ]}
            >
              <AppText variant="bodySemibold" color="accent" style={styles.errorText}>
                {error}
              </AppText>
            </View>
          ) : null}

          <ArtifactCard category="Share" title="Generate a code">
            <AppText variant="body" color="secondary" style={styles.hint}>
              Share this code with your partner. It expires in 10 minutes.
            </AppText>

            {generatedCode ? (
              <View style={styles.codeBox}>
                <AppText display variant="displayHero" style={styles.codeText}>
                  {generatedCode}
                </AppText>
                <AppText variant="body" color="muted">
                  Expires in {minutes}:{secs}
                </AppText>
                <PrimaryButton
                  label="Share with partner"
                  onPress={handleShareCode}
                  style={styles.shareButton}
                />
              </View>
            ) : (
              <PrimaryButton label="Generate code" onPress={handleGenerate} />
            )}
          </ArtifactCard>

          <AppText variant="body" color="muted" style={styles.divider}>
            — or —
          </AppText>

          <ArtifactCard category="Join" title="Enter partner's code">
            <AppTextInput
              style={inputStyle}
              value={enteredCode}
              onChangeText={(t) => setEnteredCode(t.replace(/\D/g, "").slice(0, 6))}
              placeholder="6-digit code"
              placeholderTextColor={theme.colors.text.muted}
              keyboardType="number-pad"
              maxLength={6}
              returnKeyType="done"
              blurOnSubmit
            />
            <PrimaryButton
              label="Link accounts"
              onPress={handleLink}
              disabled={enteredCode.length !== 6 || linking}
              loading={linking}
            />
          </ArtifactCard>
        </DismissKeyboardView>
      </SafeAreaView>
    </ScreenBackground>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, padding: 24 },
  brandRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
    marginBottom: 24,
    marginTop: 10,
  },
  title: { fontFamily: "DMSans_700Bold", textAlign: "center" },
  linkVisual: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    marginBottom: 24,
  },
  deviceDot: { width: 36, height: 36, borderRadius: 18 },
  errorBanner: {
    borderWidth: 1,
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 16,
    marginBottom: 16,
  },
  errorText: { textAlign: "center" },
  hint: { marginBottom: 12 },
  codeBox: { alignItems: "center", marginVertical: 12 },
  codeText: {
    letterSpacing: 8,
    fontFamily: "Fraunces_700Bold",
    marginBottom: 8,
  },
  shareButton: { marginTop: 12, alignSelf: "stretch" },
  divider: { textAlign: "center", marginVertical: 16 },
  input: {
    borderWidth: 1,
    borderRadius: 10,
    padding: 15,
    fontSize: 24,
    letterSpacing: 6,
    marginBottom: 12,
    textAlign: "center",
  },
  error: { textAlign: "center", marginTop: 12 },
});
