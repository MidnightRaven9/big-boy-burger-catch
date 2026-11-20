import { describe, expect, it } from 'vitest';
import { BURGER_RADIUS, GRAVY_RADIUS, LOGICAL_W } from './config';
import {
  approach,
  awardBurger,
  burgerOnPlate,
  clamp,
  createFall,
  difficultyAt,
  directionValue,
  gravyHitsPlayer,
  isGameOver,
  loseLife,
  spawnFall,
} from './logic';

describe('difficulty', () => {
  it('ramps up over time but stays capped', () => {
    const first = difficultyAt(0);
    const later = difficultyAt(40_000);
    const veryLate = difficultyAt(600_000);
    expect(first.level).toBe(0);
    expect(later.spawnEvery).toBeLessThan(first.spawnEvery);
    expect(later.fallSpeed).toBeGreaterThan(first.fallSpeed);
    expect(veryLate.spawnEvery).toBeGreaterThanOrEqual(0.36);
    expect(veryLate.fallSpeed).toBeLessThanOrEqual(560);
  });
});

describe('spawning', () => {
  it('keeps falling objects fully inside the playfield', () => {
    const difficulty = difficultyAt(120_000);
    for (let i = 0; i < 200; i += 1) {
      const fall = spawnFall(i, difficulty, Math.random, 0)!;
      expect(fall.x).toBeGreaterThanOrEqual(fall.radius);
      expect(fall.x).toBeLessThanOrEqual(LOGICAL_W - fall.radius);
      expect([BURGER_RADIUS, GRAVY_RADIUS]).toContain(fall.radius);
    }
  });

  it('respects the maximum number of falling objects', () => {
    expect(spawnFall(1, difficultyAt(0), Math.random, 14)).toBeNull();
  });
});

describe('collisions', () => {
  const plate = { x: 360, y: 900, radius: 52 };
  const player = { x: 360, y: 650, width: 240, height: 372 };

  it('awards a catch only when a burger reaches the plate', () => {
    const onPlate = createFall(1, 'burger', plate.x, 250);
    onPlate.y = plate.y;
    expect(burgerOnPlate(onPlate, plate)).toBe(true);

    const farAway = createFall(2, 'burger', plate.x, 250);
    farAway.y = 200;
    expect(burgerOnPlate(farAway, plate)).toBe(false);
  });

  it('detects gravy over the mascot and ignores distant gravy', () => {
    const onMascot = createFall(3, 'gravy', player.x, 250);
    onMascot.y = player.y + player.height * 0.6;
    expect(gravyHitsPlayer(onMascot, player)).toBe(true);

    const miss = createFall(4, 'gravy', 40, 250);
    miss.y = player.y + player.height * 0.6;
    expect(gravyHitsPlayer(miss, player)).toBe(false);
  });
});

describe('scoring and lives', () => {
  it('awards exactly 10 points per burger', () => {
    expect(awardBurger(0)).toBe(10);
    expect(awardBurger(70)).toBe(80);
  });

  it('removes exactly one life per gravy hit and ends at zero', () => {
    expect(loseLife(3)).toBe(2);
    expect(loseLife(2)).toBe(1);
    expect(loseLife(1)).toBe(0);
    expect(loseLife(0)).toBe(0);
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
