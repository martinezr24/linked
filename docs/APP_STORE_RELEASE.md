# Orbit — iOS App Store Release

Step-by-step checklist for shipping Orbit to the App Store.

## Pre-flight (code — done in repo)

- [x] Custom app icon (`assets/images/icon.png`) from Orbit orbit motif
- [x] Splash icon matches native splash (`#3D1528` background)
- [x] Privacy Policy at `/privacy` and Support at `/support`
- [x] Legal links + version in Settings
- [x] Account deletion in Settings
- [x] `ITSAppUsesNonExemptEncryption: false` in `app.json`

## 1. Deploy backend (privacy + support pages)

```bash
cd /path/to/linked
fly deploy
```

Verify:

```bash
curl -sI https://linked.fly.dev/privacy | head -1
curl -sI https://linked.fly.dev/support | head -1
curl -sI https://linked.fly.dev/health | head -1
```

### Fly secrets checklist

**Do NOT set** `ENABLE_DEV_TOOLS` in production.

Optional env vars:

| Secret | Purpose |
|--------|---------|
| `SUPPORT_EMAIL` | Shown on privacy/support pages (default: `support@martinez.dev`) |
| `APP_STORE_URL` | Real App Store link on invite pages (after listing is live) |
| `EXPO_ACCESS_TOKEN` | Required for partner push (nudges, hearts, photos). Create at expo.dev → Access tokens. |

```bash
fly secrets list -a linked
# If ENABLE_DEV_TOOLS appears, remove it:
# fly secrets unset ENABLE_DEV_TOOLS -a linked
```

## 2. EAS credentials (push notifications)

APNs must be configured for partner nudges and photo notifications.

```bash
cd frontend
npx eas-cli credentials --platform ios
```

Confirm a **Push Key** or **Push Certificate** is set for `com.martinez.orbit`.

## 3. Production iOS build

```bash
cd frontend
npx eas-cli build --platform ios --profile production
```

This profile (`eas.json`):

- Sets `EXPO_PUBLIC_API_URL=https://linked.fly.dev`
- Auto-increments build number

Wait for the build to finish on [expo.dev](https://expo.dev).

## 4. Submit to TestFlight

```bash
npx eas-cli submit --platform ios --profile production
```

Or submit a specific build:

```bash
npx eas-cli submit --platform ios --latest
```

## 5. TestFlight dogfood

Install on your iPhone and your partner's. Smoke-test:

- [ ] Pair via invite link (`https://linked.fly.dev/i/{code}`)
- [ ] Daily photo (4:3 viewfinder) + streak
- [ ] Push notification (nudge / partner photo)
- [ ] Distance map
- [ ] Mini-game (one round)
- [ ] Widget updates after opening app
- [ ] Settings → Privacy Policy / Support open in Safari
- [ ] Account delete (use a test device if needed)

## 6. App Store Connect

See [`APP_STORE_LISTING.md`](./APP_STORE_LISTING.md) for copy, screenshots, and privacy labels.

## 7. Submit for Review

Paste notes from [`APP_REVIEW_NOTES.md`](./APP_REVIEW_NOTES.md) into **App Review Information**.

In App Store Connect:

1. Select the TestFlight build
2. Complete listing + screenshots + privacy questionnaire
3. **Add for Review**

---

## Regenerating brand assets

If you tweak the orbit mark:

```bash
cd frontend
npm run icons
```

Requires `sharp` (install once: `npm install --no-save sharp`).
