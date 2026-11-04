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
  /** 책장을 손으로 끌어 넘기는 중인지 (그동안 카메라를 움직이지 않는다) */
  dragging: boolean;
  /** 책장 넘기는 소리 등 효과음을 껐는지 */
  muted: boolean;
  /** 배경음악을 껐는지 */
  musicMuted: boolean;
  /**
   * 지금 펼친 면에서 3D 실험을 하는 중인지. false면 2D 문서(인쇄된 그림)로 본다.
   * 실험 중에 다른 면으로 가려고 하면 먼저 장면을 접어 문서로 돌아간 뒤 넘긴다.
   */
  experiment: boolean;
  /** 실험을 접는 동안 미뤄 둔 넘기기. 장면이 다 접히면 이 면으로 넘어간다. */
  pendingSpread: number | null;

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
  setDragging: (dragging: boolean) => void;
  toggleMuted: () => void;
  toggleMusic: () => void;
  /** 2D 그림을 3D 실험으로 펼친다. 책장이 멈춰 있을 때만. */
  startExperiment: () => void;
  /** 3D 실험을 접고 2D 문서로 돌아간다. */
  stopExperiment: () => void;
  /** 장면이 다 접혔을 때 팝업 슬롯이 불러, 미뤄 둔 넘기기를 한다. */
  flushPending: () => void;
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
      dragging: false,
      muted: false,
      musicMuted: false,
      experiment: false,
      pendingSpread: null,
      answers: {},
      toast: null,
      viewResetCount: 0,

      configure: (spreadCount) =>
        set((state) => ({ spreadCount, spread: Math.min(state.spread, spreadCount - 1) })),
      goTo: (spread) => {
        const target = Math.max(0, Math.min(get().spreadCount - 1, Math.round(spread)));
        const { experiment, pendingSpread } = get();
        // 3D 실험 중(또는 접는 중)이면 먼저 문서로 돌아가고, 다 접힌 뒤에 넘긴다.
        if (experiment || pendingSpread !== null) {
          set({ experiment: false, pendingSpread: target === get().spread ? null : target });
          return;
        }
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
      setDragging: (dragging) => set({ dragging }),
      toggleMuted: () => set((state) => ({ muted: !state.muted })),
      toggleMusic: () => set((state) => ({ musicMuted: !state.musicMuted })),
      startExperiment: () => {
        if (get().settled) set({ experiment: true, pendingSpread: null });
      },
      stopExperiment: () => set({ experiment: false }),
      flushPending: () => {
        const { pendingSpread, experiment } = get();
        if (pendingSpread === null || experiment) return;
        set({ pendingSpread: null });
        get().goTo(pendingSpread);
      },
    }),
    {
      name: '3d-textbook:progress',
      version: 1,
      // 학습 기록과 소리 설정만 브라우저에 남긴다.
      partialize: (state) => ({
        muted: state.muted,
        musicMuted: state.musicMuted,
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
