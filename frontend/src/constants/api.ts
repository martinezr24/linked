import Constants from "expo-constants";

/** Mac/dev machine IP for the Go backend — follows Metro so Wi‑Fi changes don't break the app. */
export function getDevServerHost(): string {
  const debuggerHost =
    Constants.expoGoConfig?.debuggerHost ??
    Constants.expoConfig?.hostUri?.replace(/^exp:\/\//, "");

  if (debuggerHost) {
    return debuggerHost.split(":")[0];
  }

  return "localhost";
}

export function getApiBase(): string {
  const envUrl = process.env.EXPO_PUBLIC_API_URL;
  if (envUrl) {
    return envUrl.replace(/\/$/, "");
  }
  return `http://${getDevServerHost()}:8080`;
}

export function getWsUrl(): string {
  const base = getApiBase();
  if (base.startsWith("https://")) {
    return base.replace(/^https:/, "wss:") + "/ws";
  }
  return base.replace(/^http:/, "ws:") + "/ws";
}
