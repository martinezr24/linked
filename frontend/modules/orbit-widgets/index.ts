import { requireNativeModule } from "expo-modules-core";

type OrbitWidgetsModule = {
  set: (key: string, value: string, group: string) => void;
  reload: () => void;
  cacheImages: (slots: Record<string, string>, group: string) => Promise<void>;
};

// The native module only exists in iOS builds that include the local module.
// On other platforms (or dev clients without it) fall back to a no-op.
let native: OrbitWidgetsModule | null = null;
try {
  native = requireNativeModule<OrbitWidgetsModule>("OrbitWidgets");
} catch {
  native = null;
}

/** Write a string into the shared App Group and reload widget timelines. */
export function setWidgetValue(key: string, value: string, group: string): void {
  native?.set(key, value, group);
}

/** Force the widgets to reload their timelines. */
export function reloadWidgets(): void {
  native?.reload();
}

/**
 * Download (or clear) image slots into the App Group `widget-images/` folder.
 * Empty-string values delete the slot file. No-ops when the native module is absent.
 */
export async function cacheWidgetImages(
  slots: Record<string, string>,
  group: string,
): Promise<void> {
  if (!native?.cacheImages) return;
  await native.cacheImages(slots, group);
}
