import { lazy } from 'react';
import type { Lesson } from '../../../book/types.ts';
import { LESSON_ID, POTENTIAL_QUESTION } from './ids.ts';

/** 2단원 에너지 ① 위치 에너지 */
export const potentialEnergyLesson: Lesson = {
  id: LESSON_ID,
  title: '높이에 저장된 에너지',
  textPage: [
    { type: 'eyebrow', text: '2단원 · 에너지' },
    { type: 'heading', text: '높이에 저장된 에너지' },
    {
      type: 'paragraph',
      text: '물체를 들어 올리려면 중력을 거슬러 일을 해야 해요. 그 일은 사라지지 않고 높이에 저장되는데, 이것이 중력에 의한 위치 에너지예요. 무거울수록, 높을수록 커져요.',
    },
    {
      type: 'formula',
      text: 'Ep = m g h',
      note: '질량 m(kg) × 중력 가속도 g × 높이 h(m), 단위는 J(줄)',
    },
    {
      type: 'question',
      question: {
        id: POTENTIAL_QUESTION,
        prompt: '같은 상자를 처음보다 2배 높은 곳으로 올리면 위치 에너지는 몇 배가 될까요?',
        choices: [
          { id: 'same', label: '그대로다' },
          { id: 'double', label: '2배가 된다' },
          { id: 'quadruple', label: '4배가 된다' },
        ],
        answerId: 'double',
        explanation:
          'Ep = mgh에서 높이 h만 2배가 되었으니 위치 에너지도 2배예요. 질량을 2배로 해도 똑같이 2배가 돼요.',
      },
    },
  ],
  scenePage: [
    { type: 'eyebrow', text: '실험' },
    { type: 'subheading', text: '도르래 실험대' },
    { type: 'grid' },
    {
      type: 'caption',
      text: '그림 3. 상자를 올리고 내리며 위치 에너지 막대를 살펴보세요. 상자의 질량도 바꿔 볼 수 있어요.',
      placement: 'bottom',
    },
  ],
  Scene: lazy(() =>
    import('./PotentialEnergyScene.tsx').then((module) => ({
      default: module.PotentialEnergyScene,
    })),
  ),
};
