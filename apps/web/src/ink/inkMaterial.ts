import * as THREE from 'three';
import { COLORS } from '../book/constants.ts';

/**
 * 잉크 펜 그림처럼 보이는 재질.
 * - 단계가 나뉜 툰 음영 위에, 어두운 곳일수록 사선(빗금)과 교차선을 겹쳐 그린다.
 *   빗금은 화면 좌표 기준이라 물체가 움직여도 펜 질감이 유지된다.
 * - 색 번짐: 높이 uFillY 아래만 색이 칠해지고, 그 위는 종이색 스케치(빗금만)로 남는다.
 *   팝업 장면이 일어설 때 uFillY를 아래에서 위로 올려 물감이 번지듯 색이 차오르게 한다.
 *   차오르는 동안(uFillGlow) 경계가 금빛으로 빛난다.
 * - 가장자리 빛: 시선과 비스듬한 면을 살짝 밝혀 물체의 둘레가 빛나 보인다.
 */
const toonGradient = (() => {
  const texture = new THREE.DataTexture(new Uint8Array([120, 190, 255]), 3, 1, THREE.RedFormat);
  texture.minFilter = THREE.NearestFilter;
  texture.magFilter = THREE.NearestFilter;
  texture.generateMipmaps = false;
  texture.needsUpdate = true;
  return texture;
})();

/** 모든 잉크 재질이 함께 쓰는 값. 지금 펼쳐진 팝업 장면이 매 프레임 갱신한다. */
export const inkUniforms = {
  uInkScale: { value: 1 },
  uInkColor: { value: new THREE.Color(COLORS.ink) },
  uPaperColor: { value: new THREE.Color('#f6f1e6') },
  /** 이 높이(월드 y)보다 아래만 색이 칠해진다. 기본값은 모두 칠해진 상태. */
  uFillY: { value: 100 },
  /** 색이 차오르는 경계의 금빛(0 = 끔). 팝업 슬롯이 차오르는 동안만 켠다. */
  uFillGlow: { value: 0 },
  /** 아직 칠하지 않은 종이색 스케치의 밝기. 방이 어두워지면 무대 조명이 함께 낮춘다. */
  uPaperLight: { value: 1 },
  /** 물체 가장자리에 두르는 빛의 색(세기 포함) */
  uRimColor: { value: new THREE.Color(0.34, 0.31, 0.26) },
  /** 색의 선명함(1 = 그대로) */
  uInkVivid: { value: 1.16 },
};

const VERTEX_PARS = /* glsl */ `
#include <common>
varying float vInkWorldY;
`;

const VERTEX_MAIN = /* glsl */ `
#include <project_vertex>
vInkWorldY = (modelMatrix * vec4(transformed, 1.0)).y;
`;

const FRAGMENT_PARS = /* glsl */ `
#include <common>
uniform float uInkScale;
uniform vec3 uInkColor;
uniform vec3 uPaperColor;
uniform float uFillY;
uniform float uFillGlow;
uniform float uPaperLight;
uniform vec3 uRimColor;
uniform float uInkVivid;
varying float vInkWorldY;
`;

const FRAGMENT_MAIN = /* glsl */ `
  float inkLuma = dot(outgoingLight, vec3(0.2126, 0.7152, 0.0722));

  // 색 번짐: 경계는 살짝 일렁이고, 경계 바로 아래는 물감이 고인 듯 진하다.
  float inkEdge = uFillY + 0.006 * sin(gl_FragCoord.x * 0.045 / uInkScale)
                         + 0.004 * sin(gl_FragCoord.y * 0.07 / uInkScale);
  float inkDry = smoothstep(inkEdge - 0.004, inkEdge + 0.004, vInkWorldY);
  float inkWet = (1.0 - inkDry) * (1.0 - smoothstep(0.0, 0.02, inkEdge - vInkWorldY));
  vec3 inkPaper = uPaperColor * uPaperLight * (0.82 + 0.18 * smoothstep(0.2, 0.8, inkLuma));
  // 색은 조금 더 선명하게, 시선과 비스듬한 가장자리에는 빛을 두른다.
  vec3 inkTint = max(vec3(0.0), mix(vec3(inkLuma), outgoingLight, uInkVivid));
  float inkRim = pow(1.0 - saturate(dot(geometryNormal, geometryViewDir)), 2.6);
  inkTint += uRimColor * inkRim * (0.3 + 0.7 * smoothstep(0.15, 0.7, inkLuma));
  outgoingLight = mix(inkTint * (1.0 - 0.14 * inkWet), inkPaper, inkDry);
  // 색이 차오르는 경계는 금빛으로 빛난다.
  float inkGlow = uFillGlow * (1.0 - smoothstep(0.0, 0.016, abs(vInkWorldY - inkEdge)));
  outgoingLight += vec3(1.0, 0.74, 0.3) * inkGlow;

  // 빗금: 칠하기 전의 밝기(inkLuma)로 그려서 스케치 상태에서도 그늘이 보인다.
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
    shader.uniforms['uPaperColor'] = inkUniforms.uPaperColor;
    shader.uniforms['uFillY'] = inkUniforms.uFillY;
    shader.uniforms['uFillGlow'] = inkUniforms.uFillGlow;
    shader.uniforms['uPaperLight'] = inkUniforms.uPaperLight;
    shader.uniforms['uRimColor'] = inkUniforms.uRimColor;
    shader.uniforms['uInkVivid'] = inkUniforms.uInkVivid;
    shader.vertexShader = shader.vertexShader
      .replace('#include <common>', VERTEX_PARS)
      .replace('#include <project_vertex>', VERTEX_MAIN);
    shader.fragmentShader = shader.fragmentShader
      .replace('#include <common>', FRAGMENT_PARS)
      .replace('#include <opaque_fragment>', `${FRAGMENT_MAIN}\n#include <opaque_fragment>`);
  };
  material.customProgramCacheKey = () => 'ink-hatch-wash-rim-v3';
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

/** 유리처럼 비치는 재질(잉크 선과 함께 쓴다). 색 번짐 효과는 받지 않는다. */
export const glassMaterial = new THREE.MeshStandardMaterial({
  color: '#dcebf2',
  transparent: true,
  opacity: 0.16,
  roughness: 0.15,
  depthWrite: false,
});
