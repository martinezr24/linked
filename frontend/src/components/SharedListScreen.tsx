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

import { useRelationship } from "@/context/RelationshipContext";
import { apiFetch } from "@/utils/api";
import type { ListItem, ListType } from "@/types";

const generateId = () =>
  Date.now().toString(36) + Math.random().toString(36).substring(2);

type Props = {
  listType: ListType;
  title: string;
  placeholder: string;
  notePlaceholder?: string;
};

export function SharedListScreen({
  listType,
  title,
  placeholder,
  notePlaceholder,
}: Props) {
  const { deviceId, relationshipId, sendMessage, subscribe } = useRelationship();
  const [items, setItems] = useState<ListItem[]>([]);
  const [inputText, setInputText] = useState("");
  const [inputNote, setInputNote] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    if (!deviceId || !relationshipId) return;

    const load = async () => {
      setIsLoading(true);
      setLoadError(null);
      try {
        const res = await apiFetch(
          `/api/lists?type=${listType}`,
          deviceId,
        );
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data: ListItem[] = await res.json();
        setItems(Array.isArray(data) ? data : []);
      } catch {
        setLoadError("Could not load list. Is the backend running?");
      } finally {
        setIsLoading(false);
      }
    };

    load();

    return subscribe((msg) => {
      if (msg.action === "ADD_ITEM" && msg.payload.listType === listType) {
        const payload = msg.payload as unknown as ListItem;
        setItems((prev) =>
          prev.some((i) => i.id === payload.id) ? prev : [...prev, payload],
        );
      }
      if (msg.action === "DELETE_ITEM" && msg.payload.listType === listType) {
        const id = msg.payload.id as string;
        setItems((prev) => prev.filter((i) => i.id !== id));
      }
    });
  }, [deviceId, relationshipId, listType, subscribe]);

  const handleAdd = () => {
    const text = inputText.trim();
    if (!text) return;

    const newItem: ListItem = {
      id: generateId(),
      text,
      listType,
      ...(notePlaceholder && inputNote.trim()
        ? { note: inputNote.trim() }
        : {}),
    };
    setItems((prev) => [...prev, newItem]);
    setInputText("");
    setInputNote("");
    sendMessage("ADD_ITEM", newItem as unknown as Record<string, unknown>);
  };

  const handleDelete = (id: string) => {
    setItems((prev) => prev.filter((i) => i.id !== id));
    sendMessage("DELETE_ITEM", { id, listType });
  };

  if (isLoading) {
    return (
      <SafeAreaView style={[styles.container, styles.centered]}>
        <ActivityIndicator size="large" color="#000" />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <Text style={styles.header}>{title}</Text>
      {loadError ? <Text style={styles.errorText}>{loadError}</Text> : null}

      <View style={styles.inputBlock}>
        <View style={styles.inputRow}>
          <TextInput
            style={styles.input}
            value={inputText}
            onChangeText={setInputText}
            placeholder={placeholder}
            onSubmitEditing={handleAdd}
          />
          <TouchableOpacity style={styles.addButton} onPress={handleAdd}>
            <Text style={styles.addButtonText}>Add</Text>
          </TouchableOpacity>
        </View>
        {notePlaceholder ? (
          <TextInput
            style={styles.noteInput}
            value={inputNote}
            onChangeText={setInputNote}
            placeholder={notePlaceholder}
          />
        ) : null}
      </View>

      <FlatList
        data={items}
        keyExtractor={(item) => item.id}
        ListEmptyComponent={
          <Text style={styles.emptyText}>Nothing here yet — add one above.</Text>
        }
        renderItem={({ item }) => (
          <View style={styles.listItem}>
            <View style={styles.itemContent}>
              <Text style={styles.itemText}>{item.text}</Text>
              {item.note ? (
                <Text style={styles.itemNote}>{item.note}</Text>
              ) : null}
            </View>
            <TouchableOpacity onPress={() => handleDelete(item.id)}>
              <Text style={styles.deleteText}>✕</Text>
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
  header: { fontSize: 26, fontWeight: "800", marginBottom: 16 },
  errorText: { color: "#c0392b", marginBottom: 12 },
  inputBlock: { marginBottom: 16 },
  inputRow: { flexDirection: "row" },
  input: {
    flex: 1,
    backgroundColor: "#fff",
    padding: 14,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#ddd",
    marginRight: 10,
  },
  noteInput: {
    backgroundColor: "#fff",
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#ddd",
    marginTop: 10,
  },
  addButton: {
    backgroundColor: "#000",
    paddingHorizontal: 18,
    justifyContent: "center",
    borderRadius: 10,
  },
  addButtonText: { color: "#fff", fontWeight: "bold" },
  list: { flex: 1 },
  emptyText: { textAlign: "center", color: "#888", marginTop: 24 },
  listItem: {
    flexDirection: "row",
    backgroundColor: "#fff",
    padding: 14,
    borderRadius: 10,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: "#eee",
    alignItems: "flex-start",
  },
  itemContent: { flex: 1 },
  itemText: { fontSize: 16, fontWeight: "600" },
  itemNote: { fontSize: 14, color: "#666", marginTop: 4 },
  deleteText: { color: "#ff4444", fontSize: 18, fontWeight: "bold", padding: 4 },
});
