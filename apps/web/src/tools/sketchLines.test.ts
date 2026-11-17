import { describe, expect, it } from 'vitest';
import {
  contentBox,
  inkImage,
  ROOM_ID,
  thicken,
  traceLines,
  type SketchPasses,
} from './sketchLines.ts';

interface Pixel {
  id: number;
  depth?: number;
  normal?: [number, number];
  shade?: number;
}

/** 줄마다 화소를 적어 그린 결과를 만든다. */
function passes(rows: Pixel[][]): SketchPasses {
  const height = rows.length;
  const width = rows[0]!.length;
  const geometry = new Float32Array(width * height * 4);
  const color = new Float32Array(width * height * 4);
  rows.flat().forEach((pixel, index) => {
    geometry.set([...(pixel.normal ?? [0, 0]), pixel.depth ?? 10, pixel.id], index * 4);
    const shade = pixel.shade ?? 1;
    color.set([shade, shade, shade, 1], index * 4);
  });
  return { width, height, geometry, color };
}

const wall: Pixel = { id: ROOM_ID };
const desk: Pixel = { id: ROOM_ID + 1 };
const cart: Pixel = { id: 1 };
const empty: Pixel = { id: 0 };

describe('traceLines', () => {
  it('draws a strong line where two parts of the room meet', () => {
    const { strong, soft } = traceLines(passes([[wall, wall, desk, desk]]));
    expect([...strong]).toEqual([0, 1, 0, 0]);
    expect([...soft]).toEqual([0, 0, 0, 0]);
  });

  it('draws the outline of a model one pixel thicker', () => {
    const { strong } = traceLines(passes([[wall, wall, cart, cart]]));
    expect([...strong]).toEqual([0, 1, 1, 0]);
  });

  it('outlines things against the empty background but leaves the background blank', () => {
    const { strong } = traceLines(passes([[empty, empty, wall, wall]]));
    expect([...strong]).toEqual([0, 1, 0, 0]);
  });

  it('looks down as well as right', () => {
    const { strong } = traceLines(passes([[wall], [desk]]));
    expect([...strong]).toEqual([1, 0]);
  });

  it('draws a strong line where one surface hides another part of itself', () => {
    const { strong } = traceLines(
      passes([[wall, { ...wall, depth: 10.01 }, { ...wall, depth: 12 }]]),
    );
    expect([...strong]).toEqual([0, 1, 0]);
  });

  it('draws room corners strongly and model creases softly', () => {
    const turned: [number, number] = [0.8, 0];
    const room = traceLines(passes([[wall, { ...wall, normal: turned }]]));
    expect([...room.strong]).toEqual([1, 0]);
    const model = traceLines(passes([[cart, { ...cart, normal: turned }]]));
    expect([...model.strong]).toEqual([0, 0]);
    expect([...model.soft]).toEqual([1, 0]);
  });

  it('draws patterns printed on a model softly, and ignores them on the room', () => {
    const model = traceLines(passes([[cart, { ...cart, shade: 0.3 }]]));
    expect([...model.soft]).toEqual([1, 0]);
    const room = traceLines(passes([[wall, { ...wall, shade: 0.3 }]]));
    expect([...room.soft]).toEqual([0, 0]);
    expect([...room.strong]).toEqual([0, 0]);
  });
});

describe('thicken', () => {
  it('grows a line by one pixel up, down, left and right', () => {
    const mask = Uint8Array.from([0, 0, 0, 0, 1, 0, 0, 0, 0]);
    expect([...thicken(mask, 3, 3)]).toEqual([0, 1, 0, 1, 1, 1, 0, 1, 0]);
  });

  it('does not wrap around the edges', () => {
    const mask = Uint8Array.from([0, 0, 1, 0, 0, 0]);
    expect([...thicken(mask, 3, 2)]).toEqual([0, 1, 1, 0, 0, 1]);
  });
});

describe('inkImage', () => {
  const ink: [number, number, number] = [55, 55, 55];

  it('shrinks the lines, flips the rows and blends ink with white paper', () => {
    // 2 × 2 한 칸으로 줄인다: 굵은 선 화소 하나 → 잉크 1/4
    const lines = { strong: Uint8Array.from([1, 0, 0, 0]), soft: new Uint8Array(4) };
    const image = inkImage(lines, 2, 2, 2, ink);
    expect([image.width, image.height]).toEqual([1, 1]);
    expect([...image.data]).toEqual([205, 205, 205, 255]);
  });

  it('puts the bottom row of the render at the bottom of the picture', () => {
    // 렌더 결과의 첫 줄(아래)이 그림의 마지막 줄이 된다.
    const lines = { strong: Uint8Array.from([1, 0]), soft: new Uint8Array(2) };
    const image = inkImage(lines, 1, 2, 1, ink);
    expect([image.data[0], image.data[4]]).toEqual([255, 55]);
  });

  it('counts soft lines as lighter ink', () => {
    const lines = { strong: new Uint8Array(1), soft: Uint8Array.from([1]) };
    expect(inkImage(lines, 1, 1, 1, ink).data[0]).toBe(145);
  });
});

/** 흰 종이에 어두운 화소 몇 개를 찍은 그림 */
const picture = (width: number, height: number, dark: [number, number][]) => {
  const data = new Uint8ClampedArray(width * height * 4).fill(255);
  for (const [x, y] of dark) data.fill(60, (y * width + x) * 4, (y * width + x) * 4 + 3);
  return data;
};

describe('contentBox', () => {
  it('finds the drawn area and adds padding inside the picture', () => {
    const data = picture(10, 8, [
      [3, 2],
      [6, 5],
    ]);
    expect(contentBox(data, 10, 8, 1)).toEqual({ x: 2, y: 1, w: 6, h: 6 });
    expect(contentBox(data, 10, 8, 20)).toEqual({ x: 0, y: 0, w: 10, h: 8 });
  });

  it('keeps the whole picture when nothing is drawn', () => {
    expect(contentBox(picture(4, 3, []), 4, 3, 2)).toEqual({ x: 0, y: 0, w: 4, h: 3 });
  });
});
