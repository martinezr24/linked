import { useState } from "react";
import {
  ActivityIndicator,
  Keyboard,
  StyleSheet,
  TouchableOpacity,
  View,
} from "react-native";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { AppTextInput } from "@/components/AppTextInput";
import { AppText } from "@/components/ui/AppText";
import { CloseIcon } from "@/components/ui/icons";
import { ArtifactCard } from "@/components/ui/ArtifactCard";
import { PrimaryButton } from "@/components/ui/PrimaryButton";
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
  description?: string;
  stacked?: boolean;
};

export function SharedListSection({
  listType,
  title,
  placeholder,
  notePlaceholder,
  eventId,
  description,
  stacked = true,
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
      <View style={styles.wrap}>
        <ArtifactCard title={title} stacked={stacked} style={styles.card}>
          <ActivityIndicator color={theme.colors.accent.primary} />
        </ArtifactCard>
      </View>
    );
  }

  return (
    <View style={styles.wrap}>
      <ArtifactCard title={title} stacked={stacked} style={styles.card}>
        {description ? (
          <AppText variant="body" color="secondary" style={styles.description}>
            {description}
          </AppText>
        ) : null}
        {error ? (
          <AppText variant="body" color="accent" style={styles.errorText}>
            Could not load list. Is the backend running?
          </AppText>
        ) : null}

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

        {items.length === 0 ? (
          <AppText variant="body" color="muted" style={styles.emptyText}>
            Nothing here yet — add one above.
          </AppText>
        ) : (
          items.map((item) => (
            <View
              key={item.id}
              style={[
                styles.listItem,
                {
                  backgroundColor: theme.colors.surface.cardElevated,
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
                <CloseIcon size={18} color={theme.colors.accent.primary} />
              </TouchableOpacity>
            </View>
          ))
        )}
      </ArtifactCard>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { marginHorizontal: 0, marginBottom: 0 },
  card: { marginBottom: 0 },
  description: { marginBottom: 12, marginTop: -4 },
  errorText: { marginBottom: 12 },
  inputRow: { flexDirection: "row", marginBottom: 10, gap: 8 },
  input: {
    flex: 1,
    padding: 14,
    borderRadius: 10,
    borderWidth: 1,
    fontSize: 16,
  },
  noteInput: { marginBottom: 12 },
  addBtn: { alignSelf: "stretch", justifyContent: "center" },
  emptyText: { textAlign: "center", paddingVertical: 12 },
  listItem: {
    flexDirection: "row",
    padding: 14,
    borderRadius: 10,
    marginBottom: 8,
    borderWidth: 1,
    alignItems: "flex-start",
  },
  itemContent: { flex: 1 },
  itemNote: { marginTop: 4 },
});
