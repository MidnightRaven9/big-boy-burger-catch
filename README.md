# Big Boy Burger Catch

A lightweight, nostalgic Bismarck Big Boy arcade game built with React, TypeScript, Vite and HTML5 Canvas. Catch original cheeseburger artwork on Big Boy's original white plate, dodge the original gravy splats, and beat your local high score.

## Download and play

Pick whichever way you want to play — all three versions are the same game using the original artwork:

| Version | Link | Notes |
| --- | --- | --- |
| Play in a browser | [Live game (GitHub Pages)](https://midnightraven9.github.io/big-boy-burger-catch/) | No install. Works on phone and desktop. |
| Web ZIP (offline) | [big-boy-burger-catch-web.zip](https://github.com/MidnightRaven9/big-boy-burger-catch/releases/download/v1.0.0/big-boy-burger-catch-web.zip) | Unzip and open `index.html`, or serve the folder locally. Fully offline. |
| Android APK | [BigBoyBurgerCatch-v1.0.0.apk](https://github.com/MidnightRaven9/big-boy-burger-catch/releases/download/v1.0.0/BigBoyBurgerCatch-v1.0.0.apk) | Sideload on Android 6.0+ (API 23). Fully offline. |

### Web ZIP instructions

1. Download and unzip `big-boy-burger-catch-web.zip`.
2. Open `index.html` in a modern browser — the game loads straight from the file with no server needed.
3. Or, for a local server: `cd` into the unzipped folder and run `python3 -m http.server 8000`, then open `http://127.0.0.1:8000/`.

All code and the three original PNGs are bundled. The high score is saved in that browser's local storage.

### Android APK instructions

1. Download `BigBoyBurgerCatch-v1.0.0.apk` onto your Android phone (API 23 / Android 6.0 or newer).
2. Enable **Settings → Security → Install unknown apps** for the app you use to open the file (Files, Chrome, etc.).
3. Open the APK and tap **Install**.
4. Launch **Big Boy Burger Catch** from your app drawer. No internet connection is required to play.

The APK is **release-signed** with the project key in `android/app/burgercatch-release.keystore`. Keep that key if you want to install future updates over this one without uninstalling first. It is signed for sideloading only; it is not submitted to the Play Store.

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
npm test                # gameplay logic unit tests
npm run verify:assets   # validate the three original PNGs
npm run build           # production build into dist/ (GitHub Pages)
npm run preview         # serve the production build locally
npm run build:standalone # offline build into dist-standalone/ (relative paths, classic script)
npm run build:apk       # offline build + Gradle assembleRelease APK
```

`build:standalone` creates a self-contained folder that opens from `file://` and can be zipped as the offline web version. `build:apk` copies that build into the Android WebView app's assets and produces `android/app/build/outputs/apk/release/app-release.apk`. It needs the Android SDK (`ANDROID_HOME` or `android/local.properties` with `sdk.dir`) and Java 17+. Use `npm run build:apk:debug` for a debug variant.

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
- The same 25 checks pass against the live GitHub Pages URL **and** the offline standalone build opened from `file://`.
- The release APK was verified with `aapt dump badging` (package `com.midnightraven9.burgercatch`, label `Big Boy Burger Catch`, minSdk 23, targetSdk 36, non-debuggable), `aapt list` (index + all three original PNGs bundled under `assets/public/`), and `apksigner verify` (release signature valid).

## Project structure

```text
big-boy-burger-catch/
├── public/assets/{mascot,burger,gravy}.png
├── src/components/{Hud,Controls,Overlay}.tsx
├── src/game/{assets,audio,config,engine,logic,render,storage,types}.ts
├── src/App.tsx
├── src/main.tsx
├── src/styles.css
├── android/                       # offline WebView APK project
│   └── app/
│       ├── build.gradle           # release signing config
│       ├── burgercatch-release.keystore
│       └── src/main/{java,res,assets/public}
├── release/                       # downloadable artifacts
│   ├── BigBoyBurgerCatch-v1.0.0.apk
│   └── big-boy-burger-catch-web.zip
├── scripts/{verify-assets,fix-standalone-html,sync-android-assets}.mjs
├── .github/workflows/deploy.yml
├── vite.config.ts                 # GitHub Pages build
├── vite.config.standalone.ts      # offline/file:// build
└── vitest.config.ts
```
