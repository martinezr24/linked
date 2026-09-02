# 🪐 Orbit

**A home for long-distance couples — stay close across any distance.**

Orbit brings two people into one shared space: see each other's world at a glance,
count down to your next visit, play together, and leave little moments for each
other throughout the day — all wrapped in an original, hand-drawn celestial design.

---

## ✨ Features

**Feel close**
- **Their World** — your partner's local time, weather, battery, and status, refreshed in the background.
- **Distance Apart** — a live map of the miles (or km) between you, with a pulsing heart at your shared midpoint.
- **Thinking of You** — long-press your partner's avatar to send a heart that ripples across their screen.
- **You're both here** — a quiet moment when you both have the app open at once.

**Share your days**
- **Daily Photo** — swap a photo each day, build a streak, and react with hand-drawn stickers.
- **Daily Check-in** — answer a shared prompt or leave a note; you each see the other's once you've both checked in.
- **Doodles** — draw something and send it over.
- **Shared Calendar** — plan visits and events together, color-coded per person.

**Play & treat**
- **Mini-games** — Connect 4, Tic-Tac-Toe, Word Guess, Dots & Boxes, Battleship, and Trivia, in real time.
- **Treats** — send your partner a little something via Venmo.

**Stay in sync**
- Real-time updates over WebSockets, push notifications, and an iOS home-screen widget (streak + next-visit countdown).

---

## 🧱 Tech stack

| Layer | Tech |
|-------|------|
| Mobile | Expo SDK 54 · React Native (New Architecture) · TypeScript · Expo Router · TanStack Query · Reanimated · react-native-maps |
| Backend | Go · `net/http` · Gorilla WebSocket · PostgreSQL |
| Realtime | Per-relationship WebSocket hub |
| Push | Expo Push (APNs) |
| Widget | SwiftUI · WidgetKit (via `@bacons/apple-targets`) |
| Storage | S3-compatible object storage (or local files in dev) |
| Infra | Fly.io (API + Postgres) · EAS Build / Submit |

---

## 📁 Project structure

```
.
├── backend/        Go API + WebSocket server
│   ├── internal/   games · ws hub · storage · models · migrate
│   └── *.go        HTTP handlers (profile, games, photos, nudges, …)
├── frontend/       Expo / React Native app
│   ├── src/        app (expo-router) · components · hooks · games · services
│   ├── targets/    native iOS widget target
│   └── modules/    local Expo native modules
├── migrations/     SQL schema migrations (auto-applied on backend start)
└── scripts/        local Postgres helpers
```

---

## 🚀 Getting started

### Prerequisites

- Node 18+ and npm
- Go (version per [`backend/go.mod`](backend/go.mod))
- PostgreSQL 18 (Homebrew)
- Xcode 16 (for iOS builds)

### 1. Database

Install and start Postgres with Homebrew:

```bash
brew install postgresql@18
./scripts/start-postgresql.sh
```

Create the app database and schema (lists, goals, events, pairing):

```bash
./scripts/setup-database.sh
```

Connect:

```bash
/opt/homebrew/opt/postgresql@18/bin/psql linked_db
```

> If `brew services list` shows `other` or `psql` can't connect, run
> `./scripts/start-postgresql.sh` again — it uses `launchctl kickstart`, which is
> required on some Macs after `brew services start`.

### 2. Backend

```bash
cd backend
ENABLE_DEV_TOOLS=true go run .
```

Setting `ENABLE_DEV_TOOLS=true` enables a **Pair with fake partner** button on the pair screen (dev builds only) so you can explore the app without a second device.

The API listens on `:8080` and applies any pending migrations on startup.

### 3. Frontend

```bash
cd frontend
npm install
npx expo run:ios      # native dev build (recommended)
# or: npx expo start  # if you already have a dev client installed
```

---

## ☁️ Deployment

**Backend (Fly.io)**

```bash
fly deploy
```

**Mobile (EAS)**

```bash
npx eas-cli build  --platform ios --profile preview      # internal build
npx eas-cli submit --platform ios --profile production   # TestFlight / App Store
```

---

## 🎨 Design

Orbit uses an original, hand-drawn *celestial* identity: a marker-style `SketchFrame`
around featured cards, a shared elliptical **orbit** motif in the header, an animated
orbiting logo, and twinkling sketch-star ornaments — all drawn with deterministic
jitter so they stay stable across renders.
