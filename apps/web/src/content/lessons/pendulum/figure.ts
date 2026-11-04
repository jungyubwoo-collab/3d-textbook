import type { PageBlock } from '../../../book/types.ts';
import {
  arc,
  circle,
  fitFigure,
  formula,
  ghost,
  hatch,
  line,
  PEN,
  rect,
  tag,
  text,
  unknown,
  type Point,
} from '../../../figure/kit.ts';

const L = {
  pivot: '매단 곳',
  peg: '못',
  start: '처음 높이',
  release: '여기서 놓는다',
  where: '어디까지 올라갈까?',
  formula: 'Ep + Ek = 일정',
} as const;

const PIVOT: Point = [410, 130];
const LENGTH = 400;
const PEG_DEPTH = 230;
const START = (42 * Math.PI) / 180;

/** 그림 5. 줄이 내려오다 못에 걸리는 진자. 추는 반대편에서 어디까지 올라갈까? */
function draw(ctx: CanvasRenderingContext2D): void {
  // 틀
  rect(ctx, 52, 106, 716, 26, { fill: PEN.woodDark, radius: 4 });
  rect(ctx, 64, 132, 22, 498, { fill: PEN.wood });
  rect(ctx, 734, 132, 22, 498, { fill: PEN.wood });
  rect(ctx, 36, 630, 748, 24, { fill: PEN.wood, radius: 4 });
  hatch(ctx, 36, 654, 748, 18);
  circle(ctx, PIVOT, 8, { fill: PEN.steel });
  text(ctx, L.pivot, [PIVOT[0] + 70, PIVOT[1] + 26], { size: 20, weight: 600, color: PEN.muted });

  const peg: Point = [PIVOT[0], PIVOT[1] + PEG_DEPTH];
  const bottom: Point = [PIVOT[0], PIVOT[1] + LENGTH];
  const start: Point = [PIVOT[0] - LENGTH * Math.sin(START), PIVOT[1] + LENGTH * Math.cos(START)];

  // 처음 높이(가로 점선)
  line(ctx, [96, start[1]], [724, start[1]], { color: PEN.accent, width: 2.5, dash: [12, 10] });
  tag(ctx, L.start, [654, start[1] + 32], { size: 22, color: PEN.accent });

  // 내려오는 길: 매단 곳을 중심으로 돈다
  arc(ctx, PIVOT, LENGTH, Math.PI / 2 + START, Math.PI / 2, {
    color: PEN.ink,
    width: 2.5,
    dash: [10, 9],
  });
  // 못에 걸린 뒤: 못을 중심으로 짧아진 줄로 돈다(끝은 모른다)
  arc(ctx, peg, LENGTH - PEG_DEPTH, Math.PI / 2, Math.PI / 2 - 0.85, {
    color: PEN.ink,
    width: 2.5,
    dash: [10, 9],
  });

  // 못에 걸려 올라가는 중인 모습(흐리게)
  ghost(
    ctx,
    () => {
      const angle = 0.55;
      const up: Point = [
        peg[0] + (LENGTH - PEG_DEPTH) * Math.sin(angle),
        peg[1] + (LENGTH - PEG_DEPTH) * Math.cos(angle),
      ];
      line(ctx, PIVOT, peg, { width: 3 });
      line(ctx, peg, up, { width: 3 });
      circle(ctx, up, 24, { fill: PEN.brass });
    },
    0.3,
  );

  // 못
  circle(ctx, peg, 10, { fill: PEN.brass, width: 2.5 });
  line(ctx, [peg[0] + 14, peg[1]], [peg[0] + 60, peg[1] - 30], { width: 2 });
  tag(ctx, L.peg, [peg[0] + 86, peg[1] - 36], { size: 22 });

  // 놓는 곳의 추
  line(ctx, PIVOT, start, { width: 3.5 });
  circle(ctx, start, 26, { fill: PEN.brass, width: 3 });
  tag(ctx, L.release, [start[0] + 20, start[1] + 64], { size: 20, align: 'left' });
  circle(ctx, bottom, 5, { fill: PEN.muted, stroke: false });

  // 어디까지?
  unknown(ctx, [600, 300], 32);
  text(ctx, L.where, [600, 248], { size: 22, weight: 800, color: PEN.accent });

  formula(ctx, L.formula, [410, 760]);
}

export const pendulumFigure: Extract<PageBlock, { type: 'figure' }> = {
  type: 'figure',
  draw: (ctx, size) => fitFigure(ctx, size, draw),
  text: Object.values(L).join(' '),
  alt: '갈릴레이의 진자 그림. 추를 처음 높이에서 놓으면 매단 곳을 중심으로 내려오다가, 줄이 아래의 못에 걸린 뒤 짧아진 줄로 반대편을 따라 올라간다. 처음 높이는 가로 점선으로 표시되어 있고, 추가 어디까지 올라갈지 물음표로 묻는다.',
};
