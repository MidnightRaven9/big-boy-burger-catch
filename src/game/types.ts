export type Phase = 'start' | 'playing' | 'paused' | 'gameover';
export type Direction = 'left' | 'right';
export type FallKind = 'burger' | 'gravy';

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
  playerX: number;
  playerY: number;
  playerW: number;
  playerH: number;
  playerVX: number;
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
  muted: boolean;
  catches: number;
}

export interface GameImages {
  mascot: HTMLImageElement;
  burger: HTMLImageElement;
  gravy: HTMLImageElement;
}

export interface EngineCallbacks {
  onChange: (snapshot: UiSnapshot) => void;
  onCatch: () => void;
  onHit: () => void;
  onGameOver: (score: number, highScore: number) => void;
  onHighScore: (score: number) => void;
}
