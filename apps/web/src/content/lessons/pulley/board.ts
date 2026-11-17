import { fontOf } from '../../../scene/canvasText.ts';
import { liftOf, RIGS, short, type Movable } from './physics.ts';

/**
 * 도르래 실험의 칠판(기록표)과 자 그림.
 * 기록표는 도르래마다 당긴 힘, 당긴 거리, 한 일을 적는다. 힘과 거리는 달라도 일은 같다.
 */

/** 텍스처 해상도(장면 단위당 픽셀) */
const PIXELS = 2000;

/** 칠판 크기(장면 단위) */
export const BOARD = { width: 0.5, height: 0.27 } as const;
export const BOARD_SIZE = { width: BOARD.width * PIXELS, height: BOARD.height * PIXELS } as const;

const CHALK = '#f4ecd6';
const CHALK_DIM = 'rgba(244, 236, 214, 0.62)';
const CHALK_YELLOW = '#ffe08a';

/** 도르래마다 다른 분필 색(막대와 기록표에서 같은 색을 쓴다) */
export const RIG_COLORS: Record<Movable, string> = { 0: '#86d6ff', 1: '#ffb96e', 2: '#ff93a8' };
const RIG_SHORT: Record<Movable, string> = { 0: '고정', 1: '움직 1개', 2: '움직 2개' };

const TEXT = {
  title: '실험 기록',
  rule: '일 = 힘 × 거리',
  columns: ['도르래', '힘(N)', '거리(m)', '일(J)'],
  hint: '세 가지 도르래로 모두 들어 보세요',
  conclusion: '힘은 줄어도 일은 그대로!',
  none: '–',
} as const;

export const BOARD_TEXT = `${Object.values(TEXT).flat().join(' ')} ${Object.values(RIG_SHORT).join(' ')} 0123456789.`;

type Ctx = CanvasRenderingContext2D;

function write(
  ctx: Ctx,
  value: string,
  x: number,
  y: number,
  size: number,
  color: string = CHALK,
  align: CanvasTextAlign = 'left',
  weight = 700,
): void {
  ctx.font = fontOf(weight, size);
  ctx.fillStyle = color;
  ctx.textAlign = align;
  ctx.textBaseline = 'middle';
  ctx.fillText(value, x, y);
}

const COLUMNS = [596, 760, 908] as const;

/** 칠판을 그린다. lifted는 끝까지 들어 올려 본 도르래 */
export function drawBoard(ctx: Ctx, lifted: readonly Movable[]): void {
  const { width: w, height: h } = BOARD_SIZE;
  const shade = ctx.createRadialGradient(w * 0.4, h * 0.4, 40, w * 0.5, h * 0.5, w * 0.7);
  shade.addColorStop(0, '#2d544d');
  shade.addColorStop(1, '#1d3a36');
  ctx.fillStyle = shade;
  ctx.fillRect(0, 0, w, h);

  write(ctx, TEXT.title, 36, 52, 44, CHALK, 'left', 800);
  write(ctx, TEXT.rule, w - 36, 52, 36, CHALK_YELLOW, 'right');
  write(ctx, TEXT.columns[0], 78, 118, 32, CHALK_DIM);
  COLUMNS.forEach((x, index) =>
    write(ctx, TEXT.columns[index + 1] ?? '', x, 118, 32, CHALK_DIM, 'center'),
  );
  ctx.strokeStyle = CHALK_DIM;
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(36, 146);
  ctx.lineTo(w - 36, 146);
  ctx.stroke();

  RIGS.forEach((rig, index) => {
    const y = 196 + index * 70;
    const done = lifted.includes(rig);
    ctx.beginPath();
    ctx.arc(52, y, 11, 0, Math.PI * 2);
    ctx.fillStyle = RIG_COLORS[rig];
    ctx.fill();
    write(ctx, RIG_SHORT[rig], 78, y, 40, done ? CHALK : CHALK_DIM);
    const lift = liftOf(rig);
    const values = done
      ? [short(lift.force), short(lift.distance), short(lift.work)]
      : [TEXT.none, TEXT.none, TEXT.none];
    values.forEach((value, column) =>
      write(
        ctx,
        value,
        COLUMNS[column] ?? 0,
        y,
        48,
        !done ? CHALK_DIM : column === 2 ? CHALK_YELLOW : CHALK,
        'center',
        800,
      ),
    );
  });

  if (RIGS.every((rig) => lifted.includes(rig))) {
    ctx.beginPath();
    ctx.roundRect(36, 404, w - 72, 104, 18);
    ctx.fillStyle = 'rgba(255, 224, 138, 0.14)';
    ctx.fill();
    ctx.strokeStyle = CHALK_YELLOW;
    ctx.lineWidth = 4;
    ctx.stroke();
    write(ctx, TEXT.conclusion, w / 2, 458, 50, CHALK_YELLOW, 'center', 800);
  } else {
    write(ctx, TEXT.hint, w / 2, 458, 34, CHALK_DIM, 'center');
  }
}

export const RULER_TEXT = '0 0.2 0.4 0.8 1.2 1.6 m';

/**
 * 눈금자를 그린다(캔버스 가득). 가로 자는 왼쪽 끝이 0, 세로 자는 아래 끝이 0이다.
 * meter: 1 m의 길이(장면 단위), length: 자의 길이(m), step: 눈금 간격(m), labels: 숫자를 쓸 곳(m)
 */
export function drawRuler(
  ctx: Ctx,
  {
    vertical,
    meter,
    margin,
    length,
    step,
    labels,
  }: {
    vertical: boolean;
    meter: number;
    /** 0 눈금 앞의 여백(장면 단위) */
    margin: number;
    length: number;
    step: number;
    labels: number[];
  },
): void {
  const { width: w, height: h } = ctx.canvas;
  ctx.fillStyle = '#f0dca4';
  ctx.fillRect(0, 0, w, h);
  ctx.strokeStyle = '#25221e';
  ctx.lineWidth = 4;
  ctx.strokeRect(2, 2, w - 4, h - 4);
  ctx.fillStyle = '#25221e';
  ctx.textBaseline = 'middle';
  const at = (meters: number): number => (margin + meters * meter) * PIXELS;
  ctx.lineWidth = 3;
  for (let i = 0; i * step <= length + 1e-9; i++) {
    const value = i * step;
    const major = labels.some((label) => Math.abs(label - value) < 1e-9);
    const size = major ? 0.42 : 0.24;
    ctx.beginPath();
    if (vertical) {
      ctx.moveTo(w, h - at(value));
      ctx.lineTo(w * (1 - size), h - at(value));
    } else {
      ctx.moveTo(at(value), 0);
      ctx.lineTo(at(value), h * size);
    }
    ctx.stroke();
  }
  for (const value of labels) {
    const text = value === labels.at(-1) ? `${short(value)} m` : short(value);
    if (vertical) {
      ctx.font = fontOf(800, 30);
      ctx.textAlign = 'left';
      ctx.fillText(text, 8, h - at(value));
    } else {
      ctx.font = fontOf(800, 36);
      ctx.textAlign = 'center';
      ctx.fillText(text, at(value), h * 0.7);
    }
  }
}

/** 자 텍스처의 크기(픽셀): 장면 단위의 가로, 세로 길이로 정한다. */
export function rulerPixels(width: number, height: number): [number, number] {
  return [Math.round(width * PIXELS), Math.round(height * PIXELS)];
}
