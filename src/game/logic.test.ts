import { describe, expect, it } from 'vitest';
import {
  BURGER_RADIUS,
  DIFFICULTY_STAGES,
  GRAVY_RADIUS,
  HIGHEST_LEVEL,
  LOGICAL_W,
  MAX_BURGERS,
  MAX_FALLS,
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
  hasSpawnSpacing,
  isGameOver,
  loseLife,
  spawnFall,
} from './logic';
import type { Falling } from './types';

function fall(id: number, kind: Falling['kind'], x: number, y = 0): Falling {
  const created = createFall(id, kind, x, 250, () => 0.5);
  created.y = y;
  created.sway = 0;
  created.spin = 0;
  return created;
}

describe('exact difficulty table', () => {
  it('uses the requested speed and spawn interval in every time window', () => {
    const samples = [0, 14.99, 15, 29.99, 30, 44.99, 45, 59.99, 60, 89.99, 90, 600];
    const expected = [
      [1, 140, 1.4], [1, 140, 1.4],
      [2, 175, 1.3], [2, 175, 1.3],
      [3, 215, 1.2], [3, 215, 1.2],
      [4, 260, 1.1], [4, 260, 1.1],
      [5, 310, 1.0], [5, 310, 1.0],
      [6, 360, 0.9], [6, 360, 0.9],
    ];
    samples.forEach((elapsed, index) => {
      const actual = difficultyAt(elapsed);
      expect(actual.level).toBe(expected[index]?.[0]);
      expect(actual.fallSpeed).toBe(expected[index]?.[1]);
      expect(actual.spawnEvery).toBe(expected[index]?.[2]);
      expect(actual.gravyChance).toBeCloseTo(0.25, 5);
    });
    expect(HIGHEST_LEVEL).toBe(6);
    expect(DIFFICULTY_STAGES[DIFFICULTY_STAGES.length - 1]?.fallSpeed).toBe(360);
  });
});

describe('spawn limits', () => {
  it('never spawns at the falling-object cap', () => {
    const existing = Array.from({ length: MAX_FALLS }, (_, i) => fall(i, 'gravy', i * 120));
    expect(spawnFall(99, difficultyAt(0), Math.random, existing)).toBeNull();
  });

  it('never allows more than two burgers falling at once', () => {
    const existing = [fall(1, 'burger', 100), fall(2, 'burger', 500)];
    let seed = 12345;
    let firstRoll = true;
    // The first roll forces a burger request; later rolls vary spawn positions.
    const rng = () => {
      if (firstRoll) {
        firstRoll = false;
        return 0;
      }
      seed = (seed * 1664525 + 1013904223) >>> 0;
      return seed / 0x100000000;
    };
    let spawnedGravy = 0;
    for (let i = 0; i < 40; i += 1) {
      const spawned = spawnFall(10 + i, difficultyAt(100), rng, existing);
      expect(spawned?.kind).not.toBe('burger');
      if (spawned) spawnedGravy += 1;
    }
    expect(spawnedGravy).toBeGreaterThan(0);
  });

  it('targets roughly 25% gravy over many rolls', () => {
    const difficulty = difficultyAt(0);
    let gravy = 0;
    const rolls = 4000;
    for (let i = 0; i < rolls; i += 1) {
      if (spawnFall(i, difficulty, Math.random, [])?.kind === 'gravy') gravy += 1;
    }
    expect(gravy / rolls).toBeGreaterThan(0.22);
    expect(gravy / rolls).toBeLessThan(0.28);
  });

  it('keeps spawned objects inside the playfield and clear of each other', () => {
    const difficulty = difficultyAt(120);
    for (let i = 0; i < 200; i += 1) {
      const spawned = spawnFall(i, difficulty, Math.random, [])!;
      expect(spawned.x).toBeGreaterThanOrEqual(spawned.radius);
      expect(spawned.x).toBeLessThanOrEqual(LOGICAL_W - spawned.radius);
      expect([BURGER_RADIUS, GRAVY_RADIUS]).toContain(spawned.radius);
      expect(spawned.speed).toBe(360);
    }
    const first = fall(1, 'burger', 300, -60);
    expect(hasSpawnSpacing(fall(2, 'burger', 310, -60), [first])).toBe(false);
    expect(hasSpawnSpacing(fall(3, 'burger', 560, -60), [first])).toBe(true);
  });
});

describe('plate-only collisions', () => {
  const plate = { x: 460, y: 900, radius: 52 };

  it('scores a burger landing on the white plate', () => {
    const onPlate = fall(1, 'burger', plate.x, plate.y);
    expect(burgerOnPlate(onPlate, plate)).toBe(true);
  });

  it('does not score hits on the head, torso, or empty air', () => {
    const head = fall(2, 'burger', plate.x - 110, plate.y - 45);
    const torso = fall(3, 'burger', plate.x - 85, plate.y + 90);
    const farAway = fall(4, 'burger', plate.x, 200);
    expect(burgerOnPlate(head, plate)).toBe(false);
    expect(burgerOnPlate(torso, plate)).toBe(false);
    expect(burgerOnPlate(farAway, plate)).toBe(false);
  });

  it('detects gravy over the mascot and ignores distant gravy', () => {
    const player = { x: 360, y: 650, width: 240, height: 372 };
    const onMascot = fall(5, 'gravy', player.x, player.y + player.height * 0.6);
    const miss = fall(6, 'gravy', 40, player.y + player.height * 0.6);
    expect(gravyHitsPlayer(onMascot, player)).toBe(true);
    expect(gravyHitsPlayer(miss, player)).toBe(false);
  });
});

describe('scoring and lives', () => {
  it('awards exactly 10 points per burger', () => {
    expect(awardBurger(0)).toBe(10);
    expect(awardBurger(70)).toBe(80);
  });

  it('removes exactly one life per gravy hit and ends at zero', () => {
    expect([3, 2, 1, 0].map(loseLife)).toEqual([2, 1, 0, 0]);
    expect([3, 2, 1, 0].map(isGameOver)).toEqual([false, false, false, true]);
  });
});

describe('movement helpers', () => {
  it('resolves direction and clamps movement', () => {
    expect(directionValue(true, false)).toBe(-1);
    expect(directionValue(false, true)).toBe(1);
    expect(directionValue(true, true)).toBe(0);
    expect(approach(0, 100, 25)).toBe(25);
    expect(approach(90, 100, 25)).toBe(100);
    expect(clamp(900, 0, 720)).toBe(720);
  });
});

describe('burger cap helper', () => {
  it('exposes the configured maximum', () => {
    expect(MAX_BURGERS).toBe(2);
    expect(MAX_FALLS).toBe(3);
  });
});
