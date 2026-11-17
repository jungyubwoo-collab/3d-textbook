import type { LabId } from './models.ts';

/** 책 끝의 '나의 실험실'. 공간(GLB)과 스케치(선 그림)는 힉스필드 3D Jutsu에서 만들었다. */
export interface LabConfig {
  id: LabId;
  /** 책에서 쓰는 단원 ID */
  lessonId: string;
  title: string;
  /** 실험실 공간 GLB(public/labs) */
  room: string;
  /** 같은 구도의 선 스케치(페이지에 인쇄되는 2D 그림) */
  sketch: string;
}

export const LABS: Record<LabId, LabConfig> = {
  physics: {
    id: 'physics',
    lessonId: 'lab-physics',
    title: '나의 물리 실험실',
    room: '/labs/physics.glb',
    sketch: '/labs/physics-sketch.webp',
  },
  chemistry: {
    id: 'chemistry',
    lessonId: 'lab-chemistry',
    title: '나의 화학 실험실',
    room: '/labs/chemistry.glb',
    sketch: '/labs/chemistry-sketch.webp',
  },
};
