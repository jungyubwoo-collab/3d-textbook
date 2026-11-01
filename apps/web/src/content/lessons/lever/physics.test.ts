import { describe, expect, it } from 'vitest';
import { MAX_TILT, netTorque, rightSide, tiltAngle } from './physics.ts';

const left = { position: -2, count: 2 };

describe('netTorque', () => {
  it('balances 2 weights at 2 against 1 weight at 4', () => {
    expect(netTorque([left, ...rightSide([0, 0, 0, 1])])).toBe(0);
  });

  it('balances 2 weights at 2 against 2 weights at 2', () => {
    expect(netTorque([left, ...rightSide([0, 2, 0, 0])])).toBe(0);
  });

  it('is positive when the right side is heavier', () => {
    expect(netTorque([left, ...rightSide([0, 0, 0, 2])])).toBe(4);
  });
});

describe('tiltAngle', () => {
  it('stays level when balanced', () => {
    expect(tiltAngle(0)).toBeCloseTo(0);
  });

  it('dips the heavier side', () => {
    expect(tiltAngle(4)).toBeLessThan(0);
    expect(tiltAngle(-4)).toBeGreaterThan(0);
  });

  it('never tilts past the stop', () => {
    expect(tiltAngle(1000)).toBe(-MAX_TILT);
    expect(tiltAngle(-1000)).toBe(MAX_TILT);
  });
});
