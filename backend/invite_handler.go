package main

import (
	"net/http"
	"os"
	"strings"
)

// Landing page for a pairing invite link (https://<host>/i/{code}). Shared with
// a partner who may not have the app yet: it offers "Open in Orbit" (deep link)
// for people who have it, plus App Store / Play links and the code for people
// who don't.
const invitePageHTML = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
<meta name="apple-itunes-app" content="app-argument={{DEEPLINK}}" />
<title>Join me on Orbit</title>
<style>
  :root { color-scheme: dark; }
  * { box-sizing: border-box; }
  body {
    margin: 0; min-height: 100vh; display: flex; align-items: center; justify-content: center;
    background: radial-gradient(120% 90% at 50% 0%, #3D1528 0%, #151318 55%);
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
    color: #F5F0F1; padding: 24px;
  }
  .card {
    width: 100%; max-width: 360px; text-align: center;
    background: #222026; border: 1px solid rgba(255,255,255,0.08);
    border-radius: 22px; padding: 30px 22px;
  }
  .mark { width: 54px; height: 26px; margin: 0 auto 18px; position: relative; }
  .mark:before { content:""; position:absolute; inset:0; border:2px solid #F5F0F1; border-radius:999px; transform: rotate(-20deg); }
  .mark:after { content:""; position:absolute; left:2px; top:9px; width:9px; height:9px; border-radius:999px; background:#E63946; transform: rotate(-20deg); }
  h1 { font-size: 24px; margin: 0 0 6px; }
  p { color: #A89BA0; margin: 0 0 20px; line-height: 1.5; }
  .btn { display: block; text-decoration: none; font-weight: 700; border-radius: 999px; padding: 15px; margin: 10px 0; }
  .primary { background: #E63946; color: #fff; }
  .ghost { background: #2B2831; color: #F5F0F1; border: 1px solid rgba(255,255,255,0.1); }
  .code { margin: 20px 0; color: #A89BA0; font-size: 14px; }
  .code b { display: block; font-size: 30px; letter-spacing: 8px; color: #F5F0F1; margin-top: 6px; font-variant-numeric: tabular-nums; }
  .hint { font-size: 13px; color: #6E6367; margin-top: 18px; line-height: 1.5; }
</style>
</head>
<body>
  <div class="card">
    <div class="mark"></div>
    <h1>Join me on Orbit</h1>
    <p>Your partner invited you to connect on Orbit &mdash; a little space just for the two of you.</p>
    <a class="btn primary" href="{{DEEPLINK}}">Open in Orbit</a>
    <div class="code">Your pairing code<b>{{CODE}}</b></div>
    <a class="btn ghost" href="{{APPSTORE}}">Download for iPhone</a>
    <a class="btn ghost" href="{{PLAYSTORE}}">Download for Android</a>
    <p class="hint">Already have Orbit? Tap &ldquo;Open in Orbit.&rdquo; New here? Download the app, then enter the code above. Codes expire in 10 minutes.</p>
  </div>
</body>
</html>`

func handlePairInvite(w http.ResponseWriter, r *http.Request) {
	code := sanitizePairCode(strings.TrimPrefix(r.URL.Path, "/i/"))

	appStore := os.Getenv("APP_STORE_URL")
	if appStore == "" {
		// Placeholder until the app is live — replace the numeric id (or set the
		// APP_STORE_URL env var on Fly) once the App Store listing exists.
		appStore = "https://apps.apple.com/app/orbit/id0000000000"
	}
	playStore := os.Getenv("PLAY_STORE_URL")
	if playStore == "" {
		playStore = "https://play.google.com/store/apps/details?id=com.martinez.orbit"
	}

	html := invitePageHTML
	html = strings.ReplaceAll(html, "{{DEEPLINK}}", "orbit://pair?code="+code)
	html = strings.ReplaceAll(html, "{{CODE}}", code)
	html = strings.ReplaceAll(html, "{{APPSTORE}}", appStore)
	html = strings.ReplaceAll(html, "{{PLAYSTORE}}", playStore)

	w.Header().Set("Content-Type", "text/html; charset=utf-8")
	w.Write([]byte(html))
}

// sanitizePairCode keeps only digits (max 6) so the code is safe to embed.
func sanitizePairCode(s string) string {
	var b strings.Builder
	for _, ch := range s {
		if ch >= '0' && ch <= '9' {
			b.WriteByte(byte(ch))
			if b.Len() >= 6 {
				break
			}
		}
	}
	return b.String()
}
