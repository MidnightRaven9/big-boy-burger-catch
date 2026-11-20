import type {
  MascotExpression,
  MascotLayerName,
} from './mascotLayers.generated';

export type { MascotExpression, MascotLayerName } from './mascotLayers.generated';

export type Phase = 'start' | 'playing' | 'paused' | 'gameover';
export type Direction = 'left' | 'right';
export type Facing = Direction;
export type FallKind = 'burger' | 'gravy';

/**
 * The renderer is driven by these explicit sprite states. Walking is built
 * from independently transformed leg/arm/head layers, not by wobbling one
 * flattened mascot image.
 */
export type MascotAnimation =
  | 'idle'
  | 'walk-left'
  | 'walk-right'
  | 'catch'
  | 'hit'
  | 'game-over';

export type Rng = () => number;

/** Plate position/size as fractions of the mascot image (x/y from top-left). */
export interface PlateRelative {
  x: number;
  y: number;
  /** Radius as a fraction of the mascot image width. */
  radiusX: number;
  detected: boolean;
}

export interface PlateAbsolute {
  x: number;
  y: number;
  radius: number;
}

export interface Falling {
  id: number;
  kind: FallKind;
  x: number;
  y: number;
  radius: number;
  speed: number;
  rotation: number;
  spin: number;
  sway: number;
  swayPhase: number;
}

export interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  size: number;
  color: string;
  gravity: number;
}

export interface FloatingText {
  x: number;
  y: number;
  text: string;
  life: number;
  maxLife: number;
  color: string;
}

export interface GameState {
  phase: Phase;
  score: number;
  lives: number;
  highScore: number;
  elapsed: number;
  level: number;
  speedUpTimer: number;
  playerX: number;
  playerY: number;
  playerW: number;
  playerH: number;
  playerVX: number;
  facing: Facing;
  anim: MascotAnimation;
  animTime: number;
  expression: MascotExpression;
  blinkTimer: number;
  blinkActive: number;
  plate: PlateAbsolute;
  falls: Falling[];
  particles: Particle[];
  texts: FloatingText[];
  spawnTimer: number;
  shake: number;
  flash: number;
  invuln: number;
  catchPulse: number;
  hitPulse: number;
  muted: boolean;
  catches: number;
  nextId: number;
}

export interface UiSnapshot {
  phase: Phase;
  score: number;
  lives: number;
  highScore: number;
  level: number;
  muted: boolean;
  catches: number;
}

export interface GameImages {
  /** Original flat artwork, kept for plate detection and reference. */
  mascot: HTMLImageElement;
  burger: HTMLImageElement;
  gravy: HTMLImageElement;
  /** Independently animatable crops of the ORIGINAL mascot artwork. */
  layers: Record<MascotLayerName, HTMLImageElement>;
  expressions: Record<MascotExpression, HTMLImageElement>;
}

export interface EngineCallbacks {
  onChange: (snapshot: UiSnapshot) => void;
  onCatch: () => void;
  onHit: () => void;
  onGameOver: (score: number, highScore: number) => void;
  onHighScore: (score: number) => void;
}
