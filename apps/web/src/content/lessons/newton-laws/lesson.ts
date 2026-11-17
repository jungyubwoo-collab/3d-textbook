import { lazy } from 'react';
import type { Lesson } from '../../../book/types.ts';
import { newtonFigure } from './figure.ts';
import { LESSON_ID, NEWTON_QUESTION } from './ids.ts';

/** 뉴턴의 운동 법칙: 수레와 추 실험(힘·질량·가속도, 관성, 작용 반작용) */
export const newtonLawsLesson: Lesson = {
  id: LESSON_ID,
  mood: '#ffb070',
  focus: { target: [0.5, 0.295, 0], frame: [1.3, 1.2] },
  title: '힘이 운동을 바꾼다',
  textPage: [
    { type: 'heading', text: '힘이 운동을 바꾼다' },
    {
      type: 'paragraph',
      text: '힘을 받지 않는 물체는 멈춰 있거나 같은 속력으로 곧게 나아가요(관성). 힘을 받으면 속력이 변하는데, 1초마다 변하는 정도인 가속도는 힘에 비례하고 질량에 반비례해요. 그리고 힘은 언제나 서로 주고받아요.',
    },
    {
      type: 'formula',
      text: 'a = F ÷ m',
      note: '가속도(m/s²) = 힘(N) ÷ 질량(kg)',
    },
    {
      type: 'question',
      question: {
        id: NEWTON_QUESTION,
        prompt:
          '추가 줄로 수레를 끌다가 바닥에 닿아 줄이 느슨해졌어요. 끄는 힘이 사라진 수레는 어떻게 될까요? (마찰은 없어요)',
        choices: [
          { id: 'stops', label: '바로 멈춘다' },
          { id: 'slows', label: '점점 느려지다 멈춘다' },
          { id: 'keeps', label: '같은 속력으로 계속 간다' },
        ],
        answerId: 'keeps',
        explanation:
          '힘이 없으면 물체는 움직이던 그대로 움직여요(제1법칙, 관성). 추가 끄는 동안에는 속력이 고르게 빨라지고(제2법칙), 힘이 사라지면 그때의 속력 그대로 나아가요.',
      },
    },
  ],
  scenePage: [
    { type: 'eyebrow', text: '실험' },
    { type: 'subheading', text: '수레와 추' },
    newtonFigure,
    {
      type: 'caption',
      text: '추가 줄로 수레를 끌어요. 추가 바닥에 닿아 끄는 힘이 사라지면 수레는? 그림을 눌러 3D로 실험해 보세요.',
      placement: 'bottom',
    },
  ],
  Scene: lazy(() =>
    import('./NewtonScene.tsx').then((module) => ({ default: module.NewtonScene })),
  ),
};
