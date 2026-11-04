import { COLORS } from './constants.ts';
import { FONT_FAMILY } from './fonts.ts';
import type { DrawItem, PageLayout, Rect, Region } from './typeset.ts';
import type { PageStyle } from './types.ts';

/** 페이지에 그릴 문항 상태 (문항 ID별) */
export interface AnswerView {
  choiceId: string;
  revealed: boolean;
  correct: boolean;
  /** 도장 애니메이션이 끝나기 전에는 텍스처에 도장을 그리지 않는다. */
  stampPending: boolean;
}
export type AnswerViews = Readonly<Record<string, AnswerView | undefined>>;

export const STAMP_ROTATION = -0.21;

export function paintPage(
  ctx: CanvasRenderingContext2D,
  layout: PageLayout,
  options: { style: PageStyle; side: 'left' | 'right'; seed: string; answers: AnswerViews },
): void {
  const { width, height } = ctx.canvas;
  ctx.save();
  ctx.clearRect(0, 0, width, height);
  paintBackground(ctx, options.style, options.side, hashSeed(options.seed));
  for (const item of layout.items) drawItem(ctx, item);
  for (const region of layout.regions)
    paintRegion(ctx, region, options.answers[questionIdOf(region) ?? '']);
  ctx.restore();
}

function questionIdOf(region: Region): string | undefined {
  return region.kind === 'link' ? undefined : region.questionId;
}

function paintRegion(
  ctx: CanvasRenderingContext2D,
  region: Region,
  answer: AnswerView | undefined,
): void {
  switch (region.kind) {
    case 'choice': {
      if (answer?.choiceId === region.choiceId) drawCheck(ctx, region.box);
      if (!answer?.revealed) return;
      // 채점: 정답에는 동그라미, 틀리게 고른 보기에는 빗금
      if (region.isAnswer) drawGradeCircle(ctx, region.label);
      else if (answer.choiceId === region.choiceId) drawGradeSlash(ctx, region.label);
      return;
    }
    case 'answer':
      if (answer?.revealed) {
        roundRect(ctx, region.rect, 12);
        ctx.fillStyle = 'rgba(196, 82, 47, 0.06)';
        ctx.fill();
        ctx.setLineDash([6, 6]);
        ctx.strokeStyle = COLORS.accentLine;
        ctx.lineWidth = 1.5;
        ctx.stroke();
        ctx.setLineDash([]);
        for (const item of region.items) drawItem(ctx, item);
      } else {
        ctx.save();
        ctx.translate(region.rect.x, region.rect.y);
        drawFlapFace(ctx, region.rect.w, region.rect.h, true);
        ctx.restore();
      }
      return;
    case 'stamp':
      if (answer?.revealed && answer.correct && !answer.stampPending) {
        const stamp = getStampCanvas();
        const size = region.radius * 2;
        ctx.save();
        ctx.translate(region.x, region.y);
        ctx.rotate(STAMP_ROTATION);
        ctx.drawImage(stamp, -size / 2, -size / 2, size, size);
        ctx.restore();
      }
      return;
    case 'link':
      return;
  }
}

function drawItem(ctx: CanvasRenderingContext2D, item: DrawItem): void {
  switch (item.kind) {
    case 'text':
      ctx.font = item.font;
      ctx.fillStyle = item.color;
      ctx.textAlign = item.align ?? 'left';
      ctx.textBaseline = 'middle';
      ctx.fillText(item.text, item.x, item.y);
      return;
    case 'box':
      roundRect(ctx, item.rect, item.radius ?? 0);
      if (item.fill) {
        ctx.fillStyle = item.fill;
        ctx.fill();
      }
      if (item.stroke) {
        ctx.setLineDash(item.dash ?? []);
        ctx.strokeStyle = item.stroke;
        ctx.lineWidth = item.lineWidth ?? 1;
        ctx.stroke();
        ctx.setLineDash([]);
      }
      return;
    case 'line':
      ctx.beginPath();
      ctx.moveTo(item.x1, item.y1);
      ctx.lineTo(item.x2, item.y2);
      ctx.setLineDash(item.dash ?? []);
      ctx.strokeStyle = item.color;
      ctx.lineWidth = item.lineWidth;
      ctx.lineCap = 'round';
      ctx.stroke();
      ctx.setLineDash([]);
      return;
  }
}

function roundRect(ctx: CanvasRenderingContext2D, rect: Rect, radius: number): void {
  ctx.beginPath();
  ctx.roundRect(rect.x, rect.y, rect.w, rect.h, radius);
}

/** 접힌 덮개의 겉면. 페이지 텍스처와 3D 덮개가 같은 그림을 쓴다. */
export function drawFlapFace(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  withShadow: boolean,
): void {
  ctx.save();
  if (withShadow) {
    ctx.shadowColor = 'rgba(60, 40, 10, 0.22)';
    ctx.shadowBlur = 14;
    ctx.shadowOffsetY = 5;
  }
  roundRect(ctx, { x: 0, y: 0, w: width, h: height }, 12);
  ctx.fillStyle = COLORS.flap;
  ctx.fill();
  ctx.restore();

  ctx.save();
  roundRect(ctx, { x: 1, y: 1, w: width - 2, h: height - 2 }, 11);
  ctx.strokeStyle = COLORS.flapEdge;
  ctx.lineWidth = 2;
  ctx.stroke();
  // 종이 결
  const random = mulberry32(7);
  ctx.globalAlpha = 0.05;
  ctx.fillStyle = '#5a4520';
  for (let i = 0; i < (width * height) / 900; i++) {
    ctx.fillRect(random() * width, random() * height, 1.5, 1.5);
  }
  ctx.globalAlpha = 1;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = COLORS.flapText;
  ctx.font = `800 26px ${FONT_FAMILY}`;
  ctx.fillText('정답과 해설', width / 2, height / 2 - 18);
  ctx.font = `400 19px ${FONT_FAMILY}`;
  ctx.fillText('덮개를 눌러 들춰 보세요', width / 2, height / 2 + 20);
  ctx.restore();
}

/** 파란 펜 체크 표시 */
function drawCheck(ctx: CanvasRenderingContext2D, box: Rect): void {
  ctx.save();
  ctx.strokeStyle = COLORS.pencil;
  ctx.lineWidth = 5.5;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.beginPath();
  ctx.moveTo(box.x + box.w * 0.12, box.y + box.h * 0.52);
  ctx.quadraticCurveTo(
    box.x + box.w * 0.3,
    box.y + box.h * 0.72,
    box.x + box.w * 0.42,
    box.y + box.h * 0.88,
  );
  ctx.quadraticCurveTo(
    box.x + box.w * 0.7,
    box.y + box.h * 0.3,
    box.x + box.w * 1.15,
    box.y - box.h * 0.12,
  );
  ctx.stroke();
  ctx.restore();
}

/** 빨간 채점 동그라미 */
function drawGradeCircle(ctx: CanvasRenderingContext2D, rect: Rect): void {
  ctx.save();
  ctx.strokeStyle = COLORS.grade;
  ctx.lineWidth = 4;
  ctx.lineCap = 'round';
  ctx.beginPath();
  const cx = rect.x + rect.w / 2;
  const cy = rect.y + rect.h / 2;
  for (let i = 0; i <= 64; i++) {
    const t = -0.35 * Math.PI + (i / 64) * 2.15 * Math.PI;
    const wobble = 1 + 0.035 * Math.sin(t * 3);
    const x = cx + Math.cos(t) * (rect.w / 2 + 10) * wobble;
    const y = cy + Math.sin(t) * (rect.h / 2 + 4) * wobble;
    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  }
  ctx.stroke();
  ctx.restore();
}

/** 빨간 채점 빗금 */
function drawGradeSlash(ctx: CanvasRenderingContext2D, rect: Rect): void {
  ctx.save();
  ctx.strokeStyle = COLORS.grade;
  ctx.lineWidth = 4.5;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(rect.x + 6, rect.y + rect.h - 2);
  ctx.lineTo(rect.x + Math.min(rect.w, 90) - 4, rect.y + 2);
  ctx.stroke();
  ctx.restore();
}

let stampCanvas: HTMLCanvasElement | null = null;

/** "참 잘했어요" 도장 그림 (투명 배경, 512px). 페이지와 3D 도장 효과가 함께 쓴다. */
export function getStampCanvas(): HTMLCanvasElement {
  if (stampCanvas) return stampCanvas;
  const size = 512;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  if (!ctx) return canvas;
  const r = size / 2;
  ctx.translate(r, r);
  ctx.strokeStyle = COLORS.grade;
  ctx.fillStyle = COLORS.grade;
  ctx.lineWidth = r * 0.085;
  ctx.beginPath();
  ctx.arc(0, 0, r * 0.9, 0, Math.PI * 2);
  ctx.stroke();
  ctx.lineWidth = r * 0.03;
  ctx.beginPath();
  ctx.arc(0, 0, r * 0.74, 0, Math.PI * 2);
  ctx.stroke();
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.font = `900 ${Math.round(r * 0.66)}px ${FONT_FAMILY}`;
  ctx.fillText('참', 0, -r * 0.13);
  ctx.font = `800 ${Math.round(r * 0.22)}px ${FONT_FAMILY}`;
  ctx.fillText('잘했어요', 0, r * 0.42);
  // 잉크가 덜 묻은 자국
  ctx.globalCompositeOperation = 'destination-out';
  const random = mulberry32(42);
  for (let i = 0; i < 260; i++) {
    const angle = random() * Math.PI * 2;
    const distance = Math.sqrt(random()) * r;
    ctx.globalAlpha = 0.3 + random() * 0.6;
    ctx.beginPath();
    ctx.arc(
      Math.cos(angle) * distance,
      Math.sin(angle) * distance,
      1 + random() * 3.5,
      0,
      Math.PI * 2,
    );
    ctx.fill();
  }
  stampCanvas = canvas;
  return canvas;
}

function paintBackground(
  ctx: CanvasRenderingContext2D,
  style: PageStyle,
  side: 'left' | 'right',
  seed: number,
): void {
  const { width, height } = ctx.canvas;
  const random = mulberry32(seed);
  const cover = style === 'cover-front' || style === 'cover-back';

  ctx.fillStyle = cover ? COLORS.cloth : style === 'endpaper' ? COLORS.endpaper : COLORS.paper;
  ctx.fillRect(0, 0, width, height);

  if (cover) {
    // 천 결
    ctx.globalAlpha = 0.06;
    for (let y = 0; y < height; y += 3) {
      ctx.fillStyle = random() > 0.5 ? '#ffffff' : '#000000';
      ctx.fillRect(0, y, width, 1);
    }
    for (let x = 0; x < width; x += 3) {
      ctx.fillStyle = random() > 0.5 ? '#ffffff' : '#000000';
      ctx.fillRect(x, 0, 1, height);
    }
    ctx.globalAlpha = 1;
    // 테두리
    ctx.strokeStyle = COLORS.gold;
    ctx.lineWidth = 3;
    ctx.strokeRect(46, 46, width - 92, height - 92);
    ctx.lineWidth = 1.2;
    ctx.strokeRect(58, 58, width - 116, height - 116);
    if (style === 'cover-front') drawCoverIllustration(ctx, width / 2, height * 0.63, width * 0.5);
    return;
  }

  if (style === 'endpaper') {
    ctx.fillStyle = 'rgba(120, 95, 50, 0.12)';
    for (let y = 30; y < height; y += 44) {
      for (let x = (y / 44) % 2 === 0 ? 22 : 44; x < width; x += 44) {
        ctx.beginPath();
        ctx.arc(x, y, 3, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  }

  // 종이 입자
  for (let i = 0; i < 4200; i++) {
    ctx.fillStyle = random() > 0.5 ? 'rgba(90, 70, 40, 0.05)' : 'rgba(255, 255, 255, 0.35)';
    ctx.fillRect(random() * width, random() * height, 1 + random() * 1.5, 1 + random() * 1.5);
  }

  // 책등 쪽 그늘
  const gutter = side === 'right' ? 0 : width;
  const shade = ctx.createLinearGradient(gutter, 0, side === 'right' ? 110 : width - 110, 0);
  shade.addColorStop(0, 'rgba(70, 50, 25, 0.2)');
  shade.addColorStop(1, 'rgba(70, 50, 25, 0)');
  ctx.fillStyle = shade;
  ctx.fillRect(0, 0, width, height);
}

/** 앞표지의 선 그림: 뉴턴의 대포. 산 위에서 쏜 대포알이 떨어지다가, 충분히 빠르면 지구를 돈다. */
function drawCoverIllustration(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  size: number,
): void {
  const radius = size * 0.32;
  const launch = radius + 46;
  const at = (angle: number, distance: number): [number, number] => [
    cx + distance * Math.sin(angle),
    cy - distance * Math.cos(angle),
  ];
  ctx.save();
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';

  // 지구와 위도·경도선
  ctx.strokeStyle = COLORS.ivory;
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.arc(cx, cy, radius, 0, Math.PI * 2);
  ctx.stroke();
  ctx.globalAlpha = 0.45;
  ctx.lineWidth = 1.8;
  for (const k of [-0.5, 0, 0.5]) {
    ctx.beginPath();
    ctx.ellipse(
      cx,
      cy + k * radius,
      radius * Math.sqrt(1 - k * k),
      radius * 0.13,
      0,
      0,
      Math.PI * 2,
    );
    ctx.stroke();
  }
  ctx.beginPath();
  ctx.ellipse(cx, cy, radius * 0.42, radius, 0, 0, Math.PI * 2);
  ctx.stroke();
  ctx.globalAlpha = 1;

  // 대포알이 지나간 길: 떨어지는 두 길과 한 바퀴 도는 궤도
  ctx.strokeStyle = COLORS.gold;
  ctx.lineWidth = 3.2;
  ctx.setLineDash([11, 10]);
  for (const end of [0.42, 1.25]) {
    ctx.beginPath();
    for (let i = 0; i <= 40; i++) {
      const t = i / 40;
      const [x, y] = at(t * end, launch - (launch - radius) * t * t);
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.stroke();
  }
  ctx.beginPath();
  ctx.arc(cx, cy, launch, 0, Math.PI * 2);
  ctx.stroke();
  ctx.setLineDash([]);

  // 산과 대포
  ctx.fillStyle = COLORS.cloth;
  ctx.strokeStyle = COLORS.ivory;
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.moveTo(cx - 40, cy - radius + 14);
  ctx.lineTo(cx - 4, cy - launch + 8);
  ctx.lineTo(cx + 40, cy - radius + 14);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = COLORS.ivory;
  ctx.beginPath();
  ctx.roundRect(cx - 6, cy - launch - 4, 30, 12, 5);
  ctx.fill();

  // 궤도를 도는 대포알
  const [bx, by] = at(2.2, launch);
  ctx.fillStyle = COLORS.gold;
  ctx.beginPath();
  ctx.arc(bx, by, 11, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

export function hashSeed(value: string): number {
  let hash = 2166136261;
  for (let i = 0; i < value.length; i++) {
    hash ^= value.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

/** 시드가 같으면 같은 수열을 내는 난수 (종이 결이 다시 그려도 그대로 보이도록) */
export function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
