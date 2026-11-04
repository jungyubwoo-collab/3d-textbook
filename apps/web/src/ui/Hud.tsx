import { useEffect } from 'react';
import { enterExperiment, experimentOfSpread } from '../book/experiment.ts';
import { pagesOfSpread } from '../book/structure.ts';
import type { BookDefinition, PageBlock } from '../book/types.ts';
import { CAPTURE } from '../lib/capture.ts';
import { bookStore, useBookStore } from '../state/bookStore.ts';
import { Toolbar } from './Toolbar.tsx';

/** 3D 화면 위에 겹치는 HTML: 제목, 알림, 조작 막대, 화면 낭독기용 본문 */
export function Hud({ book }: { book: BookDefinition }) {
  return (
    <div className="pointer-events-none absolute inset-0 flex flex-col justify-between p-4 sm:p-6">
      <header className="flex items-start justify-between gap-4">
        <div className="rounded-2xl bg-paper/80 px-4 py-2.5 shadow-sm ring-1 ring-black/5 backdrop-blur">
          <p className="text-xs font-semibold tracking-wide text-accent">3D 교과서</p>
          <h1 className="text-lg font-extrabold text-ink">{book.title}</h1>
        </div>
        <ExperimentExit book={book} />
      </header>
      <ToastMessage />
      <footer className="flex flex-col items-center gap-3">
        <ExperimentStart book={book} />
        <Toolbar pages={book.pages} />
      </footer>
      <SpreadText book={book} />
    </div>
  );
}

const pill =
  'pointer-events-auto inline-flex h-11 animate-[toast-in_0.25s_ease-out] items-center gap-2 rounded-full px-5 text-sm font-bold shadow-lg ring-1 ring-black/10 transition';

/**
 * 2D 문서에서 3D 실험으로 들어가는 단추(조작 막대 위). 실험이 있는 펼침면에서 책장이 멈춰 있을 때만 보인다.
 * 누르면 그림이 입체로 일어서고 카메라가 실험 장치로 다가간다. 페이지의 그림을 눌러도 같다.
 */
function ExperimentStart({ book }: { book: BookDefinition }) {
  const spread = useBookStore((state) => state.spread);
  const settled = useBookStore((state) => state.settled);
  const experiment = useBookStore((state) => state.experiment);
  const pending = useBookStore((state) => state.pendingSpread);
  if (experiment || !settled || pending !== null || !experimentOfSpread(book, spread)) return null;
  return (
    <button
      type="button"
      className={`${pill} bg-accent text-paper hover:brightness-110`}
      onClick={() => void enterExperiment(book)}
    >
      <svg viewBox="0 0 24 24" className="size-5" fill="currentColor" aria-hidden="true">
        <path d="M8 5.5v13l10.5-6.5z" />
      </svg>
      3D로 실험하기
    </button>
  );
}

/**
 * 3D 실험을 접고 2D 문서로 돌아가는 단추(화면 오른쪽 위, Esc). 실험 단추를 가리지 않게 위에 둔다.
 * 다음 장으로 넘겨도 먼저 접힌 뒤에 넘어간다.
 */
function ExperimentExit({ book }: { book: BookDefinition }) {
  const spread = useBookStore((state) => state.spread);
  const experiment = useBookStore((state) => state.experiment);
  if (!experiment || !experimentOfSpread(book, spread)) return null;
  return (
    <button
      type="button"
      className={`${pill} bg-paper/95 text-ink hover:bg-paper`}
      onClick={() => bookStore.getState().stopExperiment()}
    >
      <svg
        viewBox="0 0 24 24"
        className="size-5"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        aria-hidden="true"
      >
        <path d="M6 3h9l4 4v14H6z" strokeLinejoin="round" />
        <path d="M9 12h7M9 16h7M9 8h3" strokeLinecap="round" />
      </svg>
      2D 문서로 돌아가기
    </button>
  );
}

function ToastMessage() {
  const toast = useBookStore((state) => state.toast);
  useEffect(() => {
    // 영상 녹화 중에는 녹화 스크립트가 화면 시간에 맞춰 직접 닫는다.
    if (!toast || CAPTURE) return;
    const timer = setTimeout(() => bookStore.getState().dismissToast(toast.id), 3200);
    return () => clearTimeout(timer);
  }, [toast]);
  return (
    <div
      className="pointer-events-none absolute inset-x-0 top-24 flex justify-center px-4"
      role="status"
      aria-live="polite"
    >
      {toast && (
        <p
          key={toast.id}
          className="animate-[toast-in_0.25s_ease-out] rounded-full bg-ink/90 px-5 py-2.5 text-sm font-medium text-paper shadow-lg"
        >
          {toast.message}
        </p>
      )}
    </div>
  );
}

function blockToText(block: PageBlock): string[] {
  switch (block.type) {
    case 'eyebrow':
    case 'heading':
    case 'subheading':
    case 'paragraph':
    case 'caption':
      return [block.text];
    case 'formula':
      return [block.text, block.note ?? ''];
    case 'list':
      return block.items;
    case 'toc':
      return block.entries.map((entry) => entry.title);
    case 'question':
      return [
        `예측 문항: ${block.question.prompt}`,
        ...block.question.choices.map((choice, index) => `${index + 1}. ${choice.label}`),
      ];
    case 'table':
      return block.rows.map(([label, value]) => `${label}: ${value}`);
    case 'figure':
      return [`그림: ${block.alt}`];
    case 'lines':
    case 'grid':
    case 'spacer':
      return [];
  }
}

/** 화면 낭독기가 읽을 수 있도록 펼친 면의 글을 숨겨진 텍스트로도 둔다. */
function SpreadText({ book }: { book: BookDefinition }) {
  const spread = useBookStore((state) => state.spread);
  const { left, right } = pagesOfSpread(book.pages, spread);
  return (
    <section className="sr-only" aria-live="polite" aria-label="펼친 면의 내용">
      {[left, right].map((page) =>
        page ? (
          <article key={page.id}>
            {page.blocks
              .flatMap(blockToText)
              .filter(Boolean)
              .map((text, index) => (
                <p key={index}>{text}</p>
              ))}
          </article>
        ) : null,
      )}
    </section>
  );
}
