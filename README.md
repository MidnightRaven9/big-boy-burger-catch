# Big Boy Burger Catch

A lightweight, nostalgic Bismarck Big Boy arcade game built with React, TypeScript, Vite and HTML5 Canvas. Catch original cheeseburger artwork on Big Boy's original white plate, dodge the original gravy splats, and beat your local high score.

Version 1.2.0 keeps the articulated walk/direction animation, facial expressions and six-stage speed ramp from 1.1.0, and adds an adaptive full-width playfield plus a generated diner/rockabilly music loop that follows play, pause and mute.

## Download and play

Pick whichever way you want to play — all three versions are the same game using the original artwork:

| Version | Link | Notes |
| --- | --- | --- |
| Play in a browser | [Live game (GitHub Pages)](https://midnightraven9.github.io/big-boy-burger-catch/) | No install. Works on phone and desktop. |
| Web ZIP (offline) | [big-boy-burger-catch-web.zip](https://github.com/MidnightRaven9/big-boy-burger-catch/releases/download/v1.2.0/big-boy-burger-catch-web.zip) | Unzip and open `index.html`, or serve the folder locally. Fully offline. |
| Android APK | [BigBoyBurgerCatch-v1.2.0.apk](https://github.com/MidnightRaven9/big-boy-burger-catch/releases/download/v1.2.0/BigBoyBurgerCatch-v1.2.0.apk) | Sideload on Android 6.0+ (API 23). Fully offline. |

### Web ZIP instructions

1. Download and unzip `big-boy-burger-catch-web.zip`.
2. Open `index.html` in a modern browser — the game loads straight from the file with no server needed.
3. Or, for a local server: `cd` into the unzipped folder and run `python3 -m http.server 8000`, then open `http://127.0.0.1:8000/`.

All code, the three original PNGs, and the six articulated mascot layers plus five expression heads are bundled. The high score is saved in that browser's local storage.

### Android APK instructions

1. Download `BigBoyBurgerCatch-v1.2.0.apk` onto your Android phone (API 23 / Android 6.0 or newer).
2. Enable **Settings → Security → Install unknown apps** for the app you use to open the file (Files, Chrome, etc.).
3. Open the APK and tap **Install**.
4. Launch **Big Boy Burger Catch** from your app drawer. No internet connection is required to play.

The APK is **release-signed** with the project key in `android/app/burgercatch-release.keystore`. Keep that key if you want to install future updates over this one without uninstalling first. It is signed for sideloading only; it is not submitted to the Play Store.

## Original artwork (required)

The gameplay art comes from **only the three original PNG images** supplied for this project:

| Source | Required path |
| --- | --- |
| Big Boy mascot holding his white plate | `public/assets/mascot.png` |
| Cheeseburger | `public/assets/burger.png` |
| Gravy splat | `public/assets/gravy.png` |

The articulated animation uses crops of that **same original mascot PNG**. `scripts/build-mascot-layers.py` splits it into six layers (back leg, front leg, torso, free arm, rigid plate arm, head) and derives five expression heads (normal, blink, happy, shock, sad) using colors sampled from the source art. No emoji, generic character, substitute sprite, or CSS drawing is used. Regenerate them with `npm run build:mascot-layers`.

The plate is **part of the original mascot art**. The rigid plate arm is never rotated, so the plate stays level while the legs and free arm animate. At startup the game scans the original image for the white plate and aligns the mirrored catch hitbox with it automatically. A manual fallback lives in `src/game/config.ts` (`PLATE_OVERRIDE`) if the source artwork needs a tweak.

Run `npm run verify:assets` to confirm the original PNGs and all generated layer frames exist and are valid.

## Gameplay

- **Move:** hold the on-screen LEFT / RIGHT pads, tap either half of the playfield, or use the ← / → (or A / D) keys. The two legs alternate with forward/back feet, a slight body bounce and a subtle counter-swinging free arm; stride and cadence follow actual speed. Stopping eases back to idle, and the last direction is kept.
- **Direction:** LEFT / RIGHT mirror the whole mascot, including the plate. The plate catch hitbox mirrors with it and there is no position jump.
- **Catch:** a burger visibly landing on the white plate is worth **10 points**, with a happy wide-eyed face, bounce, sparkle, burst, floating `+10` and chime for about 0.5 seconds. Head/body hits do not score.
- **Dodge:** gravy hitting Big Boy removes **exactly one life** (3 → 2 → 1 → 0). Hits show a shocked face and recoil for about 0.7 seconds with a flash, shake and brown splat particles. Damage protection lasts exactly **0.8 seconds**, so one splat cannot take multiple lives.
- **Game over:** motion stops, Big Boy slumps with a sad face, and the final score appears.
- **Lives:** every game starts with **3 hearts**, shown in the top HUD. Zero lives ends the game.
- **Screens:** start, main game, pause/resume, game over with final score, and Play Again.
- **High score:** stored locally in `localStorage` (`bbbc.highScore.v1`).
- **Sound:** generated with WebAudio, no audio files. Catch/hit/jukebox effects and a looping diner/rockabilly bass-and-brush band all follow the HUD mute button, and the preference is stored locally. Music starts after the first tap, plays only during a round, and stops on pause or game over.
- **Screen fit:** the app shell is unchanged, but the playfield now scales with the device instead of leaving wide empty margins. It fills the available width on normal phones, crops only empty backdrop when space is tight, and never stretches the original art or hides Big Boy's plate. Short landscape screens move the controls beside the game.
- **Difficulty:** six tiers with a HUD level indicator, exact fall-speed/spawn-interval table below, a brief `SPEED UP!` banner at each new level, and a hard cap at level 6.
- **Spawning:** one item per event, at most **3** falling items and **2** burgers, approximately **25%** gravy, with spacing that prevents overlapping spawns.

| Time | Fall speed | Spawn interval |
| --- | --- | --- |
| 0–15s | 140 px/s | 1.4s |
| 15–30s | 175 px/s | 1.3s |
| 30–45s | 215 px/s | 1.2s |
| 45–60s | 260 px/s | 1.1s |
| 60–90s | 310 px/s | 1.0s |
| 90s+ | 360 px/s | 0.9s |

## Local development

```bash
npm install
npm run dev
```

Open the URL Vite prints (normally `http://127.0.0.1:5173/big-boy-burger-catch/`).

```bash
npm test                # gameplay logic, animation and engine unit tests
npm run verify:assets   # validate original PNGs and generated mascot layers
npm run build           # production build into dist/ (GitHub Pages)
npm run preview         # serve the production build locally
npm run build:mascot-layers # regenerate articulated layers from mascot.png
npm run build:standalone # offline build into dist-standalone/ (relative paths, classic script)
npm run build:apk       # offline build + Gradle assembleRelease APK
```

`build:standalone` creates a self-contained folder that opens from `file://` and can be zipped as the offline web version. `build:apk` copies that build into the Android WebView app's assets and produces `android/app/build/outputs/apk/release/app-release.apk`. It needs the Android SDK (`ANDROID_HOME` or `android/local.properties` with `sdk.dir`) and Java 17+. Use `npm run build:apk:debug` for a debug variant.

Add `?debug=1` to the URL to expose `window.__BBBC__` with helpers (`start`, `setPlayerX`, `setPlayerVelocity`, `setDirection`, `setElapsed`, `setPulse`, `setAnimation`, `getState`, `getSnapshot`, `getAnimation`, `getPlate`, `spawn`, `getAudio`, `getLayout`) for automated testing.

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

- All three original PNGs load (mascot 1086×1448, burger 1536×1024, gravy 1536×1024), along with all 6 articulated layers and 5 expression heads.
- Plate detection lands on the original white plate (~77% across, ~27% down the mascot art); the rendered plate area stays bright white and mirrors with LEFT/RIGHT.
- Walking uses counter-phased leg angles with visible canvas pixel changes, forward/back feet, free-arm counter-swing, slight body bounce, and a level rigid plate arm.
- LEFT/RIGHT flip immediately with no position jump; STOP returns to idle while keeping the last facing.
- Happy, blink, shock and sad frames render visibly differently; catch/hit reactions last about 0.5s/0.7s in game time.
- Exact six-tier difficulty table, HUD level indicator, `SPEED UP!` banner, paused timer, restart reset, and live spawn caps (3 falling / 2 burgers).
- Hold-to-move left/right touch pads and ← / → keyboard controls.
- Burger catch awards exactly 10 points, head/body burgers score nothing, three gravy collisions remove one life each and end the game, damage protection is 0.8s.
- Game Over final score, empty hearts, sad expression, Play Again restart, pause/resume, mute, high score and mute persistence after reload.
- No page scrolling and no console/page errors.
- Adaptive layout verified at 390x844, 360x640, 430x932, 390x600 and 844x390: the game fills the stage width on portrait phones, keeps its 720:1280 proportions, keeps the banner and mascot visible, and the controls stay on screen.
- Music is silent before the first gesture, starts on Play, stops on pause/game over and when muted, and resumes correctly.
- `npm test` (29 logic/animation/engine/layout tests), `npm run verify:assets`, `npm run build`, and `npm run build:standalone` all pass.
- All 52 gameplay browser checks and 34 layout/music browser checks pass against the built bundle, the offline standalone build opened from `file://`, and the live GitHub Pages URL.
- The release APK was verified with `aapt dump badging` (package `com.midnightraven9.burgercatch`, label `Big Boy Burger Catch`, minSdk 23, targetSdk 36, version 1.2.0, non-debuggable), `aapt list` (all original and layer PNGs bundled under `assets/public/`), and `apksigner verify` (release signature valid).

## Project structure

```text
big-boy-burger-catch/
├── public/assets/{mascot,burger,gravy}.png
├── public/assets/mascot/          # generated layers + expression heads
├── scripts/build-mascot-layers.py # regenerates layers from mascot.png
├── src/components/{Hud,Controls,Overlay}.tsx
├── src/game/{animation,assets,audio,config,engine,layout,logic,render,storage,types}.ts
├── src/game/mascotLayers.generated.ts
├── src/App.tsx
├── src/main.tsx
├── src/styles.css
├── android/                       # offline WebView APK project
│   └── app/
│       ├── build.gradle           # release signing config, version 1.2.0
│       ├── burgercatch-release.keystore
│       └── src/main/{java,res,assets/public}
├── release/                       # downloadable artifacts
│   ├── BigBoyBurgerCatch-v1.2.0.apk
│   └── big-boy-burger-catch-web.zip
├── scripts/{verify-assets,fix-standalone-html,sync-android-assets}.mjs
├── .github/workflows/deploy.yml
├── vite.config.ts                 # GitHub Pages build
├── vite.config.standalone.ts      # offline/file:// build
└── vitest.config.ts
```
