import { useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Keyboard,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { router } from "expo-router";

import { AppTextInput } from "@/components/AppTextInput";
import { DismissKeyboardView } from "@/components/DismissKeyboardView";
import { queryKeys } from "@/api/queryKeys";
import {
  deleteListItem,
  fetchListItems,
  postListItem,
} from "@/api/fetchers";
import { useRelationship } from "@/context/RelationshipContext";
import { showMutationError } from "@/utils/errors";
import { generateId } from "@/utils/id";
import type { ListItem, ListType } from "@/types";

type Props = {
  listType: ListType;
  title: string;
  placeholder: string;
  notePlaceholder?: string;
  eventId?: string;
  showBack?: boolean;
};

export function SharedListScreen({
  listType,
  title,
  placeholder,
  notePlaceholder,
  eventId,
  showBack,
}: Props) {
  const { deviceId, relationshipId } = useRelationship();
  const queryClient = useQueryClient();
  const queryKey = queryKeys.list(listType, eventId);
  const [inputText, setInputText] = useState("");
  const [inputNote, setInputNote] = useState("");

  const {
    data: items = [],
    isLoading,
    error,
  } = useQuery({
    queryKey,
    queryFn: () => fetchListItems(deviceId!, listType, eventId),
    enabled:
      Boolean(deviceId && relationshipId) &&
      (listType !== "visit" || Boolean(eventId)),
  });

  const addItem = useMutation({
    mutationFn: (item: ListItem) => postListItem(deviceId!, item),
    onSuccess: () => void queryClient.invalidateQueries({ queryKey }),
    onError: () => showMutationError("Could not add item."),
  });

  const removeItem = useMutation({
    mutationFn: (id: string) =>
      deleteListItem(deviceId!, id, listType, eventId),
    onSuccess: () => void queryClient.invalidateQueries({ queryKey }),
    onError: () => showMutationError("Could not delete item."),
  });

  const handleAdd = () => {
    const text = inputText.trim();
    if (!text || !deviceId) return;
    Keyboard.dismiss();

    const newItem: ListItem = {
      id: generateId(),
      text,
      listType,
      ...(notePlaceholder && inputNote.trim()
        ? { note: inputNote.trim() }
        : {}),
      ...(listType === "visit" && eventId ? { eventId } : {}),
    };
    setInputText("");
    setInputNote("");
    addItem.mutate(newItem);
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
      <DismissKeyboardView scroll={false} style={styles.flex}>
        {showBack ? (
          <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
            <Text style={styles.backButtonText}>← Back</Text>
          </TouchableOpacity>
        ) : null}
        <Text style={styles.header}>{title}</Text>
        {error ? (
          <Text style={styles.errorText}>
            Could not load list. Is the backend running?
          </Text>
        ) : null}

        <View style={styles.inputBlock}>
          <View style={styles.inputRow}>
            <AppTextInput
              style={styles.input}
              value={inputText}
              onChangeText={setInputText}
              placeholder={placeholder}
              returnKeyType="done"
              blurOnSubmit
              onSubmitEditing={handleAdd}
            />
            <TouchableOpacity style={styles.addButton} onPress={handleAdd}>
              <Text style={styles.addButtonText}>Add</Text>
            </TouchableOpacity>
          </View>
          {notePlaceholder ? (
            <AppTextInput
              style={styles.noteInput}
              value={inputNote}
              onChangeText={setInputNote}
              placeholder={notePlaceholder}
              returnKeyType="done"
              blurOnSubmit
            />
          ) : null}
        </View>

        <FlatList
          data={items}
          keyExtractor={(item) => item.id}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag"
          ListEmptyComponent={
            <Text style={styles.emptyText}>
              Nothing here yet — add one above.
            </Text>
          }
          renderItem={({ item }) => (
            <View style={styles.listItem}>
              <View style={styles.itemContent}>
                <Text style={styles.itemText}>{item.text}</Text>
                {item.note ? (
                  <Text style={styles.itemNote}>{item.note}</Text>
                ) : null}
              </View>
              <TouchableOpacity onPress={() => removeItem.mutate(item.id)}>
                <Text style={styles.deleteText}>✕</Text>
              </TouchableOpacity>
            </View>
          )}
          style={styles.list}
          contentContainerStyle={styles.listContent}
        />
      </DismissKeyboardView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f9f9f9", padding: 20 },
  flex: { flex: 1 },
  centered: { justifyContent: "center", alignItems: "center" },
  backButton: { marginBottom: 12, alignSelf: "flex-start" },
  backButtonText: { fontSize: 16, fontWeight: "600", color: "#000" },
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
  listContent: { paddingBottom: 24 },
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
