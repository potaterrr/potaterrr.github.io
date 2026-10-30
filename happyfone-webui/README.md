# HappyFone WebUI

A production-style, dependency-free agent console for a simulated outbound call center. Built with vanilla HTML, CSS, and ES modules for GitHub Pages.

**Live:** https://potaterrr.github.io/happyfone-webui/

## Features

- **Mock auth and session guard** — username, extension, and password. A dummy JWT and user profile are stored in `localStorage`. Direct visits to the dashboard without a valid session redirect to sign-in.
- **Agent state machine** — `AVAILABLE`, `ON_CALL`, `WRAP_UP`, and `AUX`, with a live timer for the current state.
- **AUX pauses** — Lunch, Short Break, Bio Break, Coaching, and Training. Selecting any AUX reason pauses the dialer; returning to Available unlocks it.
- **Simulated call lifecycle** — 3 seconds of ringing, then a connected call timer. Mute, hold/resume, and hangup controls are available after connection.
- **Wrap-up** — hanging up starts a 5-second wrap-up countdown before the agent returns to Available.
- **Persistent call history** — number, start time, duration, and status (`Completed`, `Handled`, `No Answer`). Entries survive reloads, support click-to-dial, and can be cleared.
- **Responsive dark UI** — JetBrains Mono typography, CSS variables, accessible focus states, and reduced-motion support.

## Routes

GitHub Pages is a static host, so this app uses hash routing. Every route works on refresh and direct access without a 404 fallback.

| View | URL |
| --- | --- |
| Login | `https://potaterrr.github.io/happyfone-webui/#/login-webui` |
| Dashboard | `https://potaterrr.github.io/happyfone-webui/#/dashboard` |

The bare project URL redirects to sign-in when there is no session, or to the dashboard when a session exists.

## Demo login

Authentication is intentionally mocked. Any non-empty username, extension, and password will sign you in. No credentials leave the browser and no real calls are placed.

## Local development

Because the app uses ES modules, serve the folder over HTTP rather than opening `index.html` directly:

```bash
cd happyfone-webui
python3 -m http.server 8080
# open http://localhost:8080/
```

## File structure

```
index.html          Markup for both views
css/styles.css      Theme, layout, components, responsive rules
js/app.js           Hash router, mock auth/session, header, boot
js/dialer.js        Keypad, simulated WebRTC flow, history storage
js/aux.js           AUX state machine, reasons, time helpers
```

## Implementation notes

- Call durations are computed from timestamps, so timers stay accurate if the tab is throttled.
- Calls that use Hold are logged as `Handled`; connected calls without hold are `Completed`; calls ended while ringing are `No Answer`.
- Logout cancels any active simulation, clears the `happyfone.*` storage keys, and returns to sign-in.
- The only external request is the Google Fonts stylesheet for JetBrains Mono. The app falls back to a system monospace stack if it is unavailable.

## Deployment

This folder is published from the `potaterrr.github.io` repository under `happyfone-webui/`. Commit the files and push to `main`; the existing GitHub Pages workflow deploys the repository root.
