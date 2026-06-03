# Linked Home Screen Widget

The main app syncs widget data to secure storage on launch and when returning to foreground (`src/services/widgetSync.ts`).

## Data available

- Days until next visit / next event
- Partner check-in status today
- Connection streak

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
