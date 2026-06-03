export const CONNECTION_PROMPTS = [
  "What made you smile about us today?",
  "What's one thing you're looking forward to together?",
  "What were your first impressions of each other?",
  "What's a small moment you want to recreate?",
  "What do you appreciate about your partner right now?",
  "What's something new you want to try on your next visit?",
  "What song reminds you of them?",
  "What's your favorite memory from last month?",
  "What would make today feel more connected?",
  "What's one way you felt loved recently?",
  "What are you proud of them for?",
  "What's a dream you share?",
  "What inside joke still makes you laugh?",
  "What do you miss most when you're apart?",
  "What would you tell them if they were right here?",
];

export function pickRandomPrompt(): string {
  const i = Math.floor(Math.random() * CONNECTION_PROMPTS.length);
  return CONNECTION_PROMPTS[i]!;
}
