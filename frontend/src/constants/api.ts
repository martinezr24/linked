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
  return `http://${getDevServerHost()}:8080`;
}

export function getWsUrl(): string {
  return `ws://${getDevServerHost()}:8080/ws`;
}
