import { lazy } from 'react';
import type { Lesson } from '../../../book/types.ts';
import { LESSON_ID, ORBIT_QUESTION } from './ids.ts';

/** 1단원 중력 ② 뉴턴의 대포 */
export const orbitLesson: Lesson = {
  id: LESSON_ID,
  music: 'gravity',
  title: '떨어지면서 도는 달',
  textPage: [
    { type: 'eyebrow', text: '1단원 · 중력' },
    { type: 'heading', text: '떨어지면서 도는 달' },
    {
      type: 'paragraph',
      text: '산 위에서 대포알을 수평으로 쏘면 휘어지며 떨어져요. 빠르게 쏠수록 더 멀리 떨어지죠. 그런데 지구는 둥글어서, 충분히 빠르면 땅이 휘는 만큼 계속 떨어지기만 하고 땅에 닿지 않아요.',
    },
    {
      type: 'formula',
      text: '원 궤도 속력 v = √(GM ÷ r)',
      note: '지표면 가까이에서는 약 7.9 km/s예요. 이보다 느리면 땅에 떨어져요.',
    },
    {
      type: 'question',
      question: {
        id: ORBIT_QUESTION,
        prompt:
          '공기 저항이 없을 때, 산 위에서 대포알을 초속 7.9 km로 수평으로 쏘면 어떻게 될까요?',
        choices: [
          { id: 'far-crash', label: '아주 멀리 가서 떨어진다' },
          { id: 'orbit', label: '지구 주위를 계속 돈다' },
          { id: 'escape', label: '우주 멀리 날아가 버린다' },
        ],
        answerId: 'orbit',
        explanation:
          '중력은 대포알을 계속 지구 쪽으로 끌어당기지만, 앞으로 나아가는 만큼 땅도 둥글게 멀어져요. 그래서 계속 떨어지면서도 땅에 닿지 않아요. 달과 인공위성도 이렇게 돌아요.',
      },
    },
  ],
  scenePage: [
    { type: 'eyebrow', text: '실험' },
    { type: 'subheading', text: '뉴턴의 대포' },
    { type: 'grid' },
    {
      type: 'caption',
      text: '그림 2. 속력을 골라 쏘아 보세요. 산 높이와 지구 크기는 알아보기 쉽게 과장했어요.',
      placement: 'bottom',
    },
  ],
  Scene: lazy(() => import('./OrbitScene.tsx').then((module) => ({ default: module.OrbitScene }))),
};
