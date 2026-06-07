import { apiFetch } from "@/utils/api";
import type {
  AsyncNote,
  ListItem,
  PartnerPresence,
  PhotoDayGroup,
  PhotoToday,
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
