import { useCallback } from 'react';
import { isSceneInteractive, useSceneRuntime } from '../book/runtime.ts';
import { answerKey, bookStore } from '../state/bookStore.ts';

/**
 * '먼저 예측, 다음 실험' 규칙. 왼쪽 페이지에서 보기를 고르기 전에는 장면 조작이 잠긴다.
 * 처리기 첫 줄에서 `if (!allow()) return;` 으로 확인한다.
 * allow()는 장면이 다 일어섰고 예측을 골랐을 때만 true이고, 아니면 안내를 띄운다.
 */
export function useLessonGate(questionId: string) {
  const scene = useSceneRuntime();
  const allow = useCallback((): boolean => {
    if (!isSceneInteractive(scene)) return false;
    const store = bookStore.getState();
    if (!store.answers[answerKey(scene.lessonId, questionId)]) {
      store.showToast('먼저 왼쪽 페이지에서 예측을 골라 보세요.');
      return false;
    }
    return true;
  }, [scene, questionId]);
  return { scene, allow };
}
