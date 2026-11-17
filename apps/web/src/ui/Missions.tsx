import { experimentOfSpread } from '../book/experiment.ts';
import type { BookDefinition } from '../book/types.ts';
import { useBookStore } from '../state/bookStore.ts';

/**
 * 3D 실험 중에 보이는 탐구 과제판(화면 왼쪽 위). 장면이 알려 주는 진행 상황(bookStore.missions)을 보여 준다.
 * 과제를 모두 마치면 결론이 나타난다. 좁은 화면에서는 지금 할 과제 하나만 보여 준다.
 */
export function Missions({ book }: { book: BookDefinition }) {
  const spread = useBookStore((state) => state.spread);
  const experiment = useBookStore((state) => state.experiment);
  const lessonId = experimentOfSpread(book, spread)?.lessonId;
  const board = useBookStore((state) => (lessonId ? state.missions[lessonId] : undefined));
  if (!experiment || !board || board.items.length === 0) return null;

  const done = board.items.filter((item) => item.done).length;
  const complete = done === board.items.length;
  const next = board.items.find((item) => !item.done);
  return (
    <section
      className="pointer-events-none absolute left-4 top-24 w-[min(17rem,62vw)] animate-[toast-in_0.3s_ease-out] rounded-2xl bg-paper/90 p-3.5 shadow-lg ring-1 ring-black/5 backdrop-blur sm:left-6 sm:top-28"
      aria-label="탐구 과제"
      aria-live="polite"
    >
      <h2 className="flex items-baseline justify-between text-xs font-bold tracking-wide text-accent">
        탐구 과제
        <span className="tabular-nums text-muted">
          {done}/{board.items.length}
        </span>
      </h2>
      <ol className="mt-2 hidden flex-col gap-1.5 sm:flex">
        {board.items.map((item, index) => (
          <li
            key={item.label}
            className={`flex items-start gap-2 text-[13px] leading-snug ${
              item.done ? 'text-muted' : 'font-semibold text-ink'
            }`}
          >
            <span
              className={`mt-0.5 flex size-4 shrink-0 items-center justify-center rounded-full text-[10px] font-bold ring-1 ${
                item.done ? 'bg-accent text-paper ring-accent' : 'text-muted ring-ink/30'
              }`}
              aria-hidden="true"
            >
              {item.done ? '✓' : index + 1}
            </span>
            <span className={item.done ? 'line-through decoration-ink/30' : ''}>{item.label}</span>
            <span className="sr-only">{item.done ? '(완료)' : '(아직)'}</span>
          </li>
        ))}
      </ol>
      {next && <p className="mt-1.5 text-[13px] font-semibold text-ink sm:hidden">{next.label}</p>}
      {complete && (
        <p className="mt-2.5 animate-[toast-in_0.4s_ease-out] rounded-xl bg-accent/10 px-3 py-2 text-[13px] font-bold leading-snug text-accent ring-1 ring-accent/30">
          {board.conclusion}
        </p>
      )}
    </section>
  );
}
