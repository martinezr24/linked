import type { RefObject } from "react";
import type { CameraView } from "expo-camera";

import { cropToFrame } from "@/utils/cropToFrame";

const CAPTURE_QUALITY = 0.85;

export async function captureFromCamera(
  cameraRef: RefObject<CameraView | null>,
): Promise<string | null> {
  const photo = await cameraRef.current?.takePictureAsync({
    quality: CAPTURE_QUALITY,
    skipProcessing: false,
  });
  if (!photo?.uri || !photo.width || !photo.height) return null;

  return cropToFrame(photo.uri, { width: photo.width, height: photo.height });
}
