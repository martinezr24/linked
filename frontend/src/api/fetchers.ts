import { apiFetch } from "@/utils/api";
import type {
  AsyncNote,
  ConnectionStreak,
  ListItem,
  SharedEvent,
  TodayCheckIns,
  WeeklyGoal,
  WidgetSummary,
} from "@/types";

export async function fetchRelationship(deviceId: string) {
  const res = await apiFetch("/api/relationship", deviceId);
  if (!res.ok) throw new Error("Failed to load relationship");
  return res.json() as Promise<{ relationshipId: string; nextVisitAt?: string | null }>;
}

export async function fetchGoals(deviceId: string) {
  const res = await apiFetch("/api/goals/current", deviceId);
  if (!res.ok) throw new Error("Failed to load goals");
  const data: WeeklyGoal[] = await res.json();
  return Array.isArray(data) ? data : [];
}

export async function fetchEvents(deviceId: string) {
  const res = await apiFetch("/api/events", deviceId);
  if (!res.ok) throw new Error("Failed to load events");
  const data: SharedEvent[] = await res.json();
  return Array.isArray(data) ? data : [];
}

export async function fetchCheckIns(deviceId: string) {
  const res = await apiFetch("/api/checkins/today", deviceId);
  if (!res.ok) throw new Error("Failed to load check-ins");
  return res.json() as Promise<TodayCheckIns>;
}

export async function fetchStreak(deviceId: string) {
  const res = await apiFetch("/api/checkins/streak", deviceId);
  if (!res.ok) throw new Error("Failed to load streak");
  return res.json() as Promise<ConnectionStreak>;
}

export async function fetchAsyncNotes(deviceId: string) {
  const res = await apiFetch("/api/async-notes", deviceId);
  if (!res.ok) throw new Error("Failed to load notes");
  const data: AsyncNote[] = await res.json();
  return Array.isArray(data) ? data : [];
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
