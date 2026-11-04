import type { ComponentType } from 'react';

export interface Choice {
  /** 소문자·숫자·하이픈 (API에도 그대로 저장된다) */
  id: string;
  label: string;
}

/** 덮개 아래에 정답이 숨겨진 예측 문항 */
export interface Question {
  id: string;
  prompt: string;
  choices: Choice[];
  answerId: string;
  explanation: string;
}

export interface TocEntry {
  title: string;
  /** 눌렀을 때 펼칠 페이지 */
  pageId: string;
}

/** 페이지에 인쇄되는 내용 조각. 위에서부터 차례로 배치된다. */
export type PageBlock =
  | { type: 'eyebrow'; text: string }
  | { type: 'heading'; text: string }
  | { type: 'subheading'; text: string }
  | { type: 'paragraph'; text: string }
  | { type: 'list'; items: string[]; ordered?: boolean }
  | { type: 'formula'; text: string; note?: string }
  | { type: 'question'; question: Question }
  | { type: 'caption'; text: string; placement?: 'flow' | 'bottom' }
  | { type: 'toc'; entries: TocEntry[] }
  | { type: 'lines'; count: number }
  /** 왼쪽에 이름, 오른쪽에 내용(공식 등)이 있는 표 */
  | { type: 'table'; rows: [label: string, value: string][] }
  /** 3D 장면이 서는 자리의 도면 모눈. height를 생략하면 아래 설명 글 위까지 채운다. */
  | { type: 'grid'; height?: number }
  | { type: 'spacer'; size: number };

export type PageStyle = 'paper' | 'endpaper' | 'cover-front' | 'cover-back';

export interface PageSpec {
  id: string;
  style?: PageStyle;
  /** 문항 기록을 묶는 단원 ID */
  lessonId?: string;
  blocks: PageBlock[];
  /** 오른쪽 페이지에서 일어서는 팝업 3D 장면 */
  scene?: ComponentType;
  /** 쪽 번호 표시 여부 (기본: 표지가 아니면 표시) */
  showNumber?: boolean;
  /** 이 페이지를 펼쳤을 때 흐르는 배경음악(public/audio/music/<이름>.mp3). 없으면 책의 기본 곡 */
  music?: string;
}

/** 단원 하나 = 왼쪽 글 페이지 + 오른쪽 3D 장면 페이지 */
export interface Lesson {
  id: string;
  title: string;
  textPage: PageBlock[];
  scenePage: PageBlock[];
  Scene: ComponentType;
  /** 단원의 배경음악 이름 (PageSpec.music) */
  music?: string;
}

export interface BookDefinition {
  title: string;
  /** 단원 밖(표지, 차례, 정리)에서 흐르는 기본 배경음악 이름 */
  music?: string;
  /** 짝수 개. [0]은 앞표지, 마지막은 뒤표지. 단원의 글 페이지는 홀수 번째(왼쪽)에 와야 한다. */
  pages: PageSpec[];
}
