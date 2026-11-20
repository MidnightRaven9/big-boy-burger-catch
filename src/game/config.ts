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
export const INVULN_SECONDS = 1.15;

export const MAX_FALLS = 14;

/**
 * Used only if automated white-plate detection cannot find the plate in the
 * original mascot artwork. Values are fractions of the mascot image.
 */
export const PLATE_FALLBACK: PlateRelative = {
  // Measured from the supplied original mascot PNG: the white plate is held
  // out to the right, around 77% across and 27% down the artwork.
  x: 0.772,
  y: 0.268,
  radiusX: 0.156,
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
