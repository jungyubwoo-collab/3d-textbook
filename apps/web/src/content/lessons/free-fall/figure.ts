import type { PageBlock } from '../../../book/types.ts';
import {
  circle,
  dimension,
  feather,
  fitFigure,
  ghost,
  line,
  PEN,
  rect,
  tag,
  text,
  unknown,
  arrow,
  type Point,
} from '../../../figure/kit.ts';

const L = {
  air: '공기가 있을 때',
  vacuum: '공기를 뺐을 때',
  ballFirst: '쇠구슬이 먼저 바닥에',
  how: '어떻게 떨어질까?',
  pump: '진공 펌프',
  meter: '1 m',
  gravity: '중력',
  ball: '쇠구슬',
  feather: '깃털',
  strobe: '같은 시간 간격으로 찍은 위치',
} as const;

const TOP = 110;
const BOTTOM = 730;

function tube(ctx: CanvasRenderingContext2D, x: number): void {
  rect(ctx, x - 62, TOP, 124, BOTTOM - TOP, { fill: PEN.glass, radius: 8 });
  line(ctx, [x - 40, TOP + 34], [x - 40, BOTTOM - 34], { color: '#ffffff', width: 6 });
  rect(ctx, x - 78, TOP - 18, 156, 26, { radius: 6, fill: PEN.metal });
  rect(ctx, x - 78, BOTTOM - 8, 156, 26, { radius: 6, fill: PEN.metal });
}

const ball = (ctx: CanvasRenderingContext2D, at: Point) =>
  circle(ctx, at, 17, { fill: PEN.steel, width: 2.5 });

/** 그림 1. 공기 속에서는 쇠구슬이 먼저 떨어진다. 공기를 빼면? */
function draw(ctx: CanvasRenderingContext2D): void {
  const air = 250;
  const vacuum = 590;
  tag(ctx, L.air, [air, 46], { size: 26 });
  tag(ctx, L.vacuum, [vacuum, 46], { size: 26, color: PEN.accent });
  tube(ctx, air);
  tube(ctx, vacuum);
  dimension(ctx, [118, TOP + 30], [118, BOTTOM - 30], L.meter);

  // 공기 속: 같은 시간 간격으로 찍은 위치. 쇠구슬은 점점 벌어지고, 깃털은 조금씩만 내려온다.
  for (let i = 0; i < 8; i++) {
    const k = i / 7;
    const ballAt: Point = [air - 26, 150 + 550 * k * k];
    const featherAt: Point = [air + 26 + 10 * Math.sin(i * 1.7), 150 + 24 * i];
    const shot = () => {
      ball(ctx, ballAt);
      feather(ctx, featherAt, 0.35 + 0.25 * Math.sin(i * 1.3));
    };
    if (i < 7) ghost(ctx, shot, 0.3);
    else shot();
  }
  tag(ctx, L.ballFirst, [air, BOTTOM + 62], { size: 22 });

  // 진공 속: 같은 높이에서 놓았다. 어떻게 떨어질까?
  ball(ctx, [vacuum - 26, 150]);
  feather(ctx, [vacuum + 26, 150], 0.35);
  for (const x of [vacuum - 26, vacuum + 26]) {
    arrow(ctx, [x, 190], [x, 330], { color: PEN.accent, width: 3, dash: [8, 8], head: 14 });
  }
  unknown(ctx, [vacuum, 430], 40);
  tag(ctx, L.how, [vacuum, BOTTOM + 62], { size: 22, color: PEN.accent });

  // 진공 펌프
  rect(ctx, 706, 590, 92, 84, { radius: 10, fill: PEN.steel });
  circle(ctx, [752, 622], 20, { fill: PEN.card, width: 2.5 });
  line(ctx, [752, 622], [764, 610], { color: PEN.accent, width: 3 });
  line(ctx, [706, 650], [668, 724], { width: 8, color: PEN.ink });
  text(ctx, L.pump, [752, 700], { size: 21, weight: 700 });

  // 중력
  arrow(ctx, [420, 300], [420, 430], { color: PEN.pencil, width: 5, head: 20 });
  text(ctx, L.gravity, [420, 270], { size: 24, weight: 800, color: PEN.pencil });

  // 범례
  ball(ctx, [70, 846]);
  text(ctx, L.ball, [100, 846], { size: 22, align: 'left' });
  feather(ctx, [210, 846], 0.4);
  text(ctx, L.feather, [236, 846], { size: 22, align: 'left' });
  ghost(ctx, () => ball(ctx, [70, 900]), 0.3);
  text(ctx, L.strobe, [100, 900], { size: 22, align: 'left', color: PEN.muted });
}

export const freeFallFigure: Extract<PageBlock, { type: 'figure' }> = {
  type: 'figure',
  draw: (ctx, size) => fitFigure(ctx, size, draw),
  text: Object.values(L).join(' '),
  alt: '두 유리관 그림. 왼쪽 공기가 있는 관은 같은 시간 간격으로 찍은 위치를 보여 주는데, 쇠구슬이 깃털보다 먼저 바닥에 닿는다. 오른쪽 공기를 뺀 관에서는 쇠구슬과 깃털을 같은 높이에서 놓을 때 어떻게 떨어질지 물음표로 묻는다.',
};
