import { describe, expect, it } from 'vitest';
import {
  advanceAnimation,
  chooseMascotAnimation,
  chooseMascotExpression,
  mascotPoseFor,
  platePosition,
  walkAmplitude,
  walkFrequency,
} from './animation';
import type { GameState, PlateRelative } from './types';

function makeState(overrides: Partial<GameState> = {}): GameState {
  return {
    phase: 'playing',
    score: 0,
    lives: 3,
    highScore: 0,
    elapsed: 0,
    level: 1,
    speedUpTimer: 0,
    playerX: 360,
    playerY: 750,
    playerW: 279,
    playerH: 372,
    playerVX: 0,
    facing: 'right',
    anim: 'idle',
    animTime: 0,
    expression: 'normal',
    blinkTimer: 3,
    blinkActive: 0,
    plate: { x: 440, y: 850, radius: 49 },
    falls: [],
    particles: [],
    texts: [],
    spawnTimer: 1,
    shake: 0,
    flash: 0,
    invuln: 0,
    catchPulse: 0,
    hitPulse: 0,
    muted: false,
    catches: 0,
    nextId: 1,
    ...overrides,
  };
}

const plateRel: PlateRelative = { x: 0.7675, y: 0.2762, radiusX: 0.176, detected: true };

describe('mascot animation state machine', () => {
  it('exposes exactly the requested animation states', () => {
    expect(
      chooseMascotAnimation(makeState({ playerVX: 400, facing: 'left' })),
    ).toBe('walk-left');
    expect(
      chooseMascotAnimation(makeState({ playerVX: 400, facing: 'right' })),
    ).toBe('walk-right');
    expect(chooseMascotAnimation(makeState())).toBe('idle');
    expect(chooseMascotAnimation(makeState({ catchPulse: 1, playerVX: 400 }))).toBe('catch');
    expect(chooseMascotAnimation(makeState({ hitPulse: 1, catchPulse: 1 }))).toBe('hit');
    expect(chooseMascotAnimation(makeState({ phase: 'gameover', lives: 0, hitPulse: 1 }))).toBe(
      'game-over',
    );
  });

  it('keeps expressions independent from the walking state', () => {
    expect(chooseMascotExpression(makeState({ blinkActive: 0.05, playerVX: 400 }))).toBe('blink');
    expect(
      chooseMascotExpression(makeState({ catchPulse: 1, blinkActive: 0.05, playerVX: 400 })),
    ).toBe('happy');
    expect(chooseMascotExpression(makeState({ hitPulse: 1, catchPulse: 1 }))).toBe('shock');
    expect(chooseMascotExpression(makeState({ phase: 'gameover', lives: 0 }))).toBe('sad');
  });

  it('flips immediately and returns to idle after stopping while keeping the last facing', () => {
    const state = makeState({ playerVX: 400 });
    advanceAnimation(state, 0.016, -1);
    expect(state.facing).toBe('left');
    expect(state.anim).toBe('walk-left');

    state.playerVX = 0;
    advanceAnimation(state, 0.016, 0);
    expect(state.anim).toBe('idle');
    expect(state.facing).toBe('left');
  });
});

describe('articulated walking pose', () => {
  it('alternates the two legs and counter-swings the free arm', () => {
    const state = makeState({ anim: 'walk-right', playerVX: 640 });
    const quarterCycle = Math.PI / (2 * walkFrequency(state));

    state.animTime = 0;
    const start = mascotPoseFor(state);
    state.animTime = quarterCycle;
    const mid = mascotPoseFor(state);

    expect(start.legFrontAngle).toBeCloseTo(0, 5);
    expect(mid.legFrontAngle).toBeGreaterThan(0.3);
    expect(mid.legBackAngle).toBeCloseTo(-mid.legFrontAngle, 5);
    expect(mid.armLeftAngle).toBeLessThan(0);
    expect(mid.bodyY).toBeLessThan(0);
  });

  it('ties stride length and cadence to actual movement speed', () => {
    const slow = makeState({ playerVX: 160 });
    const fast = makeState({ playerVX: 640 });
    expect(walkAmplitude(fast)).toBeGreaterThan(walkAmplitude(slow));
    expect(walkFrequency(fast)).toBeGreaterThan(walkFrequency(slow));
  });

  it('never rotates the plate arm and uses expression-specific body poses', () => {
    const catchPose = mascotPoseFor(makeState({ anim: 'catch', catchPulse: 0.5 }));
    const hitPose = mascotPoseFor(makeState({ anim: 'hit', hitPulse: 0.5 }));
    const sadPose = mascotPoseFor(makeState({ anim: 'game-over', phase: 'gameover' }));
    expect(catchPose.bodyY).toBeLessThan(0);
    expect(hitPose.bodyX).toBeLessThan(0);
    expect(sadPose.headY).toBeGreaterThan(0);
    // No plateArmAngle field exists: the rigid plate arm is only translated.
    expect('plateArmAngle' in catchPose).toBe(false);
  });
});

describe('mirrored plate hitbox', () => {
  it('tracks the visible plate on both sides without moving the player', () => {
    const state = makeState({ facing: 'right' });
    const right = platePosition(state, plateRel);
    state.facing = 'left';
    const left = platePosition(state, plateRel);

    expect(right.x).toBeGreaterThan(state.playerX);
    expect(left.x).toBeLessThan(state.playerX);
    expect(state.playerX - left.x).toBeCloseTo(right.x - state.playerX, 5);
    expect(left.radius).toBeCloseTo(right.radius, 5);
    expect(left.y).toBeCloseTo(right.y, 5);
  });
});
