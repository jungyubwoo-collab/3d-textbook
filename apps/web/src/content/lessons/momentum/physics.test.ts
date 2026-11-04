import { describe, expect, it } from 'vitest';
import { collide, momentum } from './physics.ts';

describe('collisions on a track', () => {
  it.each([
    [1, 1, 1, 0],
    [1, 1, 2, 0],
    [2, 1.5, 1, -0.5],
  ] as const)('keep total momentum (m1=%d, v1=%d, m2=%d, v2=%d)', (m1, v1, m2, v2) => {
    for (const kind of ['stick', 'bounce'] as const) {
      const [a, b] = collide(m1, v1, m2, v2, kind);
      expect(momentum(m1, a) + momentum(m2, b)).toBeCloseTo(momentum(m1, v1) + momentum(m2, v2));
    }
  });

  it('halves the speed when equal carts stick together', () => {
    expect(collide(1, 1, 1, 0, 'stick')).toEqual([0.5, 0.5]);
  });

  it('swaps velocities when equal carts bounce', () => {
    const [a, b] = collide(1, 1, 1, 0, 'bounce');
    expect(a).toBeCloseTo(0);
    expect(b).toBeCloseTo(1);
  });

  it('bounces back off a heavier cart', () => {
    const [a, b] = collide(1, 1, 2, 0, 'bounce');
    expect(a).toBeCloseTo(-1 / 3);
    expect(b).toBeCloseTo(2 / 3);
  });
});
