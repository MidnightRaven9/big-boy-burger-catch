import {
  advanceAnimation,
  mascotPoseFor,
  platePosition,
  resetAnimationState,
} from './animation';
import { mascotDrawSize } from './assets';
import {
  CATCH_ANIM_SECONDS,
  HIT_ANIM_SECONDS,
  INVULN_SECONDS,
  LOGICAL_H,
  LOGICAL_W,
  MOVE_SPEED,
  PLATE_FALLBACK,
  PLAYER_ACCEL,
  PLAYER_BOTTOM_MARGIN,
  PLAYER_DECEL,
  POINTS_PER_BURGER,
  SPEED_UP_SECONDS,
  STARTING_LIVES,
} from './config';
import {
  approach,
  awardBurger,
  burgerOnPlate,
  clamp,
  createFall,
  difficultyAt,
  directionValue,
  gravyHitsPlayer,
  isGameOver,
  loseLife,
  spawnFall,
} from './logic';
import { renderGame } from './render';
import type {
  EngineCallbacks,
  FallKind,
  Facing,
  GameImages,
  GameState,
  MascotAnimation,
  MascotExpression,
  PlateAbsolute,
  PlateRelative,
  Rng,
  UiSnapshot,
} from './types';

interface EngineOptions {
  callbacks?: Partial<EngineCallbacks>;
  highScore?: number;
  muted?: boolean;
  rng?: Rng;
  plateRel?: PlateRelative;
}

const noop = () => undefined;

export class GameEngine {
  readonly images: GameImages;
  readonly plateRel: PlateRelative;
  readonly state: GameState;
  readonly input = { left: false, right: false };

  private readonly callbacks: EngineCallbacks;
  private readonly rng: Rng;
  private lastSnapshot: UiSnapshot;

  constructor(images: GameImages, options: EngineOptions = {}) {
    this.images = images;
    this.plateRel = options.plateRel ?? PLATE_FALLBACK;
    this.rng = options.rng ?? Math.random;
    this.callbacks = {
      onChange: options.callbacks?.onChange ?? noop,
      onCatch: options.callbacks?.onCatch ?? noop,
      onHit: options.callbacks?.onHit ?? noop,
      onGameOver: options.callbacks?.onGameOver ?? noop,
      onHighScore: options.callbacks?.onHighScore ?? noop,
    };

    const size = mascotDrawSize(images.mascot);
    const playerX = LOGICAL_W / 2;
    const playerY = LOGICAL_H - PLAYER_BOTTOM_MARGIN - size.height;
    const plate: PlateAbsolute = {
      x: playerX - size.width / 2 + this.plateRel.x * size.width,
      y: playerY + this.plateRel.y * size.height,
      radius: this.plateRel.radiusX * size.width,
    };

    this.state = {
      phase: 'start',
      score: 0,
      lives: STARTING_LIVES,
      highScore: options.highScore ?? 0,
      elapsed: 0,
      level: 1,
      speedUpTimer: 0,
      playerX,
      playerY,
      playerW: size.width,
      playerH: size.height,
      playerVX: 0,
      facing: 'right',
      anim: 'idle',
      animTime: 0,
      expression: 'normal',
      blinkTimer: 3,
      blinkActive: 0,
      plate,
      falls: [],
      particles: [],
      texts: [],
      spawnTimer: 0.7,
      shake: 0,
      flash: 0,
      invuln: 0,
      catchPulse: 0,
      hitPulse: 0,
      muted: options.muted ?? false,
      catches: 0,
      nextId: 1,
    };
    resetAnimationState(this.state);
    this.updatePlate();
    this.lastSnapshot = this.getSnapshot();
  }

  start(): void {
    const s = this.state;
    s.score = 0;
    s.lives = STARTING_LIVES;
    s.elapsed = 0;
    s.level = 1;
    s.speedUpTimer = 0;
    s.playerX = LOGICAL_W / 2;
    s.playerVX = 0;
    s.falls = [];
    s.particles = [];
    s.texts = [];
    s.spawnTimer = 0.7;
    s.shake = 0;
    s.flash = 0;
    s.invuln = 0;
    s.catchPulse = 0;
    s.hitPulse = 0;
    s.catches = 0;
    s.nextId = 1;
    this.input.left = false;
    this.input.right = false;
    resetAnimationState(s);
    this.updatePlate();
    s.phase = 'playing';
    this.emit(true);
  }

  pause(): void {
    if (this.state.phase !== 'playing') return;
    this.state.phase = 'paused';
    this.input.left = false;
    this.input.right = false;
    this.emit(true);
  }

  resume(): void {
    if (this.state.phase !== 'paused') return;
    this.state.phase = 'playing';
    this.emit(true);
  }

  togglePause(): void {
    if (this.state.phase === 'playing') this.pause();
    else if (this.state.phase === 'paused') this.resume();
  }

  setDirection(direction: 'left' | 'right', active: boolean): void {
    // The most recently pressed direction wins, so a flip is immediate even
    // if the previous control has not been released yet.
    if (active) this.input[direction === 'left' ? 'right' : 'left'] = false;
    this.input[direction] = active;
  }

  clearDirections(): void {
    this.input.left = false;
    this.input.right = false;
  }

  setMuted(muted: boolean): void {
    this.state.muted = muted;
    this.emit(true);
  }

  update(dt: number): void {
    const s = this.state;
    if (s.phase !== 'playing') return;
    const step = clamp(dt, 0, 0.05);
    s.elapsed += step;

    // --- player movement (smooth, but responsive) ---
    const direction = directionValue(this.input.left, this.input.right) as -1 | 0 | 1;
    const target = direction * MOVE_SPEED;
    const accel = direction === 0 ? PLAYER_DECEL : PLAYER_ACCEL;
    s.playerVX = approach(s.playerVX, target, accel * step);
    s.playerX = clamp(
      s.playerX + s.playerVX * step,
      s.playerW / 2 + 10,
      LOGICAL_W - s.playerW / 2 - 10,
    );

    // --- articulated animation + mirrored plate hitbox ---
    advanceAnimation(s, step, direction);
    this.updatePlate();

    // --- difficulty / SPEED UP! ---
    const difficulty = difficultyAt(s.elapsed);
    if (difficulty.level > s.level) {
      s.level = difficulty.level;
      s.speedUpTimer = SPEED_UP_SECONDS;
    }

    // --- spawning: one item per event, with caps and spacing ---
    s.spawnTimer -= step;
    if (s.spawnTimer <= 0) {
      const fall = spawnFall(s.nextId, difficulty, this.rng, s.falls);
      if (fall) {
        s.falls.push(fall);
        s.nextId += 1;
        s.spawnTimer = difficulty.spawnEvery;
      } else {
        // At a limit: do not spawn, and retry shortly.
        s.spawnTimer = 0.12;
      }
    }

    // --- falling objects, collisions ---
    for (let i = s.falls.length - 1; i >= 0; i -= 1) {
      const fall = s.falls[i];
      if (!fall) break;
      fall.y += fall.speed * step;
      fall.x += Math.sin(s.elapsed * 1.7 + fall.swayPhase) * fall.sway * step;
      fall.rotation += fall.spin * step;
      if (fall.x < fall.radius) {
        fall.x = fall.radius;
        fall.spin = Math.abs(fall.spin);
      } else if (fall.x > LOGICAL_W - fall.radius) {
        fall.x = LOGICAL_W - fall.radius;
        fall.spin = -Math.abs(fall.spin);
      }

      let consumed = false;
      if (fall.y - fall.radius > LOGICAL_H + 70) {
        consumed = true;
      } else if (fall.kind === 'burger' && burgerOnPlate(fall, s.plate)) {
        this.catchBurger(fall);
        consumed = true;
      } else if (
        fall.kind === 'gravy' &&
        s.invuln <= 0 &&
        gravyHitsPlayer(fall, {
          x: s.playerX,
          y: s.playerY,
          width: s.playerW,
          height: s.playerH,
        })
      ) {
        this.hitGravy(fall);
        consumed = true;
      }
      if (consumed) s.falls.splice(i, 1);
      if (s.lives <= 0) break;
    }

    // --- timers and effects ---
    s.invuln = Math.max(0, s.invuln - step);
    s.shake = Math.max(0, s.shake - step * 26);
    s.flash = Math.max(0, s.flash - step * 2.4);
    s.catchPulse = Math.max(0, s.catchPulse - step / CATCH_ANIM_SECONDS);
    s.hitPulse = Math.max(0, s.hitPulse - step / HIT_ANIM_SECONDS);
    s.speedUpTimer = Math.max(0, s.speedUpTimer - step);

    for (let i = s.particles.length - 1; i >= 0; i -= 1) {
      const p = s.particles[i];
      p.life -= step;
      p.vy += p.gravity * step;
      p.x += p.vx * step;
      p.y += p.vy * step;
      if (p.life <= 0) s.particles.splice(i, 1);
    }
    for (let i = s.texts.length - 1; i >= 0; i -= 1) {
      const t = s.texts[i];
      t.life -= step;
      t.y -= 54 * step;
      if (t.life <= 0) s.texts.splice(i, 1);
    }

    if (s.score > s.highScore) {
      s.highScore = s.score;
      this.callbacks.onHighScore(s.highScore);
    }
    this.emit();
  }

  draw(ctx: CanvasRenderingContext2D): void {
    renderGame(ctx, this.state, this.images);
  }

  getSnapshot(): UiSnapshot {
    const s = this.state;
    return {
      phase: s.phase,
      score: s.score,
      lives: s.lives,
      highScore: s.highScore,
      level: s.level,
      muted: s.muted,
      catches: s.catches,
    };
  }

  /** Debug/testing helper: force the mascot to an exact horizontal position. */
  debugSetPlayerX(x: number): void {
    this.state.playerX = clamp(x, this.state.playerW / 2, LOGICAL_W - this.state.playerW / 2);
    this.state.playerVX = 0;
    this.updatePlate();
  }

  /** Debug/testing helper: force a horizontal velocity for animation checks. */
  debugSetPlayerVelocity(vx: number): void {
    this.state.playerVX = vx;
    advanceAnimation(this.state, 0, 0);
    this.updatePlate();
  }

  /** Debug/testing helper: jump to a difficulty tier without waiting. */
  debugSetElapsed(seconds: number): void {
    this.state.elapsed = Math.max(0, seconds);
    this.state.level = difficultyAt(this.state.elapsed).level;
    this.emit(true);
  }

  /** Debug/testing helper: hold a pulse to inspect an expression. */
  debugSetPulse(kind: 'catch' | 'hit', value: number): void {
    const amount = clamp(value, 0, 1);
    this.state.catchPulse = kind === 'catch' ? amount : 0;
    this.state.hitPulse = kind === 'hit' ? amount : 0;
    advanceAnimation(this.state, 0, 0);
    this.updatePlate();
  }

  /** Debug/testing helper: force an explicit animation for rendering checks. */
  debugSetAnimation(anim: MascotAnimation, expression?: MascotExpression): void {
    this.state.anim = anim;
    this.state.animTime = 0;
    if (expression) this.state.expression = expression;
    this.updatePlate();
  }

  /** Debug/testing helper: expose the exact pose driving the canvas. */
  debugAnimation(): {
    anim: MascotAnimation;
    expression: MascotExpression;
    facing: Facing;
    pose: ReturnType<typeof mascotPoseFor>;
  } {
    const s = this.state;
    return {
      anim: s.anim,
      expression: s.expression,
      facing: s.facing,
      pose: mascotPoseFor(s),
    };
  }

  /** Debug/testing helper: spawn a specific object at an exact position. */
  debugSpawn(kind: FallKind, x: number, y = 0): number {
    const id = this.state.nextId++;
    const fall = createFall(id, kind, x, 250, this.rng);
    fall.y = y;
    fall.sway = 0;
    fall.spin = 0;
    this.state.falls.push(fall);
    return id;
  }

  private updatePlate(): void {
    this.state.plate = platePosition(this.state, this.plateRel);
  }

  private catchBurger(fall: { x: number; y: number }): void {
    const s = this.state;
    s.score = awardBurger(s.score, POINTS_PER_BURGER);
    s.catches += 1;
    s.catchPulse = 1;
    this.burst(fall.x, fall.y, ['#FFC72C', '#FFF1B8', '#C8102E', '#FFFFFF'], 16, 250);
    s.texts.push({
      x: s.plate.x,
      y: s.plate.y - 70,
      text: `+${POINTS_PER_BURGER}`,
      life: 0.85,
      maxLife: 0.85,
      color: '#FFD54A',
    });
    this.callbacks.onCatch();
  }

  private hitGravy(fall: { x: number; y: number }): void {
    const s = this.state;
    s.lives = loseLife(s.lives);
    s.invuln = INVULN_SECONDS;
    s.shake = 16;
    s.flash = 1;
    s.hitPulse = 1;
    this.burst(fall.x, fall.y, ['#7B4A24', '#5B3218', '#A66A33'], 22, 190);
    s.texts.push({
      x: s.playerX,
      y: s.playerY - 20,
      text: '-1 HEART',
      life: 0.95,
      maxLife: 0.95,
      color: '#FF6B6B',
    });
    this.callbacks.onHit();

    if (isGameOver(s.lives)) {
      s.phase = 'gameover';
      s.invuln = 0;
      s.falls = [];
      s.anim = 'game-over';
      s.animTime = 0;
      s.expression = 'sad';
      s.highScore = Math.max(s.highScore, s.score);
      this.clearDirections();
      this.callbacks.onGameOver(s.score, s.highScore);
      this.emit(true);
    }
  }

  private burst(x: number, y: number, colors: string[], count: number, power: number): void {
    const s = this.state;
    for (let i = 0; i < count; i += 1) {
      const angle = this.rng() * Math.PI * 2;
      const speed = power * (0.35 + this.rng() * 0.85);
      s.particles.push({
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - 70,
        life: 0.45 + this.rng() * 0.5,
        maxLife: 0.95,
        size: 4 + this.rng() * 9,
        color: colors[Math.floor(this.rng() * colors.length)] ?? '#FFFFFF',
        gravity: 620,
      });
    }
  }

  private emit(force = false): void {
    const next = this.getSnapshot();
    const prev = this.lastSnapshot;
    if (
      force ||
      next.phase !== prev.phase ||
      next.score !== prev.score ||
      next.lives !== prev.lives ||
      next.highScore !== prev.highScore ||
      next.level !== prev.level ||
      next.muted !== prev.muted ||
      next.catches !== prev.catches
    ) {
      this.lastSnapshot = next;
      this.callbacks.onChange(next);
    }
  }
}
