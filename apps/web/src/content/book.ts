import type { BookDefinition, Lesson, PageSpec } from '../book/types.ts';
import { leverLesson } from './lessons/lever/lesson.ts';

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

/**
 * 책 한 권의 페이지 순서. 짝수 번째(0, 2, 4…)는 오른쪽, 홀수 번째는 왼쪽 페이지가 된다.
 * 단원을 추가할 때는 글 페이지가 홀수 번째에 오도록 앞에 빈 페이지를 끼워 맞춘다(validateBook이 검사한다).
 */
export const book: BookDefinition = {
  title: '펼치는 과학',
  pages: [
    {
      id: 'cover',
      style: 'cover-front',
      blocks: [
        { type: 'eyebrow', text: '3D 교과서 · 예시 도서' },
        { type: 'heading', text: '펼치는 과학' },
        { type: 'paragraph', text: '책장 위 그림이 입체로 일어서는 과학책' },
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
            '← → 키나 아래 단추로 책장을 넘겨요.',
            '화면을 끌면 책을 돌려 볼 수 있고, 휠이나 두 손가락으로 확대해요.',
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
            { title: `1. ${leverLesson.title}`, pageId: `${leverLesson.id}-text` },
            { title: '2. 다음 단원 (준비 중)', pageId: 'coming-soon' },
          ],
        },
      ],
    },
    ...lessonPages(leverLesson),
    {
      id: 'coming-soon',
      blocks: [
        { type: 'eyebrow', text: '2단원' },
        { type: 'heading', text: '다음 단원을 준비하고 있어요' },
        { type: 'paragraph', text: '새로운 실험이 곧 이 자리에 일어설 거예요.' },
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
      blocks: [{ type: 'paragraph', text: '3D 교과서 프로젝트 · 예시 도서' }],
    },
  ],
};
