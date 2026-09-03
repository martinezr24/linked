# Production verification (2026-03-02)

Checklist run before App Store production build.

| Check | Status | Notes |
|-------|--------|-------|
| `ENABLE_DEV_TOOLS` absent on Fly | ✅ | `fly secrets list -a linked` — not present |
| `/privacy` returns 200 | ✅ | https://linked.fly.dev/privacy |
| `/support` returns 200 | ✅ | https://linked.fly.dev/support |
| `/health` returns ok | ✅ | `{"status":"ok"}` |
| EAS production `EXPO_PUBLIC_API_URL` | ✅ | `https://linked.fly.dev` in `eas.json` |
| iOS distribution cert | ✅ | Expires 2027-06-28, team `4S6A78PA3C` |
| Widget provisioning profile | ✅ | `com.martinez.orbit.widget` registered |
| Custom app icon | ✅ | `frontend/assets/images/icon.png` (AppMark motif) |
| Account deletion in app | ✅ | Settings → Delete my account |
| Export compliance | ✅ | `ITSAppUsesNonExemptEncryption: false` |

## EAS production build

Latest build triggered via:

```bash
cd frontend
npx eas-cli build --platform ios --profile production --non-interactive
```

Monitor at: https://expo.dev/accounts/giojetski/projects/orbit/builds

## After build succeeds

```bash
npx eas-cli submit --platform ios --profile production --latest --non-interactive
```

(Requires `ascAppId` in `frontend/eas.json` — see [`TESTFLIGHT_NEXT_STEPS.md`](./TESTFLIGHT_NEXT_STEPS.md).)

**Latest production build:** v1.0.0 (15) — [EAS build log](https://expo.dev/accounts/giojetski/projects/orbit/builds/4c6ba71e-efdf-43b1-9315-5d8bbdb9ed71)
