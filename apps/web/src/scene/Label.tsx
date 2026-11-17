import { Billboard } from '@react-three/drei';
import { useEffect, useMemo, type ComponentProps } from 'react';
import { COLORS } from '../book/constants.ts';
import { createTextTexture, fontOf } from './canvasText.ts';

const FONT_SIZE = 64;
const TAG_SIZE = 46;

/**
 * 장면 속에 띄우는 한글 꼬리표. 항상 카메라를 바라본다.
 * tag를 주면 글 앞에 색 딱지(법칙 이름 같은 짧은 말)를 붙인다.
 */
export function Label({
  text,
  height = 0.06,
  color = COLORS.ink,
  background = 'rgba(255, 253, 246, 0.94)',
  tag,
  tagColor = COLORS.accent,
  ...props
}: {
  text: string;
  height?: number;
  color?: string;
  background?: string;
  tag?: string;
  tagColor?: string;
} & Omit<ComponentProps<typeof Billboard>, 'children'>) {
  const { texture, aspect } = useMemo(() => {
    const measure = document.createElement('canvas').getContext('2d');
    const widthOf = (value: string, size: number) => {
      if (!measure) return value.length * size;
      measure.font = fontOf(800, size);
      return measure.measureText(value).width;
    };
    const tall = Math.ceil(FONT_SIZE * 1.6);
    const pad = FONT_SIZE * 0.55;
    // 딱지: 꼬리표 왼쪽 안에 들어가는 둥근 색 상자
    const tagWidth = tag ? widthOf(tag, TAG_SIZE) + TAG_SIZE * 1.1 : 0;
    const tagGap = tag ? FONT_SIZE * 0.32 : 0;
    const width = Math.ceil(
      widthOf(text, FONT_SIZE) + pad * 2 + tagWidth + tagGap - (tag ? pad * 0.55 : 0),
    );
    const result = createTextTexture(
      width,
      tall,
      (ctx, w, h) => {
        ctx.fillStyle = background;
        ctx.strokeStyle = COLORS.ink;
        ctx.lineWidth = 5;
        ctx.beginPath();
        ctx.roundRect(3, 3, w - 6, h - 6, h / 2);
        ctx.fill();
        ctx.stroke();
        ctx.textBaseline = 'middle';
        let left = pad;
        if (tag) {
          const inset = 13;
          left = inset;
          ctx.fillStyle = tagColor;
          ctx.beginPath();
          ctx.roundRect(left, inset, tagWidth, h - inset * 2, (h - inset * 2) / 2);
          ctx.fill();
          ctx.font = fontOf(800, TAG_SIZE);
          ctx.fillStyle = '#ffffff';
          ctx.textAlign = 'center';
          ctx.fillText(tag, left + tagWidth / 2, h / 2 + 2);
          left += tagWidth + tagGap;
        }
        ctx.font = fontOf(800, FONT_SIZE);
        ctx.fillStyle = color;
        ctx.textAlign = 'left';
        ctx.fillText(text, left, h / 2 + 3);
      },
      `${text}${tag ?? ''}`,
    );
    return { texture: result, aspect: width / tall };
  }, [text, color, background, tag, tagColor]);
  useEffect(() => () => texture.dispose(), [texture]);

  return (
    <Billboard {...props}>
      <mesh>
        <planeGeometry args={[height * aspect, height]} />
        <meshBasicMaterial map={texture} transparent toneMapped={false} depthWrite={false} />
      </mesh>
    </Billboard>
  );
}
