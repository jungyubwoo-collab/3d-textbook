import { lazy } from 'react';
import type { Lesson } from '../../../book/types.ts';
import { kineticEnergyFigure } from './figure.ts';
import { KINETIC_QUESTION, LESSON_ID } from './ids.ts';

/** 2단원 에너지 ② 운동 에너지 */
export const kineticEnergyLesson: Lesson = {
  id: LESSON_ID,
  music: 'energy',
  // 3D 실험 때 카메라가 맞출 곳(장치 전체가 화면에 들어오게)
  focus: { target: [0.5, 0.1, 0.08], frame: [1.32, 0.86] },
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
    kineticEnergyFigure,
    {
      type: 'caption',
      text: '그림 4. 속력 v로 부딪힌 수레가 나무토막을 d만큼 밀어냈어요. 속력이 2v라면? 그림을 눌러 3D로 실험해 보세요.',
      placement: 'bottom',
    },
  ],
  Scene: lazy(() =>
    import('./KineticEnergyScene.tsx').then((module) => ({ default: module.KineticEnergyScene })),
  ),
};
