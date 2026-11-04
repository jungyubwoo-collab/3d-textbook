import { lazy } from 'react';
import type { Lesson } from '../../../book/types.ts';
import { KINETIC_QUESTION, LESSON_ID } from './ids.ts';

/** 2단원 에너지 ② 운동 에너지 */
export const kineticEnergyLesson: Lesson = {
  id: LESSON_ID,
  title: '움직임에 담긴 에너지',
  textPage: [
    { type: 'eyebrow', text: '2단원 · 에너지' },
    { type: 'heading', text: '움직임에 담긴 에너지' },
    {
      type: 'paragraph',
      text: '움직이는 물체는 다른 물체를 밀어내거나 부술 수 있어요. 움직임이 가진 이 능력이 운동 에너지예요. 질량에 비례하고, 속력의 제곱에 비례해요.',
    },
    {
      type: 'formula',
      text: 'Ek = ½ m v²',
      note: '질량 m(kg), 속력 v(m/s), 단위는 J(줄)',
    },
    {
      type: 'question',
      question: {
        id: KINETIC_QUESTION,
        prompt: '수레의 속력을 2배로 하면, 부딪힌 나무토막이 밀려나는 거리는 몇 배가 될까요?',
        choices: [
          { id: 'double', label: '2배' },
          { id: 'quadruple', label: '4배' },
          { id: 'octuple', label: '8배' },
        ],
        answerId: 'quadruple',
        explanation:
          '속력이 2배면 운동 에너지는 2² = 4배예요. 나무토막을 멈추게 하는 마찰력은 그대로라서, 4배 많은 에너지를 다 쓸 때까지 4배 더 멀리 밀려나요.',
      },
    },
  ],
  scenePage: [
    { type: 'eyebrow', text: '실험' },
    { type: 'subheading', text: '수레와 나무토막' },
    { type: 'grid' },
    {
      type: 'caption',
      text: '그림 4. 속력을 고르고 출발시켜 보세요. 깃발은 속력마다 나무토막이 멈춘 자리예요.',
      placement: 'bottom',
    },
  ],
  Scene: lazy(() =>
    import('./KineticEnergyScene.tsx').then((module) => ({ default: module.KineticEnergyScene })),
  ),
};
