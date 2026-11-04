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
