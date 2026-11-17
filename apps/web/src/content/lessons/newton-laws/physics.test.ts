import { describe, expect, it } from 'vitest';
import {
  acceleration,
  addRecord,
  cartAt,
  COAST_DISTANCE,
  insightOf,
  missionsOf,
  planRun,
  PULL_DISTANCE,
  pullForce,
  tapeDots,
  timesText,
  totalMass,
  type Setup,
} from './physics.ts';

const base: Setup = { weights: 1, bricks: 0 };

describe('second law: a = F ÷ m', () => {
  it('pulls 1 kg with the weight of one 100 g mass', () => {
    expect(pullForce(base)).toBeCloseTo(0.98);
    expect(totalMass(base)).toBe(1);
    expect(acceleration(base)).toBeCloseTo(0.98);
  });

  it('is proportional to the force', () => {
    expect(acceleration({ weights: 2, bricks: 0 }) / acceleration(base)).toBeCloseTo(2);
    expect(acceleration({ weights: 3, bricks: 0 }) / acceleration(base)).toBeCloseTo(3);
  });

  it('is inversely proportional to the mass', () => {
    expect(acceleration({ weights: 1, bricks: 1 }) / acceleration(base)).toBeCloseTo(1 / 2);
    expect(acceleration({ weights: 1, bricks: 2 }) / acceleration(base)).toBeCloseTo(1 / 3);
    // 힘과 질량을 함께 3배로 하면 가속도는 그대로
    expect(acceleration({ weights: 3, bricks: 2 })).toBeCloseTo(acceleration(base));
  });
});

describe('a run', () => {
  const run = planRun(base);

  it('speeds up evenly while the weight pulls', () => {
    expect(run.landAt).toBeCloseTo(Math.sqrt(1.2 / 0.98));
    expect(cartAt(run, 0.5).speed).toBeCloseTo(0.49);
    expect(cartAt(run, 1).speed).toBeCloseTo(0.98);
    expect(cartAt(run, 1).distance).toBeCloseTo(0.49);
    expect(cartAt(run, 1).phase).toBe('pull');
  });

  it('keeps its speed once the weight has landed (first law)', () => {
    const early = cartAt(run, run.landAt + 0.1);
    const late = cartAt(run, run.landAt + 0.5);
    expect(early.phase).toBe('coast');
    expect(early.speed).toBeCloseTo(run.topSpeed);
    expect(late.speed).toBeCloseTo(run.topSpeed);
    expect(late.distance - early.distance).toBeCloseTo(run.topSpeed * 0.4);
  });

  it('is continuous where the weight lands and stops at the bumper', () => {
    expect(cartAt(run, run.landAt - 1e-9).distance).toBeCloseTo(PULL_DISTANCE);
    expect(cartAt(run, run.landAt).distance).toBeCloseTo(PULL_DISTANCE);
    expect(cartAt(run, run.hitAt - 1e-9).distance).toBeCloseTo(PULL_DISTANCE + COAST_DISTANCE);
    expect(cartAt(run, run.hitAt + 1)).toEqual({
      phase: 'stop',
      distance: PULL_DISTANCE + COAST_DISTANCE,
      speed: 0,
    });
    expect(cartAt(run, -1).distance).toBe(0);
  });

  it('reaches the same speed sooner with more force', () => {
    const strong = planRun({ weights: 3, bricks: 0 });
    expect(strong.landAt).toBeLessThan(run.landAt);
    expect(strong.topSpeed).toBeGreaterThan(run.topSpeed);
    // v² = 2 a s
    expect(strong.topSpeed ** 2).toBeCloseTo(2 * strong.a * PULL_DISTANCE);
  });
});

describe('ticker tape', () => {
  const dots = tapeDots(planRun(base));
  const gaps = dots.slice(1).map((dot, index) => dot.distance - dots[index]!.distance);

  it('starts at the start and stays on the track', () => {
    expect(dots[0]).toEqual({ distance: 0, phase: 'pull' });
    expect(dots.at(-1)!.distance).toBeLessThan(PULL_DISTANCE + COAST_DISTANCE);
  });

  it('widens while pulled, then keeps an even spacing', () => {
    const pulled = gaps.filter((_, index) => dots[index + 1]!.phase === 'pull');
    const coasting = gaps.filter((_, index) => dots[index]!.phase === 'coast');
    expect(pulled.length).toBeGreaterThan(5);
    expect(coasting.length).toBeGreaterThan(3);
    for (let i = 1; i < pulled.length; i++) expect(pulled[i]!).toBeGreaterThan(pulled[i - 1]!);
    for (const gap of coasting) expect(gap).toBeCloseTo(coasting[0]!);
  });
});

describe('records', () => {
  it('keeps one row per setup and at most four', () => {
    const records = addRecord(addRecord([], base), base);
    expect(records).toEqual([base]);
    const many = (
      [
        [1, 0],
        [2, 0],
        [3, 0],
        [1, 1],
        [1, 2],
      ] as const
    ).reduce<Setup[]>((list, [weights, bricks]) => addRecord(list, { weights, bricks }), []);
    expect(many).toHaveLength(4);
    expect(many[0]).toEqual({ weights: 2, bricks: 0 });
    expect(many.at(-1)).toEqual({ weights: 1, bricks: 2 });
  });

  it('tells what a comparison shows', () => {
    expect(insightOf(base, [])).toBeNull();
    expect(insightOf({ weights: 2, bricks: 0 }, [base])).toBe('힘이 2배 → 가속도도 2배');
    expect(insightOf({ weights: 1, bricks: 1 }, [base])).toBe('질량이 2배 → 가속도는 1/2배');
    expect(insightOf(base, [{ weights: 1, bricks: 2 }])).toBe('질량이 1/3배 → 가속도는 3배');
    // 두 조건이 모두 다르면 견줄 수 없다.
    expect(insightOf({ weights: 2, bricks: 1 }, [base])).toBeNull();
    // 가장 최근 기록과 먼저 견준다.
    expect(insightOf({ weights: 3, bricks: 0 }, [base, { weights: 2, bricks: 0 }])).toBe(
      '힘이 1.5배 → 가속도도 1.5배',
    );
  });

  it('writes ratios as times', () => {
    expect(timesText(3)).toBe('3배');
    expect(timesText(1 / 3)).toBe('1/3배');
    expect(timesText(2 / 3)).toBe('2/3배');
  });

  it('checks off the missions', () => {
    expect(missionsOf([])).toEqual([false, false, false]);
    expect(missionsOf([base])).toEqual([true, false, false]);
    expect(missionsOf([base, { weights: 2, bricks: 0 }])).toEqual([true, true, false]);
    expect(missionsOf([base, { weights: 2, bricks: 0 }, { weights: 2, bricks: 1 }])).toEqual([
      true,
      true,
      true,
    ]);
  });
});
