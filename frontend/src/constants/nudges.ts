export type NudgePreset = {
  type: string;
  label: string;
  emoji: string;
};

// Keep in sync with nudgePresets in backend/nudges_handlers.go.
export const NUDGE_PRESETS: NudgePreset[] = [
  { type: "thinking_of_you", label: "Thinking of you", emoji: "💭" },
  { type: "send_photo", label: "Send a photo", emoji: "📸" },
  { type: "charge_phone", label: "Charge your phone", emoji: "🔋" },
  { type: "call_me", label: "Call me", emoji: "📞" },
  { type: "good_morning", label: "Good morning", emoji: "☀️" },
  { type: "goodnight", label: "Goodnight", emoji: "🌙" },
];
