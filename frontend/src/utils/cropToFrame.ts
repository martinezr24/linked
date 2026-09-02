import { Image } from "react-native";
import * as ImageManipulator from "expo-image-manipulator";

import { DAILY_PHOTO_ASPECT_RATIO } from "@/constants/dailyPhoto";

function getImageSize(uri: string): Promise<{ width: number; height: number }> {
  return new Promise((resolve, reject) => {
    Image.getSize(
      uri,
      (width, height) => resolve({ width, height }),
      reject,
    );
  });
}

export function computeCenterCrop(
  width: number,
  height: number,
  aspectRatio = DAILY_PHOTO_ASPECT_RATIO,
): { originX: number; originY: number; width: number; height: number } {
  const imageAspect = width / height;

  let cropWidth: number;
  let cropHeight: number;

  if (imageAspect > aspectRatio) {
    cropHeight = height;
    cropWidth = height * aspectRatio;
  } else {
    cropWidth = width;
    cropHeight = width / aspectRatio;
  }

  return {
    originX: Math.round((width - cropWidth) / 2),
    originY: Math.round((height - cropHeight) / 2),
    width: Math.round(cropWidth),
    height: Math.round(cropHeight),
  };
}

export async function cropToFrame(
  uri: string,
  dimensions?: { width: number; height: number },
): Promise<string> {
  const { width, height } = dimensions ?? (await getImageSize(uri));
  const crop = computeCenterCrop(width, height);

  const result = await ImageManipulator.manipulateAsync(
    uri,
    [{ crop: crop }],
    { compress: 0.85, format: ImageManipulator.SaveFormat.JPEG },
  );

  return result.uri;
}
