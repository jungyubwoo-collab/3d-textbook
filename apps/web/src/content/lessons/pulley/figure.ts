import type { PageBlock } from '../../../book/types.ts';
import {
  arc,
  arrow,
  circle,
  dimension,
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
} from '../../../figure/kit.ts';

const L = {
  formula: '일 = 힘 × 이동 거리',
  fixed: '고정 도르래',
  movable: '움직도르래',
  load: '10 N',
  height: '0.4 m',
  fixedForce: '힘 10 N',
  fixedRope: '줄을 0.4 m 당김',
  movableForce: '힘 5 N',
  movableRope: '줄을 얼마나 당길까?',
  strands: '두 가닥이 나눠 든다',
} as const;

const BEAM = 150;
const FLOOR = 800;
/** 그림에서 0.4 m의 길이 */
const LIFT = 150;

/** 천장(들보)과 바닥 */
function room(ctx: CanvasRenderingContext2D, x: number, width: number): void {
  rect(ctx, x, BEAM - 22, width, 22, { fill: PEN.woodDark });
  hatch(ctx, x, FLOOR, width, 18);
}

function pulley(ctx: CanvasRenderingContext2D, center: [number, number], radius = 34): void {
  circle(ctx, center, radius, { fill: PEN.brass });
  circle(ctx, center, 6, { fill: PEN.ink });
}

/** 무게 10 N인 물체: bottom은 밑면의 높이, 올라가기 전 자리는 흐리게 */
function load(ctx: CanvasRenderingContext2D, x: number, bottom: number): void {
  ghost(ctx, () => rect(ctx, x - 44, FLOOR - 78, 88, 78, { fill: PEN.brass, radius: 4 }), 0.3);
  rect(ctx, x - 44, bottom - 78, 88, 78, { fill: PEN.brass, radius: 4 });
  text(ctx, L.load, [x, bottom - 38], { size: 26, weight: 800 });
}

/**
 * 고정 도르래와 움직도르래로 같은 물체를 같은 높이만큼 들어 올린다.
 * 고정 도르래는 힘도 당긴 줄의 길이도 그대로다. 움직도르래는 힘이 절반인데, 당긴 줄의 길이는 물음표로 남긴다.
 */
function draw(ctx: CanvasRenderingContext2D): void {
  formula(ctx, L.formula, [410, 56]);

  // 왼쪽: 고정 도르래
  const a = 130;
  room(ctx, 40, 330);
  line(ctx, [a + 34, BEAM], [a + 34, BEAM + 40], { width: 6, color: PEN.steel });
  pulley(ctx, [a + 34, BEAM + 74]);
  tag(ctx, L.fixed, [a + 160, BEAM + 74], { size: 22, color: PEN.muted });
  const raised = FLOOR - LIFT;
  load(ctx, a, raised);
  line(ctx, [a, raised - 78], [a, BEAM + 74], { width: 2.5 });
  arc(ctx, [a + 34, BEAM + 74], 34, Math.PI, 0, { width: 2.5 });
  line(ctx, [a + 68, BEAM + 74], [a + 68, 520], { width: 2.5 });
  arrow(ctx, [a + 68, 420], [a + 68, 540], { color: PEN.pencil, width: 5, head: 18 });
  tag(ctx, L.fixedForce, [a + 140, 440], { size: 22, color: PEN.pencil });
  tag(ctx, L.fixedRope, [a + 166, 494], { size: 21, color: PEN.pencil });
  dimension(ctx, [a - 78, raised], [a - 78, FLOOR], L.height, PEN.muted);

  // 오른쪽: 움직도르래(줄 한쪽 끝은 천장에 묶고, 고정 도르래로 당기는 방향만 바꾼다)
  const b = 566;
  room(ctx, 420, 370);
  const wheel: [number, number] = [b, raised - 78 - 60];
  load(ctx, b, raised);
  line(ctx, [b, raised - 78], [b, wheel[1]], { width: 6, color: PEN.steel });
  pulley(ctx, wheel);
  line(ctx, [b - 34, BEAM], [b - 34, wheel[1]], { width: 2.5 });
  arc(ctx, wheel, 34, 0, Math.PI, { width: 2.5 });
  line(ctx, [b + 34, wheel[1]], [b + 34, BEAM + 74], { width: 2.5 });
  line(ctx, [b + 68, BEAM], [b + 68, BEAM + 40], { width: 6, color: PEN.steel });
  pulley(ctx, [b + 68, BEAM + 74]);
  arc(ctx, [b + 68, BEAM + 74], 34, Math.PI, 0, { width: 2.5 });
  line(ctx, [b + 102, BEAM + 74], [b + 102, 520], { width: 2.5 });
  arrow(ctx, [b + 102, 420], [b + 102, 540], { color: PEN.accent, width: 5, head: 18 });
  tag(ctx, L.movable, [b - 114, wheel[1]], { size: 22, color: PEN.muted });
  tag(ctx, L.strands, [b - 120, wheel[1] - 96], { size: 20, color: PEN.muted });
  tag(ctx, L.movableForce, [b + 180, 440], { size: 22, color: PEN.accent });
  unknown(ctx, [b + 176, 512], 26);
  tag(ctx, L.movableRope, [b + 146, 596], { size: 21, color: PEN.accent });
  dimension(ctx, [b - 96, raised], [b - 96, FLOOR], L.height, PEN.muted);
}

export const pulleyFigure: Extract<PageBlock, { type: 'figure' }> = {
  type: 'figure',
  draw: (ctx, size) => fitFigure(ctx, size, draw),
  text: Object.values(L).join(' '),
  alt: '도르래 그림 두 개. 왼쪽은 고정 도르래로 무게 10 N인 물체를 0.4 m 들어 올리는데, 힘 10 N으로 줄을 0.4 m 당긴다. 오른쪽은 움직도르래로 같은 물체를 0.4 m 들어 올리는데, 줄 두 가닥이 물체를 나눠 들어 힘은 5 N이다. 이때 당겨야 하는 줄의 길이를 물음표로 묻는다. 일은 힘과 이동 거리를 곱한 값이다.',
};
