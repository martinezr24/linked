package main

import (
	"net/http"
	"os"
	"strings"
)

const legalPageCSS = `
  :root { color-scheme: dark; }
  * { box-sizing: border-box; }
  body {
    margin: 0; min-height: 100vh;
    background: radial-gradient(120% 90% at 50% 0%, #3D1528 0%, #151318 55%);
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
    color: #F5F0F1; padding: 24px; line-height: 1.6;
  }
  .wrap { max-width: 640px; margin: 0 auto; }
  .card {
    background: #222026; border: 1px solid rgba(255,255,255,0.08);
    border-radius: 22px; padding: 28px 24px;
  }
  h1 { font-size: 28px; margin: 0 0 8px; }
  h2 { font-size: 18px; margin: 28px 0 8px; color: #F5F0F1; }
  p, li { color: #A89BA0; margin: 0 0 12px; }
  ul { padding-left: 20px; margin: 0 0 12px; }
  a { color: #E63946; }
  .muted { font-size: 14px; color: #6E6367; margin-top: 24px; }
  .mark { width: 54px; height: 26px; margin: 0 0 20px; position: relative; }
  .mark:before { content:""; position:absolute; inset:0; border:2px solid #F5F0F1; border-radius:999px; transform: rotate(-20deg); }
  .mark:after { content:""; position:absolute; left:2px; top:9px; width:9px; height:9px; border-radius:999px; background:#E63946; transform: rotate(-20deg); }
`

const privacyPageHTML = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>Orbit — Privacy Policy</title>
<style>` + legalPageCSS + `</style>
</head>
<body>
  <div class="wrap">
    <div class="card">
      <div class="mark"></div>
      <h1>Privacy Policy</h1>
      <p class="muted">Last updated: March 2, 2026</p>

      <p>Orbit (&ldquo;we,&rdquo; &ldquo;our,&rdquo; or &ldquo;the app&rdquo;) is a shared space for couples. This policy explains what we collect, how we use it, and your choices.</p>

      <h2>Information we collect</h2>
      <ul>
        <li><strong>Device identifier</strong> — a random ID stored on your device to identify your account. We do not require an email or phone number to use Orbit.</li>
        <li><strong>Profile information</strong> — display name and optional profile photo you choose to upload.</li>
        <li><strong>Shared content</strong> — photos, check-ins, notes, doodles, calendar events, goals, game state, and other content you create with your partner.</li>
        <li><strong>Location (optional)</strong> — if you grant permission, we use your location to show your partner local weather on the home screen. You may also set a city manually in Settings.</li>
        <li><strong>Presence data</strong> — timezone, optional battery level, and app-open status to power &ldquo;Their World&rdquo; features.</li>
        <li><strong>Push notification token</strong> — so we can send you notifications about your partner&rsquo;s activity (e.g. nudges, photos).</li>
      </ul>

      <h2>How we use information</h2>
      <ul>
        <li>Pair your device with your partner&rsquo;s device.</li>
        <li>Sync and display shared content between you and your partner in real time.</li>
        <li>Send push notifications you expect from a couples app.</li>
        <li>Operate the iOS home-screen widget (streak and visit countdown).</li>
        <li>Keep the service secure and reliable.</li>
      </ul>

      <h2>What your partner sees</h2>
      <p>When you are paired, content you create in Orbit is visible to your partner — that is the core purpose of the app. Do not share anything you would not want your partner to see.</p>

      <h2>Third-party services</h2>
      <ul>
        <li><strong>Fly.io</strong> — hosts our API and database.</li>
        <li><strong>Expo / Apple Push Notification service</strong> — delivers push notifications on iOS.</li>
        <li><strong>Object storage</strong> — stores uploaded photos and media.</li>
        <li><strong>Apple Maps / Google Maps</strong> — displays the distance map (location coordinates are not shared as a live map pin to third parties beyond map rendering).</li>
      </ul>
      <p>We do not sell your personal information. We do not use third-party advertising or analytics SDKs.</p>

      <h2>Data retention &amp; deletion</h2>
      <p>Your data is kept while your account exists and you remain paired or active. You can <strong>unlink your partner</strong> or <strong>delete your account</strong> at any time in Settings. Deleting your account permanently removes your profile, photos, and shared history. If you are paired, your partner is unlinked as well.</p>

      <h2>Children</h2>
      <p>Orbit is not directed at children under 13. We do not knowingly collect information from children.</p>

      <h2>Security</h2>
      <p>Traffic between the app and our servers uses HTTPS. Device identifiers are stored in the device secure store where available.</p>

      <h2>Changes</h2>
      <p>We may update this policy from time to time. Continued use of Orbit after changes means you accept the updated policy.</p>

      <h2>Contact</h2>
      <p>Questions? Visit <a href="/support">Support</a> or email <a href="mailto:{{SUPPORT_EMAIL}}">{{SUPPORT_EMAIL}}</a>.</p>
    </div>
  </div>
</body>
</html>`

const supportPageHTML = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>Orbit — Support</title>
<style>` + legalPageCSS + `</style>
</head>
<body>
  <div class="wrap">
    <div class="card">
      <div class="mark"></div>
      <h1>Support</h1>
      <p>Need help with Orbit? We&rsquo;re here for you.</p>

      <h2>Getting started</h2>
      <p>Orbit works best with two people. One partner generates a pairing code in the app and shares the invite link. The other opens the link or enters the code to connect. Codes expire after 10 minutes.</p>

      <h2>Common questions</h2>
      <ul>
        <li><strong>Notifications not working?</strong> Check that notifications are enabled for Orbit in iOS Settings.</li>
        <li><strong>Widget not updating?</strong> Open Orbit at least once so the widget can refresh its data.</li>
        <li><strong>Want to disconnect?</strong> Go to Settings &rarr; Unlink partner, or Delete account to remove all your data.</li>
      </ul>

      <h2>Contact us</h2>
      <p>Email: <a href="mailto:{{SUPPORT_EMAIL}}">{{SUPPORT_EMAIL}}</a></p>
      <p>Privacy policy: <a href="/privacy">Privacy Policy</a></p>

      <p class="muted">Orbit — a home for long-distance couples.</p>
    </div>
  </div>
</body>
</html>`

func supportEmail() string {
	if e := os.Getenv("SUPPORT_EMAIL"); e != "" {
		return e
	}
	return "support@martinez.dev"
}

func handlePrivacy(w http.ResponseWriter, r *http.Request) {
	if r.URL.Path != "/privacy" {
		http.NotFound(w, r)
		return
	}
	html := strings.ReplaceAll(privacyPageHTML, "{{SUPPORT_EMAIL}}", supportEmail())
	w.Header().Set("Content-Type", "text/html; charset=utf-8")
	w.Write([]byte(html))
}

func handleSupport(w http.ResponseWriter, r *http.Request) {
	if r.URL.Path != "/support" {
		http.NotFound(w, r)
		return
	}
	html := strings.ReplaceAll(supportPageHTML, "{{SUPPORT_EMAIL}}", supportEmail())
	w.Header().Set("Content-Type", "text/html; charset=utf-8")
	w.Write([]byte(html))
}
