import { useEffect, useMemo } from 'react';
import * as THREE from 'three';
import { mulberry32 } from './paint.ts';

/** 나뭇결 책상 텍스처를 코드로 그린다(이미지 파일 없이). */
function createWoodTexture(): THREE.CanvasTexture {
  const size = 1024;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  const texture = new THREE.CanvasTexture(canvas);
  if (!ctx) return texture;
  const random = mulberry32(11);

  ctx.fillStyle = '#c9a57a';
  ctx.fillRect(0, 0, size, size);
  const plank = size / 4;
  for (let p = 0; p < 4; p++) {
    const tone = 0.92 + random() * 0.12;
    ctx.fillStyle = `rgba(${Math.round(190 * tone)}, ${Math.round(150 * tone)}, ${Math.round(105 * tone)}, 0.55)`;
    ctx.fillRect(0, p * plank, size, plank);
    for (let line = 0; line < 46; line++) {
      const baseY = p * plank + random() * plank;
      const amplitude = 2 + random() * 7;
      const frequency = 0.004 + random() * 0.01;
      const phase = random() * Math.PI * 2;
      ctx.strokeStyle = `rgba(110, 72, 38, ${0.05 + random() * 0.12})`;
      ctx.lineWidth = 0.6 + random() * 1.8;
      ctx.beginPath();
      for (let x = 0; x <= size; x += 8) {
        const y = baseY + Math.sin(x * frequency + phase) * amplitude;
        if (x === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.stroke();
    }
    ctx.fillStyle = 'rgba(80, 50, 25, 0.35)';
    ctx.fillRect(0, p * plank, size, 2);
  }
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(3, 3);
  texture.anisotropy = 8;
  return texture;
}

/** 모서리가 둥근 책상 매트 */
function createMatGeometry(
  width: number,
  depth: number,
  radius: number,
  thickness: number,
): THREE.ExtrudeGeometry {
  const shape = new THREE.Shape();
  const x = -width / 2;
  const y = -depth / 2;
  shape.moveTo(x + radius, y);
  shape.lineTo(x + width - radius, y);
  shape.quadraticCurveTo(x + width, y, x + width, y + radius);
  shape.lineTo(x + width, y + depth - radius);
  shape.quadraticCurveTo(x + width, y + depth, x + width - radius, y + depth);
  shape.lineTo(x + radius, y + depth);
  shape.quadraticCurveTo(x, y + depth, x, y + depth - radius);
  shape.lineTo(x, y + radius);
  shape.quadraticCurveTo(x, y, x + radius, y);
  const geometry = new THREE.ExtrudeGeometry(shape, {
    depth: thickness,
    bevelEnabled: false,
    curveSegments: 12,
  });
  // 돌출 방향(z)을 위(y)로 세운다.
  geometry.rotateX(-Math.PI / 2);
  return geometry;
}

export function Desk() {
  const wood = useMemo(() => createWoodTexture(), []);
  const mat = useMemo(() => createMatGeometry(3.3, 2.25, 0.09, 0.005), []);
  useEffect(
    () => () => {
      wood.dispose();
      mat.dispose();
    },
    [wood, mat],
  );

  return (
    <group>
      <mesh rotation-x={-Math.PI / 2} receiveShadow>
        <planeGeometry args={[16, 16]} />
        <meshStandardMaterial map={wood} roughness={0.72} />
      </mesh>
      <mesh geometry={mat} position-y={0.0005} receiveShadow>
        <meshStandardMaterial color="#5d7f86" roughness={0.95} />
      </mesh>
    </group>
  );
}
