# Ara Games

`games.araand.co` is a static, iPad-first arcade hub with six touch-friendly games:

- Gem Pop Arcade
- Pet Rescue Run
- Space Miner
- Fireline Rescue
- Mini Golf Madness
- Rainbow Art Studio

## Run locally

```sh
npm ci
npx playwright install chromium webkit
npm run serve
```

Open <http://127.0.0.1:4173>. The site is intentionally static and can be hosted from GitHub Pages or any ordinary web server.

## Verify changes

```sh
npm run check       # syntax checks
npm run build       # verify required assets and initial shell budget
npm test            # Chromium + WebKit iPad projects
npm run test:chromium
npm run test:webkit
```

The Playwright suite covers hub rendering, every game opening, core interactions, corrupt saves, landscape sizing, lazy atlas loading, and pause/resume behavior.

## Project structure

- `index.html` — accessible shell, metadata, and PWA links
- `styles.css` — responsive hub/play layout and reduced-motion rules
- `app.js` — game engine and game implementations
- `src/core/storage.js` — versioned, failure-safe save persistence
- `assets/generated/` — full-resolution game atlases and backgrounds
- `assets/thumbs/` — small hub card thumbnails
- `assets/icons/` — PWA and Apple home-screen icons
- `manifest.webmanifest` / `service-worker.js` — installability and offline shell
- `playwright-*.spec.js` — browser regression tests

Sprite atlases are loaded only when their game opens. Keep card artwork small and update the cache name in `service-worker.js` when shell assets change.

## Controls

All games support touch or pointer input. Keyboard alternatives are available when the canvas is focused: arrow keys move/select, Space/Enter performs the primary action, number keys select Rainbow Art Studio tools, and Escape pauses. Fireline Rescue also supports WASD and Space.

## Asset provenance

The generated Fireline thumbnail and app icon were created for this project with the image-generation prompts documented in the implementation notes. Existing sprite sheets are retained as source atlases; JPEG thumbnails are derived exports for the hub.
