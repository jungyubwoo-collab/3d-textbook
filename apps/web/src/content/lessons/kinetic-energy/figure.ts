import type { PageBlock } from '../../../book/types.ts';
import {
  arrow,
  cart,
  dimension,
  fitFigure,
  formula,
  hatch,
  line,
  PEN,
  rect,
  tag,
  text,
  unknown,
} from '../../../figure/kit.ts';

const L = {
  first: '① 속력 v',
  second: '② 속력 2v',
  v: 'v',
  twoV: '2v',
  m: 'm',
  d: 'd',
  pushed: '밀려난 거리',
  howFar: '몇 배?',
  formula: 'Ek = ½ m v²',
} as const;

function rail(ctx: CanvasRenderingContext2D, y: number): void {
  rect(ctx, 30, y, 760, 16, { fill: PEN.wood });
  hatch(ctx, 30, y + 16, 760, 20);
}

function block(ctx: CanvasRenderingContext2D, x: number, y: number, dashed = false): void {
  rect(
    ctx,
    x,
    y - 66,
    74,
    66,
    dashed ? { dash: [9, 7], color: PEN.muted, width: 2.5 } : { fill: PEN.woodDark },
  );
  if (!dashed) {
    line(ctx, [x + 12, y - 46], [x + 62, y - 46], { color: '#a98d64', width: 2 });
    line(ctx, [x + 12, y - 24], [x + 62, y - 24], { color: '#a98d64', width: 2 });
  }
}

/** 그림 4. 수레가 나무토막을 밀어낸 거리 d. 속력을 2배로 하면? */
function draw(ctx: CanvasRenderingContext2D): void {
  formula(ctx, L.formula, [600, 60]);

  // ① 속력 v: 나무토막이 거리 d만큼 밀려난다
  const top = 330;
  tag(ctx, L.first, [40, top - 136], { size: 24, align: 'left' });
  rail(ctx, top);
  cart(ctx, 60, top, 124, PEN.orange, L.m);
  arrow(ctx, [196, top - 36], [286, top - 36], { color: PEN.pencil, width: 5, head: 18 });
  text(ctx, L.v, [240, top - 70], { size: 28, weight: 800, color: PEN.pencil });
  block(ctx, 360, top);
  block(ctx, 520, top, true);
  arrow(ctx, [440, top - 92], [516, top - 92], {
    color: PEN.muted,
    width: 3,
    dash: [8, 7],
    head: 14,
  });
  dimension(ctx, [397, top + 70], [557, top + 70], L.d);
  text(ctx, L.pushed, [477, top + 112], { size: 20, weight: 600, color: PEN.muted });

  // ② 속력 2v: 얼마나 밀려날까?
  const bottom = 720;
  tag(ctx, L.second, [40, bottom - 136], { size: 24, align: 'left', color: PEN.accent });
  rail(ctx, bottom);
  cart(ctx, 60, bottom, 124, PEN.orange, L.m);
  arrow(ctx, [196, bottom - 36], [376, bottom - 36], { color: PEN.pencil, width: 5, head: 18 });
  text(ctx, L.twoV, [286, bottom - 70], { size: 28, weight: 800, color: PEN.pencil });
  block(ctx, 400, bottom);
  line(ctx, [437, bottom + 70], [720, bottom + 70], {
    color: PEN.accent,
    width: 2.5,
    dash: [10, 8],
  });
  line(ctx, [437, bottom + 58], [437, bottom + 82], { color: PEN.accent, width: 2.5 });
  unknown(ctx, [610, bottom + 70], 28);
  text(ctx, L.howFar, [690, bottom + 116], { size: 22, weight: 800, color: PEN.accent });
}

export const kineticEnergyFigure: Extract<PageBlock, { type: 'figure' }> = {
  type: 'figure',
  draw: (ctx, size) => fitFigure(ctx, size, draw),
  text: Object.values(L).join(' '),
  alt: '수레와 나무토막 그림. 위 그림에서 질량 m인 수레가 속력 v로 나무토막에 부딪혀 거리 d만큼 밀어낸다. 아래 그림에서는 같은 수레가 속력 2v로 부딪힐 때 나무토막이 몇 배 밀려날지 물음표로 묻는다.',
};
