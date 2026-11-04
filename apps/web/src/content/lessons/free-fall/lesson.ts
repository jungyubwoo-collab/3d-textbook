import { lazy } from 'react';
import type { Lesson } from '../../../book/types.ts';
import { FREE_FALL_QUESTION, LESSON_ID } from './ids.ts';

/** 1단원 중력 ① 자유 낙하 */
export const freeFallLesson: Lesson = {
  id: LESSON_ID,
  title: '모든 것은 함께 떨어진다',
  textPage: [
    { type: 'eyebrow', text: '1단원 · 중력' },
    { type: 'heading', text: '모든 것은 함께 떨어진다' },
    {
      type: 'paragraph',
      text: '지구는 모든 물체를 아래로 끌어당겨요. 이 힘이 중력이에요. 공기의 저항이 없다면 무겁든 가볍든 모든 물체는 1초마다 9.8 m/s씩 빨라지며 떨어져요.',
    },
    {
      type: 'formula',
      text: 'v = g t        h = ½ g t²',
      note: 'g ≈ 9.8 m/s² (중력 가속도), t는 떨어지기 시작한 뒤 지난 시간(초)',
    },
    {
      type: 'question',
      question: {
        id: FREE_FALL_QUESTION,
        prompt:
          '공기를 모두 뺀 유리관 안에서 깃털과 쇠구슬을 같은 높이에서 동시에 놓으면 어떻게 될까요?',
        choices: [
          { id: 'ball-first', label: '쇠구슬이 먼저 떨어진다' },
          { id: 'together', label: '둘이 동시에 떨어진다' },
          { id: 'feather-first', label: '깃털이 먼저 떨어진다' },
        ],
        answerId: 'together',
        explanation:
          '공기 저항이 없으면 두 물체 모두 같은 중력 가속도 g로 빨라져요. 쇠구슬은 중력을 더 크게 받지만 그만큼 움직이기도 어려워서, 빨라지는 정도는 똑같아요.',
      },
    },
  ],
  scenePage: [
    { type: 'eyebrow', text: '실험' },
    { type: 'subheading', text: '진공 낙하 장치' },
    { type: 'grid' },
    {
      type: 'caption',
      text: '그림 1. 공기가 있을 때와 뺐을 때 각각 놓아 보세요. 흐린 그림은 같은 시간 간격으로 찍은 위치예요.',
      placement: 'bottom',
    },
  ],
  Scene: lazy(() =>
    import('./FreeFallScene.tsx').then((module) => ({ default: module.FreeFallScene })),
  ),
};
