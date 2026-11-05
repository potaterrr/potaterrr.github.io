# Patch notes

All notable changes to Tippy Card Monte. The game is one self-contained `index.html`; the version on the title screen matches the latest entry here.

Format: [Semantic Versioning](https://semver.org/). Dates are YYYY-MM-DD. Every release is listed below, newest first.

## v1.3.3 — 2026-11-04

Exit option.

- Added an **EXIT** button to the game HUD.
- Exit ends the current run and shows the result screen, where **CHANGE MODE** returns to the title.
- In Bet mode, if the pot has money, Exit opens a choice: **CASH OUT & END**, **LEAVE POT & END**, or **KEEP PLAYING**.
- `Escape` still belongs to the browser; the EXIT button is the in-game path.

## v1.3.2 — 2026-11-04

Bet mode peek fix.

- Bet mode was using a **0 ms peek**, so Tippy flipped and disappeared instantly.
- Bet rounds now hold the Tippy peek for the normal **1.5 seconds** before shuffling.
- No other rules changed: pick Tippy to win, wrong pick loses the stake, debt allowed, cash out the pot.

## v1.3.1 — 2026-11-04

Bet mode correction.

- Bet mode now plays the same card loop as Classic: **Tippy is shown during the peek**, the cards shuffle, and you must **pick Tippy** to win.
- Picking a wrong card loses the stake. The next round still starts, even in debt.
- The pot, cash-out, auto-bank and debt rules are unchanged.
- Docs and mode copy now say “find Tippy” instead of the earlier “not Tippy” wording.

## v1.3.0 — 2026-11-04

Two new modes and an uncapped streak payout.

### Bet mode

- Fixed **16-card** table across **16 rounds**.
- Start with **100p** bankroll and bet **5 / 10 / 25 / 50 / 100p** each round.
- Watch Tippy during the peek, follow the shuffle, then pick Tippy.
- Win: the stake is not lost and the Classic streak reward goes into an **unbanked pot**.
- Lose: the stake is lost and **not returned**; bankroll can go into **debt**.
- **CASH OUT** banks the pot; after round 16 it auto-banks.
- Debt warning is shown when the bankroll goes negative; debt does not stop the run.

### Reverse mode

- 16 rounds, Classic stages.
- The peek reveals a **wrong card** instead of Tippy.
- After the shuffle, you still try to find **Tippy**.
- New medals: **Reverse Thinker** and **Perfect Avoidance**.

### Economy

- Removed the **+25p reward cap**. Streak rewards now keep climbing: **+5, +10, +15, +20, +25, +30…**
- Added Bet medals: **First Bet** and **Big Pot**.
- Title screen now shows **seven modes**.

## v1.2.1 — 2026-11-04

Fullscreen and a cash-out fix.

### Fullscreen

- Added a **FULLSCREEN** button to the title screen and a **FULL** button in the game HUD.
- Press **F** to toggle fullscreen from anywhere in the game.
- On touch devices the game best-effort locks the screen to **landscape** after entering fullscreen. If the browser cannot lock orientation, a **ROTATE TO LANDSCAPE** prompt covers the table until the device is turned.
- Exiting fullscreen unlocks the orientation again.

### Cash out

- The HUD **CASH OUT** button now banks the run on a **single press**; the old double-press confirmation was removed.
- The checkpoint **CASH OUT** button is now resilient: it works even if the checkpoint promise was already cleared, and it always ends the run.
- Both paths land on the result screen with the current depth and score.

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
