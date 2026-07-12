/**
 * Shared motion constants so every animation across the app feels consistent
 * and subtle rather than bouncy. Tuned for premium, native-thread feedback.
 */

// Quick, tight spring for press feedback (scale down/up).
export const PRESS_SPRING = {
  damping: 18,
  stiffness: 260,
  mass: 0.6,
} as const;

// Softer spring for mount/entrance transitions.
export const ENTER_SPRING = {
  damping: 18,
  stiffness: 180,
  mass: 0.8,
} as const;

export const DURATION = {
  fast: 160,
  base: 240,
  slow: 360,
} as const;

// Default scale a pressable shrinks to while held.
export const PRESS_SCALE = 0.96;

// Delay (ms) added per item index for staggered list entrances.
export const STAGGER_STEP = 55;

