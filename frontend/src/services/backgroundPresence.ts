import * as BackgroundTask from "expo-background-task";
import * as TaskManager from "expo-task-manager";

import { getOrCreateDeviceId } from "@/utils/deviceId";
import { getStoredRelationshipId } from "@/utils/relationshipStorage";
import { syncMyPresence } from "@/utils/presenceSync";

const PRESENCE_TASK = "orbit-presence-refresh";

// Runs opportunistically in the background (iOS decides the timing, roughly
// every 15+ minutes and only when Background App Refresh is on) to push a fresh
// presence update — including battery — so your partner sees newer data even
// when you don't have the app open. Only runs while paired. Defined at module
// scope so it's registered on a headless background launch.
TaskManager.defineTask(PRESENCE_TASK, async () => {
  try {
    const relationshipId = await getStoredRelationshipId();
    if (!relationshipId) return BackgroundTask.BackgroundTaskResult.Success;
    const deviceId = await getOrCreateDeviceId();
    await syncMyPresence(deviceId);
    return BackgroundTask.BackgroundTaskResult.Success;
  } catch {
    return BackgroundTask.BackgroundTaskResult.Failed;
  }
});

/** Register the periodic background presence refresh (best-effort, idempotent). */
export async function registerPresenceBackgroundTask() {
  try {
    const status = await BackgroundTask.getStatusAsync();
    if (status !== BackgroundTask.BackgroundTaskStatus.Available) return;
    const already = await TaskManager.isTaskRegisteredAsync(PRESENCE_TASK);
    if (!already) {
      await BackgroundTask.registerTaskAsync(PRESENCE_TASK, {
        minimumInterval: 15,
      });
    }
  } catch {
    // Registration is best-effort — nothing to do if it fails.
  }
}
