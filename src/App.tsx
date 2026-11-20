import { useCallback, useEffect, useRef, useState } from 'react';
import type { PointerEvent as ReactPointerEvent } from 'react';
import { Controls } from './components/Controls';
import { Hud } from './components/Hud';
import { Overlay } from './components/Overlay';
import { detectPlate, loadImages } from './game/assets';
import { Sfx } from './game/audio';
import { LOGICAL_H, LOGICAL_W, STARTING_LIVES } from './game/config';
import { GameEngine } from './game/engine';
import { computeStageLayout, type StageLayout } from './game/layout';
import { readHighScore, readMuted, writeHighScore, writeMuted } from './game/storage';
import type {
  Direction,
  GameState,
  MascotAnimation,
  MascotExpression,
  Phase,
  UiSnapshot,
} from './game/types';

interface DebugApi {
  engine: GameEngine;
  getState: () => GameState;
  getPlate: () => GameState['plate'];
  getSnapshot: () => UiSnapshot;
  getAnimation: () => ReturnType<GameEngine['debugAnimation']>;
  start: () => void;
  setPlayerX: (x: number) => void;
  setPlayerVelocity: (vx: number) => void;
  setDirection: (direction: Direction, active: boolean) => void;
  setElapsed: (seconds: number) => void;
  setPulse: (kind: 'catch' | 'hit', value: number) => void;
  setAnimation: (anim: MascotAnimation, expression?: MascotExpression) => void;
  spawn: (kind: 'burger' | 'gravy', x: number, y?: number) => number;
  getAudio: () => ReturnType<Sfx['getDebugState']>;
  getLayout: () => StageLayout;
}

declare global {
  interface Window {
    __BBBC__?: DebugApi;
  }
}

const INITIAL_UI: UiSnapshot = {
  phase: 'start',
  score: 0,
  lives: STARTING_LIVES,
  highScore: 0,
  level: 1,
  muted: false,
  catches: 0,
};

export default function App() {
  const [ui, setUi] = useState<UiSnapshot>(INITIAL_UI);
  const [assetStatus, setAssetStatus] = useState<'loading' | 'ready' | 'error'>('loading');
  const [assetError, setAssetError] = useState('');
  const [layout, setLayout] = useState<StageLayout>(() => computeStageLayout(1, 1));
  const layoutRef = useRef(layout);

  const stageRef = useRef<HTMLDivElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const engineRef = useRef<GameEngine | null>(null);
  const sfxRef = useRef<Sfx | null>(null);
  const heldKeyRef = useRef<{ left: boolean; right: boolean }>({ left: false, right: false });

  /** The band plays only while a round is active and sound is on. */
  const syncMusic = useCallback((phase: Phase, muted: boolean) => {
    const sfx = sfxRef.current;
    if (!sfx) return;
    if (phase === 'playing' && !muted) sfx.startMusic();
    else sfx.stopMusic();
  }, []);

  useEffect(() => {
    let cancelled = false;
    let frame = 0;
    const highScore = readHighScore();
    const muted = readMuted();
    const sfx = new Sfx(muted);
    sfxRef.current = sfx;

    loadImages()
      .then((images) => {
        if (cancelled) return;
        const plateRel = detectPlate(images.mascot);
        console.info('[Big Boy Burger Catch] Plate detected in original mascot art:', plateRel);

        const engine = new GameEngine(images, {
          highScore,
          muted,
          plateRel,
          callbacks: {
            onChange: (snapshot) => {
              setUi(snapshot);
              if (snapshot.muted !== sfx.muted) sfx.setMuted(snapshot.muted);
              syncMusic(snapshot.phase, snapshot.muted);
            },
            onCatch: () => sfx.catch(),
            onHit: () => sfx.hit(),
            onGameOver: (_score, finalHighScore) => {
              sfx.gameOver();
              writeHighScore(finalHighScore);
            },
            onHighScore: (score) => writeHighScore(score),
          },
        });
        engineRef.current = engine;
        setUi(engine.getSnapshot());
        setAssetStatus('ready');

        if (import.meta.env.DEV || new URLSearchParams(location.search).has('debug')) {
          window.__BBBC__ = {
            engine,
            getState: () => engine.state,
            getPlate: () => engine.state.plate,
            getSnapshot: () => engine.getSnapshot(),
            getAnimation: () => engine.debugAnimation(),
            start: () => engine.start(),
            setPlayerX: (x: number) => engine.debugSetPlayerX(x),
            setPlayerVelocity: (vx: number) => engine.debugSetPlayerVelocity(vx),
            setDirection: (direction, active) => engine.setDirection(direction, active),
            setElapsed: (seconds: number) => engine.debugSetElapsed(seconds),
            setPulse: (kind, value) => engine.debugSetPulse(kind, value),
            setAnimation: (anim, expression) => engine.debugSetAnimation(anim, expression),
            spawn: (kind, x, y) => engine.debugSpawn(kind, x, y),
            getAudio: () => sfx.getDebugState(),
            getLayout: () => layoutRef.current,
          };
        }

        let last = performance.now();
        const loop = (now: number) => {
          const dt = (now - last) / 1000;
          last = now;
          const current = engineRef.current;
          const canvas = canvasRef.current;
          if (current && canvas) {
            current.update(dt);
            const ctx = canvas.getContext('2d');
            if (ctx) {
              const dpr = Math.min(window.devicePixelRatio || 1, 2);
              ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
              current.draw(ctx);
            }
          }
          frame = requestAnimationFrame(loop);
        };
        frame = requestAnimationFrame(loop);
      })
      .catch((error: unknown) => {
        if (cancelled) return;
        setAssetError(error instanceof Error ? error.message : String(error));
        setAssetStatus('error');
      });

    return () => {
      cancelled = true;
      cancelAnimationFrame(frame);
      engineRef.current = null;
      sfxRef.current?.dispose();
      sfxRef.current = null;
      delete window.__BBBC__;
    };
  }, [syncMusic]);

  useEffect(() => {
    const stage = stageRef.current;
    if (!stage) return;
    const measure = () => {
      const next = computeStageLayout(stage.clientWidth, stage.clientHeight);
      layoutRef.current = next;
      setLayout(next);
    };
    measure();
    if (typeof ResizeObserver !== 'undefined') {
      const observer = new ResizeObserver(measure);
      observer.observe(stage);
      return () => observer.disconnect();
    }
    window.addEventListener('resize', measure);
    return () => window.removeEventListener('resize', measure);
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = Math.round(LOGICAL_W * dpr);
    canvas.height = Math.round(LOGICAL_H * dpr);
    canvas.style.width = `${layout.width}px`;
    canvas.style.height = `${layout.height}px`;
    canvas.style.transform = `translate(${layout.offsetX}px, ${layout.offsetY}px)`;
  }, [layout, assetStatus]);

  const interact = useCallback(() => {
    sfxRef.current?.unlock();
  }, []);

  const setDirection = useCallback((direction: Direction, active: boolean) => {
    engineRef.current?.setDirection(direction, active);
  }, []);

  const play = useCallback(() => {
    interact();
    sfxRef.current?.click();
    engineRef.current?.start();
  }, [interact]);

  const resume = useCallback(() => {
    interact();
    sfxRef.current?.click();
    engineRef.current?.resume();
  }, [interact]);

  const togglePause = useCallback(() => {
    interact();
    engineRef.current?.togglePause();
  }, [interact]);

  const toggleMute = useCallback(() => {
    const engine = engineRef.current;
    if (!engine) return;
    const next = !engine.state.muted;
    engine.setMuted(next);
    writeMuted(next);
    if (!next) {
      interact();
      sfxRef.current?.click();
    }
  }, [interact]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      const engine = engineRef.current;
      if (!engine) return;
      const key = event.key;
      if (key === 'ArrowLeft' || key === 'a' || key === 'A') {
        event.preventDefault();
        heldKeyRef.current.left = true;
        interact();
        engine.setDirection('left', true);
      } else if (key === 'ArrowRight' || key === 'd' || key === 'D') {
        event.preventDefault();
        heldKeyRef.current.right = true;
        interact();
        engine.setDirection('right', true);
      } else if (key === 'Escape' || key === 'p' || key === 'P' || key === ' ') {
        event.preventDefault();
        if (engine.state.phase === 'start' || engine.state.phase === 'gameover') play();
        else togglePause();
      } else if (key === 'Enter') {
        event.preventDefault();
        if (engine.state.phase === 'start' || engine.state.phase === 'gameover') play();
        else if (engine.state.phase === 'paused') resume();
      }
    };
    const onKeyUp = (event: KeyboardEvent) => {
      const engine = engineRef.current;
      if (!engine) return;
      const key = event.key;
      if (key === 'ArrowLeft' || key === 'a' || key === 'A') {
        heldKeyRef.current.left = false;
        engine.setDirection('left', false);
      } else if (key === 'ArrowRight' || key === 'd' || key === 'D') {
        heldKeyRef.current.right = false;
        engine.setDirection('right', false);
      }
    };
    const onBlur = () => {
      heldKeyRef.current = { left: false, right: false };
      engineRef.current?.clearDirections();
    };
    const onVisibility = () => {
      if (document.hidden) {
        heldKeyRef.current = { left: false, right: false };
        engineRef.current?.clearDirections();
        engineRef.current?.pause();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);
    window.addEventListener('blur', onBlur);
    document.addEventListener('visibilitychange', onVisibility);
    return () => {
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
      window.removeEventListener('blur', onBlur);
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, [interact, play, resume, togglePause]);

  const onCanvasPointerDown = (event: ReactPointerEvent<HTMLCanvasElement>) => {
    const engine = engineRef.current;
    if (!engine || engine.state.phase !== 'playing') return;
    event.preventDefault();
    interact();
    const rect = event.currentTarget.getBoundingClientRect();
    const direction: Direction = event.clientX - rect.left < rect.width / 2 ? 'left' : 'right';
    event.currentTarget.setPointerCapture(event.pointerId);
    engine.setDirection(direction, true);
  };

  const releaseCanvasPointer = (event: ReactPointerEvent<HTMLCanvasElement>) => {
    event.preventDefault();
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
    engineRef.current?.clearDirections();
  };

  return (
    <main className="app">
      <Hud
        phase={ui.phase}
        score={ui.score}
        highScore={ui.highScore}
        lives={ui.lives}
        level={ui.level}
        muted={ui.muted}
        onPause={togglePause}
        onResume={resume}
        onMute={toggleMute}
      />

      <div className="stage" ref={stageRef}>
        <canvas
          ref={canvasRef}
          className="game-canvas"
          aria-label="Big Boy Burger Catch playfield"
          onPointerDown={onCanvasPointerDown}
          onPointerUp={releaseCanvasPointer}
          onPointerCancel={releaseCanvasPointer}
          onLostPointerCapture={() => engineRef.current?.clearDirections()}
          onContextMenu={(event) => event.preventDefault()}
        />

        {assetStatus === 'loading' ? (
          <div className="status-screen">
            <div className="status-screen__card">
              <h2>Warming up the grill…</h2>
              <p>Loading the original Big Boy artwork.</p>
            </div>
          </div>
        ) : null}

        {assetStatus === 'error' ? (
          <div className="status-screen">
            <div className="status-screen__card status-screen__card--error">
              <h2>Artwork missing</h2>
              <p>The original game images could not be loaded:</p>
              <code>{assetError}</code>
              <p>Place the original PNGs and the <code>public/assets/mascot/</code> layer frames in place, then reload.</p>
            </div>
          </div>
        ) : null}

        {assetStatus === 'ready' ? (
          <Overlay
            phase={ui.phase}
            score={ui.score}
            highScore={ui.highScore}
            onPlay={play}
            onResume={resume}
          />
        ) : null}
      </div>

      <Controls
        disabled={assetStatus !== 'ready' || ui.phase !== 'playing'}
        onDirection={setDirection}
        onInteract={interact}
      />
    </main>
  );
}
