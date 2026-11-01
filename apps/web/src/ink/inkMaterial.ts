import * as THREE from 'three';
import { COLORS } from '../book/constants.ts';

/**
 * 잉크 펜 그림처럼 보이는 재질.
 * 단계가 나뉜 툰 음영 위에, 어두운 곳일수록 사선(빗금)과 교차선을 겹쳐 그린다.
 * 빗금은 화면 좌표 기준이라 물체가 움직여도 펜 질감이 유지된다.
 */
const toonGradient = (() => {
  const texture = new THREE.DataTexture(new Uint8Array([120, 190, 255]), 3, 1, THREE.RedFormat);
  texture.minFilter = THREE.NearestFilter;
  texture.magFilter = THREE.NearestFilter;
  texture.generateMipmaps = false;
  texture.needsUpdate = true;
  return texture;
})();

/** 모든 잉크 재질이 함께 쓰는 값 */
export const inkUniforms = {
  uInkScale: { value: 1 },
  uInkColor: { value: new THREE.Color(COLORS.ink) },
};

const HATCH_GLSL = /* glsl */ `
  float inkLuma = dot(outgoingLight, vec3(0.2126, 0.7152, 0.0722));
  vec2 inkPx = gl_FragCoord.xy / uInkScale;
  float inkA = abs(fract((inkPx.x + inkPx.y) / 7.0) - 0.5);
  float inkB = abs(fract((inkPx.x - inkPx.y) / 7.0) - 0.5);
  float lineA = 1.0 - smoothstep(0.07, 0.15, inkA);
  float lineB = 1.0 - smoothstep(0.07, 0.15, inkB);
  float shadeA = 1.0 - smoothstep(0.38, 0.58, inkLuma);
  float shadeB = 1.0 - smoothstep(0.18, 0.3, inkLuma);
  float inkAmount = max(lineA * shadeA, lineB * shadeB) * 0.6;
  outgoingLight = mix(outgoingLight, uInkColor, inkAmount);
`;

export function createInkMaterial(color: THREE.ColorRepresentation): THREE.MeshToonMaterial {
  const material = new THREE.MeshToonMaterial({ color, gradientMap: toonGradient });
  material.onBeforeCompile = (shader) => {
    shader.uniforms['uInkScale'] = inkUniforms.uInkScale;
    shader.uniforms['uInkColor'] = inkUniforms.uInkColor;
    shader.fragmentShader = shader.fragmentShader
      .replace(
        '#include <common>',
        '#include <common>\nuniform float uInkScale;\nuniform vec3 uInkColor;',
      )
      .replace('#include <opaque_fragment>', `${HATCH_GLSL}\n#include <opaque_fragment>`);
  };
  material.customProgramCacheKey = () => 'ink-hatch-v1';
  return material;
}

/** 같은 색 재질은 하나만 만들어 나눠 쓴다. */
const cache = new Map<string, THREE.MeshToonMaterial>();

export function inkMaterial(color: string): THREE.MeshToonMaterial {
  let material = cache.get(color);
  if (!material) {
    material = createInkMaterial(color);
    cache.set(color, material);
  }
  return material;
}
