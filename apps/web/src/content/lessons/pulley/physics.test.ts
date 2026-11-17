import { describe, expect, it } from 'vitest';
import {
  energyGained,
  heightFor,
  LIFT_HEIGHT,
  liftOf,
  LOAD_WEIGHT,
  pullForce,
  RIGS,
  rigName,
  ropeFor,
  short,
  strandsOf,
  work,
} from './physics.ts';

describe('pulleys', () => {
  it('share the load among the strands that hold it', () => {
    expect(RIGS.map(strandsOf)).toEqual([1, 2, 4]);
    expect(RIGS.map(pullForce)).toEqual([10, 5, 2.5]);
  });

  it('need that many times more rope', () => {
    expect(RIGS.map((rig) => ropeFor(rig, LIFT_HEIGHT))).toEqual([0.4, 0.8, 1.6]);
    expect(heightFor(1, 0.4)).toBeCloseTo(0.2);
    expect(heightFor(2, 0.4)).toBeCloseTo(0.1);
    // 다 올라가면 더 당겨도 올라가지 않는다.
    expect(heightFor(0, 5)).toBe(LIFT_HEIGHT);
    expect(heightFor(2, -1)).toBe(0);
  });

  it('never save work: force × distance stays the same', () => {
    for (const rig of RIGS) {
      const lift = liftOf(rig);
      expect(lift.work).toBeCloseTo(4);
      expect(lift.work).toBeCloseTo(energyGained(LIFT_HEIGHT));
      expect(lift.force * lift.strands).toBe(LOAD_WEIGHT);
    }
    // 당기는 도중에도 한 일은 물체가 얻은 위치 에너지와 같다.
    expect(work(pullForce(2), 0.6)).toBeCloseTo(energyGained(heightFor(2, 0.6)));
  });

  it('are named and written briefly', () => {
    expect(RIGS.map(rigName)).toEqual(['고정 도르래', '움직도르래 1개', '움직도르래 2개']);
    expect([10, 2.5, 0.8, 1.6].map(short)).toEqual(['10', '2.5', '0.8', '1.6']);
  });
});
