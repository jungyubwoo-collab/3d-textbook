import { createContext, useContext, type RefObject } from 'react';

/** 매 프레임 바뀌는 값은 React 상태 대신 ref로 공유한다(다시 그리기를 피한다). */
export interface BookRuntime {
  /** 장별 넘김 진행도. 0 = 오른쪽에 누움, 1 = 왼쪽으로 넘어감 */
  progress: RefObject<number[]>;
}

export const BookRuntimeContext = createContext<BookRuntime | null>(null);

export function useBookRuntime(): BookRuntime {
  const runtime = useContext(BookRuntimeContext);
  if (!runtime) throw new Error('useBookRuntime은 <Book> 안에서만 쓸 수 있습니다.');
  return runtime;
}

/** 팝업 장면이 받는 정보 */
export interface SceneRuntime {
  lessonId: string;
  /** 0 = 페이지에 납작하게 누움, 1 = 완전히 일어섬 */
  openness: RefObject<number>;
}

export const SceneContext = createContext<SceneRuntime | null>(null);

export function useSceneRuntime(): SceneRuntime {
  const scene = useContext(SceneContext);
  if (!scene) throw new Error('useSceneRuntime은 팝업 장면 안에서만 쓸 수 있습니다.');
  return scene;
}

/** 장면이 다 일어섰을 때만 조작을 받는다. */
export function isSceneInteractive(scene: SceneRuntime): boolean {
  return scene.openness.current > 0.95;
}
