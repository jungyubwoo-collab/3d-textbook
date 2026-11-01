/** 책 크기 (Three.js 단위, 대략 1 = 20cm). 책은 책상(XZ 평면) 위에 누워 있고 책등은 x = 0 이다. */
export const PAGE_WIDTH = 1;
export const PAGE_HEIGHT = 1.36;
export const PAGE_DEPTH = 0.0024;
export const PAGE_SEGMENTS = 30;

export const COVER_WIDTH = 1.03;
export const COVER_HEIGHT = 1.4;
export const COVER_DEPTH = 0.016;

/** 책장 사이 간격 (겹쳐 깜빡이는 것을 막는다) */
export const LEAF_GAP = 0.0006;
/** 책상 매트 윗면 높이 */
export const BOOK_BASE_Y = 0.006;

const reducedMotion =
  typeof window !== 'undefined' &&
  typeof window.matchMedia === 'function' &&
  window.matchMedia('(prefers-reduced-motion: reduce)').matches;

/** 책장 한 장을 넘기는 시간(초) */
export const TURN_DURATION = reducedMotion ? 0.3 : 0.9;
/** 여러 장을 한꺼번에 넘길 때 장 사이 지연(초) */
export const TURN_STAGGER = reducedMotion ? 0 : 0.14;
/** 넘기는 도중 종이 끝이 더 휘는 정도(라디안) */
export const TURN_CURL = 0.8;
/** 넘기는 도중 살짝 들어 올리는 높이 */
export const TURN_LIFT = 0.012;

/** 페이지 텍스처 해상도(px) */
export const TEXTURE_WIDTH = 1024;
export const TEXTURE_HEIGHT = Math.round((TEXTURE_WIDTH * PAGE_HEIGHT) / PAGE_WIDTH);

export const COLORS = {
  paper: '#f7f2e7',
  paperEdge: '#ece3d1',
  endpaper: '#e8dcc3',
  cloth: '#1f4f5c',
  clothDark: '#163c46',
  ivory: '#f4ead2',
  gold: '#d6a94f',
  ink: '#25221e',
  body: '#3b3631',
  muted: '#8a7f72',
  accent: '#c4522f',
  accentSoft: 'rgba(196, 82, 47, 0.07)',
  accentLine: 'rgba(196, 82, 47, 0.45)',
  pencil: '#2d5fa8',
  grade: '#d0352c',
  flap: '#efe2c0',
  flapEdge: '#cdb98a',
  flapText: '#6b5a36',
} as const;
