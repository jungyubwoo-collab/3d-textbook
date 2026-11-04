import type { PageBlock } from '../../../book/types.ts';
import {
  arrow,
  cart,
  circle,
  fitFigure,
  formula,
  hatch,
  PEN,
  rect,
  tag,
  text,
  unknown,
} from '../../../figure/kit.ts';

const L = {
  before: '충돌 전',
  after: '충돌 후: 붙어서 함께',
  a: 'A',
  b: 'B',
  mass: '질량 m',
  rest: '정지',
  v: 'v',
  speed: '함께 움직이는 속력은?',
  formula: '운동량 p = m v',
} as const;

function rail(ctx: CanvasRenderingContext2D, y: number): void {
  rect(ctx, 30, y, 760, 14, { fill: PEN.metal });
  rect(ctx, 30, y - 34, 14, 34, { fill: PEN.steel });
  rect(ctx, 776, y - 34, 14, 34, { fill: PEN.steel });
  hatch(ctx, 30, y + 14, 760, 20);
}

/** 그림 6. 움직이는 수레 A가 서 있는 수레 B에 부딪혀 붙는다. 함께 움직이는 속력은? */
function draw(ctx: CanvasRenderingContext2D): void {
  formula(ctx, L.formula, [600, 60]);

  // 충돌 전
  const top = 340;
  tag(ctx, L.before, [40, top - 150], { size: 24, align: 'left' });
  rail(ctx, top);
  cart(ctx, 110, top, 130, PEN.orange, L.a);
  text(ctx, L.mass, [175, top - 84], { size: 20, weight: 700 });
  arrow(ctx, [252, top - 36], [372, top - 36], { color: PEN.pencil, width: 5, head: 18 });
  text(ctx, L.v, [312, top - 70], { size: 28, weight: 800, color: PEN.pencil });
  cart(ctx, 500, top, 130, PEN.blue, L.b);
  text(ctx, L.mass, [565, top - 84], { size: 20, weight: 700 });
  tag(ctx, L.rest, [565, top - 126], { size: 20, color: PEN.muted });

  // 충돌 후: 붙어서 함께 움직인다
  const bottom = 720;
  tag(ctx, L.after, [40, bottom - 150], { size: 24, align: 'left', color: PEN.accent });
  rail(ctx, bottom);
  cart(ctx, 330, bottom, 130, PEN.orange, L.a);
  cart(ctx, 460, bottom, 130, PEN.blue, L.b);
  circle(ctx, [460, bottom - 35], 9, { fill: PEN.steel, width: 2.5 });
  arrow(ctx, [602, bottom - 36], [700, bottom - 36], {
    color: PEN.accent,
    width: 5,
    head: 18,
    dash: [10, 8],
  });
  unknown(ctx, [736, bottom - 98], 28);
  tag(ctx, L.speed, [460, bottom + 72], { size: 22, color: PEN.accent });
}

export const momentumFigure: Extract<PageBlock, { type: 'figure' }> = {
  type: 'figure',
  draw: (ctx, size) => fitFigure(ctx, size, draw),
  text: Object.values(L).join(' '),
  alt: '충돌 레일 그림. 충돌 전에는 질량 m인 수레 A가 속력 v로 움직이고, 같은 질량의 수레 B는 서 있다. 충돌 후 두 수레가 붙어서 함께 움직일 때의 속력을 물음표로 묻는다. 운동량은 p = m v이다.',
};
