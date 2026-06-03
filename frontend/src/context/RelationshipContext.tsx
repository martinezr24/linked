import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { Alert, Platform } from "react-native";
import { router } from "expo-router";

import { getWsUrl } from "@/constants/api";
import {
  clearStoredRelationshipId,
  getStoredRelationshipId,
} from "@/utils/relationshipStorage";
import { getOrCreateDeviceId } from "@/utils/deviceId";
import type { WsMessage } from "@/types";

type RelationshipContextValue = {
  deviceId: string | null;
  relationshipId: string | null;
  isReady: boolean;
  isPaired: boolean;
  setPaired: (relationshipId: string) => Promise<void>;
  clearPaired: () => Promise<void>;
  subscribe: (handler: (msg: WsMessage) => void) => () => void;
};

const RelationshipContext = createContext<RelationshipContextValue | null>(null);

function alertPartnerUnlinked() {
  const title = "Partner unlinked";
  const message =
    "Your partner ended the link. All shared data has been permanently deleted.";

  if (Platform.OS === "web") {
    window.alert(`${title}\n\n${message}`);
    return;
  }
  Alert.alert(title, message);
}

export function RelationshipProvider({ children }: { children: ReactNode }) {
  const [deviceId, setDeviceId] = useState<string | null>(null);
  const [relationshipId, setRelationshipId] = useState<string | null>(null);
  const [isReady, setIsReady] = useState(false);
  const socketRef = useRef<WebSocket | null>(null);
  const subscribersRef = useRef<Set<(msg: WsMessage) => void>>(new Set());
  const partnerUnlinkHandled = useRef(false);

  const notify = useCallback((msg: WsMessage) => {
    subscribersRef.current.forEach((h) => h(msg));
  }, []);

  useEffect(() => {
    (async () => {
      const [stored, id] = await Promise.all([
        getStoredRelationshipId(),
        getOrCreateDeviceId(),
      ]);
      setRelationshipId(stored);
      setDeviceId(id);
      setIsReady(true);
    })();
  }, []);

  const subscribe = useCallback((handler: (msg: WsMessage) => void) => {
    subscribersRef.current.add(handler);
    return () => subscribersRef.current.delete(handler);
  }, []);

  const handlePartnerUnlinked = useCallback(async () => {
    if (partnerUnlinkHandled.current) return;
    partnerUnlinkHandled.current = true;
    socketRef.current?.close();
    socketRef.current = null;
    await clearStoredRelationshipId();
    setRelationshipId(null);
    alertPartnerUnlinked();
    router.replace("/pair");
  }, []);

  useEffect(() => {
    if (!deviceId || !relationshipId) {
      socketRef.current?.close();
      socketRef.current = null;
      return;
    }

    partnerUnlinkHandled.current = false;
    const wsUrl = `${getWsUrl()}?deviceId=${encodeURIComponent(deviceId)}`;
    const ws = new WebSocket(wsUrl);
    socketRef.current = ws;

    ws.onopen = () => {
      notify({ action: "WS_CONNECTED", payload: {} });
    };

    ws.onmessage = (event) => {
      try {
        const msg = JSON.parse(event.data) as WsMessage;
        if (msg.action === "RELATIONSHIP_ENDED") {
          void handlePartnerUnlinked();
          return;
        }
        notify(msg);
      } catch {
        // ignore non-json
      }
    };

    return () => {
      ws.close();
      if (socketRef.current === ws) {
        socketRef.current = null;
      }
    };
  }, [deviceId, relationshipId, notify, handlePartnerUnlinked]);

  const setPaired = useCallback(async (id: string) => {
    const { setStoredRelationshipId } = await import(
      "@/utils/relationshipStorage"
    );
    await setStoredRelationshipId(id);
    setRelationshipId(id);
  }, []);

  const clearPaired = useCallback(async () => {
    socketRef.current?.close();
    socketRef.current = null;
    await clearStoredRelationshipId();
    setRelationshipId(null);
  }, []);

  const value: RelationshipContextValue = {
    deviceId,
    relationshipId,
    isReady,
    isPaired: Boolean(relationshipId),
    setPaired,
    clearPaired,
    subscribe,
  };

  return (
    <RelationshipContext.Provider value={value}>
      {children}
    </RelationshipContext.Provider>
  );
}

export function useRelationship() {
  const ctx = useContext(RelationshipContext);
  if (!ctx) {
    throw new Error("useRelationship must be used within RelationshipProvider");
  }
  return ctx;
}
