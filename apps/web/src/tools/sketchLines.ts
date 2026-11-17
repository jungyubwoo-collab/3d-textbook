/**
 * 실험실 스케치(선 그림)를 만드는 계산. 3D 장면을 그린 결과(화소마다 법선·거리·번호, 바탕색)에서
 * 선을 찾아 종이 위의 잉크로 바꾼다. WebGL 없이 돌아가는 순수 함수라 테스트할 수 있다.
 */

/** 번호가 이 값 이상이면 방(바닥·벽·가구), 1 이상 이 값 미만이면 놓인 모델, 0은 빈 곳 */
export const ROOM_ID = 1000;

export interface SketchPasses {
  width: number;
  height: number;
  /** 화소마다 [법선 x, 법선 y, 카메라에서의 거리, 번호] */
  geometry: Float32Array;
  /** 화소마다 [r, g, b, a] 바탕색(모델은 텍스처 색, 방은 흰색) */
  color: Float32Array;
}

export interface SketchLines {
  /** 윤곽, 가려진 경계, 방의 모서리(굵은 선) */
  strong: Uint8Array;
  /** 모델의 꺾인 면과 무늬(가는 선) */
  soft: Uint8Array;
}

/** 이웃 화소와 거리가 이 비율보다 크게 다르면 앞뒤로 가려진 경계다. */
const DEPTH_JUMP = 0.0035;
/** 이웃 화소와 법선의 내적이 이보다 작으면 꺾인 모서리다(약 30도). */
const CREASE = 0.86;
/** 이웃 화소와 밝기가 이만큼 다르면 무늬(눈금, 글자, 색 경계)다. */
const PATTERN = 0.2;

const isModel = (id: number): boolean => id > 0 && id < ROOM_ID;

/** 버퍼 밖을 읽으면 0으로 본다. */
const value = (buffer: Float32Array, index: number): number => buffer[index] ?? 0;

/** 화소마다 오른쪽·아래 이웃과 견주어 선이 지나는 곳을 찾는다. */
export function traceLines({ width, height, geometry, color }: SketchPasses): SketchLines {
  const strong = new Uint8Array(width * height);
  const soft = new Uint8Array(width * height);
  const idOf = (pixel: number): number => Math.round(value(geometry, pixel * 4 + 3));
  const brightness = (pixel: number): number =>
    0.299 * value(color, pixel * 4) +
    0.587 * value(color, pixel * 4 + 1) +
    0.114 * value(color, pixel * 4 + 2);
  /** 두 화소의 법선이 얼마나 같은 쪽을 보는지(1이면 같다). z는 x·y에서 되살린다. */
  const facing = (a: number, b: number): number => {
    const ax = value(geometry, a * 4);
    const ay = value(geometry, a * 4 + 1);
    const bx = value(geometry, b * 4);
    const by = value(geometry, b * 4 + 1);
    const az = Math.sqrt(Math.max(0, 1 - ax * ax - ay * ay));
    const bz = Math.sqrt(Math.max(0, 1 - bx * bx - by * by));
    return ax * bx + ay * by + az * bz;
  };

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const pixel = y * width + x;
      const id = idOf(pixel);
      const neighbours = [x + 1 < width ? pixel + 1 : -1, y + 1 < height ? pixel + width : -1];
      for (const other of neighbours) {
        if (other < 0) continue;
        const otherId = idOf(other);
        if (id === 0 && otherId === 0) continue;
        if (id !== otherId) {
          strong[pixel] = 1;
          // 모델의 윤곽은 한 화소 더 굵게 긋는다.
          if (isModel(id) || isModel(otherId)) strong[other] = 1;
          continue;
        }
        const near = value(geometry, pixel * 4 + 2);
        const far = value(geometry, other * 4 + 2);
        if (Math.abs(near - far) > Math.min(near, far) * DEPTH_JUMP) {
          strong[pixel] = 1;
          continue;
        }
        if (facing(pixel, other) < CREASE) {
          // 방은 상자라 모서리가 또렷하고, 모델은 면이 잘게 꺾여 있어 가늘게 긋는다.
          (isModel(id) ? soft : strong)[pixel] = 1;
          continue;
        }
        if (isModel(id) && Math.abs(brightness(pixel) - brightness(other)) > PATTERN) {
          soft[pixel] = 1;
        }
      }
    }
  }
  return { strong, soft };
}

/** 선을 위아래·양옆으로 한 화소씩 부풀린다. */
export function thicken(mask: Uint8Array, width: number, height: number): Uint8Array {
  const result = new Uint8Array(mask.length);
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const pixel = y * width + x;
      const on =
        mask[pixel] ||
        (x > 0 && mask[pixel - 1]) ||
        (x + 1 < width && mask[pixel + 1]) ||
        (y > 0 && mask[pixel - width]) ||
        (y + 1 < height && mask[pixel + width]);
      if (on) result[pixel] = 1;
    }
  }
  return result;
}

/** 가는 선이 종이에 묻는 잉크의 양(굵은 선을 1로 볼 때) */
const SOFT_INK = 0.55;

/**
 * 선을 scale분의 1 크기의 그림(RGBA)으로 줄인다. 줄이면서 선 가장자리가 매끄러워진다.
 * WebGL이 읽어 준 화소는 아래 줄부터라 위아래를 뒤집는다.
 */
export function inkImage(
  lines: SketchLines,
  width: number,
  height: number,
  scale: number,
  ink: [number, number, number],
): { data: Uint8ClampedArray<ArrayBuffer>; width: number; height: number } {
  const outWidth = Math.floor(width / scale);
  const outHeight = Math.floor(height / scale);
  const data = new Uint8ClampedArray(outWidth * outHeight * 4);
  const samples = scale * scale;
  for (let y = 0; y < outHeight; y++) {
    for (let x = 0; x < outWidth; x++) {
      let strong = 0;
      let soft = 0;
      for (let dy = 0; dy < scale; dy++) {
        for (let dx = 0; dx < scale; dx++) {
          const pixel = (height - 1 - (y * scale + dy)) * width + x * scale + dx;
          strong += lines.strong[pixel] ?? 0;
          soft += lines.soft[pixel] ?? 0;
        }
      }
      const amount = Math.min(1, strong / samples + (SOFT_INK * soft) / samples);
      const offset = (y * outWidth + x) * 4;
      for (let channel = 0; channel < 3; channel++) {
        data[offset + channel] = Math.round(255 * (1 - amount) + (ink[channel] ?? 0) * amount);
      }
      data[offset + 3] = 255;
    }
  }
  return { data, width: outWidth, height: outHeight };
}

/** 그림에서 선이 있는 범위에 여백을 더한 상자. 선이 없으면 그림 전체 */
export function contentBox(
  data: Uint8ClampedArray,
  width: number,
  height: number,
  pad: number,
): { x: number; y: number; w: number; h: number } {
  let left = width;
  let top = height;
  let right = -1;
  let bottom = -1;
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      // 종이(255)보다 뚜렷하게 어두운 곳만 선으로 친다.
      if ((data[(y * width + x) * 4] ?? 255) > 215) continue;
      left = Math.min(left, x);
      right = Math.max(right, x);
      top = Math.min(top, y);
      bottom = Math.max(bottom, y);
    }
  }
  if (right < 0) return { x: 0, y: 0, w: width, h: height };
  const x = Math.max(0, left - pad);
  const y = Math.max(0, top - pad);
  return {
    x,
    y,
    w: Math.min(width, right + 1 + pad) - x,
    h: Math.min(height, bottom + 1 + pad) - y,
  };
}
