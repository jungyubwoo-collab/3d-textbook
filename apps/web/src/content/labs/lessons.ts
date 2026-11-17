import { lazy, type ComponentType } from 'react';
import type { Lesson, PageBlock } from '../../book/types.ts';
import { drawSketch } from '../../figure/images.ts';
import { LABS, type LabConfig } from './labs.ts';
import { HUB, modelsOf } from './models.ts';

/** 글 페이지에 이름을 적는 모델의 최대 개수(넘으면 "외 N개"로 줄인다) */
const LISTED = 8;

/** 실험실 하나를 책의 한 펼침면(왼쪽 글 + 오른쪽 스케치·3D 공간)으로 만든다. */
function labLesson(
  lab: LabConfig,
  intro: string,
  /** 스케치 아래에 적는 둘러볼 곳 */
  tour: string[],
  mood: string,
  Scene: ComponentType,
): Lesson {
  const models = modelsOf(lab.id);
  const names = models.slice(0, LISTED).map((model) => model.name);
  if (models.length > LISTED) names.push(`… 외 ${models.length - LISTED}개`);
  const featured: PageBlock[] =
    models.length > 0
      ? [
          {
            type: 'paragraph',
            text: `실험 기구와 장치의 3D 모델이 에셋 허브에 ${HUB.total} 모여 있어요. 이 실험실에는 그 가운데 주요 모델 ${models.length}개를 골라 놓았어요. 모델을 누르면 앞의 받침대에서 크게 돌려 볼 수 있어요.`,
          },
          { type: 'list', items: names },
        ]
      : [
          {
            type: 'paragraph',
            text: `실험 기구와 장치의 3D 모델이 에셋 허브에 ${HUB.total} 모여 있어요. 이 실험실은 그 모델들을 실험대와 선반에 놓아 보는 나만의 공간이에요.`,
          },
        ];
  return {
    id: lab.lessonId,
    title: lab.title,
    mood,
    // 오른쪽 앞에서 비스듬히 본다(왼쪽 벽의 안쪽과 창문이 보이게).
    focus: { target: [0.5, 0.22, -0.08], frame: [1.25, 1.06], azimuth: 0.24 },
    textPage: [
      { type: 'heading', text: lab.title },
      { type: 'paragraph', text: intro },
      { type: 'subheading', text: '3D 모델 자료실' },
      ...featured,
      { type: 'link', text: '에셋 허브에서 모두 보기', href: HUB.url },
    ],
    scenePage: [
      { type: 'eyebrow', text: '스케치' },
      { type: 'subheading', text: `${lab.title} 스케치` },
      {
        type: 'figure',
        draw: (ctx, size) => drawSketch(ctx, lab.sketch, size, 4),
        text: '',
        alt: `${lab.title}을 선으로 그린 스케치. 칠판과 선반이 있는 뒷벽, 창문이 있는 왼쪽 벽, 가운데 실험대와 의자, 벽 쪽 실험대, 바퀴 달린 수레가 보인다.`,
        images: [lab.sketch],
        action: '3D로 둘러보기',
        // 스케치 비율(4:3)에 맞춘 높이. 아래에 설명 글이 들어간다.
        height: 600,
      },
      {
        type: 'paragraph',
        text: '선으로 그린 스케치는 공간의 설계도예요. 3D로 일으켜 세우면 선이 면이 되고, 색과 그림자가 입혀져요.',
      },
      { type: 'list', items: tour },
      {
        type: 'caption',
        text: `${lab.title}의 스케치예요. 그림을 눌러 3D 공간으로 일으켜 세우고, 화면을 끌어 둘러보세요.`,
        placement: 'bottom',
      },
    ],
    Scene,
  };
}

export const physicsLabLesson = labLesson(
  LABS.physics,
  '칠판과 실험대, 선반이 있는 나만의 물리 실험실이에요. 오른쪽 스케치를 누르면 선으로 그린 실험실이 3D 공간으로 일어서요.',
  [
    '뒷벽: 칠판과 시계, 기구를 올려 두는 선반',
    '가운데: 넓은 실험대와 의자',
    '왼쪽 벽: 창문과 벽 쪽 실험대',
    '오른쪽 앞: 기구를 싣고 다니는 수레',
  ],
  '#ffb070',
  lazy(() => import('./LabScene.tsx').then((module) => ({ default: module.PhysicsLabScene }))),
);

export const chemistryLabLesson = labLesson(
  LABS.chemistry,
  '개수대와 후드, 시약 선반이 있는 나만의 화학 실험실이에요. 오른쪽 스케치를 누르면 선으로 그린 실험실이 3D 공간으로 일어서요.',
  [
    '뒷벽: 칠판과 시계, 시약병이 놓인 선반',
    '가운데: 개수대가 있는 실험대와 의자',
    '왼쪽 벽: 창문과 후드, 벽 쪽 실험대',
    '오른쪽 앞: 기구를 싣고 다니는 수레',
  ],
  '#7fe0c8',
  lazy(() => import('./LabScene.tsx').then((module) => ({ default: module.ChemistryLabScene }))),
);
