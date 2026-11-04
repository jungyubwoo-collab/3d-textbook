import { describe, expect, it } from 'vitest';
import {
  BALL_TERMINAL_SPEED,
  FEATHER_TERMINAL_SPEED,
  fallDistance,
  fallSpeed,
  timeToFall,
} from './physics.ts';

describe('free fall without air', () => {
  it('follows h = ½gt² and v = gt', () => {
    expect(fallDistance(0.5)).toBeCloseTo(1.225);
    expect(fallSpeed(2)).toBeCloseTo(19.6);
  });

  it('takes about 0.45 s to fall 1 m', () => {
    expect(timeToFall(1)).toBeCloseTo(0.4518, 3);
  });
});

describe('falling through air', () => {
  it('never falls farther than in a vacuum', () => {
    for (const t of [0.1, 0.5, 1, 3]) {
      expect(fallDistance(t, FEATHER_TERMINAL_SPEED)).toBeLessThan(fallDistance(t));
    }
  });

  it('settles to the terminal speed', () => {
    expect(fallSpeed(5, FEATHER_TERMINAL_SPEED)).toBeCloseTo(FEATHER_TERMINAL_SPEED, 5);
  });

  it('slows a feather a lot but a steel ball barely', () => {
    expect(timeToFall(1, FEATHER_TERMINAL_SPEED)).toBeGreaterThan(2);
    expect(timeToFall(1, BALL_TERMINAL_SPEED) / timeToFall(1)).toBeLessThan(1.02);
  });
});
