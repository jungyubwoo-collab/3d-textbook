import * as THREE from 'three';

/**
 * 효과에 쓰는 작은 그림들(반짝이, 둥근 빛, 만화식 충돌 별, 빛기둥 띠).
 * 이미지 파일 없이 canvas에 그리고, 한 번 만든 것을 계속 나눠 쓴다(앱이 끝날 때까지 둔다).
 */
const cache = new Map<string, THREE.CanvasTexture>();

function sprite(
  name: string,
  width: number,
  height: number,
  draw: (ctx: CanvasRenderingContext2D, width: number, height: number) => void,
): THREE.CanvasTexture {
  const cached = cache.get(name);
  if (cached) return cached;
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (ctx) draw(ctx, width, height);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  cache.set(name, texture);
  return texture;
}

/** 네 갈래로 빛나는 반짝이(흰색. 색은 재질에서 입힌다) */
export function sparkleTexture(): THREE.CanvasTexture {
  return sprite('sparkle', 96, 96, (ctx, w, h) => {
    const cx = w / 2;
    const cy = h / 2;
    const core = ctx.createRadialGradient(cx, cy, 0, cx, cy, w * 0.26);
    core.addColorStop(0, 'rgba(255, 255, 255, 1)');
    core.addColorStop(0.35, 'rgba(255, 255, 255, 0.75)');
    core.addColorStop(1, 'rgba(255, 255, 255, 0)');
    ctx.fillStyle = core;
    ctx.fillRect(0, 0, w, h);
    // 가로·세로로 뻗는 가는 빛살
    for (const [rx, ry] of [
      [w * 0.48, w * 0.045],
      [w * 0.045, w * 0.48],
    ] as const) {
      const ray = ctx.createRadialGradient(cx, cy, 0, cx, cy, Math.max(rx, ry));
      ray.addColorStop(0, 'rgba(255, 255, 255, 0.95)');
      ray.addColorStop(1, 'rgba(255, 255, 255, 0)');
      ctx.fillStyle = ray;
      ctx.beginPath();
      ctx.ellipse(cx, cy, rx, ry, 0, 0, Math.PI * 2);
      ctx.fill();
    }
  });
}

/** 가운데가 밝고 가장자리로 사라지는 둥근 빛 */
export function glowTexture(): THREE.CanvasTexture {
  return sprite('glow', 128, 128, (ctx, w, h) => {
    const glow = ctx.createRadialGradient(w / 2, h / 2, 0, w / 2, h / 2, w / 2);
    glow.addColorStop(0, 'rgba(255, 255, 255, 1)');
    glow.addColorStop(0.25, 'rgba(255, 255, 255, 0.55)');
    glow.addColorStop(0.6, 'rgba(255, 255, 255, 0.14)');
    glow.addColorStop(1, 'rgba(255, 255, 255, 0)');
    ctx.fillStyle = glow;
    ctx.fillRect(0, 0, w, h);
  });
}

/** 만화식 충돌 별: 뾰족한 노란 별에 잉크 테두리, 가운데는 흰빛 */
export function impactTexture(): THREE.CanvasTexture {
  return sprite('impact', 256, 256, (ctx, w, h) => {
    const cx = w / 2;
    const cy = h / 2;
    const spikes = 11;
    const star = (outer: number, inner: number) => {
      ctx.beginPath();
      for (let i = 0; i < spikes * 2; i++) {
        // 뾰족한 끝의 길이를 들쭉날쭉하게
        const wobble = i % 2 === 0 ? 1 - 0.22 * ((i * 7) % 5 === 0 ? 1 : (i % 3) / 3) : 1;
        const radius = (i % 2 === 0 ? outer : inner) * wobble;
        const angle = (i / (spikes * 2)) * Math.PI * 2 - Math.PI / 2;
        const x = cx + Math.cos(angle) * radius;
        const y = cy + Math.sin(angle) * radius;
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.closePath();
    };
    star(w * 0.47, w * 0.24);
    ctx.fillStyle = '#ffd23e';
    ctx.fill();
    ctx.lineJoin = 'round';
    ctx.lineWidth = 9;
    ctx.strokeStyle = '#25221e';
    ctx.stroke();
    star(w * 0.3, w * 0.15);
    ctx.fillStyle = '#fff6cf';
    ctx.fill();
  });
}

/** 동그란 고리(물결) */
export function ringTexture(): THREE.CanvasTexture {
  return sprite('ring', 256, 256, (ctx, w, h) => {
    const ring = ctx.createRadialGradient(w / 2, h / 2, w * 0.36, w / 2, h / 2, w * 0.5);
    ring.addColorStop(0, 'rgba(255, 255, 255, 0)');
    ring.addColorStop(0.55, 'rgba(255, 255, 255, 0.95)');
    ring.addColorStop(0.8, 'rgba(255, 255, 255, 0.5)');
    ring.addColorStop(1, 'rgba(255, 255, 255, 0)');
    ctx.fillStyle = ring;
    ctx.fillRect(0, 0, w, h);
  });
}

/** 아래가 밝고 위로 갈수록 사라지는 띠(빛기둥·조명 빛줄기) */
export function beamTexture(): THREE.CanvasTexture {
  return sprite('beam', 8, 256, (ctx, w, h) => {
    const beam = ctx.createLinearGradient(0, h, 0, 0);
    beam.addColorStop(0, 'rgba(255, 255, 255, 1)');
    beam.addColorStop(0.35, 'rgba(255, 255, 255, 0.4)');
    beam.addColorStop(1, 'rgba(255, 255, 255, 0)');
    ctx.fillStyle = beam;
    ctx.fillRect(0, 0, w, h);
  });
}

/** 비스듬한 빛 띠(금박 표지가 반짝일 때) */
export function sheenTexture(): THREE.CanvasTexture {
  const texture = sprite('sheen', 256, 8, (ctx, w, h) => {
    const sheen = ctx.createLinearGradient(0, 0, w, 0);
    sheen.addColorStop(0.3, 'rgba(255, 255, 255, 0)');
    sheen.addColorStop(0.47, 'rgba(255, 255, 255, 0.5)');
    sheen.addColorStop(0.5, 'rgba(255, 255, 255, 0.95)');
    sheen.addColorStop(0.53, 'rgba(255, 255, 255, 0.5)');
    sheen.addColorStop(0.7, 'rgba(255, 255, 255, 0)');
    ctx.fillStyle = sheen;
    ctx.fillRect(0, 0, w, h);
  });
  return texture;
}
