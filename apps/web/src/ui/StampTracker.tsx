import { useMemo } from 'react';
import { useShallow } from 'zustand/react/shallow';
import type { BookDefinition } from '../book/types.ts';
import { answerKey, useBookStore } from '../state/bookStore.ts';

/** 책 전체에서 모은 도장(예측을 맞힌 문항) 수를 제목 아래에 작은 동그라미로 보여 준다. */
export function StampTracker({ book }: { book: BookDefinition }) {
  const keys = useMemo(
    () =>
      book.pages.flatMap((page) =>
        page.blocks.flatMap((block) =>
          block.type === 'question' ? [answerKey(page.lessonId ?? page.id, block.question.id)] : [],
        ),
      ),
    [book],
  );
  const stamped = useBookStore(
    useShallow((state) => keys.map((key) => state.answers[key]?.correct === true)),
  );
  if (keys.length === 0) return null;
  const count = stamped.filter(Boolean).length;
  return (
    <p
      className="mt-1 flex items-center gap-1 text-[11px] font-semibold text-muted"
      aria-label={`모은 도장 ${count}개, 전체 ${keys.length}개`}
    >
      {stamped.map((done, index) => (
        <span
          key={keys[index]}
          aria-hidden="true"
          className={`size-2 rounded-full ring-1 ${done ? 'bg-accent ring-accent' : 'ring-ink/25'}`}
        />
      ))}
      <span className="ml-1 tabular-nums" aria-hidden="true">
        도장 {count}/{keys.length}
      </span>
    </p>
  );
}
