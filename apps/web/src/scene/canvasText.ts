import * as THREE from 'three';
import { FONT_FAMILY } from '../book/fonts.ts';

/**
 * 글자가 든 canvas 텍스처를 만든다. 그 글자의 글꼴 파일이 아직 없으면
 * 우선 대체 글꼴로 그리고, 글꼴을 받은 뒤 다시 그린다(장면 단추·꼬리표용).
 */
export function createTextTexture(
  width: number,
  height: number,
  draw: (ctx: CanvasRenderingContext2D, width: number, height: number) => void,
  text: string,
  weight = 800,
): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = Math.max(2, Math.round(width));
  canvas.height = Math.max(2, Math.round(height));
  const context = canvas.getContext('2d');
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 4;
  const paint = () => {
    if (!context) return;
    context.clearRect(0, 0, canvas.width, canvas.height);
    draw(context, canvas.width, canvas.height);
    texture.needsUpdate = true;
  };
  paint();
  if (typeof document !== 'undefined' && document.fonts) {
    void document.fonts
      .load(`${weight} 32px "Pretendard Variable"`, text)
      .then(paint)
      .catch(() => undefined);
  }
  return texture;
}

export function fontOf(weight: number, size: number): string {
  return `${weight} ${Math.round(size)}px ${FONT_FAMILY}`;
}

/** 폭에 맞게 글자 크기를 줄인다. */
export function fitFontSize(
  ctx: CanvasRenderingContext2D,
  text: string,
  weight: number,
  maxSize: number,
  maxWidth: number,
): number {
  ctx.font = fontOf(weight, maxSize);
  const width = ctx.measureText(text).width;
  return width > maxWidth ? Math.max(10, (maxSize * maxWidth) / width) : maxSize;
}
