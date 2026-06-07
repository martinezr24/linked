export type ListType = "reunion" | "visit";

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
  startAt: string;
  endAt: string;
  allDay: boolean;
  createdBy?: string;
  description?: string;
  recurrenceRule?: string;
  color?: string;
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

export type DailyPhoto = {
  id: string;
  photoDate: string;
  caption?: string;
  imageUrl: string;
  isMine: boolean;
  createdAt: string;
};

export type PhotoToday = {
  mine: DailyPhoto | null;
  partner: DailyPhoto | null;
  currentStreak: number;
  longestStreak: number;
  bothSentToday: boolean;
};

export type PhotoDayGroup = {
  photoDate: string;
  mine: DailyPhoto | null;
  partner: DailyPhoto | null;
  bothSent: boolean;
};

export type PartnerPresence = {
  timezone: string;
  weatherCity?: string;
  localTime: string;
  weatherSummary?: string;
  temperatureF?: number;
};

export type AsyncNote = {
  id: string;
  triggerType: string;
  triggerValue?: string;
  lockType: "state" | "time";
  opensAt?: string;
  body: string | null;
  isLocked: boolean;
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
