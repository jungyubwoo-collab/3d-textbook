import { useEffect } from 'react';
import { musicOfSpread } from '../book/structure.ts';
import type { BookDefinition } from '../book/types.ts';
import { setMusic } from '../lib/music.ts';
import { useBookStore } from '../state/bookStore.ts';

/** 펼친 면에 맞는 배경음악을 고른다(단원이 바뀌면 곡도 바뀐다). 화면에는 아무것도 그리지 않는다. */
export function Soundtrack({ book }: { book: BookDefinition }) {
  const spread = useBookStore((state) => state.spread);
  const musicMuted = useBookStore((state) => state.musicMuted);
  useEffect(() => {
    setMusic(musicMuted ? null : (musicOfSpread(book, spread) ?? null));
  }, [book, spread, musicMuted]);
  return null;
}
