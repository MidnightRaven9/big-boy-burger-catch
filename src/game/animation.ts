import {
  BLINK_MAX_GAP,
  BLINK_MIN_GAP,
  BLINK_SECONDS,
  MOVE_SPEED,
} from './config';
import { clamp } from './logic';
import type {
  Direction,
  Facing,
  GameState,
  MascotAnimation,
  MascotExpression,
  PlateAbsolute,
  PlateRelative,
} from './types';

/** Minimum horizontal speed that still counts as a walk cycle. */
const WALK_SPEED_THRESHOLD = 14;

export interface MascotPose {
  /** Radians, applied around each leg's hip pivot. */
  legFrontAngle: number;
  legBackAngle: number;
  /** Radians, applied around the free arm's shoulder pivot. */
  armLeftAngle: number;
  /** Radians; the plate arm is deliberately never rotated. */
  headAngle: number;
  /** Local pixel offsets before LEFT/RIGHT mirroring. */
  bodyX: number;
  bodyY: number;
  /** Extra head-only offset for the game-over slump. */
  headY: number;
}

/** Reset all expression/animation state for a fresh run. */
export function resetAnimationState(state: GameState): void {
  state.facing = 'right';
  state.anim = 'idle';
  state.animTime = 0;
  state.expression = 'normal';
  state.blinkTimer = BLINK_MIN_GAP + (BLINK_MAX_GAP - BLINK_MIN_GAP) * 0.35;
  state.blinkActive = 0;
}

/**
 * Advance the small state machine. Reaction animations take priority over
 * walking; expressions remain independent so a catch while moving still shows
 * the wide-eyed happy face and the leg cycle continues underneath.
 */
export function advanceAnimation(
  state: GameState,
  dt: number,
  inputDirection: -1 | 0 | 1,
): void {
  if (inputDirection !== 0) {
    state.facing = inputDirection > 0 ? 'right' : 'left';
  }

  if (state.phase === 'playing') {
    if (state.blinkActive > 0) {
      state.blinkActive = Math.max(0, state.blinkActive - dt);
    } else {
      state.blinkTimer -= dt;
      if (state.blinkTimer <= 0) {
        state.blinkActive = BLINK_SECONDS;
        const fraction = ((state.elapsed * 0.6180339887) % 1 + 1) % 1;
        state.blinkTimer = BLINK_MIN_GAP + fraction * (BLINK_MAX_GAP - BLINK_MIN_GAP);
      }
    }
  }

  const next = chooseMascotAnimation(state);
  if (next !== state.anim) {
    state.anim = next;
    state.animTime = 0;
  } else {
    state.animTime += dt;
  }
  state.expression = chooseMascotExpression(state);
}

export function chooseMascotAnimation(state: GameState): MascotAnimation {
  if (state.phase === 'gameover' || state.lives <= 0) return 'game-over';
  if (state.hitPulse > 0) return 'hit';
  if (state.catchPulse > 0) return 'catch';
  if (Math.abs(state.playerVX) > WALK_SPEED_THRESHOLD) {
    return state.facing === 'left' ? 'walk-left' : 'walk-right';
  }
  return 'idle';
}

export function chooseMascotExpression(state: GameState): MascotExpression {
  if (state.phase === 'gameover' || state.lives <= 0) return 'sad';
  if (state.hitPulse > 0) return 'shock';
  if (state.catchPulse > 0) return 'happy';
  if (state.blinkActive > 0 && state.phase === 'playing') return 'blink';
  return 'normal';
}

export function movementRatio(state: GameState): number {
  return clamp(Math.abs(state.playerVX) / MOVE_SPEED, 0, 1);
}

/** Walking frequency and stride grow with actual movement speed. */
export function walkFrequency(state: GameState): number {
  return 7.2 + movementRatio(state) * 5.8;
}

export function walkAmplitude(state: GameState): number {
  return 0.1 + movementRatio(state) * 0.3;
}

/** Pure pose calculation shared by renderer and plate hitbox. */
export function mascotPoseFor(state: GameState): MascotPose {
  const t = state.animTime;
  const speed = movementRatio(state);
  const pose: MascotPose = {
    legFrontAngle: 0,
    legBackAngle: 0,
    armLeftAngle: 0,
    headAngle: 0,
    bodyX: 0,
    bodyY: 0,
    headY: 0,
  };

  switch (state.anim) {
    case 'walk-left':
    case 'walk-right': {
      const cycle = t * walkFrequency(state);
      const amplitude = walkAmplitude(state);
      const swing = Math.sin(cycle);
      pose.legFrontAngle = swing * amplitude;
      pose.legBackAngle = -swing * amplitude;
      pose.armLeftAngle = -swing * (0.05 + speed * 0.1);
      pose.bodyY = -Math.abs(Math.sin(cycle)) * (1.5 + speed * 5.5);
      pose.headAngle = swing * 0.015 * speed;
      break;
    }
    case 'catch': {
      const progress = clamp(1 - state.catchPulse, 0, 1);
      const pop = Math.sin(progress * Math.PI);
      pose.bodyY = -pop * (5 + speed * 2);
      pose.headAngle = Math.sin(progress * Math.PI * 2) * 0.05;
      pose.armLeftAngle = -pop * 0.08;
      pose.legFrontAngle = pop * 0.05;
      pose.legBackAngle = -pop * 0.05;
      break;
    }
    case 'hit': {
      const progress = clamp(1 - state.hitPulse, 0, 1);
      const recoil = Math.sin(progress * Math.PI);
      pose.bodyX = -recoil * 10;
      pose.bodyY = Math.sin(progress * Math.PI * 3) * 2 * (1 - progress);
      pose.headAngle = Math.sin(progress * Math.PI * 4) * 0.09 * (1 - progress);
      pose.armLeftAngle = recoil * 0.06;
      break;
    }
    case 'game-over': {
      pose.bodyY = 4;
      pose.headY = 9;
      pose.headAngle = -0.09;
      pose.legFrontAngle = 0.04;
      pose.legBackAngle = -0.04;
      pose.armLeftAngle = 0.04;
      break;
    }
    case 'idle':
    default: {
      pose.bodyY = Math.sin(t * 2.1) * 0.8;
      pose.armLeftAngle = Math.sin(t * 1.4) * 0.012;
      pose.headAngle = Math.sin(t * 1.1) * 0.008;
      break;
    }
  }
  return pose;
}

/**
 * Compute the plate hitbox from the SAME pose the renderer uses, including
 * the LEFT/RIGHT mirror. This keeps scoring glued to the visible white plate.
 */
export function platePosition(state: GameState, plateRel: PlateRelative): PlateAbsolute {
  const pose = mascotPoseFor(state);
  const localX = plateRel.x * state.playerW;
  const mirroredX = state.facing === 'left' ? state.playerW - localX : localX;
  const mirroredBodyX = state.facing === 'left' ? -pose.bodyX : pose.bodyX;
  return {
    x: state.playerX - state.playerW / 2 + mirroredBodyX + mirroredX,
    y: state.playerY + pose.bodyY + plateRel.y * state.playerH,
    radius: plateRel.radiusX * state.playerW,
  };
}

export function facingFromDirection(direction: Direction): Facing {
  return direction;
}
