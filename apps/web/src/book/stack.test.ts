import { describe, expect, it } from 'vitest';
import { curlWeights, easeInOutCubic, easeOutBack } from './stack.ts';

/** 휨이 가장 큰 뼈마디 */
function peak(weights: number[]): number {
  return weights.indexOf(Math.max(...weights));
}

describe('curlWeights', () => {
  it('splits the whole curl across the bones', () => {
    for (const phase of [0, 0.3, 0.7, 1]) {
      const sum = curlWeights(30, phase).reduce((total, weight) => total + weight, 0);
      expect(sum).toBeCloseTo(1);
    }
  });

  it('rolls the bend from the outer edge toward the spine as the page turns', () => {
    const start = peak(curlWeights(30, 0));
    const middle = peak(curlWeights(30, 0.5));
    const end = peak(curlWeights(30, 1));
    expect(start).toBeGreaterThan(middle);
    expect(middle).toBeGreaterThan(end);
  });
});

describe('easing', () => {
  it('starts at 0 and ends at 1', () => {
    for (const ease of [easeInOutCubic, easeOutBack]) {
      expect(ease(0)).toBeCloseTo(0);
      expect(ease(1)).toBeCloseTo(1);
    }
  });

  it('lets pop-ups overshoot a little before settling', () => {
    expect(Math.max(...[0.6, 0.7, 0.8].map(easeOutBack))).toBeGreaterThan(1);
  });
});
