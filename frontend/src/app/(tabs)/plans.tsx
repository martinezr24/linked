import { ScrollView, StyleSheet } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { DismissKeyboardView } from "@/components/DismissKeyboardView";
import { SharedListSection } from "@/components/SharedListSection";
import { AppText } from "@/components/ui/AppText";
import { ScreenBackground } from "@/components/ui/ScreenBackground";

export default function PlansScreen() {
  return (
    <ScreenBackground>
      <SafeAreaView style={styles.safe} edges={["top"]}>
        <DismissKeyboardView>
          <ScrollView
            contentContainerStyle={styles.scroll}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
            <AppText variant="h1" style={styles.header}>
              Plans
            </AppText>
            <AppText variant="body" color="secondary" style={styles.subtitle}>
              Ideas for your next trip and things to do when you're together.
            </AppText>

            <SharedListSection
              listType="trip"
              title="Trip itinerary"
              placeholder="Add a trip plan..."
            />

            <SharedListSection
              listType="reunion"
              title="When we're together"
              placeholder="Something to do together..."
              notePlaceholder="Optional note..."
            />
          </ScrollView>
        </DismissKeyboardView>
      </SafeAreaView>
    </ScreenBackground>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  scroll: { paddingBottom: 100 },
  header: {
    marginTop: 8,
    marginBottom: 4,
    paddingHorizontal: 20,
    fontFamily: "DMSans_700Bold",
  },
  subtitle: {
    marginBottom: 16,
    paddingHorizontal: 20,
  },
});
