# Big Boy Burger Catch

A lightweight, nostalgic Bismarck Big Boy arcade game built with React, TypeScript, Vite and HTML5 Canvas. Catch original cheeseburger artwork on Big Boy's original white plate, dodge the original gravy splats, and beat your local high score.

## Original artwork (required)

The game uses **only the three original PNG images** supplied for this project:

| Source | Required path |
| --- | --- |
| Big Boy mascot holding his white plate | `public/assets/mascot.png` |
| Cheeseburger | `public/assets/burger.png` |
| Gravy splat | `public/assets/gravy.png` |

No emoji, generated art, CSS drawings or substitute sprites are used for gameplay. The plate is **part of the original mascot art**. At startup the game scans that image for the white plate and aligns the catch hitbox with it automatically. A manual fallback lives in `src/game/config.ts` (`PLATE_OVERRIDE`) if the source artwork needs a tweak.

Run `npm run verify:assets` to confirm all three PNGs exist and are valid.

## Gameplay

- **Move:** hold the on-screen LEFT / RIGHT pads, tap either half of the playfield, or use the ← / → (or A / D) keys.
- **Catch:** a burger landing on the white plate is worth **10 points**, with a burst effect, a floating `+10` and a chime.
- **Dodge:** gravy hitting Big Boy removes **exactly one life** (3 → 2 → 1 → 0). Hits trigger a flash, shake, brown splat particles and a short invulnerability window so one splat cannot take multiple lives.
- **Lives:** every game starts with **3 hearts**, shown in the top HUD. Zero lives ends the game.
- **Screens:** start, main game, pause/resume, game over with final score, and Play Again.
- **High score:** stored locally in `localStorage` (`bbbc.highScore.v1`).
- **Sound:** generated with WebAudio, no audio files. Mute button in the HUD, preference stored locally.
- **Difficulty:** spawn rate, fall speed and gravy frequency increase gradually, with caps to keep play fair.

## Local development

```bash
npm install
npm run dev
```

Open the URL Vite prints (normally `http://127.0.0.1:5173/big-boy-burger-catch/`).

```bash
npm test              # gameplay logic unit tests
npm run verify:assets # validate the three original PNGs
npm run build         # production build into dist/
npm run preview       # serve the production build locally
```

Add `?debug=1` to the URL to expose `window.__BBBC__` with helpers (`start`, `setPlayerX`, `spawn`, `getState`, `getPlate`) for automated testing.

## Deployment

The site is built for GitHub Pages at:

**https://midnightraven9.github.io/big-boy-burger-catch/**

`vite.config.ts` sets `base: '/big-boy-burger-catch/'`, and image URLs are built from `import.meta.env.BASE_URL`, so all assets resolve correctly from the repository subpath.

`.github/workflows/deploy.yml` runs on every push to `main`: it verifies the artwork, runs tests, builds, and deploys `dist/` with the official GitHub Pages actions.

If Pages is not yet enabled for the repository, enable it once under **Settings → Pages → Build and deployment → Source: GitHub Actions**. The token used to create this repository attempts to enable it automatically via the Pages API; if that call is blocked, the manual step above is all that is needed.

## Integrating with the Bismarck Big Boy app

The existing [bismarck-big-boy-app](https://github.com/MidnightRaven9/bismarck-big-boy-app) repository is deliberately **not modified** by this project. To add a **Play Burger Catch** button there, with permission, use one of these approaches.

### 1. Simple external link (easiest, works everywhere)

```js
window.open('https://midnightraven9.github.io/big-boy-burger-catch/', '_blank');
```

### 2. Android WebView (recommended for the native app)

```kotlin
webView.settings.javaScriptEnabled = true
webView.settings.domStorageEnabled = true
webView.settings.javaScriptCanOpenWindowsAutomatically = true
webView.settings.setSupportZoom(false)
webView.settings.cacheMode = WebSettings.LOAD_DEFAULT
webView.setLayerType(View.LAYER_TYPE_HARDWARE, null)
webView.loadUrl("https://midnightraven9.github.io/big-boy-burger-catch/")
```

The game already uses `viewport-fit=cover`, `100dvh`, `touch-action: none` and pointer events, so it works inside a WebView without extra CSS. For full-screen immersive mode, hide the app toolbar when the game opens.

### 3. Capacitor / InAppBrowser

```ts
import { InAppBrowser } from '@ionic-native/in-app-browser/ngx';

browser.create(
  'https://midnightraven9.github.io/big-boy-burger-catch/',
  '_blank',
  'location=no,toolbar=yes,closebuttoncaption=Done'
);
```

### 4. Embedded iframe (web app shell)

```html
<iframe
  src="https://midnightraven9.github.io/big-boy-burger-catch/"
  title="Big Boy Burger Catch"
  style="width:100%;height:100dvh;border:0;touch-action:none"
  allowfullscreen
></iframe>
```

Use a full-screen route or modal for the iframe so touch controls have enough room on phones.

## Verification performed

Before publishing, the following were checked against a real headless Chromium run at a phone viewport (390×844) using the built production bundle:

- All three original PNGs load (mascot 1086×1448, burger 1536×1024, gravy 1536×1024).
- Plate detection lands on the original white plate (~77% across, ~27% down the mascot art); rendered plate pixels are 88% bright white.
- Hold-to-move left/right touch pads and ← / → keyboard controls.
- Burger catch awards exactly 10 points; three gravy collisions remove one life each and end the game.
- Game Over final score, empty hearts, Play Again restart, pause/resume, mute, high score and mute persistence after reload.
- No page scrolling and no console/page errors.
- `npm test` (8 logic tests) and `npm run build` both pass.

## Project structure

```text
big-boy-burger-catch/
├── public/assets/{mascot,burger,gravy}.png
├── src/components/{Hud,Controls,Overlay}.tsx
├── src/game/{assets,audio,config,engine,logic,render,storage,types}.ts
├── src/App.tsx
├── src/main.tsx
├── src/styles.css
├── .github/workflows/deploy.yml
├── index.html
├── package.json
├── README.md
└── vite.config.ts
```
