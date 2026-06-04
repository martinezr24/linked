export const PHOTO_CAPTIONS = [
  "Missing you a little extra today",
  "Thought of you instantly",
  "A tiny window into my day",
  "Wish you were in this frame",
  "Sending a hug through pixels",
  "This made me smile — for you",
  "Your daily dose of me",
  "Proof I'm still thinking of you",
  "Caught this moment for us",
  "Here's what today looks like",
];

export function pickRandomCaption(): string {
  return PHOTO_CAPTIONS[Math.floor(Math.random() * PHOTO_CAPTIONS.length)];
}
