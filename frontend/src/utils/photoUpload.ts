import { getApiBase } from "@/constants/api";
import { apiFetch } from "@/utils/api";
import { localDateString } from "@/utils/dates";

export async function uploadDailyPhoto(
  deviceId: string,
  imageUri: string,
  caption?: string,
): Promise<void> {
  const photoDate = localDateString();
  const presignRes = await apiFetch("/api/photos/presign", deviceId, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      contentType: "image/jpeg",
      photoDate,
    }),
  });
  if (!presignRes.ok) throw new Error("Could not prepare upload");
  const { uploadUrl, objectKey } = (await presignRes.json()) as {
    uploadUrl: string;
    objectKey: string;
  };

  const blob = await (await fetch(imageUri)).blob();
  const fullUploadUrl = uploadUrl.startsWith("http")
    ? uploadUrl
    : `${getApiBase()}${uploadUrl}`;

  const putRes = await fetch(fullUploadUrl, {
    method: "PUT",
    headers: { "Content-Type": "image/jpeg" },
    body: blob,
  });
  if (!putRes.ok) throw new Error("Upload failed");

  const postRes = await apiFetch("/api/photos", deviceId, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      objectKey,
      caption: caption?.trim() || undefined,
      photoDate,
    }),
  });
  if (!postRes.ok) throw new Error("Could not save photo");
}
