import { lazy } from 'react';
import type { Lesson } from '../../../book/types.ts';
import { pulleyFigure } from './figure.ts';
import { LESSON_ID, PULLEY_QUESTION } from './ids.ts';

/** 일의 원리: 고정 도르래와 움직도르래로 물체 들어 올리기 */
export const pulleyLesson: Lesson = {
  id: LESSON_ID,
  focus: { target: [0.47, 0.26, 0], frame: [1.25, 1.08] },
  title: '힘을 줄이면 거리가 늘어난다',
  textPage: [
    { type: 'heading', text: '힘을 줄이면 거리가 늘어난다' },
    {
      type: 'paragraph',
      text: '물체에 힘을 주어 힘의 방향으로 움직이면 일을 했다고 해요. 일의 양은 힘과 이동 거리를 곱한 값이에요. 도르래를 쓰면 작은 힘으로 무거운 물체를 들 수 있지만, 그만큼 줄을 더 길게 당겨야 해서 일의 양은 줄지 않아요.',
    },
    {
      type: 'formula',
      text: 'W = F s',
      note: '일(J) = 힘(N) × 이동 거리(m)',
    },
    {
      type: 'question',
      question: {
        id: PULLEY_QUESTION,
        prompt:
          '무게 10 N인 물체를 움직도르래 1개로 0.4 m 들어 올리려고 해요. 힘은 절반인 5 N이면 돼요. 줄은 얼마나 당겨야 할까요?',
        choices: [
          { id: 'half', label: '0.2 m' },
          { id: 'same', label: '0.4 m' },
          { id: 'double', label: '0.8 m' },
        ],
        answerId: 'double',
        explanation:
          '물체를 두 가닥의 줄이 나눠 들어서 힘은 절반이지만, 두 가닥이 모두 0.4 m씩 짧아져야 하므로 줄은 0.8 m를 당겨야 해요. 한 일은 5 N × 0.8 m = 4 J로, 직접 들 때(10 N × 0.4 m)와 같아요. 이것이 일의 원리예요.',
      },
    },
  ],
  scenePage: [
    { type: 'eyebrow', text: '실험' },
    { type: 'subheading', text: '도르래로 들어 올리기' },
    pulleyFigure,
    {
      type: 'caption',
      text: '움직도르래를 쓰면 힘이 절반으로 줄어요. 줄은 얼마나 당겨야 할까요? 그림을 눌러 3D로 실험해 보세요.',
      placement: 'bottom',
    },
  ],
  Scene: lazy(() =>
    import('./PulleyScene.tsx').then((module) => ({ default: module.PulleyScene })),
  ),
};
