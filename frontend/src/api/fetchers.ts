import { apiFetch } from "@/utils/api";
import type {
  AsyncNote,
  CoupleDistance,
  Drawing,
  DrawingData,
  GridGame,
  ListItem,
  PartnerPresence,
  PhotoDayGroup,
  PhotoPostResponse,
  PhotoToday,
  ProfileResponse,
  SharedEvent,
  TodayCheckIns,
  UserProfile,
  WeeklyGoal,
  WidgetSummary,
} from "@/types";

export async function fetchRelationship(deviceId: string) {
  const res = await apiFetch("/api/relationship", deviceId);
  if (!res.ok) throw new Error("Failed to load relationship");
  return res.json() as Promise<{
    relationshipId: string;
    nextVisitAt?: string | null;
    anniversaryAt?: string | null;
  }>;
}

export async function registerPushToken(
  deviceId: string,
  token: string,
  platform: string,
) {
  const res = await apiFetch("/api/profile/push-token", deviceId, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ token, platform }),
  });
  if (!res.ok) throw new Error("Failed to register push token");
  return res.json() as Promise<{ ok: boolean }>;
}

export async function sendNudge(deviceId: string, type: string) {
  const res = await apiFetch("/api/nudges", deviceId, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ type }),
  });
  if (!res.ok) throw new Error("Failed to send nudge");
  return res.json() as Promise<{ ok: boolean }>;
}

export async function fetchGoals(deviceId: string) {
  const res = await apiFetch("/api/goals/current", deviceId);
  if (!res.ok) throw new Error("Failed to load goals");
  const data: WeeklyGoal[] = await res.json();
  return Array.isArray(data) ? data : [];
}

export async function fetchEvents(
  deviceId: string,
  range?: { start: string; end: string },
) {
  const q = range
    ? `?start=${encodeURIComponent(range.start)}&end=${encodeURIComponent(range.end)}`
    : "";
  const res = await apiFetch(`/api/events${q}`, deviceId);
  if (!res.ok) throw new Error("Failed to load events");
  const data: SharedEvent[] = await res.json();
  return Array.isArray(data) ? data : [];
}

export async function createEvent(deviceId: string, ev: SharedEvent) {
  const res = await apiFetch("/api/events", deviceId, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(ev),
  });
  if (!res.ok) throw new Error("Failed to add event");
  return res.json() as Promise<SharedEvent>;
}

export async function updateEvent(deviceId: string, ev: SharedEvent) {
  const res = await apiFetch(`/api/events/${encodeURIComponent(ev.id)}`, deviceId, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(ev),
  });
  if (!res.ok) throw new Error("Failed to update event");
  return res.json() as Promise<SharedEvent>;
}

export async function deleteEvent(deviceId: string, id: string) {
  const res = await apiFetch(`/api/events/${encodeURIComponent(id)}`, deviceId, {
    method: "DELETE",
  });
  if (!res.ok) throw new Error("Failed to delete event");
}

export async function fetchCheckIns(deviceId: string) {
  const res = await apiFetch("/api/checkins/today", deviceId);
  if (!res.ok) throw new Error("Failed to load check-ins");
  return res.json() as Promise<TodayCheckIns>;
}

export async function fetchPhotoToday(deviceId: string) {
  const res = await apiFetch("/api/photos/today", deviceId);
  if (!res.ok) throw new Error("Failed to load photos");
  return res.json() as Promise<PhotoToday>;
}

export async function fetchPhotoHistory(deviceId: string, cursor?: string) {
  const q = cursor ? `?cursor=${encodeURIComponent(cursor)}` : "";
  const res = await apiFetch(`/api/photos/history${q}`, deviceId);
  if (!res.ok) throw new Error("Failed to load photo history");
  return res.json() as Promise<{
    days: PhotoDayGroup[];
    nextCursor: string | null;
  }>;
}

export async function fetchPartnerPresence(deviceId: string) {
  const res = await apiFetch("/api/partner/presence", deviceId);
  if (!res.ok) throw new Error("Failed to load partner presence");
  return res.json() as Promise<PartnerPresence>;
}

export async function fetchCoupleDistance(deviceId: string) {
  const res = await apiFetch("/api/couple/distance", deviceId);
  if (!res.ok) throw new Error("Failed to load distance");
  return res.json() as Promise<CoupleDistance>;
}

export async function fetchProfile(deviceId: string) {
  const res = await apiFetch("/api/profile", deviceId);
  if (!res.ok) throw new Error("Failed to load profile");
  return res.json() as Promise<ProfileResponse>;
}

export async function updateProfile(
  deviceId: string,
  body: {
    displayName?: string;
    calendarColor?: string;
    sharedCalendarColor?: string;
    statusMessage?: string;
  },
) {
  const res = await apiFetch("/api/profile", deviceId, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error("Failed to update profile");
  return res.json() as Promise<UserProfile>;
}

export async function fetchGridGame(deviceId: string, gameType = "connect4") {
  const res = await apiFetch(
    `/api/games/grid/active?type=${encodeURIComponent(gameType)}`,
    deviceId,
  );
  if (!res.ok) throw new Error("Failed to load game");
  const data = await res.json();
  return (data as GridGame | null) ?? null;
}

export type GameStat = { wins: number; losses: number; draws: number };
export type GridStats = { me: GameStat; partner: GameStat };

export async function fetchGridStats(
  deviceId: string,
  gameType = "connect4",
): Promise<GridStats> {
  const res = await apiFetch(
    `/api/games/grid/stats?type=${encodeURIComponent(gameType)}`,
    deviceId,
  );
  if (!res.ok) throw new Error("Failed to load stats");
  const data = await res.json();
  return {
    me: data?.me ?? { wins: 0, losses: 0, draws: 0 },
    partner: data?.partner ?? { wins: 0, losses: 0, draws: 0 },
  };
}

export async function createGridGame(deviceId: string, gameType = "connect4") {
  const res = await apiFetch("/api/games/grid", deviceId, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ gameType }),
  });
  if (!res.ok) throw new Error("Failed to create game");
  return res.json() as Promise<GridGame>;
}

export async function joinGridGame(deviceId: string, gameId: string) {
  const res = await apiFetch(`/api/games/grid/${gameId}/join`, deviceId, {
    method: "POST",
  });
  if (!res.ok) throw new Error("Failed to join game");
  return res.json() as Promise<GridGame>;
}

export async function moveGridGame(
  deviceId: string,
  gameId: string,
  move: unknown,
) {
  const res = await apiFetch(`/api/games/grid/${gameId}/move`, deviceId, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ move }),
  });
  if (!res.ok) throw new Error("Failed to move");
  return res.json() as Promise<GridGame>;
}

export async function endGridGame(deviceId: string, gameId: string) {
  const res = await apiFetch(`/api/games/grid/${gameId}/end`, deviceId, {
    method: "POST",
  });
  if (!res.ok) throw new Error("Failed to end game");
  return res.json() as Promise<{ ok: boolean }>;
}

export type { PhotoPostResponse };

export async function fetchAsyncNotes(deviceId: string) {
  const res = await apiFetch("/api/async-notes", deviceId);
  if (!res.ok) throw new Error("Failed to load notes");
  const data: AsyncNote[] = await res.json();
  return Array.isArray(data) ? data : [];
}

export async function fetchDrawings(deviceId: string) {
  const res = await apiFetch("/api/drawings", deviceId);
  if (!res.ok) throw new Error("Failed to load drawings");
  const data: Drawing[] = await res.json();
  return Array.isArray(data) ? data : [];
}

export async function createDrawing(deviceId: string, data: DrawingData) {
  const res = await apiFetch("/api/drawings", deviceId, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error("Failed to send drawing");
  return res.json() as Promise<Drawing>;
}

export async function fetchListItems(
  deviceId: string,
  listType: string,
  eventId?: string,
) {
  const query =
    listType === "visit" && eventId
      ? `/api/lists?type=visit&eventId=${encodeURIComponent(eventId)}`
      : `/api/lists?type=${listType}`;
  const res = await apiFetch(query, deviceId);
  if (!res.ok) throw new Error("Failed to load list");
  const data: ListItem[] = await res.json();
  return Array.isArray(data) ? data : [];
}

export async function fetchWidgetSummary(deviceId: string) {
  const res = await apiFetch("/api/widget/summary", deviceId);
  if (!res.ok) throw new Error("Failed to load widget summary");
  return res.json() as Promise<WidgetSummary>;
}

export async function postListItem(deviceId: string, item: ListItem) {
  const res = await apiFetch("/api/lists/items", deviceId, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(item),
  });
  if (!res.ok) throw new Error("Failed to add item");
  return res.json() as Promise<ListItem>;
}

export async function deleteListItem(
  deviceId: string,
  id: string,
  listType: string,
  eventId?: string,
) {
  const params = new URLSearchParams({ type: listType });
  if (eventId) params.set("eventId", eventId);
  const res = await apiFetch(
    `/api/lists/items/${encodeURIComponent(id)}?${params}`,
    deviceId,
    { method: "DELETE" },
  );
  if (!res.ok) throw new Error("Failed to delete item");
}
