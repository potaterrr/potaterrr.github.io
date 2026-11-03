# Patch notes

All notable changes to Tippy Card Monte. The game is one self-contained `index.html`; the version on the title screen matches the latest entry here.

Format: [Semantic Versioning](https://semver.org/). Dates are YYYY-MM-DD. Every release is listed below, newest first.

## v1.2.0 — 2026-11-04

Five modes, endless checkpoints, perks and medals.

### Modes

- **Classic** — the original 16-round climb, seven stages, 3 to 16 cards. Score above 0p to win; all 16 picks is a **BIG WIN**.
- **Endless** — no fail. Start at 16 cards and climb forever. Every 4 depths pauses for a checkpoint bonus and a perk. Best depth is the record. Cash out from the HUD or a checkpoint to bank the run.
- **Daily** — one date-seeded 16-round shuffle. The same seed is used all day, and today's best score is saved.
- **Blitz** — eight fast rounds with 6 to 16 cards. A pure score chase.
- **Zen** — 16 rounds, no fail, no debt pressure, and much slower peeks.

### Checkpoints and perks

- Endless checkpoints pay **30, 40, 50…p** (`20 + 10 × checkpoint`).
- Each checkpoint offers three random perks; pick one to continue.
- **Longer Peek** — +250 ms per round.
- **Fewer Shuffles** — remove 2 shuffles per round.
- **Slow Hands** — each swap takes 40 ms longer.
- **Coin Purse** — every correct pick pays 5p more.
- **Safety Net** — the next miss costs 0p.
- **Streak Guard** — keep your streak through one miss.
- Every perk has three ranks.

### Medals

Thirteen medals now persist in `localStorage`, with unlock toasts and a gallery on the title screen:

- First Find, Perfect Monte, Hot Hand, Tippy's Nightmare, Master of the Deck.
- Beyond the Deck, Deep Pockets, Ten Deep, Twenty Deep, Tea Break.
- Blitz Runner, Daily Devotion, Zen Master.

### Modes on the title screen

- The title screen now has a mode selector with each mode's best score/depth.
- The HUD shows the mode's round total, or `DEPTH` in Endless, with the next checkpoint count.
- The result screen reports mode, depth, new medals and the mode best.

### Fixed

- The 15-round meta descriptions and documentation are now 16 rounds.
- The keyboard shortcut list now covers all 16 cards (`Q` through `U` for cards 10–16).

## v1.1.0 — 2026-11-03

The 16-round deck.

- Classic expanded from 15 to **16 rounds** and from 5 to **7 stages**.
- The deck now grows **3 → 16 cards**.
- Added **EXPERT** (12 cards) and **MASTER** (16 cards) stages.
- Retuned peek, shuffle and swap values across the ladder.

## v1.0.0 — 2026-10-30

First OpenArcade release.

- 15 rounds, 5 stages, a deck from 3 to 15 cards.
- Streak scoring, debt, the BIG WIN ending and local best score.
- Pixel art, embedded Press Start 2P font, Web Audio sound effects and `localStorage` saves.
- Mouse, touch, keyboard and mobile fullscreen support.
