import { useStore } from 'zustand';
import { persist } from 'zustand/middleware';
import { createStore } from 'zustand/vanilla';

export interface AnswerState {
  choiceId: string;
  revealed: boolean;
  correct?: boolean;
  /** 도장이 찍히는 중 (저장하지 않는다) */
  stampPending?: boolean;
}

export interface Toast {
  id: number;
  message: string;
}

export interface BookState {
  /** 지금 펼친 면. 0 = 앞표지 */
  spread: number;
  spreadCount: number;
  /** 책장이 다 넘어가 멈췄는지. 멈췄을 때만 페이지를 누를 수 있다. */
  settled: boolean;
  /** 마지막으로 멈춰 있던 펼침면. 넘기는 동안 그 근처 장의 텍스처를 유지하는 데 쓴다. */
  restingSpread: number;
  /** `${lessonId}/${questionId}` → 답 */
  answers: Record<string, AnswerState>;
  toast: Toast | null;
  /** 바뀔 때마다 카메라가 기본 시점으로 돌아간다. */
  viewResetCount: number;

  configure: (spreadCount: number) => void;
  goTo: (spread: number) => void;
  next: () => void;
  prev: () => void;
  setSettled: (settled: boolean) => void;
  /** 보기 고르기. 덮개를 연 뒤에는 바꿀 수 없다. */
  choose: (key: string, choiceId: string) => void;
  /** 덮개 열기. 보기를 고른 뒤에만 열린다. 열렸으면 true. */
  reveal: (key: string, correct: boolean) => boolean;
  settleStamp: (key: string) => void;
  showToast: (message: string) => void;
  dismissToast: (id: number) => void;
  resetView: () => void;
}

export const answerKey = (lessonId: string, questionId: string): string =>
  `${lessonId}/${questionId}`;

let toastId = 0;

/** 화면 밖(이벤트 처리기, useFrame 등)에서는 bookStore.getState()로 읽고 쓴다. */
export const bookStore = createStore<BookState>()(
  persist(
    (set, get) => ({
      spread: 0,
      spreadCount: 1,
      settled: true,
      restingSpread: 0,
      answers: {},
      toast: null,
      viewResetCount: 0,

      configure: (spreadCount) =>
        set((state) => ({ spreadCount, spread: Math.min(state.spread, spreadCount - 1) })),
      goTo: (spread) => {
        const target = Math.max(0, Math.min(get().spreadCount - 1, Math.round(spread)));
        if (target !== get().spread) set({ spread: target, settled: false });
      },
      next: () => get().goTo(get().spread + 1),
      prev: () => get().goTo(get().spread - 1),
      setSettled: (settled) =>
        set((state) => (settled ? { settled, restingSpread: state.spread } : { settled })),

      choose: (key, choiceId) => {
        if (get().answers[key]?.revealed) return;
        set((state) => ({ answers: { ...state.answers, [key]: { choiceId, revealed: false } } }));
      },
      reveal: (key, correct) => {
        const answer = get().answers[key];
        if (!answer || answer.revealed) return false;
        set((state) => ({
          answers: {
            ...state.answers,
            [key]: { ...answer, revealed: true, correct, stampPending: correct },
          },
        }));
        return true;
      },
      settleStamp: (key) => {
        const answer = get().answers[key];
        if (!answer?.stampPending) return;
        set((state) => ({
          answers: { ...state.answers, [key]: { ...answer, stampPending: false } },
        }));
      },

      showToast: (message) => set({ toast: { id: ++toastId, message } }),
      dismissToast: (id) => {
        if (get().toast?.id === id) set({ toast: null });
      },
      resetView: () => set((state) => ({ viewResetCount: state.viewResetCount + 1 })),
    }),
    {
      name: '3d-textbook:progress',
      version: 1,
      // 학습 기록만 브라우저에 남긴다.
      partialize: (state) => ({
        answers: Object.fromEntries(
          Object.entries(state.answers).map(([key, { choiceId, revealed, correct }]) => [
            key,
            correct === undefined ? { choiceId, revealed } : { choiceId, revealed, correct },
          ]),
        ),
      }),
    },
  ),
);

/** 컴포넌트에서 상태의 일부를 구독한다. */
export function useBookStore<T>(selector: (state: BookState) => T): T {
  return useStore(bookStore, selector);
}
