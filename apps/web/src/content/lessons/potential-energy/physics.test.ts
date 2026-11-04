import { describe, expect, it } from 'vitest';
import { potentialEnergy } from './physics.ts';

describe('potentialEnergy', () => {
  it('is mgh', () => {
    expect(potentialEnergy(2, 3)).toBeCloseTo(58.8);
    expect(potentialEnergy(1, 0)).toBe(0);
  });

  it('doubles when the height doubles, and when the mass doubles', () => {
    expect(potentialEnergy(1, 2) / potentialEnergy(1, 1)).toBeCloseTo(2);
    expect(potentialEnergy(2, 1) / potentialEnergy(1, 1)).toBeCloseTo(2);
  });
});
