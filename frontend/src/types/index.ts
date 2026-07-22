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

export type EventOwnerType = "self" | "partner" | "shared";

/** Which timezone lens to use when viewing timed calendar events. */
export type CalendarTimezoneMode = "device" | "partner" | "custom";

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
  ownerType?: EventOwnerType;
  ownerLabel?: string;
};

export type CheckIn = {
  id: string;
  userId: string;
  checkDate: string;
  note?: string;
  prompt?: string;
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
  displayName?: string;
  profilePictureUrl?: string;
  batteryPercent?: number;
  statusMessage?: string;
  statusUpdatedAt?: string;
};

export type CoupleLocation = {
  lat?: number;
  lon?: number;
  city?: string;
  displayName?: string;
  profilePictureUrl?: string;
};

export type CoupleDistance = {
  me: CoupleLocation;
  partner: CoupleLocation;
  updatedAt?: string;
};

export type UserProfile = {
  displayName?: string;
  profilePictureUrl?: string;
  calendarColor: string;
  statusMessage?: string;
};

export type ProfileResponse = {
  mine: UserProfile;
  partner?: UserProfile;
};

export type PhotoPostResponse = {
  id: string;
  photoDate: string;
  caption?: string;
  imageUrl: string;
  isMine: boolean;
  createdAt: string;
  currentStreak: number;
  longestStreak: number;
  bothSentToday: boolean;
};

export type GridGame = {
  id: string;
  gameType: string;
  status: string;
  boardState: unknown;
  currentTurnUserId?: string;
  winnerUserId?: string;
  playerXUserId: string;
  playerOUserId?: string;
  isMyTurn: boolean;
  myPlayerNumber: number;
};

export type Connect4BoardState = {
  rows: number;
  cols: number;
  cells: number[][];
  moves: number[];
};

export type TicTacToeBoardState = {
  cells: number[];
  moves: number;
};

export type WordGuessBoardState = {
  secret?: string;
  length: number;
  maxGuesses: number;
  guesses: string[];
  feedback: number[][];
  solved: boolean;
};

export type DotsBoxesBoardState = {
  size: number;
  hEdges: number[][];
  vEdges: number[][];
  boxes: number[][];
  turn: number;
  scores: [number, number];
};

export type BattleshipBoardState = {
  size: number;
  boards: {
    ships: number[][];
    shots: number[][];
  }[];
  turn: number;
  phase?: "setup" | "play";
  placed?: boolean[];
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

export type DrawStroke = {
  color: string;
  width: number;
  path: string;
};

export type DrawingData = {
  width: number;
  height: number;
  background: string;
  strokes: DrawStroke[];
};

export type Drawing = {
  id: string;
  data: DrawingData;
  isMine: boolean;
  createdAt: string;
};
