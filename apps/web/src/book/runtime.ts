import { createContext, useContext, type RefObject } from 'react';

/** 매 프레임 바뀌는 값은 React 상태 대신 ref로 공유한다(다시 그리기를 피한다). */
export interface BookRuntime {
  /** 장별 넘김 진행도. 0 = 오른쪽에 누움, 1 = 왼쪽으로 넘어감 */
  progress: RefObject<number[]>;
  /** 펼침면별 팝업 장면의 등장 시간(0 = 2D 문서, 1 = 3D 실험). 장면이 없는 면은 없다. */
  reveals: Map<number, RefObject<number>>;
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
  /** 페이지가 얼마나 펼쳐졌는지. 0 = 장면이 페이지에 접혀 누움, 1 = 펼쳐짐 */
  openness: RefObject<number>;
  /**
   * 페이지가 다 펼쳐진 뒤 흐르는 등장 시간(0 → 1).
   * 0이면 종이에 인쇄된 도면처럼 납작하고, 1이면 다 일어서 색까지 칠해진 상태다.
   * 장면의 각 부분은 <PopUp at={…}>으로 이 시간에 맞춰 차례로 일어선다.
   */
  reveal: RefObject<number>;
}

export const SceneContext = createContext<SceneRuntime | null>(null);

export function useSceneRuntime(): SceneRuntime {
  const scene = useContext(SceneContext);
  if (!scene) throw new Error('useSceneRuntime은 팝업 장면 안에서만 쓸 수 있습니다.');
  return scene;
}

/** 장면이 다 일어섰을 때만 조작을 받는다. */
export function isSceneInteractive(scene: SceneRuntime): boolean {
  return scene.openness.current > 0.95 && scene.reveal.current > 0.92;
}
