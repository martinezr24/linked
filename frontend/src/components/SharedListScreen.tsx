import { useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Keyboard,
  StyleSheet,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { router } from "expo-router";

import { AppTextInput } from "@/components/AppTextInput";
import { DismissKeyboardView } from "@/components/DismissKeyboardView";
import { AppText } from "@/components/ui/AppText";
import { PrimaryButton } from "@/components/ui/PrimaryButton";
import { ScreenBackground } from "@/components/ui/ScreenBackground";
import { queryKeys } from "@/api/queryKeys";
import {
  deleteListItem,
  fetchListItems,
  postListItem,
} from "@/api/fetchers";
import { useRelationship } from "@/context/RelationshipContext";
import { showMutationError } from "@/utils/errors";
import { generateId } from "@/utils/id";
import { useTheme } from "@/theme/useTheme";
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
  const theme = useTheme();
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

  const inputStyle = [
    styles.input,
    {
      backgroundColor: theme.colors.surface.input,
      borderColor: theme.colors.border.subtle,
      color: theme.colors.text.primary,
    },
  ];

  if (isLoading) {
    return (
      <ScreenBackground>
        <SafeAreaView style={[styles.safe, styles.centered]}>
          <ActivityIndicator size="large" color={theme.colors.accent.primary} />
        </SafeAreaView>
      </ScreenBackground>
    );
  }

  return (
    <ScreenBackground>
      <SafeAreaView style={styles.safe} edges={["top"]}>
        <DismissKeyboardView scroll={false} style={styles.flex}>
          {showBack ? (
            <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
              <AppText variant="bodySemibold" color="accent">
                ← Back
              </AppText>
            </TouchableOpacity>
          ) : null}
          <AppText variant="h1" style={styles.header}>
            {title}
          </AppText>
          {error ? (
            <AppText variant="body" color="accent" style={styles.errorText}>
              Could not load list. Is the backend running?
            </AppText>
          ) : null}

          <View style={styles.inputBlock}>
            <View style={styles.inputRow}>
              <AppTextInput
                style={inputStyle}
                value={inputText}
                onChangeText={setInputText}
                placeholder={placeholder}
                placeholderTextColor={theme.colors.text.muted}
                returnKeyType="done"
                blurOnSubmit
                onSubmitEditing={handleAdd}
              />
              <PrimaryButton label="Add" onPress={handleAdd} style={styles.addBtn} />
            </View>
            {notePlaceholder ? (
              <AppTextInput
                style={[inputStyle, styles.noteInput]}
                value={inputNote}
                onChangeText={setInputNote}
                placeholder={notePlaceholder}
                placeholderTextColor={theme.colors.text.muted}
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
              <AppText variant="body" color="muted" style={styles.emptyText}>
                Nothing here yet — add one above.
              </AppText>
            }
            renderItem={({ item }) => (
              <View
                style={[
                  styles.listItem,
                  {
                    backgroundColor: theme.colors.surface.card,
                    borderColor: theme.colors.border.subtle,
                  },
                ]}
              >
                <View style={styles.itemContent}>
                  <AppText variant="bodySemibold">{item.text}</AppText>
                  {item.note ? (
                    <AppText variant="body" color="secondary" style={styles.itemNote}>
                      {item.note}
                    </AppText>
                  ) : null}
                </View>
                <TouchableOpacity onPress={() => removeItem.mutate(item.id)}>
                  <AppText color="accent">✕</AppText>
                </TouchableOpacity>
              </View>
            )}
            style={styles.list}
            contentContainerStyle={styles.listContent}
          />
        </DismissKeyboardView>
      </SafeAreaView>
    </ScreenBackground>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, padding: 20 },
  flex: { flex: 1 },
  centered: { flex: 1, justifyContent: "center", alignItems: "center" },
  backButton: { marginBottom: 12, alignSelf: "flex-start" },
  header: { marginBottom: 16, fontFamily: "DMSans_700Bold" },
  errorText: { marginBottom: 12 },
  inputBlock: { marginBottom: 16 },
  inputRow: { flexDirection: "row", gap: 8 },
  input: {
    flex: 1,
    padding: 14,
    borderRadius: 10,
    borderWidth: 1,
    fontSize: 16,
  },
  noteInput: { marginTop: 10 },
  addBtn: { justifyContent: "center" },
  list: { flex: 1 },
  listContent: { paddingBottom: 24 },
  emptyText: { textAlign: "center", marginTop: 24 },
  listItem: {
    flexDirection: "row",
    padding: 14,
    borderRadius: 16,
    marginBottom: 10,
    borderWidth: 1,
    alignItems: "flex-start",
  },
  itemContent: { flex: 1 },
  itemNote: { marginTop: 4 },
});
