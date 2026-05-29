# Ara Games

Static iPad-first arcade site for \`games.araand.co\`.

## Local Preview

```bash
python3 -m http.server 4173 --directory .
```

Open `http://localhost:4173/`.

## GitHub Pages

The shipped site has no runtime dependencies. Publish the folder contents to a GitHub Pages repository and keep the included `CNAME` file so the custom domain resolves to `games.araand.co`.

With the included `CNAME`, the production URL is expected to be `https://games.araand.co/` at the domain root.

The games save scores, stars, unlocks, and avatar choices in browser `localStorage`.

## Assets

The site uses repo-hosted art in `assets/`. The supplied generated PNG sprite sheets live in `assets/generated/`; the older SVG assets remain as safe fallbacks for any sprite that does not crop cleanly.

## Optional Smoke Test

```bash
npm install
npm run test
```

The Playwright config starts a local static server automatically unless `BASE_URL` is set. To test a deployed site, run:

```bash
BASE_URL=https://games.araand.co npm run test
```

The Playwright tests open the hub in an iPad viewport, launch every game, perform core interactions, and check for browser errors.
