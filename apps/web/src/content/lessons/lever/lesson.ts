import { lazy } from 'react';
import type { Lesson } from '../../../book/types.ts';
import { LEVER_LESSON_ID, LEVER_QUESTION_ID } from './ids.ts';

/** 예시 단원: 지레의 원리 */
export const leverLesson: Lesson = {
  id: LEVER_LESSON_ID,
  title: '지레의 원리',
  textPage: [
    { type: 'eyebrow', text: '1단원 · 힘과 운동' },
    { type: 'heading', text: '지레의 원리' },
    {
      type: 'paragraph',
      text: '긴 막대를 한 점(받침점)에 걸쳐 놓으면 작은 힘으로 무거운 물체를 움직일 수 있어요. 시소와 병따개, 가위가 모두 지레예요.',
    },
    {
      type: 'formula',
      text: '추의 무게 × 받침점까지의 거리',
      note: '왼쪽과 오른쪽의 값이 같으면 막대가 수평을 이룹니다.',
    },
    {
      type: 'question',
      question: {
        id: LEVER_QUESTION_ID,
        prompt:
          '왼쪽 2칸 자리에 추 2개가 걸려 있어요. 오른쪽 4칸 자리에 추를 몇 개 걸어야 수평이 될까요?',
        choices: [
          { id: 'one', label: '1개' },
          { id: 'two', label: '2개' },
          { id: 'four', label: '4개' },
        ],
        answerId: 'one',
        explanation:
          '왼쪽은 추 2개 × 2칸 = 4, 오른쪽은 추 1개 × 4칸 = 4로 같아요. 받침점에서 두 배 먼 곳에서는 절반의 무게로 균형을 맞출 수 있어요.',
      },
    },
  ],
  scenePage: [
    { type: 'eyebrow', text: '실험' },
    { type: 'subheading', text: '지레 실험대' },
    {
      type: 'caption',
      text: '그림 1. 오른쪽 고리를 누르면 추가 하나씩 걸리고, 걸린 추를 누르면 떼어져요. 왼쪽 추 2개는 고정되어 있어요.',
      placement: 'bottom',
    },
  ],
  // 3D 장면 코드는 이 단원을 펼칠 때 따로 받는다.
  Scene: lazy(() => import('./LeverScene.tsx').then((module) => ({ default: module.LeverScene }))),
};
