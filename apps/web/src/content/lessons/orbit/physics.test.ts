import { describe, expect, it } from 'vitest';
import { LAUNCH_RADIUS, simulateLaunch } from './physics.ts';

const radius = (point: { x: number; y: number }) => Math.hypot(point.x, point.y);

describe("Newton's cannon", () => {
  it('falls back to the ground when it is too slow', () => {
    expect(simulateLaunch(0.55).outcome).toBe('crash');
    expect(simulateLaunch(0.82).outcome).toBe('crash');
  });

  it('lands farther when it is faster', () => {
    const near = simulateLaunch(0.55).points.at(-1)!;
    const far = simulateLaunch(0.82).points.at(-1)!;
    expect(Math.atan2(far.x, far.y)).toBeGreaterThan(Math.atan2(near.x, near.y));
  });

  it('keeps circling at the circular orbit speed', () => {
    const launch = simulateLaunch(1);
    expect(launch.outcome).toBe('orbit');
    for (const point of launch.points) expect(radius(point)).toBeCloseTo(LAUNCH_RADIUS, 2);
  });

  it('swings out on an ellipse when a bit faster', () => {
    const launch = simulateLaunch(1.1);
    expect(launch.outcome).toBe('orbit');
    const farthest = Math.max(...launch.points.map(radius));
    // 이심률 e = 1.1² - 1, 가장 먼 거리 = r(1 + e)/(1 - e)
    const e = 1.1 ** 2 - 1;
    expect(farthest).toBeCloseTo((LAUNCH_RADIUS * (1 + e)) / (1 - e), 1);
  });
});
