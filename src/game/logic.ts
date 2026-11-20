import {
  BURGER_RADIUS,
  DIFFICULTY_STAGES,
  GRAVY_CHANCE,
  GRAVY_RADIUS,
  LOGICAL_W,
  MAX_BURGERS,
  MAX_FALLS,
  SPAWN_ATTEMPTS,
  SPAWN_MIN_GAP,
  STARTING_LIVES,
} from './config';
import type { FallKind, Falling, PlateAbsolute, Rng } from './types';

export interface Difficulty {
  level: number;
  spawnEvery: number;
  fallSpeed: number;
  gravyChance: number;
}

/** Exact six-tier table; elapsed is in seconds. */
export function difficultyAt(elapsed: number): Difficulty {
  const safe = Number.isFinite(elapsed) ? Math.max(0, elapsed) : 0;
  const stage =
    DIFFICULTY_STAGES.find((entry) => safe >= entry.start && safe < entry.end) ??
    DIFFICULTY_STAGES[DIFFICULTY_STAGES.length - 1];
  return {
    level: stage.level,
    spawnEvery: stage.spawnEvery,
    fallSpeed: stage.fallSpeed,
    gravyChance: GRAVY_CHANCE,
  };
}

export function createFall(
  id: number,
  kind: FallKind,
  x: number,
  speed: number,
  rng: Rng = Math.random,
): Falling {
  const radius = kind === 'burger' ? BURGER_RADIUS : GRAVY_RADIUS;
  return {
    id,
    kind,
    x,
    y: -radius - 18,
    radius,
    speed,
    rotation: (rng() - 0.5) * 0.5,
    spin: (rng() - 0.5) * (kind === 'burger' ? 2.2 : 1.1),
    sway: 12 + rng() * 20,
    swayPhase: rng() * Math.PI * 2,
  };
}

/**
 * One object per spawn event. The function refuses to spawn at the global cap,
 * when two burgers are already falling, or when no non-overlapping horizontal
 * slot can be found at the top of the playfield.
 */
export function spawnFall(
  id: number,
  difficulty: Difficulty,
  rng: Rng = Math.random,
  falls: Falling[] = [],
): Falling | null {
  if (falls.length >= MAX_FALLS) return null;

  const burgerCount = falls.reduce((count, fall) => count + (fall.kind === 'burger' ? 1 : 0), 0);
  let kind: FallKind = rng() < difficulty.gravyChance ? 'gravy' : 'burger';
  if (kind === 'burger' && burgerCount >= MAX_BURGERS) kind = 'gravy';

  const radius = kind === 'burger' ? BURGER_RADIUS : GRAVY_RADIUS;
  const margin = radius + 28;
  const usableWidth = Math.max(1, LOGICAL_W - margin * 2);
  const spawnY = -radius - 18;

  for (let attempt = 0; attempt < SPAWN_ATTEMPTS; attempt += 1) {
    const x = margin + rng() * usableWidth;
    const candidate = createFall(id, kind, x, difficulty.fallSpeed, rng);
    candidate.y = spawnY;
    if (hasSpawnSpacing(candidate, falls)) return candidate;
  }
  return null;
}

/** Keep newly spawned art clear of anything already near the top. */
export function hasSpawnSpacing(candidate: Falling, falls: Falling[]): boolean {
  for (const other of falls) {
    const minDistance = candidate.radius + other.radius + SPAWN_MIN_GAP;
    const dx = candidate.x - other.x;
    const dy = candidate.y - other.y;
    if (dx * dx + dy * dy < minDistance * minDistance) return false;
  }
  return true;
}

export function circlesOverlap(
  a: { x: number; y: number; radius: number },
  b: { x: number; y: number; radius: number },
): boolean {
  const dx = a.x - b.x;
  const dy = a.y - b.y;
  const r = a.radius + b.radius;
  return dx * dx + dy * dy <= r * r;
}

/**
 * Burgers score only when they visibly touch the actual white plate. The
 * contact area is a shallow ellipse across the plate, so a burger hitting the
 * head, torso, or empty air never scores.
 */
export function burgerOnPlate(fall: Falling, plate: PlateAbsolute): boolean {
  const dx = Math.abs(fall.x - plate.x);
  const dy = fall.y - plate.y;
  const contactX = plate.radius + fall.radius * 0.28;
  const contactY = Math.max(10, plate.radius * 0.34) + fall.radius * 0.5;
  if (dx > contactX || dy < -contactY || dy > contactY) return false;
  return (dx / contactX) ** 2 + (dy / contactY) ** 2 <= 1;
}

/** Gravy hits the mascot's body; a small inset keeps near-misses fair. */
export function gravyHitsPlayer(
  fall: Falling,
  player: { x: number; y: number; width: number; height: number },
): boolean {
  const insetX = player.width * 0.12;
  const insetY = player.height * 0.08;
  const left = player.x - player.width / 2 + insetX;
  const right = player.x + player.width / 2 - insetX;
  const top = player.y + insetY;
  const bottom = player.y + player.height - insetY;
  const nearestX = Math.max(left, Math.min(fall.x, right));
  const nearestY = Math.max(top, Math.min(fall.y, bottom));
  const dx = fall.x - nearestX;
  const dy = fall.y - nearestY;
  const r = fall.radius * 0.72;
  return dx * dx + dy * dy <= r * r;
}

export function awardBurger(score: number, points = 10): number {
  return score + points;
}

export function loseLife(lives: number): number {
  return Math.max(0, lives - 1);
}

export function isGameOver(lives: number): boolean {
  return lives <= 0;
}

export function initialLives(): number {
  return STARTING_LIVES;
}

export function directionValue(left: boolean, right: boolean): number {
  return (right ? 1 : 0) - (left ? 1 : 0);
}

export function approach(current: number, target: number, maxDelta: number): number {
  if (current < target) return Math.min(current + maxDelta, target);
  if (current > target) return Math.max(current - maxDelta, target);
  return current;
}

export function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}
