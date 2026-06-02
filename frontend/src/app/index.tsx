import { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Redirect, router } from "expo-router";
import * as SecureStore from "expo-secure-store";

import { getApiBase, getWsUrl } from "@/constants/api";
import { getOrCreateDeviceId } from "@/utils/deviceId";

type ItineraryItem = { id: string; text: string };

const generateId = () =>
  Date.now().toString(36) + Math.random().toString(36).substring(2);

async function getStoredRelationshipId(): Promise<string | null> {
  if (Platform.OS === "web") {
    return typeof window !== "undefined"
      ? window.localStorage.getItem("relationship_id")
      : null;
  }
  return SecureStore.getItemAsync("relationship_id");
}

async function clearStoredRelationshipId(): Promise<void> {
  if (Platform.OS === "web") {
    window.localStorage.removeItem("relationship_id");
  } else {
    await SecureStore.deleteItemAsync("relationship_id");
  }
}

function confirmUnlink(): Promise<boolean> {
  const title = "Unlink partner?";
  const message =
    "This will disconnect you from your partner and permanently delete all shared itinerary history. This cannot be undone.";

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

function alertPartnerUnlinked() {
  const title = "Partner unlinked";
  const message =
    "Your partner ended the link. All shared itinerary history has been deleted.";

  if (Platform.OS === "web") {
    window.alert(`${title}\n\n${message}`);
    return;
  }

  Alert.alert(title, message);
}

export default function ItineraryScreen() {
  const [socket, setSocket] = useState<WebSocket | null>(null);
  const [inputText, setInputText] = useState("");
  const [itinerary, setItinerary] = useState<ItineraryItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [isRouteCheckDone, setIsRouteCheckDone] = useState(false);
  const [isPaired, setIsPaired] = useState(false);
  const [relationshipId, setRelationshipId] = useState<string | null>(null);
  const [deviceId, setDeviceId] = useState<string | null>(null);
  const partnerUnlinkHandled = useRef(false);

  useEffect(() => {
    (async () => {
      const stored = await getStoredRelationshipId();
      setRelationshipId(stored);
      setIsPaired(Boolean(stored));
      setIsRouteCheckDone(true);
      const id = await getOrCreateDeviceId();
      setDeviceId(id);
    })();
  }, []);

  useEffect(() => {
    if (!relationshipId || !deviceId) return;

    partnerUnlinkHandled.current = false;
    const apiBase = getApiBase();
    const wsUrl = `${getWsUrl()}?deviceId=${encodeURIComponent(deviceId)}`;

    setIsLoading(true);
    setLoadError(null);

    const loadHistory = async () => {
      try {
        const response = await fetch(`${apiBase}/api/itinerary`, {
          headers: { "X-Device-Id": deviceId },
        });
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}`);
        }
        const data: ItineraryItem[] = await response.json();
        setItinerary(Array.isArray(data) ? data : []);
      } catch (error) {
        console.error("Failed to load itinerary:", error);
        setLoadError("Could not reach the server. Is the backend running?");
      } finally {
        setIsLoading(false);
      }
    };

    loadHistory();

    const ws = new WebSocket(wsUrl);

    ws.onopen = () => {
      console.log("Connected to Go WebSocket");
      setSocket(ws);
    };

    ws.onmessage = (event) => {
      try {
        const { action, payload } = JSON.parse(event.data);
        switch (action) {
          case "ADD_ITEM":
            setItinerary((prev) =>
              prev.some((item) => item.id === payload.id)
                ? prev
                : [...prev, payload],
            );
            break;
          case "DELETE_ITEM":
            setItinerary((prev) =>
              prev.filter((item) => item.id !== payload.id),
            );
            break;
        }
      } catch {
        console.log("Non-JSON WebSocket message:", event.data);
      }
    };

    ws.onerror = () => {
      console.error("WebSocket error");
    };

    return () => {
      ws.close();
      setSocket(null);
    };
  }, [relationshipId, deviceId]);

  const handlePartnerUnlinked = useCallback(async () => {
    if (partnerUnlinkHandled.current) return;
    partnerUnlinkHandled.current = true;
    await clearStoredRelationshipId();
    setRelationshipId(null);
    setIsPaired(false);
    alertPartnerUnlinked();
    router.replace("/pair");
  }, []);

  useEffect(() => {
    if (!deviceId || !relationshipId) return;

    const apiBase = getApiBase();
    const interval = setInterval(async () => {
      try {
        const res = await fetch(`${apiBase}/api/pairing/status`, {
          headers: { "X-Device-Id": deviceId },
        });
        if (!res.ok) return;

        const data: { relationshipId: string | null } = await res.json();
        if (!data.relationshipId) {
          await handlePartnerUnlinked();
        }
      } catch {
        // Ignore transient network errors during polling.
      }
    }, 2000);

    return () => clearInterval(interval);
  }, [deviceId, relationshipId, handlePartnerUnlinked]);

  const handleAddItem = () => {
    const text = inputText.trim();
    if (!text || !socket || socket.readyState !== WebSocket.OPEN) return;

    const newItem: ItineraryItem = { id: generateId(), text };
    setItinerary((prev) => [...prev, newItem]);
    setInputText("");
    socket.send(JSON.stringify({ action: "ADD_ITEM", payload: newItem }));
  };

  const handleDeleteItem = (id: string) => {
    if (!socket || socket.readyState !== WebSocket.OPEN) return;

    setItinerary((prev) => prev.filter((item) => item.id !== id));
    socket.send(JSON.stringify({ action: "DELETE_ITEM", payload: { id } }));
  };

  const performUnlink = async () => {
    if (!deviceId) return;

    try {
      const res = await fetch(`${getApiBase()}/api/pairing/unlink`, {
        method: "POST",
        headers: { "X-Device-Id": deviceId },
      });
      if (!res.ok) {
        const text = await res.text();
        if (Platform.OS === "web") {
          window.alert(text || "Failed to unlink.");
        } else {
          Alert.alert("Unlink failed", text || "Failed to unlink.");
        }
        return;
      }

      await clearStoredRelationshipId();
      setRelationshipId(null);
      setIsPaired(false);
      router.replace("/pair");
    } catch (error) {
      console.error("Failed to unlink:", error);
    }
  };

  const handleUnlinkPress = async () => {
    const confirmed = await confirmUnlink();
    if (confirmed) {
      await performUnlink();
    }
  };

  if (!isRouteCheckDone) {
    return null;
  }
  if (!isPaired) {
    return <Redirect href="/pair" />;
  }

  if (isLoading) {
    return (
      <SafeAreaView style={[styles.container, styles.centered]}>
        <ActivityIndicator size="large" color="#000" />
        <Text style={styles.loadingText}>Loading itinerary…</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <Text style={styles.header}>Trip Itinerary</Text>

      {loadError ? <Text style={styles.errorText}>{loadError}</Text> : null}

      <View style={styles.inputContainer}>
        <TextInput
          style={styles.input}
          value={inputText}
          onChangeText={setInputText}
          placeholder="Add a new plan..."
          onSubmitEditing={handleAddItem}
        />
        <TouchableOpacity style={styles.addButton} onPress={handleAddItem}>
          <Text style={styles.addButtonText}>Add</Text>
        </TouchableOpacity>
      </View>

      <FlatList
        data={itinerary}
        keyExtractor={(item) => item.id}
        ListEmptyComponent={
          <Text style={styles.emptyText}>No plans yet — add one above.</Text>
        }
        renderItem={({ item }) => (
          <View style={styles.listItem}>
            <Text style={styles.itemText}>{item.text}</Text>
            <TouchableOpacity
              style={styles.deleteButton}
              onPress={() => handleDeleteItem(item.id)}
            >
              <Text style={styles.deleteButtonText}>✕</Text>
            </TouchableOpacity>
          </View>
        )}
        style={styles.list}
      />
      <TouchableOpacity style={styles.unlinkButton} onPress={handleUnlinkPress}>
        <Text style={styles.unlinkButtonText}>Unlink partner</Text>
      </TouchableOpacity>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f9f9f9", padding: 20 },
  centered: { justifyContent: "center", alignItems: "center" },
  loadingText: { marginTop: 15, fontSize: 16, fontWeight: "600" },
  errorText: { color: "#c0392b", marginBottom: 12 },
  header: { fontSize: 28, fontWeight: "800", marginBottom: 20, marginTop: 10 },
  inputContainer: { flexDirection: "row", marginBottom: 20 },
  input: {
    flex: 1,
    backgroundColor: "#fff",
    padding: 15,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#ddd",
    marginRight: 10,
  },
  addButton: {
    backgroundColor: "#000",
    paddingHorizontal: 20,
    justifyContent: "center",
    borderRadius: 10,
  },
  addButtonText: { color: "#fff", fontWeight: "bold" },
  list: { flex: 1 },
  emptyText: { textAlign: "center", color: "#888", marginTop: 24 },
  listItem: {
    flexDirection: "row",
    backgroundColor: "#fff",
    padding: 15,
    borderRadius: 10,
    marginBottom: 10,
    alignItems: "center",
    justifyContent: "space-between",
    borderWidth: 1,
    borderColor: "#eee",
  },
  itemText: { fontSize: 16, flex: 1 },
  deleteButton: { padding: 5 },
  deleteButtonText: { color: "#ff4444", fontWeight: "bold", fontSize: 18 },
  unlinkButton: {
    alignSelf: "flex-start",
    paddingVertical: 8,
    marginBottom: 12,
  },
  unlinkButtonText: {
    color: "#b03a2e",
    fontSize: 14,
    fontWeight: "600",
  },
});
