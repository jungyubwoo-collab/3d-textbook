/**
 * 영상 녹화 모드. 주소에 `?capture`를 붙이면 화면이 스스로 그려지지 않고,
 * 녹화 스크립트가 `window.__book.advance(초)`로 한 프레임씩 시간을 정해 그린다.
 * 느린 컴퓨터에서도 애니메이션이 끊기지 않은 영상을 만들 수 있다.
 */
export const CAPTURE =
  typeof location !== 'undefined' && new URLSearchParams(location.search).has('capture');

type Action = () => void;
type PositionGetter = () => [number, number, number] | null;

const actions = new Map<string, { run: Action; position: PositionGetter | undefined }>();

/**
 * 녹화 스크립트가 부를 수 있는 동작을 등록한다(장면 단추 등).
 * 위치를 주면 스크립트가 그 자리에 가짜 마우스 포인터를 보여 줄 수 있다.
 */
export function registerAction(id: string, run: Action, position?: PositionGetter): () => void {
  const entry = { run, position };
  actions.set(id, entry);
  return () => {
    if (actions.get(id) === entry) actions.delete(id);
  };
}

export function runAction(id: string): boolean {
  const entry = actions.get(id);
  entry?.run();
  return Boolean(entry);
}

export function actionPosition(id: string): [number, number, number] | null {
  return actions.get(id)?.position?.() ?? null;
}

export function listActions(): string[] {
  return [...actions.keys()];
}

/**
 * 녹화 중에는 소리를 내지 않고, 언제 무슨 소리가 났어야 하는지 적어 둔다.
 * 녹화 스크립트가 `window.__book.sounds()`로 받아 영상에 소리를 입힌다.
 */
export interface CaptureEffect {
  kind: 'sound';
  /** public/audio/sfx/ 안의 파일 이름(확장자 빼고) */
  file: string;
  t: number;
  gain: number;
  rate: number;
}

export interface CaptureMusic {
  kind: 'music';
  /** public/audio/music/ 안의 파일 이름. null이면 음악을 멈춘다. */
  file: string | null;
  t: number;
  gain: number;
  fadeIn: number;
  fadeOut: number;
  /** 곡이 끝난 뒤 다시 시작하기까지 쉬는 시간(초) */
  gap: number;
}

let captureTime = 0;
const sounds: (CaptureEffect | CaptureMusic)[] = [];

/** 지금 그리는 프레임의 시각(초). advance가 정한다. */
export function setCaptureTime(seconds: number): void {
  captureTime = seconds;
}

/** delay초 뒤에 날 효과음을 적는다. */
export function logCaptureEffect(effect: Omit<CaptureEffect, 'kind' | 't'>, delay = 0): void {
  sounds.push({ kind: 'sound', ...effect, t: captureTime + delay });
}

/** 배경음악이 바뀌는 때를 적는다. */
export function logCaptureMusic(music: Omit<CaptureMusic, 'kind' | 't'>): void {
  sounds.push({ kind: 'music', ...music, t: captureTime });
}

export function captureSounds(): (CaptureEffect | CaptureMusic)[] {
  return sounds.slice();
}
