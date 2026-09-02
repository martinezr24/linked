import type { RefObject } from "react";
import type { CameraView } from "expo-camera";

const CAPTURE_QUALITY = 0.7;

export async function captureFromCamera(
  cameraRef: RefObject<CameraView | null>,
): Promise<string | null> {
  const photo = await cameraRef.current?.takePictureAsync({
    quality: CAPTURE_QUALITY,
  });
  return photo?.uri ?? null;
}
