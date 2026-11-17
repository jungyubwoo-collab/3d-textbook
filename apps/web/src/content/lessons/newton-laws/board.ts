import { fontOf } from '../../../scene/canvasText.ts';
import { planRun, type Setup } from './physics.ts';

/**
 * 실험대 뒤에 서는 칠판: 왼쪽은 속력–시간 그래프, 오른쪽은 실험 기록표.
 * 그래프의 기울기가 가속도라서, 힘이나 질량을 바꾼 실험을 겹쳐 그리면 기울기가 어떻게 달라지는지 보인다.
 * 지금 달리는 수레의 선은 장면이 따로(칠판 위의 빛나는 선으로) 그리고, 끝난 실험만 여기에 분필로 남긴다.
 */

/** 칠판 크기(장면 단위)와 텍스처 해상도(단위당 픽셀) */
export const BOARD = { width: 0.92, height: 0.36, pixels: 2000 } as const;
const W = BOARD.width * BOARD.pixels;
const H = BOARD.height * BOARD.pixels;

/** 그래프가 그려지는 칸(텍스처 픽셀)과 축의 범위 */
const PLOT = { left: 176, right: 1100, top: 128, bottom: 584, tMax: 3.2, vMax: 2 } as const;

const CHALK = '#f4ecd6';
const CHALK_DIM = 'rgba(244, 236, 214, 0.62)';
const CHALK_FAINT = 'rgba(244, 236, 214, 0.15)';
const CHALK_YELLOW = '#ffe08a';

/** 끄는 힘(추의 개수)마다 다른 분필 색 */
const FORCE_COLORS: Record<Setup['weights'], string> = {
  1: '#86d6ff',
  2: '#ffb96e',
  3: '#ff93a8',
};
/** 질량(벽돌의 개수)마다 다른 선 모양: 실선, 긴 점선, 짧은 점선 */
const MASS_DASHES: Record<Setup['bricks'], number[]> = {
  0: [],
  1: [26, 16],
  2: [5, 15],
};

export const lineColorOf = (setup: Setup): string => FORCE_COLORS[setup.weights];

const TEXT = {
  graph: '속력–시간 그래프',
  slope: '기울기 = 가속도',
  time: '시간 (s)',
  speed: '속력 (m/s)',
  empty: '출발을 누르면 그래프가 그려져요',
  table: '실험 기록',
  force: '힘(N)',
  mass: '질량(kg)',
  acceleration: '가속도(m/s²)',
  hint: ['한 가지만 바꿔 가며', '견주어 보세요'],
  conclusion: '가속도 = 힘 ÷ 질량',
  slow: '1.5배 느린 화면',
} as const;

/** 칠판에 쓰는 글자 전부(글꼴을 미리 받는 데 쓴다) */
export const BOARD_TEXT = `${Object.values(TEXT).flat().join(' ')} 0123456789.`;

const plotX = (t: number): number => PLOT.left + (t / PLOT.tMax) * (PLOT.right - PLOT.left);
const plotY = (v: number): number => PLOT.bottom - (v / PLOT.vMax) * (PLOT.bottom - PLOT.top);

/** 그래프의 점 (시간 t초, 속력 v m/s)의 칠판 위 자리(칠판 가운데가 원점인 장면 단위) */
export function boardPoint(t: number, v: number): [x: number, y: number] {
  return [(plotX(t) - W / 2) / BOARD.pixels, (H / 2 - plotY(v)) / BOARD.pixels];
}

type Ctx = CanvasRenderingContext2D;

function chalkLine(ctx: Ctx, points: [number, number][], color: string, width: number): void {
  const [first, ...rest] = points;
  if (!first) return;
  ctx.beginPath();
  ctx.moveTo(...first);
  for (const point of rest) ctx.lineTo(...point);
  ctx.strokeStyle = color;
  ctx.lineWidth = width;
  ctx.stroke();
}

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

function drawGraph(ctx: Ctx, records: Setup[], hint: boolean): void {
  write(ctx, TEXT.graph, 60, 58, 46, CHALK, 'left', 800);
  write(ctx, TEXT.slope, PLOT.right, 58, 38, CHALK_YELLOW, 'right');

  // 모눈
  for (let t = 0.5; t <= PLOT.tMax; t += 0.5) {
    chalkLine(
      ctx,
      [
        [plotX(t), PLOT.top],
        [plotX(t), PLOT.bottom],
      ],
      CHALK_FAINT,
      2,
    );
  }
  for (let v = 0.5; v <= PLOT.vMax; v += 0.5) {
    chalkLine(
      ctx,
      [
        [PLOT.left, plotY(v)],
        [PLOT.right, plotY(v)],
      ],
      CHALK_FAINT,
      2,
    );
  }
  // 축
  chalkLine(
    ctx,
    [
      [PLOT.left, PLOT.top - 22],
      [PLOT.left, PLOT.bottom],
      [PLOT.right + 22, PLOT.bottom],
    ],
    CHALK,
    5,
  );
  for (let t = 0; t <= 3; t++)
    write(ctx, String(t), plotX(t), PLOT.bottom + 40, 40, CHALK, 'center');
  for (let v = 0; v <= 2; v++) write(ctx, String(v), PLOT.left - 24, plotY(v), 40, CHALK, 'right');
  write(ctx, TEXT.time, PLOT.right + 22, PLOT.bottom + 92, 36, CHALK_DIM, 'right');
  write(ctx, TEXT.speed, 40, PLOT.top - 22, 36, CHALK_DIM, 'left');
  write(ctx, TEXT.slow, PLOT.left + 16, PLOT.bottom + 92, 30, CHALK_FAINT.replace('0.15', '0.42'));

  if (hint) {
    write(
      ctx,
      TEXT.empty,
      (PLOT.left + PLOT.right) / 2,
      (PLOT.top + PLOT.bottom) / 2,
      40,
      CHALK_DIM,
      'center',
    );
  }
  // 끝난 실험: 힘이 끄는 동안은 비스듬히 오르고, 추가 닿은 뒤로는 평평하다.
  for (const record of records) {
    const run = planRun(record);
    ctx.setLineDash(MASS_DASHES[record.bricks]);
    chalkLine(
      ctx,
      [
        [plotX(0), plotY(0)],
        [plotX(run.landAt), plotY(run.topSpeed)],
        [plotX(run.hitAt), plotY(run.topSpeed)],
      ],
      lineColorOf(record),
      9,
    );
    ctx.setLineDash([]);
    ctx.beginPath();
    ctx.arc(plotX(run.landAt), plotY(run.topSpeed), 11, 0, Math.PI * 2);
    ctx.fillStyle = lineColorOf(record);
    ctx.fill();
  }
}

const TABLE = { left: 1184, right: 1806, columns: [1326, 1478, 1678] as const };

function drawTable(ctx: Ctx, records: Setup[], concluded: boolean): void {
  write(ctx, TEXT.table, TABLE.left, 58, 46, CHALK, 'left', 800);
  [TEXT.force, TEXT.mass, TEXT.acceleration].forEach((title, index) =>
    write(ctx, title, TABLE.columns[index] ?? 0, 138, 37, CHALK_DIM, 'center'),
  );
  chalkLine(
    ctx,
    [
      [TABLE.left, 172],
      [TABLE.right, 172],
    ],
    CHALK_DIM,
    3,
  );
  records.forEach((record, index) => {
    const run = planRun(record);
    const y = 226 + index * 76;
    ctx.setLineDash(MASS_DASHES[record.bricks]);
    chalkLine(
      ctx,
      [
        [TABLE.left, y],
        [TABLE.left + 56, y],
      ],
      lineColorOf(record),
      10,
    );
    ctx.setLineDash([]);
    [run.force.toFixed(2), String(run.mass), run.a.toFixed(2)].forEach((value, column) =>
      write(ctx, value, TABLE.columns[column] ?? 0, y, 54, CHALK, 'center', 800),
    );
  });

  // 아래 칸: 과제를 다 하면 결론, 그 전에는 실험하는 요령
  if (concluded) {
    ctx.beginPath();
    ctx.roundRect(TABLE.left, 556, TABLE.right - TABLE.left, 116, 20);
    ctx.fillStyle = 'rgba(255, 224, 138, 0.14)';
    ctx.fill();
    ctx.strokeStyle = CHALK_YELLOW;
    ctx.lineWidth = 4;
    ctx.stroke();
    write(
      ctx,
      TEXT.conclusion,
      (TABLE.left + TABLE.right) / 2,
      616,
      56,
      CHALK_YELLOW,
      'center',
      800,
    );
  } else {
    TEXT.hint.forEach((line, index) =>
      write(ctx, line, (TABLE.left + TABLE.right) / 2, 590 + index * 48, 36, CHALK_DIM, 'center'),
    );
  }
}

/**
 * 칠판을 그린다. records는 끝난 실험(오래된 것부터), concluded는 탐구 과제를 다 했는지,
 * hint는 그래프 칸에 "출발을 누르면…" 안내를 쓸지(아직 아무것도 그리지 않았을 때)
 */
export function drawBoard(ctx: Ctx, records: Setup[], concluded: boolean, hint: boolean): void {
  const shade = ctx.createRadialGradient(W * 0.42, H * 0.4, 60, W * 0.5, H * 0.5, W * 0.62);
  shade.addColorStop(0, '#2d544d');
  shade.addColorStop(1, '#1d3a36');
  ctx.fillStyle = shade;
  ctx.fillRect(0, 0, W, H);
  // 지우개로 문지른 자국
  ctx.strokeStyle = 'rgba(244, 236, 214, 0.035)';
  ctx.lineWidth = 46;
  ctx.lineCap = 'round';
  for (const [x, y, length] of [
    [220, 250, 560],
    [760, 470, 420],
    [1260, 330, 380],
    [420, 640, 700],
  ] as const) {
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x + length, y - 34);
    ctx.stroke();
  }
  ctx.lineJoin = 'round';

  drawGraph(ctx, records, hint);
  chalkLine(
    ctx,
    [
      [1150, 40],
      [1150, H - 40],
    ],
    CHALK_FAINT,
    4,
  );
  drawTable(ctx, records, concluded);
}

/** 실험대 앞면에 붙는 기록 테이프(위)와 자(아래)의 크기(장면 단위) */
export const TAPE = { width: 0.74, height: 0.068 } as const;
/** 테이프 윗줄(점이 찍히는 종이 띠)의 가운데가 테이프 윗변에서 얼마나 내려와 있는지(장면 단위) */
export const TAPE_DOT_DROP = 0.017;

export const TAPE_TEXT = '0 0.5 m 1 m';

/**
 * 기록 테이프와 자를 그린다.
 * start: 수레가 출발하는 곳(테이프 왼쪽 끝에서 잰 장면 단위), meter: 1 m의 길이(장면 단위),
 * land: 추가 바닥에 닿을 때까지 수레가 가는 거리(m), end: 범퍼까지의 거리(m)
 */
export function drawTape(
  ctx: Ctx,
  { start, meter, land, end }: { start: number; meter: number; land: number; end: number },
): void {
  const w = TAPE.width * BOARD.pixels;
  const h = TAPE.height * BOARD.pixels;
  const band = TAPE_DOT_DROP * 2 * BOARD.pixels;
  const xOf = (meters: number): number => (start + meters * meter) * BOARD.pixels;

  // 위: 점이 찍히는 종이 띠
  ctx.fillStyle = '#fffdf6';
  ctx.fillRect(0, 0, w, band);
  // 아래: 자
  ctx.fillStyle = '#f0dca4';
  ctx.fillRect(0, band, w, h - band);
  ctx.strokeStyle = '#25221e';
  ctx.lineWidth = 4;
  ctx.strokeRect(2, 2, w - 4, h - 4);
  ctx.beginPath();
  ctx.moveTo(0, band);
  ctx.lineTo(w, band);
  ctx.stroke();

  // 0.1 m마다 눈금, 0.5 m마다 긴 눈금과 숫자
  ctx.lineWidth = 3;
  for (let i = 0; i * 0.1 <= end + 1e-9; i++) {
    const major = i % 5 === 0;
    ctx.beginPath();
    ctx.moveTo(xOf(i * 0.1), band);
    ctx.lineTo(xOf(i * 0.1), band + (major ? 30 : 16));
    ctx.stroke();
  }
  ctx.fillStyle = '#25221e';
  ctx.font = fontOf(800, 34);
  ctx.textBaseline = 'middle';
  ctx.textAlign = 'center';
  ctx.fillText('0', xOf(0), band + 50);
  ctx.fillText('0.5 m', xOf(0.5), band + 50);
  ctx.fillText('1 m', xOf(1), band + 50);

  // 추가 바닥에 닿는 곳: 빨간 점선과 세모
  ctx.strokeStyle = '#c4522f';
  ctx.fillStyle = '#c4522f';
  ctx.lineWidth = 5;
  ctx.setLineDash([12, 9]);
  ctx.beginPath();
  ctx.moveTo(xOf(land), 0);
  ctx.lineTo(xOf(land), h);
  ctx.stroke();
  ctx.setLineDash([]);
  ctx.beginPath();
  ctx.moveTo(xOf(land), band + 4);
  ctx.lineTo(xOf(land) - 16, band + 30);
  ctx.lineTo(xOf(land) + 16, band + 30);
  ctx.closePath();
  ctx.fill();
}
