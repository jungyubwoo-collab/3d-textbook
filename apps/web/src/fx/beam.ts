/**
 * 빛줄기(스탠드 조명, 그림이 일어설 때의 빛기둥)를 그리는 셰이더.
 * 열린 원뿔·원기둥에 입히면 가장자리가 부드럽게 사라져 빛이 공기 중에 퍼진 것처럼 보인다.
 * 유니폼: uColor(색), uOpacity(밝기). uv.y가 0인 쪽(원기둥 아래쪽)이 가장 밝다.
 */
export const BEAM_VERTEX = /* glsl */ `
varying vec2 vUv;
varying vec3 vNormal;
varying vec3 vView;
void main() {
  vUv = uv;
  vec4 mv = modelViewMatrix * vec4(position, 1.0);
  vNormal = normalize(normalMatrix * normal);
  vView = normalize(-mv.xyz);
  gl_Position = projectionMatrix * mv;
}
`;

export const BEAM_FRAGMENT = /* glsl */ `
uniform vec3 uColor;
uniform float uOpacity;
varying vec2 vUv;
varying vec3 vNormal;
varying vec3 vView;
void main() {
  // 시선과 나란한 면(가장자리)은 사라지고, 빛이 나오는 쪽일수록 밝다.
  float facing = abs(dot(normalize(vNormal), normalize(vView)));
  float near = 1.0 - vUv.y;
  gl_FragColor = vec4(uColor, uOpacity * pow(facing, 1.7) * (0.18 + 0.82 * near * near));
  #include <colorspace_fragment>
}
`;
