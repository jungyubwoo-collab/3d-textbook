import { describe, expect, it } from 'vitest';
import { kineticEnergy, slideDistance, slideTime } from './physics.ts';

describe('kinetic energy', () => {
  it('is ½mv²', () => {
    expect(kineticEnergy(1, 2)).toBe(2);
    expect(kineticEnergy(2, 3)).toBe(9);
  });

  it('quadruples when the speed doubles, and so does the slide', () => {
    expect(kineticEnergy(1, 2) / kineticEnergy(1, 1)).toBe(4);
    expect(slideDistance(2) / slideDistance(1)).toBeCloseTo(4);
  });

  it('slides about 10 cm at 1 m/s', () => {
    expect(slideDistance(1)).toBeCloseTo(0.102, 3);
    expect(slideTime(1)).toBeCloseTo(0.204, 3);
  });
});
