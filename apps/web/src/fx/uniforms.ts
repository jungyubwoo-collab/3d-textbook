import { Color, type ShaderMaterial } from 'three';

/** 셰이더 재질의 숫자 유니폼을 바꾼다(재질이 아직 없으면 아무것도 하지 않는다). */
export function setUniform(material: ShaderMaterial | null, name: string, value: number): void {
  const uniform = material?.uniforms[name];
  if (uniform) uniform.value = value;
}

/** 셰이더 재질의 색 유니폼(바꿔 쓸 수 있는 Color 객체) */
export function colorUniform(material: ShaderMaterial | null, name: string): Color | null {
  const value: unknown = material?.uniforms[name]?.value;
  return value instanceof Color ? value : null;
}
