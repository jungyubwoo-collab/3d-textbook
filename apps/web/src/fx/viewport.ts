import type { RootState } from '@react-three/fiber';
import { PerspectiveCamera } from 'three';

/** 입자 크기를 화면에 맞추는 데 쓰는 값: 그리기 버퍼의 세로 픽셀 수와 시야각(도) */
export function viewportOf(state: RootState): [pixelHeight: number, fovDegrees: number] {
  const fov = state.camera instanceof PerspectiveCamera ? state.camera.fov : 32;
  return [state.size.height * state.viewport.dpr, fov];
}
