# TestFlight — Next Steps

Production build **v1.0.0 (15)** is ready on EAS.

| | |
|---|---|
| **Build** | https://expo.dev/accounts/giojetski/projects/orbit/builds/4c6ba71e-efdf-43b1-9315-5d8bbdb9ed71 |
| **IPA** | https://expo.dev/artifacts/eas/20Kj72AiUliU5hzbSULHf--VQTY6RuB3NN1GXMsEtiA.ipa |
| **Bundle ID** | `com.martinez.orbit` |

## 1. Submit to TestFlight (one-time setup)

EAS needs your **App Store Connect app ID** (`ascAppId`) for non-interactive submits.

### Option A — Interactive (easiest first time)

```bash
cd frontend
npx eas-cli submit --platform ios --id 4c6ba71e-efdf-43b1-9315-5d8bbdb9ed71
```

Sign in with your Apple ID when prompted. EAS will create the App Store Connect record if needed.

After submit succeeds, copy the **Apple ID** (numeric) from App Store Connect → App Information → Apple ID.

### Option B — Save ascAppId for future submits

Edit [`frontend/eas.json`](../frontend/eas.json) and replace the placeholder:

```json
"ascAppId": "1234567890"
```

Then:

```bash
cd frontend
npm run submit:ios
```

## 2. TestFlight dogfood (you + partner)

Install from TestFlight and run through [`APP_REVIEW_NOTES.md`](./APP_REVIEW_NOTES.md) checklist:

- [ ] Pair via invite link
- [ ] Daily photo (4:3 viewfinder) + streak
- [ ] Push notification when backgrounded
- [ ] Distance map
- [ ] One mini-game round
- [ ] Widget updates
- [ ] Settings → Privacy Policy / Support open correctly
- [ ] New app icon on home screen

## 3. App Store Connect listing

While dogfooding, fill in the listing using:

- [`APP_STORE_LISTING.md`](./APP_STORE_LISTING.md) — description, keywords, privacy labels
- [`APP_STORE_METADATA.json`](./APP_STORE_METADATA.json) — copy-paste reference
- [`docs/screenshots/README.md`](./screenshots/README.md) — capture 6.7" screenshots

**Screenshots are required before App Review.** Capture on iPhone 15 Pro Max simulator or device, save to `docs/screenshots/`, upload in App Store Connect.

## 4. Submit for App Review

1. App Store Connect → your app → **Distribution**
2. Select build **1.0.0 (15)** from TestFlight
3. Complete metadata, screenshots, privacy questionnaire
4. Paste notes from [`APP_REVIEW_NOTES.md`](./APP_REVIEW_NOTES.md) into **App Review Information**
5. **Add for Review**

## 5. After approval

Set the real App Store URL on Fly so invite pages link correctly:

```bash
fly secrets set APP_STORE_URL="https://apps.apple.com/app/idYOUR_APP_ID" -a linked
```
