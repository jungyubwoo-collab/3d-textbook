import { BookCanvas } from './book/BookCanvas.tsx';
import { book } from './content/book.ts';
import { Hud } from './ui/Hud.tsx';

export function App() {
  return (
    <main className="relative h-full w-full overflow-hidden">
      <BookCanvas />
      <Hud book={book} />
    </main>
  );
}
