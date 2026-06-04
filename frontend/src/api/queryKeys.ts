export const queryKeys = {
  relationship: ["relationship"] as const,
  goals: ["goals"] as const,
  events: ["events"] as const,
  checkIns: ["checkIns"] as const,
  streak: ["streak"] as const,
  asyncNotes: ["asyncNotes"] as const,
  widgetSummary: ["widgetSummary"] as const,
  photoToday: ["photoToday"] as const,
  photoStreak: ["photoStreak"] as const,
  photoHistory: (cursor?: string) => ["photoHistory", cursor ?? ""] as const,
  partnerPresence: ["partnerPresence"] as const,
  triviaGame: ["triviaGame"] as const,
  list: (listType: string, eventId?: string) =>
    ["list", listType, eventId ?? ""] as const,
};
