import { COLORS } from '../book/constants.ts';
import { FONT_FAMILY } from '../book/fonts.ts';
import { ENERGY_COLORS, TINT } from '../scene/palette.ts';

/**
 * 교과서 2D 그림을 그리는 도구. 3D 장면과 같은 물감 색(TINT)을 쓰고,
 * 잉크 선 + 이름표 + 화살표 + 치수선으로 그림만 봐도 실험을 알 수 있게 그린다.
 * 그림은 820 × 940 크기의 설계 좌표로 그리고, fitFigure가 실제 그림 칸에 맞춰 줄인다.
 */
export const PEN = {
  ...TINT,
  ink: COLORS.ink,
  accent: COLORS.accent,
  /** 화살표(속력, 힘)에 쓰는 파란 연필색 */
  pencil: COLORS.pencil,
  muted: COLORS.muted,
  paper: COLORS.paper,
  glass: 'rgba(169, 207, 224, 0.22)',
  potential: ENERGY_COLORS.potential,
  kinetic: ENERGY_COLORS.kinetic,
} as const;

export const DESIGN = { width: 820, height: 940 } as const;

export type Point = [number, number];
type Ctx = CanvasRenderingContext2D;

interface Stroke {
  color?: string;
  width?: number;
  dash?: number[];
}
interface Shape extends Stroke {
  fill?: string;
  /** false면 테두리를 긋지 않는다. */
  stroke?: boolean;
}

/** 설계 좌표(820 × 940)로 그린 그림을 실제 칸에 가운데 맞춰 그린다. */
export function fitFigure(
  ctx: Ctx,
  size: { width: number; height: number },
  draw: (ctx: Ctx) => void,
): void {
  const scale = Math.min(size.width / DESIGN.width, size.height / DESIGN.height);
  ctx.save();
  ctx.translate((size.width - DESIGN.width * scale) / 2, (size.height - DESIGN.height * scale) / 2);
  ctx.scale(scale, scale);
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  draw(ctx);
  ctx.restore();
}

function applyStroke(ctx: Ctx, style: Stroke = {}): void {
  ctx.strokeStyle = style.color ?? PEN.ink;
  ctx.lineWidth = style.width ?? 3;
  ctx.setLineDash(style.dash ?? []);
}

function finish(ctx: Ctx, style: Shape = {}): void {
  if (style.fill) {
    ctx.fillStyle = style.fill;
    ctx.fill();
  }
  if (style.stroke !== false) {
    applyStroke(ctx, style);
    ctx.stroke();
  }
  ctx.setLineDash([]);
}

export function line(ctx: Ctx, from: Point, to: Point, style?: Stroke): void {
  ctx.beginPath();
  ctx.moveTo(...from);
  ctx.lineTo(...to);
  applyStroke(ctx, style);
  ctx.stroke();
  ctx.setLineDash([]);
}

export function path(ctx: Ctx, points: Point[], style: Shape & { close?: boolean } = {}): void {
  const [first, ...rest] = points;
  if (!first) return;
  ctx.beginPath();
  ctx.moveTo(...first);
  for (const point of rest) ctx.lineTo(...point);
  if (style.close) ctx.closePath();
  finish(ctx, style);
}

/** 3차 베지어 곡선(궤적 등) */
export function curve(
  ctx: Ctx,
  from: Point,
  c1: Point,
  c2: Point,
  to: Point,
  style?: Stroke,
): void {
  ctx.beginPath();
  ctx.moveTo(...from);
  ctx.bezierCurveTo(...c1, ...c2, ...to);
  applyStroke(ctx, style);
  ctx.stroke();
  ctx.setLineDash([]);
}

export function rect(
  ctx: Ctx,
  x: number,
  y: number,
  w: number,
  h: number,
  style: Shape & { radius?: number } = {},
): void {
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, style.radius ?? 0);
  finish(ctx, style);
}

export function circle(ctx: Ctx, center: Point, radius: number, style?: Shape): void {
  ctx.beginPath();
  ctx.arc(center[0], center[1], radius, 0, Math.PI * 2);
  finish(ctx, style);
}

/** 원호. 각도는 화면 기준(0 = 오른쪽, 시계 방향) */
export function arc(
  ctx: Ctx,
  center: Point,
  radius: number,
  from: number,
  to: number,
  style?: Stroke,
): void {
  ctx.beginPath();
  ctx.arc(center[0], center[1], radius, from, to, to < from);
  applyStroke(ctx, style);
  ctx.stroke();
  ctx.setLineDash([]);
}

export function ellipse(ctx: Ctx, center: Point, rx: number, ry: number, style?: Shape): void {
  ctx.beginPath();
  ctx.ellipse(center[0], center[1], rx, ry, 0, 0, Math.PI * 2);
  finish(ctx, style);
}

/** 끝에 삼각형 머리가 달린 화살표 */
export function arrow(
  ctx: Ctx,
  from: Point,
  to: Point,
  style: Stroke & { head?: number } = {},
): void {
  const head = style.head ?? 16;
  const angle = Math.atan2(to[1] - from[1], to[0] - from[0]);
  const back: Point = [to[0] - Math.cos(angle) * head * 0.8, to[1] - Math.sin(angle) * head * 0.8];
  line(ctx, from, back, style);
  const color = style.color ?? PEN.ink;
  path(
    ctx,
    [
      to,
      [to[0] - Math.cos(angle - 0.45) * head, to[1] - Math.sin(angle - 0.45) * head],
      [to[0] - Math.cos(angle + 0.45) * head, to[1] - Math.sin(angle + 0.45) * head],
    ],
    { close: true, fill: color, color, width: 1.5 },
  );
}

interface TextStyle {
  size?: number;
  weight?: number;
  color?: string;
  align?: CanvasTextAlign;
}

export function text(ctx: Ctx, value: string, at: Point, style: TextStyle = {}): void {
  ctx.font = `${style.weight ?? 600} ${style.size ?? 26}px ${FONT_FAMILY}`;
  ctx.fillStyle = style.color ?? PEN.ink;
  ctx.textAlign = style.align ?? 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(value, ...at);
}

/** 종이색 바탕을 깐 이름표(모눈 위에서도 잘 읽힌다) */
export function tag(
  ctx: Ctx,
  value: string,
  at: Point,
  style: TextStyle & { fill?: string; border?: string } = {},
): void {
  const size = style.size ?? 24;
  ctx.font = `${style.weight ?? 700} ${size}px ${FONT_FAMILY}`;
  const width = ctx.measureText(value).width + size * 0.9;
  const height = size * 1.55;
  const align = style.align ?? 'center';
  const left = align === 'left' ? at[0] : align === 'right' ? at[0] - width : at[0] - width / 2;
  rect(ctx, left, at[1] - height / 2, width, height, {
    radius: height / 2,
    fill: style.fill ?? PEN.paper,
    color: style.border ?? style.color ?? PEN.ink,
    width: 2,
  });
  text(ctx, value, [left + width / 2, at[1] + 1], { ...style, size, align: 'center' });
}

/** 공식 상자 */
export function formula(ctx: Ctx, value: string, at: Point): void {
  ctx.font = `800 28px ${FONT_FAMILY}`;
  const width = ctx.measureText(value).width + 44;
  rect(ctx, at[0] - width / 2, at[1] - 26, width, 52, {
    radius: 12,
    fill: 'rgba(196, 82, 47, 0.08)',
    color: 'rgba(196, 82, 47, 0.55)',
    width: 2,
  });
  text(ctx, value, [at[0], at[1] + 1], { size: 28, weight: 800, color: PEN.ink });
}

/** 아직 모르는 것: 동그라미 친 물음표 */
export function unknown(ctx: Ctx, at: Point, size = 30): void {
  circle(ctx, at, size, { fill: PEN.paper, color: PEN.accent, width: 3 });
  text(ctx, '?', [at[0], at[1] + size * 0.06], {
    size: size * 1.35,
    weight: 800,
    color: PEN.accent,
  });
}

/** 치수선: 양 끝에 짧은 눈금, 가운데 글자 */
export function dimension(
  ctx: Ctx,
  from: Point,
  to: Point,
  label: string,
  color: string = PEN.ink,
): void {
  const angle = Math.atan2(to[1] - from[1], to[0] - from[0]);
  const nx = -Math.sin(angle) * 10;
  const ny = Math.cos(angle) * 10;
  line(ctx, from, to, { color, width: 2 });
  for (const end of [from, to])
    line(ctx, [end[0] - nx, end[1] - ny], [end[0] + nx, end[1] + ny], { color, width: 2 });
  tag(ctx, label, [(from[0] + to[0]) / 2, (from[1] + to[1]) / 2], { color, size: 22 });
}

/** 바닥이나 레일 아래의 빗금 */
export function hatch(
  ctx: Ctx,
  x: number,
  y: number,
  w: number,
  h: number,
  color: string = PEN.muted,
): void {
  ctx.save();
  ctx.beginPath();
  ctx.rect(x, y, w, h);
  ctx.clip();
  for (let i = -h; i < w; i += 16) line(ctx, [x + i, y + h], [x + i + h, y], { color, width: 1.6 });
  ctx.restore();
  line(ctx, [x, y], [x + w, y], { width: 3 });
}

/** 같은 시간 간격으로 찍은 위치(흐린 그림) */
export function ghost(ctx: Ctx, draw: () => void, alpha = 0.35): void {
  ctx.save();
  ctx.globalAlpha = alpha;
  draw();
  ctx.restore();
}

/** 깃털 모양 */
export function feather(ctx: Ctx, center: Point, tilt: number, style: Shape = {}): void {
  ctx.save();
  ctx.translate(...center);
  ctx.rotate(tilt);
  ctx.beginPath();
  ctx.moveTo(0, -30);
  ctx.bezierCurveTo(16, -18, 13, 16, 0, 30);
  ctx.bezierCurveTo(-11, 16, -15, -14, 0, -30);
  finish(ctx, { fill: style.fill ?? PEN.card, ...style });
  line(ctx, [0, -26], [0, 34], { color: style.color ?? PEN.ink, width: 2 });
  ctx.restore();
}

/** 바퀴 달린 수레(옆모습) */
export function cart(
  ctx: Ctx,
  x: number,
  y: number,
  w: number,
  color: string,
  label?: string,
): void {
  rect(ctx, x, y - 56, w, 42, { radius: 6, fill: color });
  circle(ctx, [x + 22, y - 11], 11, { fill: PEN.steel });
  circle(ctx, [x + w - 22, y - 11], 11, { fill: PEN.steel });
  if (label) text(ctx, label, [x + w / 2, y - 35], { size: 26, weight: 800, color: PEN.ink });
}
