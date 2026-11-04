/** 평면 위의 점 */
export interface Point {
  x: number;
  y: number;
}

export interface Launch {
  /** 대포알이 지나간 자리(행성 중심 기준, 행성 반지름 = 1) */
  points: Point[];
  outcome: 'crash' | 'orbit';
}

export interface LaunchOptions {
  /** 대포가 놓인 산꼭대기의 거리(행성 반지름 = 1) */
  launchRadius?: number;
  /** 적분 시간 간격 */
  dt?: number;
  /** 이만큼 지나도 떨어지지 않으면 멈춘다. */
  maxTime?: number;
  /** 몇 걸음마다 점을 남길지 */
  sampleEvery?: number;
}

/** 산 높이를 과장한 대포 위치 (행성 반지름 = 1) */
export const LAUNCH_RADIUS = 1.2;

/** 원 궤도 속력: 중력이 원운동에 필요한 힘과 같아지는 속력 */
export function circularSpeed(radius: number): number {
  return Math.sqrt(1 / radius);
}

/**
 * 뉴턴의 대포. 산꼭대기(0, r)에서 오른쪽으로 수평 발사한다.
 * 중력 가속도는 거리의 제곱에 반비례한다(GM = 1, 행성 반지름 = 1로 맞춘 단위).
 * 땅에 닿거나 한 바퀴를 다 돌면 멈춘다.
 */
export function simulateLaunch(speedRatio: number, options: LaunchOptions = {}): Launch {
  const { launchRadius = LAUNCH_RADIUS, dt = 0.002, maxTime = 40, sampleEvery = 8 } = options;
  let x = 0;
  let y = launchRadius;
  let vx = speedRatio * circularSpeed(launchRadius);
  let vy = 0;
  let [ax, ay] = gravity(x, y);
  const points: Point[] = [{ x, y }];
  let travelled = 0;
  let previous = Math.atan2(x, y);

  for (let step = 1; step * dt <= maxTime; step++) {
    // 속도 베를레 적분: 에너지가 잘 보존된다.
    x += vx * dt + 0.5 * ax * dt * dt;
    y += vy * dt + 0.5 * ay * dt * dt;
    const [nextAx, nextAy] = gravity(x, y);
    vx += 0.5 * (ax + nextAx) * dt;
    vy += 0.5 * (ay + nextAy) * dt;
    ax = nextAx;
    ay = nextAy;

    const radius = Math.hypot(x, y);
    if (radius <= 1) {
      points.push({ x: x / radius, y: y / radius });
      return { points, outcome: 'crash' };
    }
    const angle = Math.atan2(x, y);
    let turn = angle - previous;
    if (turn < -Math.PI) turn += Math.PI * 2;
    if (turn > Math.PI) turn -= Math.PI * 2;
    travelled += turn;
    previous = angle;
    if (travelled >= Math.PI * 2) {
      points.push({ x: 0, y: launchRadius });
      return { points, outcome: 'orbit' };
    }
    if (step % sampleEvery === 0) points.push({ x, y });
  }
  return { points, outcome: 'orbit' };
}

function gravity(x: number, y: number): [number, number] {
  const r2 = x * x + y * y;
  const k = -1 / (r2 * Math.sqrt(r2));
  return [k * x, k * y];
}
