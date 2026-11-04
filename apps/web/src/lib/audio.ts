import { CAPTURE } from './capture.ts';

/**
 * 소리 공용 장치. 효과음과 배경음악이 같은 AudioContext를 쓰고, 각자의 음량 단자(bus)를 거쳐 나간다.
 * 브라우저 자동 재생 정책 때문에 사용자가 처음 누르거나 키를 칠 때 AudioContext를 만든다.
 * 탭이 가려지면 소리를 멈췄다가 돌아오면 잇는다.
 */
export interface AudioOutput {
  context: AudioContext;
  sfx: GainNode;
  music: GainNode;
}

let output: AudioOutput | null = null;
const readyListeners = new Set<(output: AudioOutput) => void>();

export function audioOutput(): AudioOutput | null {
  return output;
}

/** 소리를 낼 수 있게 되면(첫 입력 뒤) 부른다. 이미 낼 수 있으면 바로 부른다. 돌려준 함수로 해제한다. */
export function whenAudioReady(listener: (output: AudioOutput) => void): () => void {
  if (output) listener(output);
  else readyListeners.add(listener);
  return () => readyListeners.delete(listener);
}

function unlock(): void {
  if (output || typeof AudioContext === 'undefined') return;
  try {
    const context = new AudioContext();
    const sfx = context.createGain();
    const music = context.createGain();
    sfx.connect(context.destination);
    music.connect(context.destination);
    output = { context, sfx, music };
    void context.resume();
  } catch {
    output = null;
    return;
  }
  const ready = output;
  for (const listener of readyListeners) listener(ready);
  readyListeners.clear();
}

const decoded = new Map<string, Promise<AudioBuffer | null>>();

/** 소리 파일을 받아 풀어 둔다. 같은 주소는 한 번만 받는다. 실패하면 null(그 소리는 나지 않는다). */
export function loadAudio(url: string): Promise<AudioBuffer | null> {
  const ready = output;
  if (!ready) return Promise.resolve(null);
  let pending = decoded.get(url);
  if (!pending) {
    pending = fetch(url)
      .then((response) => (response.ok ? response.arrayBuffer() : Promise.reject(response)))
      .then((bytes) => ready.context.decodeAudioData(bytes))
      .catch(() => null);
    decoded.set(url, pending);
  }
  return pending;
}

if (typeof window !== 'undefined' && !CAPTURE) {
  const gestures = ['pointerdown', 'keydown', 'touchend'] as const;
  const onGesture = () => {
    unlock();
    if (!output) return;
    for (const name of gestures) window.removeEventListener(name, onGesture, true);
  };
  for (const name of gestures) window.addEventListener(name, onGesture, true);
  document.addEventListener('visibilitychange', () => {
    if (!output) return;
    if (document.hidden) void output.context.suspend();
    else void output.context.resume();
  });
}
