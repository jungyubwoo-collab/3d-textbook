import { COLORS } from '../book/constants.ts';

/** 팝업 장면에 쓰는 물감 색. 잉크 재질(inkMaterial)과 함께 쓴다. */
export const TINT = {
  paper: '#f3ede1',
  card: '#fbf7ee',
  wood: '#e3cfae',
  woodDark: '#c9ad85',
  metal: '#cdd2d7',
  steel: '#9aa5b0',
  brass: '#d9b25f',
  orange: '#e07b45',
  blue: '#7d9cc4',
  sky: '#a9cfe0',
  green: '#8fbf7f',
  red: '#d9675b',
  yellow: '#e9c25a',
  purple: '#a58cc9',
  ink: COLORS.ink,
  accent: COLORS.accent,
} as const;

/** 에너지 막대의 색 (위치·운동·합) */
export const ENERGY_COLORS = {
  potential: TINT.blue,
  kinetic: TINT.orange,
  total: TINT.steel,
} as const;
