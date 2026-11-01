import { useEffect } from 'react';
import { spreadLabel, spreadOfPage } from '../book/structure.ts';
import type { PageSpec } from '../book/types.ts';
import { bookStore, useBookStore } from '../state/bookStore.ts';

const button =
  'inline-flex h-11 min-w-11 items-center justify-center gap-1.5 rounded-full px-3 text-sm font-semibold text-ink transition hover:bg-black/5 disabled:cursor-not-allowed disabled:opacity-35';

/** 아래쪽 조작 막대: 이전·다음, 차례, 시점 초기화. ← → 키로도 넘긴다. */
export function Toolbar({ pages }: { pages: PageSpec[] }) {
  const spread = useBookStore((state) => state.spread);
  const count = useBookStore((state) => state.spreadCount);
  const { next, prev, goTo, resetView } = bookStore.getState();
  const contents = pages.some((page) => page.id === 'contents')
    ? spreadOfPage(pages, 'contents')
    : undefined;

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (
        event.target instanceof HTMLElement &&
        ['INPUT', 'TEXTAREA', 'SELECT'].includes(event.target.tagName)
      )
        return;
      if (event.key === 'ArrowRight' || event.key === 'PageDown') bookStore.getState().next();
      else if (event.key === 'ArrowLeft' || event.key === 'PageUp') bookStore.getState().prev();
      else if (event.key === 'Home') bookStore.getState().goTo(0);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  return (
    <nav
      aria-label="책장 넘기기"
      className="pointer-events-auto flex items-center gap-1 rounded-full bg-paper/90 p-1.5 shadow-lg ring-1 ring-black/10 backdrop-blur"
    >
      <button
        type="button"
        className={button}
        onClick={prev}
        disabled={spread === 0}
        aria-label="이전 장"
      >
        <Chevron direction="left" />
      </button>
      {contents !== undefined && (
        <button type="button" className={button} onClick={() => goTo(contents)}>
          차례
        </button>
      )}
      <span
        className="min-w-20 px-2 text-center text-sm tabular-nums text-muted"
        aria-live="polite"
      >
        {spreadLabel(pages, spread)}
      </span>
      <button
        type="button"
        className={button}
        onClick={next}
        disabled={spread >= count - 1}
        aria-label={spread === 0 ? '책 펼치기' : '다음 장'}
      >
        {spread === 0 ? <span className="pl-1">펼치기</span> : null}
        <Chevron direction="right" />
      </button>
      <span className="mx-1 h-6 w-px bg-black/10" aria-hidden="true" />
      <button type="button" className={button} onClick={resetView} aria-label="시점 처음으로">
        <svg
          viewBox="0 0 24 24"
          className="size-5"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          aria-hidden="true"
        >
          <path d="M3 12a9 9 0 1 0 3-6.7" strokeLinecap="round" />
          <path d="M3 4v5h5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>
    </nav>
  );
}

function Chevron({ direction }: { direction: 'left' | 'right' }) {
  return (
    <svg
      viewBox="0 0 24 24"
      className="size-5"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.2"
      aria-hidden="true"
    >
      <path
        d={direction === 'left' ? 'M15 5l-7 7 7 7' : 'M9 5l7 7-7 7'}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
