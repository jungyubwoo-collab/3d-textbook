import { describe, expect, it } from 'vitest';
import { nextVariant } from './sound.ts';

describe('nextVariant', () => {
  it('always uses the only file when there is one', () => {
    expect(nextVariant(1, undefined, 0.7)).toBe(0);
    expect(nextVariant(1, 0, 0.2)).toBe(0);
  });

  it('never repeats the previous file when there are several', () => {
    for (const random of [0, 0.2, 0.5, 0.8, 0.999]) {
      for (const previous of [0, 1, 2]) {
        const next = nextVariant(3, previous, random);
        expect(next).not.toBe(previous);
        expect(next).toBeGreaterThanOrEqual(0);
        expect(next).toBeLessThan(3);
      }
    }
  });

  it('can reach every other file', () => {
    const picks = new Set([0, 0.4, 0.9].map((random) => nextVariant(3, 1, random)));
    expect(picks).toEqual(new Set([0, 2]));
  });
});
