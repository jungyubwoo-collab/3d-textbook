/**
 * 에셋 허브(사내 3D 에셋 저장소)에서 골라 온 주요 3D 모델.
 * 허브에 접속하지 못해도 책에서 볼 수 있게 GLB 파일을 책에 함께 싣는다(public/models/hub/<id>.glb).
 * 모델을 더하려면 파일을 넣고 아래 목록에 한 줄을 적는다.
 */
export type LabId = 'physics' | 'chemistry';

export interface HubModel {
  /** 파일 이름에서 확장자를 뺀 것(소문자·숫자·하이픈) */
  id: string;
  /** 화면에 보이는 이름 */
  name: string;
  /** 어느 실험실에 놓는지 */
  lab: LabId;
  /** 놓을 자리(실험실 GLB의 SLOT_ 이름). 없으면 빈 자리에 차례로 놓는다. */
  slot?: string;
  /** 실험실 안에서의 크기(가장 긴 변, m). 없으면 0.5 */
  size?: number;
  /** 세워 놓는 방향(도, 위에서 봤을 때 반시계 방향) */
  turn?: number;
}

/** 에셋 허브 안내: 전체 모델 수와 프로젝트 주소(로그인이 필요하다) */
export const HUB = {
  total: '370여 종',
  url: 'https://assethub.bigbenett.com/projects/ac1e749a-de3a-4c07-907b-f984ac856f22',
} as const;

export const hubModels: HubModel[] = [];

export const modelsOf = (lab: LabId): HubModel[] => hubModels.filter((model) => model.lab === lab);

export const modelUrl = (model: HubModel): string => `/models/hub/${model.id}.glb`;
