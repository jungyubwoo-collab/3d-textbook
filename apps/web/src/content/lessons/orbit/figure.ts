import type { PageBlock } from '../../../book/types.ts';
import {
  arrow,
  circle,
  curve,
  ellipse,
  fitFigure,
  path,
  PEN,
  rect,
  tag,
  text,
  unknown,
  type Point,
} from '../../../figure/kit.ts';

const L = {
  title: '산꼭대기에서 수평으로 쏜 대포알',
  slow: '① 느리게',
  fast: '② 빠르게',
  orbit: '③ 초속 7.9 km',
  gravity: '중력',
  earth: '지구',
  note: '산 높이와 지구 크기는 알아보기 쉽게 과장했어요.',
} as const;

const CENTER: Point = [410, 610];
const RADIUS = 240;

/** 꼭대기에서 시계 방향으로 angle(도)만큼 돈 땅 위의 점 */
function ground(angle: number): Point {
  const a = (angle * Math.PI) / 180;
  return [CENTER[0] + RADIUS * Math.sin(a), CENTER[1] - RADIUS * Math.cos(a)];
}

/** 그림 2. 빠르게 쏠수록 멀리 떨어진다. 초속 7.9 km로 쏘면? */
function draw(ctx: CanvasRenderingContext2D): void {
  tag(ctx, L.title, [410, 46], { size: 26 });

  // 지구(경선·위선을 얇게)
  circle(ctx, CENTER, RADIUS, { fill: 'rgba(169, 207, 224, 0.5)' });
  for (const rx of [0.38, 0.75])
    ellipse(ctx, CENTER, RADIUS * rx, RADIUS, { color: PEN.muted, width: 1.5 });
  ellipse(ctx, CENTER, RADIUS, RADIUS * 0.3, { color: PEN.muted, width: 1.5 });
  text(ctx, L.earth, [CENTER[0], CENTER[1] + 40], { size: 30, weight: 800, color: PEN.ink });

  // 산과 대포
  const peak: Point = [CENTER[0], CENTER[1] - RADIUS - 74];
  path(
    ctx,
    [[CENTER[0] - 62, CENTER[1] - RADIUS + 10], peak, [CENTER[0] + 62, CENTER[1] - RADIUS + 10]],
    {
      close: true,
      fill: PEN.green,
    },
  );
  rect(ctx, peak[0] - 8, peak[1] - 24, 60, 16, { radius: 6, fill: PEN.steel });
  circle(ctx, [peak[0] + 4, peak[1] - 6], 11, { fill: PEN.woodDark });
  const muzzle: Point = [peak[0] + 54, peak[1] - 16];

  // ① 느리게: 가까이 떨어진다
  const near = ground(26);
  curve(ctx, muzzle, [muzzle[0] + 70, muzzle[1]], [near[0] + 20, near[1] - 70], near, {
    color: PEN.red,
    width: 4,
    dash: [12, 9],
  });
  circle(ctx, near, 9, { fill: PEN.red, color: PEN.ink, width: 2 });
  tag(ctx, L.slow, [near[0] + 74, near[1] + 6], { size: 22, color: '#b4483d' });

  // ② 빠르게: 더 멀리 떨어진다
  const far = ground(72);
  curve(ctx, muzzle, [muzzle[0] + 190, muzzle[1] - 4], [far[0] + 70, far[1] - 140], far, {
    color: '#d18a22',
    width: 4,
    dash: [12, 9],
  });
  circle(ctx, far, 9, { fill: PEN.yellow, color: PEN.ink, width: 2 });
  tag(ctx, L.fast, [far[0] + 62, far[1] + 46], { size: 22, color: '#a86a12' });

  // ③ 초속 7.9 km: 어떻게 될까?
  arrow(ctx, muzzle, [muzzle[0] + 250, muzzle[1]], { color: PEN.accent, width: 5, head: 22 });
  tag(ctx, L.orbit, [muzzle[0] + 150, muzzle[1] - 44], { size: 22, color: PEN.accent });
  unknown(ctx, [muzzle[0] + 300, muzzle[1]], 30);

  // 중력은 늘 지구 중심 쪽으로 당긴다
  const on: Point = [676, 336];
  const toward = Math.atan2(CENTER[1] - on[1], CENTER[0] - on[0]);
  arrow(ctx, on, [on[0] + Math.cos(toward) * 70, on[1] + Math.sin(toward) * 70], {
    color: PEN.pencil,
    width: 4,
    head: 16,
  });
  text(ctx, L.gravity, [on[0] + 58, on[1] + 10], { size: 22, weight: 800, color: PEN.pencil });
  circle(ctx, CENTER, 4, { fill: PEN.ink });

  text(ctx, L.note, [24, 902], { size: 20, weight: 500, color: PEN.muted, align: 'left' });
}

export const orbitFigure: Extract<PageBlock, { type: 'figure' }> = {
  type: 'figure',
  draw: (ctx, size) => fitFigure(ctx, size, draw),
  text: Object.values(L).join(' '),
  alt: '지구 위 산꼭대기의 대포에서 수평으로 쏜 대포알의 궤적. 느리게 쏘면 가까이, 빠르게 쏘면 더 멀리 떨어진다. 중력은 늘 지구 중심 쪽으로 당긴다. 초속 7.9 km로 쏘면 어떻게 될지 물음표로 묻는다.',
};
