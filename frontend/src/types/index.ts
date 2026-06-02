export type ListType = "trip" | "reunion";

export type ListItem = {
  id: string;
  text: string;
  note?: string;
  listType: ListType;
};

export type WeeklyGoal = {
  id: string;
  goalText: string;
  weekStart: string;
  done: boolean;
} | null;

export type SharedEvent = {
  id: string;
  title: string;
  eventAt: string;
  ownerLabel?: string;
};

export type WsMessage = {
  action: string;
  payload: Record<string, unknown>;
};
