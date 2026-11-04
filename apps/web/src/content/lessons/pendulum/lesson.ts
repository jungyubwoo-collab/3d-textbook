import { lazy } from 'react';
import type { Lesson } from '../../../book/types.ts';
import { LESSON_ID, PENDULUM_QUESTION } from './ids.ts';

/** 2단원 에너지 ③ 역학적 에너지 보존 */
export const pendulumLesson: Lesson = {
  id: LESSON_ID,
  music: 'energy',
  title: '사라지지 않는 에너지',
  textPage: [
    { type: 'eyebrow', text: '2단원 · 에너지' },
    { type: 'heading', text: '사라지지 않는 에너지' },
    {
      type: 'paragraph',
      text: '진자가 내려올 때는 위치 에너지가 운동 에너지로, 올라갈 때는 다시 위치 에너지로 바뀌어요. 마찰과 공기 저항이 없다면 두 에너지의 합인 역학적 에너지는 늘 같아요.',
    },
    {
      type: 'formula',
      text: 'Ep + Ek = 일정',
      note: 'mgh + ½mv²는 진자가 어디에 있든 변하지 않아요.',
    },
    {
      type: 'question',
      question: {
        id: PENDULUM_QUESTION,
        prompt: '진자의 줄이 내려오다가 중간의 못에 걸리면, 추는 반대편에서 어디까지 올라갈까요?',
        choices: [
          { id: 'lower', label: '처음보다 낮은 곳까지' },
          { id: 'same', label: '처음과 같은 높이까지' },
          { id: 'higher', label: '처음보다 높은 곳까지' },
        ],
        answerId: 'same',
        explanation:
          '못에 걸려 도는 원이 작아져도 역학적 에너지는 그대로예요. 운동 에너지가 모두 위치 에너지로 바뀌는 높이, 곧 처음과 같은 높이까지 올라가요. 갈릴레이가 보여 준 실험이에요.',
      },
    },
  ],
  scenePage: [
    { type: 'eyebrow', text: '실험' },
    { type: 'subheading', text: '갈릴레이의 진자' },
    { type: 'grid' },
    {
      type: 'caption',
      text: '그림 5. 못을 꽂거나 빼고 놓아 보세요. 막대는 위치 에너지, 운동 에너지와 그 합이에요.',
      placement: 'bottom',
    },
  ],
  Scene: lazy(() =>
    import('./PendulumScene.tsx').then((module) => ({ default: module.PendulumScene })),
  ),
};
