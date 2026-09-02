import { useCallback, useRef, useState } from "react";
import {
  ActivityIndicator,
  Image,
  Platform,
  Pressable,
  StyleSheet,
  View,
} from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { CameraView, useCameraPermissions } from "expo-camera";
import { router, useLocalSearchParams } from "expo-router";

import { AppText } from "@/components/ui/AppText";
import { CameraIcon, CloseIcon, SwapIcon } from "@/components/ui/icons";
import { PrimaryButton } from "@/components/ui/PrimaryButton";
import { useSendDailyPhoto } from "@/hooks/useSendDailyPhoto";
import { captureFromCamera } from "@/utils/capturePhoto";
import { hapticLight } from "@/utils/haptics";
import { colors } from "@/theme/tokens";

type Facing = "front" | "back";

export default function PhotoCaptureScreen() {
  const { caption = "", previewUri: initialPreviewUri } = useLocalSearchParams<{
    caption?: string;
    previewUri?: string;
  }>();
  const [permission, requestPermission] = useCameraPermissions();
  const cameraRef = useRef<CameraView>(null);
  const [facing, setFacing] = useState<Facing>("front");
  const [previewUri, setPreviewUri] = useState<string | null>(
    initialPreviewUri ?? null,
  );
  const [capturing, setCapturing] = useState(false);

  const insets = useSafeAreaInsets();
  const topInset = insets.top > 0 ? insets.top : Platform.OS === "ios" ? 59 : 0;
  const bottomInset = insets.bottom > 0 ? insets.bottom : Platform.OS === "ios" ? 34 : 0;
  const sendPhoto = useSendDailyPhoto(caption);

  const isPreview = previewUri != null;

  const handleCapture = useCallback(async () => {
    if (capturing) return;
    setCapturing(true);
    try {
      await hapticLight();
      const uri = await captureFromCamera(cameraRef);
      if (uri) setPreviewUri(uri);
    } finally {
      setCapturing(false);
    }
  }, [capturing]);

  const handleRetake = () => {
    if (initialPreviewUri) {
      router.back();
      return;
    }
    setPreviewUri(null);
  };

  const handleSend = () => {
    if (previewUri) sendPhoto.mutate(previewUri);
  };

  if (!permission) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator color={colors.accent.primary} />
      </View>
    );
  }

  if (!permission.granted && !isPreview) {
    return (
      <SafeAreaView style={styles.permission} edges={["top", "bottom"]}>
        <AppText variant="h2" style={styles.permissionTitle}>
          Camera access needed
        </AppText>
        <AppText variant="body" color="secondary" style={styles.permissionBody}>
          Orbit needs your camera to capture today&apos;s moment for your partner.
        </AppText>
        <PrimaryButton label="Allow camera" onPress={requestPermission} />
        <PrimaryButton
          label="Cancel"
          variant="ghost"
          onPress={() => router.back()}
          style={styles.cancelBtn}
        />
      </SafeAreaView>
    );
  }

  return (
    <View style={styles.root}>
      {isPreview ? (
        <Image source={{ uri: previewUri }} style={StyleSheet.absoluteFill} resizeMode="cover" />
      ) : (
        <CameraView
          ref={cameraRef}
          style={StyleSheet.absoluteFill}
          facing={facing}
          mirror={facing === "front"}
        />
      )}

      <View
        style={[
          styles.overlay,
          { paddingTop: topInset + 12, paddingBottom: bottomInset + 16 },
        ]}
        pointerEvents="box-none"
      >
        <View style={styles.topBar}>
          <Pressable
            onPress={() => router.back()}
            hitSlop={12}
            style={styles.iconBtn}
            accessibilityLabel="Close"
          >
            <CloseIcon size={22} color={colors.text.primary} />
          </Pressable>
          <View style={styles.topText}>
            <AppText variant="caption" color="secondary">
              Daily photo
            </AppText>
            {caption ? (
              <AppText variant="bodySemibold" numberOfLines={2} style={styles.caption}>
                {caption}
              </AppText>
            ) : null}
          </View>
          <View style={styles.iconSpacer} />
        </View>

        <View style={styles.bottom}>
          {isPreview ? (
            <>
              <AppText variant="body" color="secondary" style={styles.hint}>
                Happy with this one?
              </AppText>
              <PrimaryButton
                label={sendPhoto.isPending ? "Sending…" : "Send to partner"}
                onPress={handleSend}
                loading={sendPhoto.isPending}
              />
              <PrimaryButton
                label="Retake"
                variant="ghost"
                onPress={handleRetake}
                disabled={sendPhoto.isPending}
                style={styles.retakeBtn}
              />
            </>
          ) : (
            <>
              <AppText variant="body" color="secondary" style={styles.hint}>
                Send today&apos;s moment
              </AppText>
              <View style={styles.controls}>
                <Pressable
                  onPress={() => setFacing((f) => (f === "front" ? "back" : "front"))}
                  style={styles.flipBtn}
                  accessibilityLabel="Flip camera"
                >
                  <SwapIcon size={22} color={colors.text.primary} />
                </Pressable>
                <Pressable
                  onPress={() => void handleCapture()}
                  disabled={capturing}
                  style={styles.shutterOuter}
                  accessibilityLabel="Take photo"
                >
                  <View style={styles.shutterInner} />
                </Pressable>
                <View style={styles.flipSpacer}>
                  <CameraIcon size={22} color="transparent" />
                </View>
              </View>
            </>
          )}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.bg.canvas,
  },
  centered: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.bg.canvas,
  },
  permission: {
    flex: 1,
    backgroundColor: colors.bg.canvas,
    padding: 24,
    justifyContent: "center",
  },
  permissionTitle: { marginBottom: 8 },
  permissionBody: { marginBottom: 24 },
  cancelBtn: { marginTop: 8 },
  overlay: {
    flex: 1,
    justifyContent: "space-between",
  },
  topBar: {
    flexDirection: "row",
    alignItems: "flex-start",
    paddingHorizontal: 16,
  },
  iconBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.overlay.glass,
    alignItems: "center",
    justifyContent: "center",
  },
  iconSpacer: { width: 40 },
  topText: {
    flex: 1,
    alignItems: "center",
    paddingHorizontal: 12,
  },
  caption: {
    textAlign: "center",
    marginTop: 4,
  },
  bottom: {
    paddingHorizontal: 24,
  },
  hint: {
    textAlign: "center",
    marginBottom: 20,
  },
  controls: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 32,
  },
  flipBtn: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.overlay.glass,
    alignItems: "center",
    justifyContent: "center",
  },
  flipSpacer: { width: 48 },
  shutterOuter: {
    width: 76,
    height: 76,
    borderRadius: 38,
    borderWidth: 4,
    borderColor: colors.accent.primary,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(230, 57, 70, 0.15)",
  },
  shutterInner: {
    width: 58,
    height: 58,
    borderRadius: 29,
    backgroundColor: colors.accent.primary,
  },
  retakeBtn: { marginTop: 8 },
});
