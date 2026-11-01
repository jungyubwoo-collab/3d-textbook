import { useEffect } from 'react';
import { pagesOfSpread } from '../book/structure.ts';
import type { BookDefinition, PageBlock } from '../book/types.ts';
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
      </header>
      <ToastMessage />
      <footer className="flex justify-center">
        <Toolbar pages={book.pages} />
      </footer>
      <SpreadText book={book} />
    </div>
  );
}

function ToastMessage() {
  const toast = useBookStore((state) => state.toast);
  useEffect(() => {
    if (!toast) return;
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
    case 'lines':
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
