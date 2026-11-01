import { Billboard } from '@react-three/drei';
import { useEffect, useMemo, type ComponentProps } from 'react';
import * as THREE from 'three';
import { COLORS } from '../book/constants.ts';
import { FONT_FAMILY } from '../book/fonts.ts';

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
    const fontSize = 64;
    const font = `800 ${fontSize}px ${FONT_FAMILY}`;
    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d');
    if (context) context.font = font;
    const textWidth = context ? context.measureText(text).width : text.length * fontSize;
    canvas.width = Math.ceil(textWidth + fontSize * 1.1);
    canvas.height = Math.ceil(fontSize * 1.6);
    if (context) {
      context.fillStyle = background;
      context.strokeStyle = COLORS.ink;
      context.lineWidth = 5;
      context.beginPath();
      context.roundRect(3, 3, canvas.width - 6, canvas.height - 6, canvas.height / 2);
      context.fill();
      context.stroke();
      context.font = font;
      context.fillStyle = color;
      context.textAlign = 'center';
      context.textBaseline = 'middle';
      context.fillText(text, canvas.width / 2, canvas.height / 2 + 3);
    }
    const result = new THREE.CanvasTexture(canvas);
    result.colorSpace = THREE.SRGBColorSpace;
    return { texture: result, aspect: canvas.width / canvas.height };
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
