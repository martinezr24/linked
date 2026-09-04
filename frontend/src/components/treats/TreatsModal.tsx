import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

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
  const insets = useSafeAreaInsets();
  const { partnerVenmo } = useProfile();
  const label = partnerName?.trim() || "your partner";

  return (
    <Modal visible={visible} transparent animationType="fade">
      <View style={styles.backdrop}>
        <Pressable
          style={StyleSheet.absoluteFill}
          onPress={onClose}
          accessibilityLabel="Dismiss"
        />
        <View
          style={[
            styles.sheet,
            {
              backgroundColor: theme.colors.surface.card,
              borderColor: theme.colors.border.subtle,
              paddingBottom: Math.max(insets.bottom, 16) + 16,
            },
          ]}
        >
          <View style={styles.header}>
            <View style={styles.handle} />
            <AppText variant="h2" style={styles.title}>
              Treat {label}
            </AppText>
            <AppText variant="body" color="secondary" style={styles.hint}>
              Pick a small gift — you'll finish checkout in their app or browser.
            </AppText>
          </View>
          <ScrollView
            style={styles.list}
            contentContainerStyle={styles.listContent}
            showsVerticalScrollIndicator
            keyboardShouldPersistTaps="handled"
            bounces
          >
            <VenmoTreatCard
              username={partnerVenmo}
              partnerName={label}
              mode="pay"
            />
            <VenmoTreatCard
              username={partnerVenmo}
              partnerName={label}
              mode="request"
            />
            {TREAT_LINKS.map((treat) => (
              <TreatCard key={treat.id} treat={treat} />
            ))}
          </ScrollView>
          <Pressable onPress={onClose} style={styles.dismiss}>
            <AppText variant="bodySemibold" color="muted">
              Not now
            </AppText>
          </Pressable>
        </View>
      </View>
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
    maxHeight: "85%",
  },
  header: {
    flexShrink: 0,
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
  list: {
    flexGrow: 1,
    flexShrink: 1,
    minHeight: 0,
  },
  listContent: { gap: 10, paddingBottom: 8 },
  dismiss: {
    flexShrink: 0,
    alignItems: "center",
    marginTop: 16,
    paddingVertical: 8,
  },
});
