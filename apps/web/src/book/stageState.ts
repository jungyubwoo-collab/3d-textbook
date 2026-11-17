import { Color } from 'three';

/**
 * 실험 무대의 상태. level이 0이면 밝은 책상 위의 문서, 1이면 어두운 방에서 스탠드 조명을 받는 실험이다.
 * StageLights가 매 프레임 갱신하고, 스탠드·화면 가장자리 어둠·먼지가 읽어 쓴다.
 */
export const stage = {
  level: 0,
  /** 지금 단원의 분위기 색(보조 조명, 화면 가장자리) */
  mood: new Color('#ffb46b'),
};

/**
 * 스탠드(책상 좌표). head는 눈에 보이는 갓의 자리, aim은 비추는 곳이다.
 * 갓은 실험 화면에 들어오도록 낮게 두고, 실제 조명(light)은 같은 방향의 더 높은 곳에 둔다.
 * 갓 높이에서 그대로 비추면 그림자가 왼쪽 페이지 끝까지 길게 늘어지기 때문이다.
 */
export const LAMP = {
  head: [1.3, 0.4, -0.32],
  aim: [0.5, 0.04, 0.06],
  light: [1.22, 1.0, -0.46],
} as const satisfies Record<string, [number, number, number]>;
