import {
  BURGER_RADIUS,
  GRAVY_RADIUS,
  LOGICAL_W,
  MAX_FALLS,
  STARTING_LIVES,
} from './config';
import type { FallKind, Falling, PlateAbsolute, Rng } from './types';

export interface Difficulty {
  level: number;
  spawnEvery: number;
  fallSpeed: number;
  gravyChance: number;
}

/** Gentle ramp: a new level every 18 seconds, capped so the game stays fair. */
export function difficultyAt(elapsed: number): Difficulty {
  const level = Math.max(0, Math.floor(elapsed / 18));
  return {
    level,
    spawnEvery: Math.max(0.36, 0.98 - level * 0.075),
    fallSpeed: Math.min(560, 205 + level * 32),
    gravyChance: Math.min(0.44, 0.18 + level * 0.026),
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

/** Pick a kind and horizontal position, keeping falling art inside the playfield. */
export function spawnFall(
  id: number,
  difficulty: Difficulty,
  rng: Rng = Math.random,
  fallsCount = 0,
): Falling | null {
  if (fallsCount >= MAX_FALLS) return null;
  const kind: FallKind = rng() < difficulty.gravyChance ? 'gravy' : 'burger';
  const radius = kind === 'burger' ? BURGER_RADIUS : GRAVY_RADIUS;
  const margin = radius + 28;
  const x = margin + rng() * Math.max(1, LOGICAL_W - margin * 2);
  const speed = difficulty.fallSpeed * (0.9 + rng() * 0.25);
  return createFall(id, kind, x, speed, rng);
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

/** A burger is caught only when it reaches the white plate on the mascot. */
export function burgerOnPlate(fall: Falling, plate: PlateAbsolute): boolean {
  return circlesOverlap(
    { x: fall.x, y: fall.y, radius: fall.radius * 0.62 },
    { x: plate.x, y: plate.y, radius: plate.radius },
  );
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
