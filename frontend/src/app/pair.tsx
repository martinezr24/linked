import { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";
import { getApiBase } from "@/constants/api";
import { useRelationship } from "@/context/RelationshipContext";
import { getOrCreateDeviceId } from "@/utils/deviceId";

export default function PairScreen() {
  const { setPaired } = useRelationship();
  const [deviceId, setDeviceId] = useState<string | null>(null);

  // "generate" state
  const [generatedCode, setGeneratedCode] = useState<string | null>(null);
  const [secondsLeft, setSecondsLeft] = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // "enter code" state
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

    // start countdown timer (10 minutes = 600 seconds)
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

  return (
    <SafeAreaView style={styles.container}>
      <Text style={styles.title}>Link with your partner</Text>

      {/* --- GENERATE CODE section --- */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Generate a code</Text>
        <Text style={styles.hint}>
          Share this code with your partner. It expires in 10 minutes.
        </Text>

        {generatedCode ? (
          <View style={styles.codeBox}>
            <Text style={styles.codeText}>{generatedCode}</Text>
            <Text style={styles.timer}>
              Expires in {minutes}:{secs}
            </Text>
          </View>
        ) : (
          <TouchableOpacity style={styles.button} onPress={handleGenerate}>
            <Text style={styles.buttonText}>Generate code</Text>
          </TouchableOpacity>
        )}
      </View>

      <Text style={styles.divider}>— or —</Text>

      {/* --- ENTER CODE section --- */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Enter your partner's code</Text>
        <TextInput
          style={styles.input}
          value={enteredCode}
          onChangeText={(t) => setEnteredCode(t.replace(/\D/g, "").slice(0, 6))}
          placeholder="6-digit code"
          keyboardType="number-pad"
          maxLength={6}
        />
        <TouchableOpacity
          style={[
            styles.button,
            enteredCode.length !== 6 && styles.buttonDisabled,
          ]}
          onPress={handleLink}
          disabled={enteredCode.length !== 6 || linking}
        >
          {linking ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.buttonText}>Link accounts</Text>
          )}
        </TouchableOpacity>
      </View>

      {error ? <Text style={styles.error}>{error}</Text> : null}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f9f9f9", padding: 24 },
  title: { fontSize: 26, fontWeight: "800", marginBottom: 32, marginTop: 10 },
  section: { marginBottom: 24 },
  sectionTitle: { fontSize: 17, fontWeight: "700", marginBottom: 6 },
  hint: { color: "#666", marginBottom: 12 },
  codeBox: { alignItems: "center", marginTop: 8 },
  codeText: { fontSize: 48, fontWeight: "900", letterSpacing: 8 },
  timer: { color: "#888", marginTop: 8 },
  divider: { textAlign: "center", color: "#aaa", marginVertical: 16 },
  input: {
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 10,
    padding: 15,
    fontSize: 24,
    letterSpacing: 6,
    marginBottom: 12,
  },
  button: {
    backgroundColor: "#000",
    padding: 16,
    borderRadius: 10,
    alignItems: "center",
  },
  buttonDisabled: { backgroundColor: "#ccc" },
  buttonText: { color: "#fff", fontWeight: "700", fontSize: 16 },
  error: { color: "#c0392b", textAlign: "center", marginTop: 12 },
});
