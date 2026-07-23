import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from "react-native";

import { AppText } from "@/components/ui/AppText";
import { TreatCard } from "@/components/treats/TreatCard";
import { VenmoTreatCard } from "@/components/treats/VenmoTreatCard";
import { TREAT_LINKS } from "@/constants/treatLinks";
import { useProfile } from "@/hooks/useProfile";
import { useTheme } from "@/theme/useTheme";

type Props = {
  visible: boolean;
  onClose: () => void;
  partnerName?: string;
};

export function TreatsModal({ visible, onClose, partnerName }: Props) {
  const theme = useTheme();
  const { partnerVenmo } = useProfile();
  const label = partnerName?.trim() || "your partner";

  return (
    <Modal visible={visible} transparent animationType="fade">
      <Pressable style={styles.backdrop} onPress={onClose}>
        <Pressable
          style={[
            styles.sheet,
            {
              backgroundColor: theme.colors.surface.card,
              borderColor: theme.colors.border.subtle,
            },
          ]}
          onPress={(e) => e.stopPropagation()}
        >
          <View style={styles.handle} />
          <AppText variant="h2" style={styles.title}>
            Treat {label}
          </AppText>
          <AppText variant="body" color="secondary" style={styles.hint}>
            Pick a small gift — you'll finish checkout in their app or browser.
          </AppText>
          <ScrollView
            style={styles.list}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.listContent}
          >
            <VenmoTreatCard username={partnerVenmo} partnerName={label} />
            {TREAT_LINKS.map((treat) => (
              <TreatCard key={treat.id} treat={treat} />
            ))}
          </ScrollView>
          <Pressable onPress={onClose} style={styles.dismiss}>
            <AppText variant="bodySemibold" color="muted">
              Not now
            </AppText>
          </Pressable>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.65)",
    justifyContent: "flex-end",
  },
  sheet: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    borderWidth: 1,
    paddingHorizontal: 20,
    paddingBottom: 32,
    maxHeight: "85%",
  },
  handle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: "rgba(255,255,255,0.2)",
    alignSelf: "center",
    marginTop: 12,
    marginBottom: 16,
  },
  title: { marginBottom: 8 },
  hint: { marginBottom: 16 },
  list: { maxHeight: 360 },
  listContent: { gap: 10, paddingBottom: 8 },
  dismiss: { alignItems: "center", marginTop: 16, paddingVertical: 8 },
});
