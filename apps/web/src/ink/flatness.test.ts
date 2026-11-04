import { Euler, Matrix4 } from 'three';
import { describe, expect, it } from 'vitest';
import { verticalSquash } from './flatness.ts';

describe('verticalSquash', () => {
  it('is 1 for objects that are not squashed, even when scaled evenly', () => {
    expect(verticalSquash(new Matrix4())).toBeCloseTo(1);
    expect(verticalSquash(new Matrix4().makeScale(0.4, 0.4, 0.4))).toBeCloseTo(1);
    expect(verticalSquash(new Matrix4().makeRotationX(Math.PI / 2))).toBeCloseTo(1);
  });

  it('measures a squash along world y even when the object inside is rotated', () => {
    const squash = new Matrix4().makeScale(1, 0.01, 1);
    const rotation = new Matrix4().makeRotationFromEuler(new Euler(Math.PI / 2, 0.4, 0.2));
    expect(verticalSquash(squash)).toBeCloseTo(0.01);
    expect(verticalSquash(squash.clone().multiply(rotation))).toBeCloseTo(0.01);
  });
});
