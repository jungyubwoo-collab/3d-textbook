import { lazy } from 'react';
import type { Lesson } from '../../../book/types.ts';
import { momentumFigure } from './figure.ts';
import { LESSON_ID, MOMENTUM_QUESTION } from './ids.ts';

/** 3단원 운동량 ① 운동량과 충돌 */
export const momentumLesson: Lesson = {
  id: LESSON_ID,
  music: 'momentum',
  title: '부딪혀도 지켜지는 양',
  textPage: [
    { type: 'eyebrow', text: '3단원 · 운동량' },
    { type: 'heading', text: '부딪혀도 지켜지는 양' },
    {
      type: 'paragraph',
      text: '운동량은 질량과 속도를 곱한 양으로, 물체가 얼마나 세차게 움직이는지를 나타내요. 물체끼리 부딪혀도 바깥에서 힘이 작용하지 않으면 운동량의 합은 변하지 않아요.',
    },
    {
      type: 'formula',
      text: 'p = m v',
      note: '충돌 전 운동량의 합 = 충돌 후 운동량의 합',
    },
    {
      type: 'question',
      question: {
        id: MOMENTUM_QUESTION,
        prompt:
          '움직이는 수레가 질량이 같은 정지한 수레에 부딪혀 둘이 붙은 채 함께 움직이면, 속력은 처음의 몇 배일까요?',
        choices: [
          { id: 'same', label: '1배 (그대로)' },
          { id: 'half', label: '절반' },
          { id: 'double', label: '2배' },
        ],
        answerId: 'half',
        explanation:
          '충돌 전 운동량은 m × v예요. 붙은 뒤에는 질량이 2m이 되므로, 운동량의 합이 같으려면 속력은 v의 절반이어야 해요.',
      },
    },
  ],
  scenePage: [
    { type: 'eyebrow', text: '실험' },
    { type: 'subheading', text: '충돌 레일' },
    momentumFigure,
    {
      type: 'caption',
      text: '그림 6. 움직이는 수레 A가 서 있는 B에 부딪혀 붙었어요. 함께 움직이는 속력은? 그림을 눌러 3D로 실험해 보세요.',
      placement: 'bottom',
    },
  ],
  Scene: lazy(() =>
    import('./MomentumScene.tsx').then((module) => ({ default: module.MomentumScene })),
  ),
};
