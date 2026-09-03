# Orbit — App Store Connect Listing

Copy-paste reference for creating/updating the Orbit listing in App Store Connect.

## App information

| Field | Value |
|-------|-------|
| **Name** | Orbit |
| **Subtitle** (30 chars max) | Stay close, any distance |
| **Bundle ID** | `com.martinez.orbit` |
| **SKU** | `orbit-ios` (your choice) |
| **Primary category** | Lifestyle |
| **Secondary category** | Social Networking |
| **Copyright** | © 2026 Giovanni Martinez |
| **Support URL** | https://linked.fly.dev/support |
| **Privacy Policy URL** | https://linked.fly.dev/privacy |
| **Age rating** | 4+ (no mature content; Venmo opens externally) |

## Description (4000 chars max)

```
Orbit is a shared home for long-distance couples — a little space just for the two of you, no matter how many miles are between you.

STAY CLOSE
• Their World — see your partner's local time, weather, battery, and status at a glance
• Distance Apart — a live map showing the miles between you, with a pulsing heart at your midpoint
• Thinking of You — long-press your partner's avatar to send a heart that ripples across their screen

SHARE YOUR DAYS
• Daily Photo — swap a photo each day, build a streak together, and react with stickers
• Daily Check-in — answer shared prompts and leave notes for each other
• Doodles — draw something and send it over
• Shared Calendar — plan visits and events together

PLAY & TREAT
• Mini-games — Connect 4, Tic-Tac-Toe, Word Guess, Dots & Boxes, Battleship, and Trivia in real time
• Treats — send your partner a little something via Venmo

ALWAYS IN SYNC
Real-time updates, push notifications, and an iOS home-screen widget with your streak and next-visit countdown.

Orbit is built for two. Pair with your partner using a simple invite code and start your orbit together.
```

## Promotional text (170 chars, optional)

```
A celestial home for long-distance love — daily photos, real-time games, distance map, and a widget that keeps you both in orbit.
```

## Keywords (100 chars, comma-separated, no spaces after commas)

```
couples,long distance,relationship,daily photo,LDR,partner,widget,games,check-in,calendar
```

## What's New (v1.0.0)

```
Welcome to Orbit — your shared space across any distance. Daily photos, games, distance map, check-ins, and more.
```

---

## Screenshots (required)

**Minimum:** 6.7" display (iPhone 15 Pro Max / 14 Pro Max) — 1290 × 2796 px, 3–10 screenshots.

### Recommended captures

1. **Home** — Their World + partner presence cards
2. **Daily photo** — streak card with both thumbs filled
3. **Distance map** — map with heart midpoint
4. **Games** — game picker or active game board
5. **Memories** — photo history grid
6. **Widget** (optional) — home screen showing Orbit widget

### How to capture

**Simulator:**

```bash
cd frontend
npx expo run:ios
# In Simulator: File → Save Screen (⌘S) at iPhone 15 Pro Max scale
```

**Physical device:** Volume Up + Side button.

Optional framing: [screenshots.pro](https://screenshots.pro) or Apple Design Resources device frames.

---

## Privacy nutrition labels

Answer in App Store Connect → App Privacy. Orbit collects:

### Data linked to the user

| Data type | Purpose | Notes |
|-----------|---------|-------|
| User ID | App functionality | Random device ID, not email |
| Photos or videos | App functionality | Daily photos, profile avatar |
| Location (coarse/precise) | App functionality | Optional; weather for partner |
| Other user content | App functionality | Check-ins, notes, doodles, calendar |
| Product interaction | App functionality | Game state, streaks |

### Data NOT collected

- Contact info (no email/phone required)
- Browsing history
- Financial info (Venmo is external)
- Tracking across apps (no analytics SDKs)

### Practices

- Data is **not used for tracking**
- Data is **not sold**
- Partner-shared content is visible to the paired partner by design

---

## Export compliance

Already set in `app.json`: `ITSAppUsesNonExemptEncryption: false` (HTTPS only, exempt).

In App Store Connect, answer **No** to custom encryption beyond Apple's OS APIs.

---

## After App Store approval

Update Fly secret with the real App Store URL for invite pages:

```bash
fly secrets set APP_STORE_URL="https://apps.apple.com/app/idYOUR_APP_ID" -a linked
```
