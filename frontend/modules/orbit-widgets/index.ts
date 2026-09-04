import { requireNativeModule } from "expo-modules-core";

type OrbitWidgetsModule = {
  set: (key: string, value: string, group: string) => void;
  reload: () => void;
  writeImage: (slot: string, base64Jpeg: string, group: string) => Promise<void>;
};

// The native module only exists in iOS builds that include the local module.
// On other platforms (or dev clients without it) fall back to a no-op.
let native: OrbitWidgetsModule | null = null;
try {
  native = requireNativeModule<OrbitWidgetsModule>("OrbitWidgets");
} catch {
  native = null;
}

/** Write a string into the shared App Group (does not reload timelines). */
export function setWidgetValue(key: string, value: string, group: string): void {
  native?.set(key, value, group);
}

/** Force the widgets to reload their timelines. */
export function reloadWidgets(): void {
  native?.reload();
}

/**
 * Write (or clear) one image slot under App Group `widget-images/`.
 * Empty base64 deletes the slot file.
 */
export async function writeWidgetImage(
  slot: string,
  base64Jpeg: string,
  group: string,
): Promise<void> {
  if (!native?.writeImage) return;
  await native.writeImage(slot, base64Jpeg, group);
}
