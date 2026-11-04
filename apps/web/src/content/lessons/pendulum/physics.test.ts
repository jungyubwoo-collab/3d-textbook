import { describe, expect, it } from 'vitest';
import { energiesOf, heightOf, releasedAt, stepPendulum, type PendulumConfig } from './physics.ts';

const start = -(50 * Math.PI) / 180;

/** 놓은 뒤 오른쪽으로 가장 높이 올라간 높이 */
function highestOnTheRight(config: PendulumConfig): number {
  let state = releasedAt(start);
  let best = 0;
  for (let i = 0; i < 3000; i++) {
    state = stepPendulum(state, 1 / 1000, config);
    if (state.angle > 0) best = Math.max(best, heightOf(state, config));
  }
  return best;
}

describe('Galileo pendulum', () => {
  const free: PendulumConfig = { length: 1, pegDepth: null };
  const pegged: PendulumConfig = { length: 1, pegDepth: 0.5 };
  const released = heightOf(releasedAt(start), free);

  it('rises back to the release height', () => {
    expect(highestOnTheRight(free)).toBeCloseTo(released, 2);
  });

  it('still reaches the release height when the string catches on the peg', () => {
    expect(highestOnTheRight(pegged)).toBeCloseTo(released, 2);
  });

  it('swings through a wider angle around the peg', () => {
    let state = releasedAt(start);
    let widest = 0;
    for (let i = 0; i < 3000; i++) {
      state = stepPendulum(state, 1 / 1000, pegged);
      if (state.side === 'peg') widest = Math.max(widest, state.angle);
    }
    expect(widest).toBeGreaterThan(-start);
  });

  it('keeps the total mechanical energy', () => {
    const total = (config: PendulumConfig, state = releasedAt(start)) => {
      const { potential, kinetic } = energiesOf(state, config);
      return potential + kinetic;
    };
    let state = releasedAt(start);
    const initial = total(pegged, state);
    for (let i = 0; i < 5000; i++) {
      state = stepPendulum(state, 1 / 1000, pegged);
      expect(total(pegged, state)).toBeCloseTo(initial, 1);
    }
  });
});
