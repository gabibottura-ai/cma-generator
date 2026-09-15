# Daily Bread: Bible reader

Phone first Bible reader. Plain HTML, CSS and JS, no build step. Lives in `bible/` on this repo.

## What is built (v1)
- Full Bible, two public domain translations: World English Bible (default) and King James (toggle in the Aa sheet).
- Home: today's verse (rotates daily from 118 curated refs in `app.js`), Continue reading tile, All books, 3 collections.
- Reader: verse numbers, prev and next chapter, text size, theme (auto, light, dark), position saved automatically.
- Books picker (OT and NT tabs), chapter grid marks chapters already read.
- PWA: `manifest.webmanifest`, `sw.js` caches the app shell and the Bible text for offline use, icons in `icons/`.
- Data: `data/web.json` and `data/kjv.json`, format `{tr, name, books:[{id, name, abbr, t, ch:[[verse strings]]}]}`.
  Built by `scratch/parse_web.py` style script from the WEB USFX XML (seven1m/open-bibles) and the thiagobodruk KJV JSON.

## Hosting
- Netlify site `gabi-bible` exists (id cb9fe3da-8119-4d52-a1a7-99d361e05054) but the sandbox could not upload to it (Netlify hosts blocked by network policy).
  One time fix in the Netlify UI: Site configuration > Build & deploy > Link repository > this repo, branch `claude/bible-reader-basic-build-rr0oz3` (or `main` after merge), base directory `bible`, publish directory `.`.
  After that every push deploys automatically to https://gabi-bible.netlify.app.
- Until then the app is published as a Claude artifact (link in the chat).

## v2 (done)
- Search: full text with match highlighting, grouped by book. A reference like "Psalm 23:1" or "john 3" jumps straight there.
- Tap a verse: Highlight (yellow, persists), Save (Saved screen on Home), Copy.
- Reading plans: "New Testament in 90 days" and "Psalms and Proverbs in 31 days" (5 psalms + 1 proverb a day).
  Progress is by completion, not by calendar date, so a missed day never piles up. Next button follows the plan.

## Next (in priority order, each is small and independent)
1. Streak and daily nudge: days in a row on Home, optional notification at a chosen time (needs push, only works when hosted with a service worker, so after Netlify link).
2. Share a verse as an image (canvas render, share sheet).
3. Portuguese translation option (public domain: Almeida 1911 / "Bíblia Livre") if wanted.

## Rules for whoever continues
- Keep it one screen at a time, big touch targets, few words. The user has ADHD and reads visually.
- No frameworks, no build step. Keep `app.js` under ~600 lines; split into modules only if it grows past that.
- Never hand edit `data/*.json`; regenerate from source.
- Bump `CACHE` in `sw.js` on every release so phones pick up the new shell.
