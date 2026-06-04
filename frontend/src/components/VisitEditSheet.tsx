import { Modal, Pressable, StyleSheet, View } from "react-native";

import { DatePickerField } from "@/components/DatePickerField";
import { AppText } from "@/components/ui/AppText";
import { PrimaryButton } from "@/components/ui/PrimaryButton";
import { useTheme } from "@/theme/useTheme";

type Props = {
  visible: boolean;
  onClose: () => void;
  visitDraft: Date | null;
  onChangeDraft: (date: Date | null) => void;
  hasVisit: boolean;
  onSave: () => void;
  onClear: () => void;
  saving?: boolean;
};

export function VisitEditSheet({
  visible,
  onClose,
  visitDraft,
  onChangeDraft,
  hasVisit,
  onSave,
  onClear,
  saving,
}: Props) {
  const theme = useTheme();

  return (
    <Modal visible={visible} transparent animationType="slide">
      <Pressable style={styles.backdrop} onPress={onClose}>
        <Pressable
          style={[
            styles.sheet,
            { backgroundColor: theme.colors.surface.card },
          ]}
          onPress={(e) => e.stopPropagation()}
        >
          <AppText variant="h2" style={styles.title}>
            Next visit
          </AppText>
          <AppText variant="body" color="secondary" style={styles.hint}>
            Set when you'll be together — both of you see the same countdown.
          </AppText>
          <DatePickerField
            label="Visit date"
            value={visitDraft}
            onChange={onChangeDraft}
            minimumDate={new Date()}
          />
          <PrimaryButton
            label="Save visit date"
            onPress={onSave}
            disabled={!visitDraft}
            loading={saving}
          />
          {hasVisit ? (
            <PrimaryButton
              label="Clear visit date"
              variant="ghost"
              onPress={onClear}
              style={styles.clearBtn}
            />
          ) : null}
          <PrimaryButton
            label="Done"
            variant="ghost"
            onPress={onClose}
            style={styles.doneBtn}
          />
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    justifyContent: "flex-end",
    backgroundColor: "rgba(0,0,0,0.65)",
  },
  sheet: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 24,
    paddingBottom: 40,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
  },
  title: { marginBottom: 8 },
  hint: { marginBottom: 16, lineHeight: 22 },
  clearBtn: { marginTop: 12 },
  doneBtn: { marginTop: 8 },
});
