import { describe, expect, it } from 'vitest';
import { INVULN_SECONDS, MOVE_SPEED, POINTS_PER_BURGER } from './config';
import { GameEngine } from './engine';
import { MASCOT_EXPRESSION_HEADS, MASCOT_LAYER_RECTS } from './mascotLayers.generated';
import type { GameImages, MascotExpression, MascotLayerName, PlateRelative } from './types';

function fakeImage(width: number, height: number): HTMLImageElement {
  return {
    naturalWidth: width,
    naturalHeight: height,
    width,
    height,
  } as unknown as HTMLImageElement;
}

function fakeImages(): GameImages {
  const layers = {} as Record<MascotLayerName, HTMLImageElement>;
  (Object.keys(MASCOT_LAYER_RECTS) as MascotLayerName[]).forEach((name) => {
    layers[name] = fakeImage(100, 100);
  });
  const expressions = {} as Record<MascotExpression, HTMLImageElement>;
  (Object.keys(MASCOT_EXPRESSION_HEADS) as MascotExpression[]).forEach((name) => {
    expressions[name] = fakeImage(100, 100);
  });
  return {
    mascot: fakeImage(1086, 1448),
    burger: fakeImage(1536, 1024),
    gravy: fakeImage(1536, 1024),
    layers,
    expressions,
  };
}

const plateRel: PlateRelative = { x: 0.7675, y: 0.2762, radiusX: 0.176, detected: true };

function makeEngine(rng: () => number = Math.random): GameEngine {
  return new GameEngine(fakeImages(), { plateRel, rng, highScore: 0 });
}

describe('engine difficulty integration', () => {
  it('advances exactly one level at each threshold and shows SPEED UP!', () => {
    const engine = makeEngine();
    engine.start();
    engine.state.spawnTimer = 999;
    engine.state.elapsed = 14.99;

    engine.update(0.02);
    expect(engine.state.level).toBe(2);
    expect(engine.getSnapshot().level).toBe(2);
    expect(engine.state.speedUpTimer).toBeGreaterThan(0);

    for (let i = 0; i < 30; i += 1) engine.update(0.05);
    expect(engine.state.speedUpTimer).toBe(0);
  });

  it('resets difficulty on restart and freezes the timer while paused', () => {
    const engine = makeEngine();
    engine.start();
    engine.debugSetElapsed(95);
    expect(engine.state.level).toBe(6);

    engine.pause();
    const frozen = engine.state.elapsed;
    engine.update(5);
    expect(engine.state.elapsed).toBe(frozen);

    engine.resume();
    engine.start();
    expect(engine.state.elapsed).toBe(0);
    expect(engine.state.level).toBe(1);
  });
});

describe('engine animation integration', () => {
  it('flips facing without a position jump and returns to idle facing the last way', () => {
    const engine = makeEngine();
    engine.start();
    const startX = engine.state.playerX;

    engine.setDirection('right', true);
    engine.setDirection('left', true);
    expect(engine.input.right).toBe(false);
    engine.update(0.016);
    expect(engine.state.facing).toBe('left');
    expect(engine.state.anim).toBe('walk-left');
    expect(engine.state.plate.x).toBeLessThan(engine.state.playerX);
    expect(Math.abs(engine.state.playerX - startX)).toBeLessThanOrEqual(MOVE_SPEED * 0.016 + 0.01);

    engine.setDirection('left', false);
    for (let i = 0; i < 4; i += 1) engine.update(0.016);
    expect(engine.state.anim).toBe('idle');
    expect(engine.state.facing).toBe('left');
  });

  it('uses catch and game-over expressions without erasing movement direction', () => {
    const engine = makeEngine();
    engine.start();
    engine.setDirection('left', true);
    engine.update(0.016);

    const plate = engine.state.plate;
    engine.state.spawnTimer = 999;
    engine.debugSpawn('burger', plate.x, plate.y);
    engine.update(0.016);
    expect(engine.state.score).toBe(POINTS_PER_BURGER);
    engine.setDirection('left', false);
    engine.update(0.016);
    expect(engine.state.anim).toBe('catch');
    expect(engine.state.expression).toBe('happy');
    expect(engine.state.facing).toBe('left');

    for (let hit = 0; hit < 3; hit += 1) {
      engine.state.invuln = 0;
      engine.debugSpawn('gravy', engine.state.playerX, engine.state.playerY + 120);
      engine.update(0.016);
    }
    expect(engine.state.lives).toBe(0);
    expect(engine.state.phase).toBe('gameover');
    expect(engine.state.anim).toBe('game-over');
    expect(engine.state.expression).toBe('sad');
  });
});

describe('engine collision integration', () => {
  it('protects for 0.8 seconds after a gravy hit', () => {
    const engine = makeEngine();
    engine.start();
    engine.state.spawnTimer = 999;
    const y = engine.state.playerY + 120;

    engine.debugSpawn('gravy', engine.state.playerX, y);
    engine.update(0.016);
    expect(engine.state.lives).toBe(2);
    expect(engine.state.invuln).toBeCloseTo(INVULN_SECONDS - 0.016, 5);

    engine.debugSpawn('gravy', engine.state.playerX, y);
    engine.update(0.016);
    expect(engine.state.lives).toBe(2);

    engine.state.invuln = 0;
    engine.debugSpawn('gravy', engine.state.playerX, y);
    engine.update(0.016);
    expect(engine.state.lives).toBe(1);
  });

  it('enforces falling and burger caps during a long run', () => {
    const engine = makeEngine(() => 0.9);
    engine.start();
    for (let i = 0; i < 1200; i += 1) {
      engine.update(0.016);
      expect(engine.state.falls.length).toBeLessThanOrEqual(3);
      expect(engine.state.falls.filter((fall) => fall.kind === 'burger').length).toBeLessThanOrEqual(2);
    }
  });
});
