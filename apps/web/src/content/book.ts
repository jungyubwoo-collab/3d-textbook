import type { BookDefinition, Lesson, PageSpec } from '../book/types.ts';
import { freeFallLesson } from './lessons/free-fall/lesson.ts';
import { kineticEnergyLesson } from './lessons/kinetic-energy/lesson.ts';
import { momentumLesson } from './lessons/momentum/lesson.ts';
import { orbitLesson } from './lessons/orbit/lesson.ts';
import { pendulumLesson } from './lessons/pendulum/lesson.ts';
import { potentialEnergyLesson } from './lessons/potential-energy/lesson.ts';

/** 단원 하나를 왼쪽(글) + 오른쪽(3D 장면) 두 페이지로 만든다. */
function lessonPages(lesson: Lesson): [PageSpec, PageSpec] {
  return [
    { id: `${lesson.id}-text`, lessonId: lesson.id, blocks: lesson.textPage },
    {
      id: `${lesson.id}-scene`,
      lessonId: lesson.id,
      blocks: lesson.scenePage,
      scene: lesson.Scene,
    },
  ];
}

/** 책에 싣는 단원 (순서대로) */
const lessons = [
  freeFallLesson,
  orbitLesson,
  potentialEnergyLesson,
  kineticEnergyLesson,
  pendulumLesson,
  momentumLesson,
];

/**
 * 책 한 권의 페이지 순서. 짝수 번째(0, 2, 4…)는 오른쪽, 홀수 번째는 왼쪽 페이지가 된다.
 * 단원을 추가할 때는 글 페이지가 홀수 번째에 오도록 앞에 빈 페이지를 끼워 맞춘다(validateBook이 검사한다).
 */
export const book: BookDefinition = {
  title: '움직임의 법칙',
  pages: [
    {
      id: 'cover',
      style: 'cover-front',
      blocks: [
        { type: 'eyebrow', text: '3D 교과서 · 중고등 물리' },
        { type: 'heading', text: '움직임의 법칙' },
        { type: 'paragraph', text: '중력 · 에너지 · 운동량' },
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
            '실험 — 오른쪽 페이지에서 일어선 모형을 직접 움직여 봐요.',
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
            ...lessons.map((lesson, index) => ({
              title: `${index + 1}. ${lesson.title}`,
              pageId: `${lesson.id}-text`,
            })),
            { title: '한눈에 정리', pageId: 'summary' },
          ],
        },
      ],
    },
    ...lessons.flatMap(lessonPages),
    {
      id: 'summary',
      blocks: [
        { type: 'eyebrow', text: '정리' },
        { type: 'heading', text: '한눈에 정리' },
        {
          type: 'table',
          rows: [
            ['자유 낙하', 'v = g t,   h = ½ g t²'],
            ['원 궤도', '지표 근처에서 약 7.9 km/s'],
            ['위치 에너지', 'Ep = m g h'],
            ['운동 에너지', 'Ek = ½ m v²'],
            ['역학적 에너지', 'Ep + Ek = 일정'],
            ['운동량', 'p = m v, 충돌 전 합 = 충돌 후 합'],
          ],
        },
        {
          type: 'paragraph',
          text: 'g ≈ 9.8 m/s²이고, 에너지의 단위는 J(줄), 운동량의 단위는 kg·m/s예요.',
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
