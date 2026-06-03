export type ListType = "trip" | "reunion" | "visit";

export type ListItem = {
  id: string;
  text: string;
  note?: string;
  listType: ListType;
  eventId?: string;
};

export type WeeklyGoal = {
  id: string;
  goalText: string;
  weekStart: string;
  done: boolean;
};

export type SharedEvent = {
  id: string;
  title: string;
  eventAt: string;
  ownerLabel?: string;
};

export type CheckIn = {
  id: string;
  userId: string;
  checkDate: string;
  note?: string;
  isMine: boolean;
};

export type TodayCheckIns = {
  mine: CheckIn | null;
  partner: CheckIn | null;
};

export type ConnectionStreak = {
  currentStreak: number;
  longestStreak: number;
  bothCheckedInToday: boolean;
};

export type AsyncNote = {
  id: string;
  triggerType: string;
  triggerValue?: string;
  body: string;
  isMine: boolean;
  openedAt?: string;
  createdAt: string;
};

export type WidgetSummary = {
  nextVisitAt?: string | null;
  nextEventTitle?: string | null;
  nextEventAt?: string | null;
  partnerCheckedIn: boolean;
  mineCheckedIn: boolean;
  currentStreak: number;
};

export type WsMessage = {
  action: string;
  payload: Record<string, unknown>;
};
