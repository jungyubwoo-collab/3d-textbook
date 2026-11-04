import { bookStore } from '../state/bookStore.ts';
import { CAPTURE } from './capture.ts';

/**
 * 효과음은 파일 없이 Web Audio로 만든다(잡음을 걸러 종이 소리를 낸다).
 * 첫 소리는 사용자가 누르거나 키를 친 뒤에만 난다(브라우저 자동 재생 정책).
 */
let context: AudioContext | null = null;
let noise: AudioBuffer | null = null;

function audio(): AudioContext | null {
  if (CAPTURE || bookStore.getState().muted || typeof AudioContext === 'undefined') return null;
  try {
    context ??= new AudioContext();
    if (context.state === 'suspended') void context.resume();
    return context;
  } catch {
    return null;
  }
}

function noiseBuffer(ctx: AudioContext): AudioBuffer {
  if (noise) return noise;
  const length = Math.floor(ctx.sampleRate * 1.2);
  const buffer = ctx.createBuffer(1, length, ctx.sampleRate);
  const data = buffer.getChannelData(0);
  let brown = 0;
  for (let i = 0; i < length; i++) {
    const white = Math.random() * 2 - 1;
    brown = (brown + 0.02 * white) / 1.02;
    data[i] = brown * 3 + white * 0.3;
  }
  noise = buffer;
  return buffer;
}

function burst(
  delay: number,
  duration: number,
  volume: number,
  filter: BiquadFilterType,
  from: number,
  to: number,
): void {
  const ctx = audio();
  if (!ctx) return;
  const start = ctx.currentTime + delay;
  const source = ctx.createBufferSource();
  source.buffer = noiseBuffer(ctx);
  const shape = ctx.createBiquadFilter();
  shape.type = filter;
  shape.Q.value = 0.9;
  shape.frequency.setValueAtTime(from, start);
  shape.frequency.exponentialRampToValueAtTime(to, start + duration * 0.7);
  const gain = ctx.createGain();
  gain.gain.setValueAtTime(0.0001, start);
  gain.gain.exponentialRampToValueAtTime(volume, start + duration * 0.15);
  gain.gain.exponentialRampToValueAtTime(0.0001, start + duration);
  source.connect(shape).connect(gain).connect(ctx.destination);
  source.start(start, Math.random() * 0.5, duration + 0.05);
}

/** 책장이 스치며 넘어가는 소리 */
export function playPageTurn(delaySeconds = 0): void {
  burst(delaySeconds, 0.42, 0.09, 'bandpass', 800, 3400);
}

/** 그림이 종이에서 일어서는 소리 */
export function playPop(): void {
  burst(0, 0.32, 0.05, 'lowpass', 350, 2600);
}

/** 단추를 누르는 소리 */
export function playTap(): void {
  burst(0, 0.08, 0.06, 'highpass', 2500, 4000);
}
