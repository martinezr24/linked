import { requireNativeModule } from "expo-modules-core";

type OrbitWidgetsModule = {
  set: (key: string, value: string, group: string) => void;
  reload: () => void;
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
