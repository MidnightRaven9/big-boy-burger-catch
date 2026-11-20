import { MASCOT_PLATE } from './mascotLayers.generated';
import type { PlateRelative } from './types';

/** Fixed portrait playfield; the canvas is scaled to fit any screen. */
export const LOGICAL_W = 720;
export const LOGICAL_H = 1280;

export const STARTING_LIVES = 3;
export const POINTS_PER_BURGER = 10;

export const PLAYER_DRAW_HEIGHT = 372;
export const PLAYER_BOTTOM_MARGIN = 158;
export const MOVE_SPEED = 640;
export const PLAYER_ACCEL = 4200;
export const PLAYER_DECEL = 3200;

export const BURGER_RADIUS = 42;
export const GRAVY_RADIUS = 48;

/** Damage protection is exactly 0.8 seconds per gravy hit. */
export const INVULN_SECONDS = 0.8;

/** Reaction timing for the articulated expressions. */
export const CATCH_ANIM_SECONDS = 0.5;
export const HIT_ANIM_SECONDS = 0.7;
export const SPEED_UP_SECONDS = 1.35;

/** A blink every few seconds; timing pauses with the game. */
export const BLINK_MIN_GAP = 2.6;
export const BLINK_MAX_GAP = 5.2;
export const BLINK_SECONDS = 0.12;

/** Spawn rules requested for the upgraded difficulty curve. */
export const MAX_FALLS = 3;
export const MAX_BURGERS = 2;
export const GRAVY_CHANCE = 0.25;
export const SPAWN_MIN_GAP = 46;
export const SPAWN_ATTEMPTS = 18;

/**
 * Exact progressive difficulty table. `elapsed` is measured in seconds and
 * only advances while the game is playing. The final tier is the speed cap.
 */
export const DIFFICULTY_STAGES = [
  { level: 1, start: 0, end: 15, fallSpeed: 140, spawnEvery: 1.4 },
  { level: 2, start: 15, end: 30, fallSpeed: 175, spawnEvery: 1.3 },
  { level: 3, start: 30, end: 45, fallSpeed: 215, spawnEvery: 1.2 },
  { level: 4, start: 45, end: 60, fallSpeed: 260, spawnEvery: 1.1 },
  { level: 5, start: 60, end: 90, fallSpeed: 310, spawnEvery: 1.0 },
  { level: 6, start: 90, end: Number.POSITIVE_INFINITY, fallSpeed: 360, spawnEvery: 0.9 },
] as const;

export type DifficultyStage = (typeof DIFFICULTY_STAGES)[number];
export const HIGHEST_LEVEL = DIFFICULTY_STAGES.length;

/**
 * Fallback only if plate detection fails. These values are measured directly
 * from the original mascot artwork and match the generated layer metadata.
 */
export const PLATE_FALLBACK: PlateRelative = {
  ...MASCOT_PLATE,
  detected: false,
};

/**
 * Optional manual override, e.g. { x: 0.52, y: 0.71, radiusX: 0.14, detected: true }.
 * Leave as null to use the detected plate position.
 */
export const PLATE_OVERRIDE: PlateRelative | null = null;

export const HIGH_SCORE_KEY = 'bbbc.highScore.v1';
export const MUTED_KEY = 'bbbc.muted.v1';

export const COLORS = {
  red: '#C8102E',
  redDark: '#8E0B20',
  cream: '#FFF6E5',
  creamDark: '#F3E2C2',
  yellow: '#FFC72C',
  brown: '#4A2C1A',
  white: '#FFFFFF',
};
