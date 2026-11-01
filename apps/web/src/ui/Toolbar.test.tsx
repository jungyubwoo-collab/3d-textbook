import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it } from 'vitest';
import { spreadCount } from '../book/structure.ts';
import { book } from '../content/book.ts';
import { bookStore } from '../state/bookStore.ts';
import { Toolbar } from './Toolbar.tsx';

beforeEach(() => {
  bookStore.setState({ spread: 0, spreadCount: spreadCount(book.pages), settled: true });
});

describe('Toolbar', () => {
  it('offers to open the closed book', async () => {
    render(<Toolbar pages={book.pages} />);
    expect(screen.getByText('표지')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '이전 장' })).toBeDisabled();

    await userEvent.click(screen.getByRole('button', { name: '책 펼치기' }));
    expect(bookStore.getState().spread).toBe(1);
    expect(screen.getByText('1쪽')).toBeInTheDocument();
  });

  it('jumps to the table of contents', async () => {
    bookStore.setState({ spread: 3 });
    render(<Toolbar pages={book.pages} />);
    await userEvent.click(screen.getByRole('button', { name: '차례' }));
    expect(bookStore.getState().spread).toBe(1);
  });

  it('turns pages with the arrow keys', async () => {
    render(<Toolbar pages={book.pages} />);
    await userEvent.keyboard('{ArrowRight}{ArrowRight}');
    expect(bookStore.getState().spread).toBe(2);
    await userEvent.keyboard('{ArrowLeft}');
    expect(bookStore.getState().spread).toBe(1);
  });

  it('stops at the back cover', () => {
    bookStore.setState({ spread: spreadCount(book.pages) - 1 });
    render(<Toolbar pages={book.pages} />);
    expect(screen.getByRole('button', { name: '다음 장' })).toBeDisabled();
    expect(screen.getByText('뒤표지')).toBeInTheDocument();
  });
});
