import { Billboard } from '@react-three/drei';
import { useEffect, useMemo, type ComponentProps } from 'react';
import { COLORS } from '../book/constants.ts';
import { createTextTexture, fontOf } from './canvasText.ts';

const FONT_SIZE = 64;

/** 장면 속에 띄우는 한글 꼬리표. 항상 카메라를 바라본다. */
export function Label({
  text,
  height = 0.06,
  color = COLORS.ink,
  background = 'rgba(255, 253, 246, 0.94)',
  ...props
}: {
  text: string;
  height?: number;
  color?: string;
  background?: string;
} & Omit<ComponentProps<typeof Billboard>, 'children'>) {
  const { texture, aspect } = useMemo(() => {
    const measure = document.createElement('canvas').getContext('2d');
    if (measure) measure.font = fontOf(800, FONT_SIZE);
    const textWidth = measure ? measure.measureText(text).width : text.length * FONT_SIZE;
    const width = Math.ceil(textWidth + FONT_SIZE * 1.1);
    const tall = Math.ceil(FONT_SIZE * 1.6);
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
        ctx.font = fontOf(800, FONT_SIZE);
        ctx.fillStyle = color;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(text, w / 2, h / 2 + 3);
      },
      text,
    );
    return { texture: result, aspect: width / tall };
  }, [text, color, background]);
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
