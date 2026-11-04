import type { PageBlock } from '../../../book/types.ts';
import {
  arrow,
  circle,
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
  m: 'm',
  pull: '줄을 당긴다',
  energy: '위치 에너지',
  atH: '높이 h',
  atTwoH: '높이 2h',
  formula: 'Ep = m g h',
  meters: '0 m 1 m 2 m 3 m',
} as const;

const FLOOR = 790;
/** 1 m가 몇 픽셀인지 */
const METER = 170;

/** 그림 3. 상자를 높이 h까지 올렸다. 2h까지 올리면 위치 에너지는? */
function draw(ctx: CanvasRenderingContext2D): void {
  formula(ctx, L.formula, [410, 46]);

  // 바닥, 기둥, 들보, 도르래
  hatch(ctx, 40, FLOOR, 480, 24);
  rect(ctx, 80, 150, 24, FLOOR - 150, { fill: PEN.wood });
  rect(ctx, 456, 150, 24, FLOOR - 150, { fill: PEN.wood });
  rect(ctx, 68, 128, 424, 26, { fill: PEN.woodDark, radius: 4 });
  line(ctx, [280, 154], [280, 176], { width: 4 });
  circle(ctx, [280, 202], 28, { fill: PEN.steel });
  circle(ctx, [280, 202], 6, { fill: PEN.ink });

  // 눈금자(1 m마다)
  rect(ctx, 122, FLOOR - 3 * METER - 20, 26, 3 * METER + 20, { fill: PEN.card });
  for (let m = 0; m <= 3; m++) {
    const y = FLOOR - m * METER;
    line(ctx, [122, y], [146, y], { width: 3 });
    text(ctx, `${m} m`, [176, y], { size: 20, weight: 700 });
  }

  // 높이 2h(점선 상자): 여기까지 올리면?
  const box = (bottom: number, dashed: boolean) =>
    rect(ctx, 216, bottom - 72, 72, 72, {
      radius: 4,
      ...(dashed ? { dash: [10, 8], color: PEN.accent } : { fill: PEN.orange }),
    });
  box(FLOOR - 2 * METER, true);
  text(ctx, L.m, [252, FLOOR - 2 * METER - 36], { size: 30, weight: 800, color: PEN.accent });
  tag(ctx, L.atTwoH, [372, FLOOR - 2 * METER - 36], { size: 22, color: PEN.accent });
  // 높이 h(실제 상자)와 줄
  box(FLOOR - METER, false);
  text(ctx, L.m, [252, FLOOR - METER - 36], { size: 30, weight: 800 });
  tag(ctx, L.atH, [372, FLOOR - METER - 36], { size: 22 });
  line(ctx, [252, 202], [252, FLOOR - METER - 72], { width: 3 });
  line(ctx, [308, 202], [308, 470], { width: 3 });
  arrow(ctx, [308, 470], [308, 540], { color: PEN.pencil, width: 4, head: 16 });
  text(ctx, L.pull, [318, 470], { size: 20, weight: 700, color: PEN.pencil, align: 'left' });

  // 위치 에너지 막대: 높이 h일 때는 알고, 2h일 때는?
  tag(ctx, L.energy, [680, 236], { size: 24, color: PEN.ink });
  line(ctx, [570, FLOOR], [790, FLOOR], { width: 3 });
  line(ctx, [570, FLOOR], [570, 290], { width: 3 });
  rect(ctx, 600, FLOOR - 150, 66, 150, { fill: PEN.potential });
  text(ctx, L.atH, [633, FLOOR + 30], { size: 21, weight: 700 });
  rect(ctx, 700, 300, 66, FLOOR - 300, { dash: [10, 8], color: PEN.accent, width: 2.5 });
  unknown(ctx, [733, 520], 28);
  text(ctx, L.atTwoH, [733, FLOOR + 30], { size: 21, weight: 700, color: PEN.accent });
}

export const potentialEnergyFigure: Extract<PageBlock, { type: 'figure' }> = {
  type: 'figure',
  draw: (ctx, size) => fitFigure(ctx, size, draw),
  text: Object.values(L).join(' '),
  alt: '도르래 실험대 그림. 줄을 당겨 질량 m인 상자를 높이 h까지 올렸고, 눈금자는 1 m 간격이다. 오른쪽 위치 에너지 막대 그래프에서 높이 h일 때의 막대는 채워져 있고, 높이 2h일 때의 막대는 물음표로 비어 있다.',
};
