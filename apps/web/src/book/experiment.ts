import { answerKey, bookStore } from '../state/bookStore.ts';
import { pagesOfSpread } from './structure.ts';
import type { BookDefinition, PageSpec } from './types.ts';

/** 펼침면의 3D 실험(오른쪽 페이지의 장면)과 그 단원의 예측 문항 */
export interface SpreadExperiment {
  page: PageSpec;
  lessonId: string;
  questionId: string | undefined;
}

export function experimentOfSpread(book: BookDefinition, spread: number): SpreadExperiment | null {
  const { left, right } = pagesOfSpread(book.pages, spread);
  if (!right?.scene) return null;
  const question = [left, right]
    .flatMap((page) => page?.blocks ?? [])
    .find((block) => block.type === 'question');
  return {
    page: right,
    lessonId: right.lessonId ?? right.id,
    questionId: question?.type === 'question' ? question.question.id : undefined,
  };
}

/**
 * 2D 그림을 3D 실험으로 펼친다('예측 → 실험' 순서라 예측을 먼저 골라야 한다).
 * 펼쳤으면 true, 예측을 아직 안 골랐거나 실험이 없는 면이면 false.
 */
export function enterExperiment(book: BookDefinition): boolean {
  const store = bookStore.getState();
  const experiment = experimentOfSpread(book, store.spread);
  if (!experiment || !store.settled || store.pendingSpread !== null) return false;
  const { lessonId, questionId } = experiment;
  if (questionId && !store.answers[answerKey(lessonId, questionId)]) {
    store.showToast('먼저 왼쪽 페이지에서 예측을 골라 보세요.');
    return false;
  }
  store.startExperiment();
  return true;
}
