import 'pretendard/dist/web/variable/pretendardvariable-dynamic-subset.css';
import './index.css';
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './App.tsx';
import { spreadCount, validateBook } from './book/structure.ts';
import { book } from './content/book.ts';
import { bookStore } from './state/bookStore.ts';

if (import.meta.env.DEV) {
  for (const problem of validateBook(book.pages)) console.error(`[책 구성] ${problem}`);
}
bookStore.getState().configure(spreadCount(book.pages));

const root = document.getElementById('root');
if (!root) throw new Error('#root 요소가 없습니다.');
createRoot(root).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
