import type { BookDefinition, Chapter, Lesson, PageSpec } from '../book/types.ts';
import { freeFallLesson } from './lessons/free-fall/lesson.ts';
import { kineticEnergyLesson } from './lessons/kinetic-energy/lesson.ts';
import { momentumLesson } from './lessons/momentum/lesson.ts';
import { newtonLawsLesson } from './lessons/newton-laws/lesson.ts';
import { orbitLesson } from './lessons/orbit/lesson.ts';
import { pendulumLesson } from './lessons/pendulum/lesson.ts';
import { potentialEnergyLesson } from './lessons/potential-energy/lesson.ts';

/**
 * 책에 싣는 대단원과 단원(순서대로). 단원을 넣거나 순서를 바꾸면
 * 대단원 번호, 차례, 그림 번호가 여기서 저절로 다시 매겨진다.
 */
const chapters: Chapter[] = [
  {
    title: '힘과 운동',
    music: 'momentum',
    mood: '#ffb070',
    lessons: [newtonLawsLesson, momentumLesson],
  },
  {
    title: '중력',
    music: 'gravity',
    mood: '#9db8ff',
    lessons: [freeFallLesson, orbitLesson],
  },
  {
    title: '일과 에너지',
    music: 'energy',
    mood: '#ffd27a',
    lessons: [potentialEnergyLesson, kineticEnergyLesson, pendulumLesson],
  },
];

interface Placed {
  lesson: Lesson;
  chapter: Chapter;
  /** 페이지 맨 위에 찍는 대단원 이름 ("1단원 · 힘과 운동") */
  label: string;
  /** 책 전체에서 몇 번째 단원인지(1부터). 차례 번호이자 그림 번호 */
  number: number;
  /** 대단원의 첫 단원인지 */
  first: boolean;
}

const placed: Placed[] = chapters
  .flatMap((chapter, chapterIndex) =>
    chapter.lessons.map((lesson, lessonIndex) => ({
      lesson,
      chapter,
      label: `${chapterIndex + 1}단원 · ${chapter.title}`,
      first: lessonIndex === 0,
    })),
  )
  .map((entry, index) => ({ ...entry, number: index + 1 }));

/** 단원 하나를 왼쪽(글) + 오른쪽(3D 장면) 두 페이지로 만든다. */
function lessonPages({ lesson, chapter, label, number }: Placed): [PageSpec, PageSpec] {
  const tune = lesson.music ?? chapter.music;
  const music = tune ? { music: tune } : {};
  const mood = lesson.mood ?? chapter.mood;
  return [
    {
      id: `${lesson.id}-text`,
      lessonId: lesson.id,
      blocks: [{ type: 'eyebrow', text: label }, ...lesson.textPage],
      ...music,
    },
    {
      id: `${lesson.id}-scene`,
      lessonId: lesson.id,
      // 그림 설명에 그림 번호를 붙인다.
      blocks: lesson.scenePage.map((block) =>
        block.type === 'caption' ? { ...block, text: `그림 ${number}. ${block.text}` } : block,
      ),
      scene: lesson.Scene,
      ...music,
      ...(lesson.focus ? { focus: lesson.focus } : {}),
      ...(mood ? { mood } : {}),
    },
  ];
}

/**
 * 책 한 권의 페이지 순서. 짝수 번째(0, 2, 4…)는 오른쪽, 홀수 번째는 왼쪽 페이지가 된다.
 * 단원을 추가할 때는 글 페이지가 홀수 번째에 오도록 앞에 빈 페이지를 끼워 맞춘다(validateBook이 검사한다).
 */
export const book: BookDefinition = {
  title: '움직임의 법칙',
  // 배경음악: 표지·차례·정리는 주제곡, 단원마다 그 대단원의 곡(public/audio/music)
  music: 'theme',
  pages: [
    {
      id: 'cover',
      style: 'cover-front',
      blocks: [
        { type: 'eyebrow', text: '3D 교과서 · 중고등 물리' },
        { type: 'heading', text: '움직임의 법칙' },
        { type: 'paragraph', text: '힘과 운동 · 중력 · 에너지' },
      ],
    },
    {
      id: 'how-to',
      style: 'endpaper',
      showNumber: false,
      blocks: [
        { type: 'heading', text: '이 책을 읽는 법' },
        {
          type: 'list',
          ordered: true,
          items: [
            '예측 — 실험 결과를 먼저 골라요.',
            '실험 — 그림을 눌러 3D로 펼치고, 일어선 장치를 직접 움직여 봐요.',
            '확인 — 덮개를 들춰 정답과 해설을 봐요. 맞히면 도장이 찍혀요.',
          ],
        },
        { type: 'spacer', size: 24 },
        { type: 'subheading', text: '조작 방법' },
        {
          type: 'list',
          items: [
            '책장 가장자리를 잡고 끌거나, ← → 키나 아래 단추로 책장을 넘겨요.',
            '책 바깥을 끌면 책을 돌려 볼 수 있고, 휠이나 두 손가락으로 확대해요.',
            '실험 중에는 화면 왼쪽 위의 탐구 과제를 하나씩 해 보세요.',
          ],
        },
      ],
    },
    {
      id: 'contents',
      blocks: [
        { type: 'heading', text: '차례' },
        {
          type: 'toc',
          entries: [
            ...placed.map(({ lesson, label, number, first }) => ({
              title: `${number}. ${lesson.title}`,
              pageId: `${lesson.id}-text`,
              ...(first ? { group: label } : {}),
            })),
            { title: '한눈에 정리', pageId: 'summary', group: '마무리' },
          ],
        },
      ],
    },
    ...placed.flatMap(lessonPages),
    {
      id: 'summary',
      blocks: [
        { type: 'eyebrow', text: '정리' },
        { type: 'heading', text: '한눈에 정리' },
        {
          type: 'table',
          rows: [
            ['운동 법칙', 'a = F ÷ m,   힘이 0이면 속력 그대로'],
            ['운동량', 'p = m v, 충돌 전 합 = 충돌 후 합'],
            ['자유 낙하', 'v = g t,   h = ½ g t²'],
            ['원 궤도', '지표 근처에서 약 7.9 km/s'],
            ['위치 에너지', 'Ep = m g h'],
            ['운동 에너지', 'Ek = ½ m v²'],
            ['역학적 에너지', 'Ep + Ek = 일정'],
          ],
        },
        {
          type: 'paragraph',
          text: 'g ≈ 9.8 m/s²이고, 힘의 단위는 N(뉴턴), 에너지의 단위는 J(줄), 운동량의 단위는 kg·m/s예요.',
        },
      ],
    },
    {
      id: 'notes',
      blocks: [
        { type: 'subheading', text: '메모' },
        { type: 'lines', count: 16 },
      ],
    },
    {
      id: 'back-cover',
      style: 'cover-back',
      blocks: [{ type: 'paragraph', text: '3D 교과서 · 중고등 물리 역학 단원' }],
    },
  ],
};
