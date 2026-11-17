import type { PageBlock } from '../../../book/types.ts';
import {
  arc,
  arrow,
  cart,
  circle,
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
  formula: 'a = F ÷ m',
  cart: '수레',
  mass: '수레 + 추 = 1 kg',
  pulley: '도르래',
  bumper: '범퍼',
  weight: '추',
  pull: '추의 무게',
  newtons: '0.98 N',
  drop: '0.6 m',
  tape: '기록 테이프: 0.1초마다 수레의 위치를 찍는다',
  widening: '추가 끄는 동안: 점 사이가 점점 넓어진다',
  landed: '추가 바닥에 닿음',
  after: '그 뒤 점 사이의 간격은?',
} as const;

/** 추가 끄는 동안 0.1초마다 수레가 간 거리(m): ½ × 0.98 × t² */
const PULLED = Array.from({ length: 12 }, (_, index) => 0.49 * (index * 0.1) ** 2);

/**
 * 수레와 추 실험 장치와 기록 테이프. 도르래에 걸친 줄 끝의 추가 수레를 끌다가 바닥에 닿는다.
 * 끄는 동안의 점은 그려 두고, 추가 닿은 뒤(끄는 힘이 0)의 점은 물음표로 남긴다.
 */
function draw(ctx: CanvasRenderingContext2D): void {
  formula(ctx, L.formula, [700, 58]);

  // 실험대와 레일
  const top = 200;
  const floor = 470;
  hatch(ctx, 30, floor, 760, 18);
  rect(ctx, 46, top + 16, 16, floor - top - 16, { fill: PEN.woodDark });
  rect(ctx, 520, top + 16, 16, floor - top - 16, { fill: PEN.woodDark });
  rect(ctx, 30, top, 530, 16, { fill: PEN.wood });
  rect(ctx, 40, top - 10, 510, 10, { fill: PEN.metal });

  // 수레(남은 추 두 개를 싣고 있다)와 범퍼
  cart(ctx, 78, top - 10, 128, PEN.orange, L.cart);
  rect(ctx, 96, top - 94, 34, 14, { fill: PEN.brass, radius: 3 });
  rect(ctx, 96, top - 80, 34, 14, { fill: PEN.brass, radius: 3 });
  tag(ctx, L.mass, [150, top - 128], { size: 22 });
  rect(ctx, 500, top - 44, 12, 34, { fill: PEN.steel });
  tag(ctx, L.bumper, [470, top - 74], { size: 20, color: PEN.muted });

  // 줄: 수레 → 도르래 → 추
  const stringY = top - 42;
  const pulley: [number, number] = [578, stringY + 28];
  line(ctx, [560, top + 8], pulley, { width: 6, color: PEN.steel });
  circle(ctx, pulley, 28, { fill: PEN.brass });
  circle(ctx, pulley, 5, { fill: PEN.ink });
  line(ctx, [206, stringY], [pulley[0], stringY], { width: 2.5 });
  arc(ctx, pulley, 28, -Math.PI / 2, 0, { width: 2.5 });
  line(ctx, [pulley[0] + 28, pulley[1]], [pulley[0] + 28, 246], { width: 2.5 });
  tag(ctx, L.pulley, [pulley[0], stringY - 30], { size: 20, color: PEN.muted });

  // 추와 받침, 떨어지는 높이
  const weightBottom = 290;
  rect(ctx, pulley[0] + 4, 246, 48, weightBottom - 246, { fill: PEN.brass, radius: 4 });
  text(ctx, L.weight, [pulley[0] + 28, 269], { size: 22, weight: 800 });
  rect(ctx, pulley[0] - 6, floor - 12, 68, 12, { fill: PEN.red, radius: 3 });
  arrow(ctx, [660, 250], [660, 316], { color: PEN.pencil, width: 5, head: 18 });
  text(ctx, L.pull, [742, 266], { size: 22, weight: 700, color: PEN.pencil });
  text(ctx, L.newtons, [742, 296], { size: 24, weight: 800, color: PEN.pencil });
  dimension(ctx, [706, weightBottom + 44], [706, floor - 12], L.drop, PEN.muted);

  // 기록 테이프
  const tapeY = 606;
  const scale = 560;
  const startX = 74;
  const landX = startX + 0.6 * scale;
  tag(ctx, L.tape, [40, 528], { size: 22, align: 'left' });
  text(ctx, L.widening, [startX - 8, tapeY - 26], {
    size: 20,
    weight: 700,
    color: PEN.pencil,
    align: 'left',
  });
  rect(ctx, 40, tapeY, 740, 62, { fill: '#fffdf6', radius: 4 });
  for (const distance of PULLED) {
    circle(ctx, [startX + distance * scale, tapeY + 31], 7, { fill: PEN.accent, stroke: false });
  }
  line(ctx, [landX, tapeY - 14], [landX, tapeY + 76], {
    color: PEN.accent,
    width: 3,
    dash: [8, 7],
  });
  rect(ctx, landX + 14, tapeY + 8, 780 - landX - 26, 46, {
    radius: 8,
    color: PEN.accent,
    width: 2.5,
    dash: [9, 8],
  });
  unknown(ctx, [(landX + 780) / 2, tapeY + 31], 26);
  tag(ctx, L.landed, [landX - 96, tapeY + 104], { size: 21, color: PEN.accent });
  tag(ctx, L.after, [(landX + 780) / 2 + 20, tapeY + 104], { size: 21, color: PEN.accent });
}

export const newtonFigure: Extract<PageBlock, { type: 'figure' }> = {
  type: 'figure',
  draw: (ctx, size) => fitFigure(ctx, size, draw),
  text: Object.values(L).join(' '),
  alt: '수레와 추 실험 그림. 실험대 위 레일에 놓인 수레가 줄로 도르래를 지나 추와 이어져 있다. 수레와 추를 합친 질량은 1 kg이고, 무게 0.98 N인 추가 0.6 m 떨어지며 수레를 끈다. 아래의 기록 테이프에는 0.1초마다 수레의 위치가 찍혀 있는데, 추가 끄는 동안에는 점 사이가 점점 넓어진다. 추가 바닥에 닿은 뒤의 점 간격은 물음표로 묻는다.',
};
