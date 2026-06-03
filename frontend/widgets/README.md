# Linked Home Screen Widget

The main app syncs widget data to secure storage on launch and when returning to foreground (`src/services/widgetSync.ts`).

## Data available

- Days until next visit / next event
- Partner check-in status today
- Connection streak

## Visual design (match in-app theme)

When building native widgets, use these tokens from `src/theme/tokens.ts`:

| Token | Hex | Usage |
|-------|-----|--------|
| Background | `#1C1819` | Widget card surface (`surface.card`) |
| Canvas | `#0F0C0D` | Outer / system background |
| Primary text | `#F5F0F1` | Countdown, titles |
| Secondary text | `#A89BA0` | Labels |
| Accent | `#E63946` | Streak link, highlights |
| Flame | `#FF8C42` / `#FFD166` | Streak icon |

Typography: prefer **DM Sans** for UI labels and **Fraunces** for large countdown numbers when embedding custom fonts in the widget extension.

## iOS (WidgetKit)

1. Open the project in Xcode after `npx expo prebuild`.
2. Add a Widget Extension target.
3. Enable App Groups for the main app and widget (`group.com.linked.app`).
4. Read `linked_widget_summary` from the shared container (mirrors SecureStore key in native bridge).

## Android

1. Add a `AppWidgetProvider` in `android/app`.
2. Read widget JSON from SharedPreferences key `linked_widget_summary`.
3. Schedule updates when the main app calls `syncWidgetData`.

## Development

Widget summary API: `GET /api/widget/summary` with `X-Device-Id` header.
