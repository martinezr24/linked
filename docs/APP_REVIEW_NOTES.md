# Orbit — App Review Notes

Paste this into **App Store Connect → App Review Information → Notes** when submitting Orbit for review.

---

## Summary

Orbit is a couples app for two paired iPhones. There is no email/password login — each device gets an anonymous ID stored in the iOS Keychain (Secure Store).

## Testing requirements

**Orbit requires two devices to experience the full app.** One device generates a pairing code; the second opens the invite link or enters the code. Features like daily photos, games, and real-time sync only work between paired partners.

If you need a paired demo:

1. Install Orbit on two iPhones (or one iPhone + one Simulator with a dev build).
2. On Device A: open Orbit → generate pairing code → Share invite link.
3. On Device B: open the invite link → tap "Open in Orbit" (or enter the 6-digit code).
4. Both devices should show the shared home screen.

Alternatively, we can provide a screen recording of the pairing and daily-photo flow upon request.

## Key flows to test

| Flow | Steps |
|------|-------|
| Pairing | Generate code on Device A → open `https://linked.fly.dev/i/{code}` on Device B |
| Daily photo | Home → Take photo → frame face in 4:3 viewfinder → Send |
| Nudge | Long-press partner avatar on Home → heart animation |
| Game | Play tab → pick a game → play a move on each device |
| Delete account | Settings → Delete my account (destructive; use test device) |

## Permissions

| Permission | Why |
|------------|-----|
| Camera | Daily photos and profile avatar |
| Photo library | Choose existing photos for daily photo |
| Location (when in use) | Partner weather on home screen (optional; city fallback in Settings) |
| Notifications | Partner activity (nudges, photos, game turns) |

## External links

- **Venmo "Treats"** opens the Venmo app/website with a pre-filled payment link. Orbit does not process payments.
- **Privacy Policy:** https://linked.fly.dev/privacy
- **Support:** https://linked.fly.dev/support

## Account deletion

Users can delete their account in **Settings → Delete my account**. This permanently removes their data and unlinks their partner.

## Backend

Production API: `https://linked.fly.dev`  
No test credentials required — pairing is device-based.

## Contact

support@martinez.dev

---

## TestFlight checklist (before submitting for review)

- [ ] Production EAS build installed from TestFlight
- [ ] Paired with partner for 2+ days of real usage
- [ ] Daily photo send + receive + memories
- [ ] Push notification received when app backgrounded
- [ ] Widget shows streak / visit countdown
- [ ] Privacy Policy and Support links work from Settings
- [ ] No crashes on cold start or after pairing
- [ ] Invite link opens app via `orbit://pair?code=XXXXXX`
