import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { getApiBase, getWsUrl } from "@/constants/api";

type ItineraryItem = { id: string; text: string };

const generateId = () =>
  Date.now().toString(36) + Math.random().toString(36).substring(2);

export default function ItineraryScreen() {
  const [socket, setSocket] = useState<WebSocket | null>(null);
  const [inputText, setInputText] = useState("");
  const [itinerary, setItinerary] = useState<ItineraryItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    const apiBase = getApiBase();
    const wsUrl = getWsUrl();

    const loadHistory = async () => {
      try {
        const response = await fetch(`${apiBase}/api/itinerary`);
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

    return () => ws.close();
  }, []);

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
});
