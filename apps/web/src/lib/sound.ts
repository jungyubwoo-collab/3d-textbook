import { bookStore } from '../state/bookStore.ts';
import { audioOutput, loadAudio, whenAudioReady } from './audio.ts';
import { CAPTURE, logCaptureEffect } from './capture.ts';

/**
 * 효과음. ElevenLabs로 만든 짧은 소리 파일(public/audio/sfx)을 Web Audio로 낸다.
 * 같은 소리가 여러 개면 번갈아 쓰고, 재생 속도를 조금씩 흔들어 똑같이 반복되지 않게 한다.
 * 첫 소리는 사용자가 누르거나 키를 친 뒤에만 난다(브라우저 자동 재생 정책).
 */
export type SoundName =
  | 'page-turn'
  | 'unfold'
  | 'sparkle'
  | 'tap'
  | 'pencil'
  | 'flap'
  | 'stamp'
  | 'correct'
  | 'wrong'
  | 'whoosh'
  | 'knock';

interface SoundSpec {
  files: string[];
  /** 기본 음량(0~1) */
  volume: number;
  /** 재생 속도를 1 ± vary 안에서 흔든다. */
  vary: number;
}

// 음량은 파일마다 잰 크기(100 ms 최대 RMS)를 바탕으로, 배경음악 위에서 고르게 들리도록 맞췄다.
const SOUNDS: Record<SoundName, SoundSpec> = {
  'page-turn': { files: ['page-turn-1', 'page-turn-2', 'page-turn-3'], volume: 0.9, vary: 0.05 },
  unfold: { files: ['unfold'], volume: 0.5, vary: 0.03 },
  sparkle: { files: ['sparkle'], volume: 0.28, vary: 0 },
  tap: { files: ['tap'], volume: 0.45, vary: 0.08 },
  pencil: { files: ['pencil'], volume: 0.4, vary: 0.05 },
  flap: { files: ['flap'], volume: 0.5, vary: 0.04 },
  stamp: { files: ['stamp'], volume: 0.71, vary: 0.03 },
  correct: { files: ['correct'], volume: 0.63, vary: 0 },
  wrong: { files: ['wrong'], volume: 0.45, vary: 0 },
  whoosh: { files: ['whoosh'], volume: 0.35, vary: 0.08 },
  knock: { files: ['knock-1', 'knock-2'], volume: 0.82, vary: 0.08 },
};

/** 늦게 받은 소리는 이만큼 늦은 것까지만 낸다(초). 더 늦으면 엉뚱한 때 나므로 버린다. */
const LATE_LIMIT = 0.25;

const soundUrl = (file: string): string => `${import.meta.env.BASE_URL}audio/sfx/${file}.mp3`;
const lastVariant = new Map<SoundName, number>();

/** 바로 앞에 쓴 것과 다른 번호를 고른다. count가 1이면 0. random은 0 이상 1 미만. */
export function nextVariant(count: number, previous: number | undefined, random: number): number {
  if (count <= 1) return 0;
  if (previous === undefined || previous < 0 || previous >= count) {
    return Math.min(count - 1, Math.floor(random * count));
  }
  const pick = Math.min(count - 2, Math.floor(random * (count - 1)));
  return pick >= previous ? pick + 1 : pick;
}

export interface PlayOptions {
  /** 몇 초 뒤에 낼지 */
  delay?: number;
  /** 기본 음량에 곱할 값 */
  volume?: number;
}

export function playSound(name: SoundName, { delay = 0, volume = 1 }: PlayOptions = {}): void {
  if (bookStore.getState().muted) return;
  const spec = SOUNDS[name];
  const index = nextVariant(spec.files.length, lastVariant.get(name), Math.random());
  lastVariant.set(name, index);
  const file = spec.files[index];
  if (!file) return;
  const rate = 1 + (Math.random() * 2 - 1) * spec.vary;
  const gain = spec.volume * volume;
  if (CAPTURE) {
    logCaptureEffect({ file, gain, rate }, delay);
    return;
  }
  const output = audioOutput();
  if (!output) return;
  const { context } = output;
  const due = context.currentTime + delay;
  void loadAudio(soundUrl(file)).then((buffer) => {
    if (!buffer || context.currentTime - due > LATE_LIMIT) return;
    const source = context.createBufferSource();
    source.buffer = buffer;
    source.playbackRate.value = rate;
    const level = context.createGain();
    level.gain.value = gain;
    source.connect(level).connect(output.sfx);
    source.start(Math.max(context.currentTime, due));
  });
}

/** 종이 그림이 입체로 일어설 때: 종이 펼쳐지는 소리에 반짝임을 살짝 늦게 겹친다. */
export function playReveal(): void {
  playSound('unfold');
  playSound('sparkle', { delay: 0.35 });
}

// 소리를 낼 수 있게 되면 효과음 파일을 미리 받아 둔다(모두 합쳐 수십 KB).
whenAudioReady(() => {
  for (const spec of Object.values(SOUNDS)) {
    for (const file of spec.files) void loadAudio(soundUrl(file));
  }
});
