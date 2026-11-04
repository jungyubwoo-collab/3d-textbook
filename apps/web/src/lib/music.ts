import { audioOutput, loadAudio, whenAudioReady, type AudioOutput } from './audio.ts';
import { CAPTURE, logCaptureMusic } from './capture.ts';

/**
 * 배경음악. 펼친 면에 맞는 곡(public/audio/music)을 틀고, 곡이 바뀌면 천천히 엇갈려 바꾼다.
 * 곡이 끝나면 잠깐 쉬었다가 처음부터 다시 튼다. ElevenLabs Music으로 만든 기악곡이다.
 */
const VOLUME = 0.3;
const FADE_IN = 2.2;
const FADE_OUT = 1.6;
/** 곡이 끝난 뒤 다시 시작하기까지 쉬는 시간(초) */
const GAP = 2.5;

const musicUrl = (file: string): string => `${import.meta.env.BASE_URL}audio/music/${file}.mp3`;

interface Track {
  file: string;
  source: AudioBufferSourceNode;
  level: GainNode;
}

/** 지금 흘러야 할 곡(null = 멈춤) */
let wanted: string | null = null;
let current: Track | null = null;
let restartTimer: ReturnType<typeof setTimeout> | undefined;

/** 틀 곡을 정한다. null이면 멈춘다. 같은 곡이면 끊지 않고 이어서 튼다. */
export function setMusic(file: string | null): void {
  if (file === wanted) return;
  wanted = file;
  if (CAPTURE) {
    logCaptureMusic({ file, gain: VOLUME, fadeIn: FADE_IN, fadeOut: FADE_OUT, gap: GAP });
    return;
  }
  const output = audioOutput();
  if (output) void switchTo(output, file);
}

async function switchTo(output: AudioOutput, file: string | null): Promise<void> {
  clearTimeout(restartTimer);
  if (current?.file === file) return;
  if (current) fadeOut(output, current);
  current = null;
  if (!file) return;
  const buffer = await loadAudio(musicUrl(file));
  // 받는 동안 다른 곡으로 바뀌었거나 이미 틀었으면 그대로 둔다.
  if (!buffer || wanted !== file || current) return;
  start(output, file, buffer);
}

function start(output: AudioOutput, file: string, buffer: AudioBuffer): void {
  const { context } = output;
  const now = context.currentTime;
  const level = context.createGain();
  level.gain.setValueAtTime(0, now);
  level.gain.linearRampToValueAtTime(VOLUME, now + FADE_IN);
  const source = context.createBufferSource();
  source.buffer = buffer;
  source.connect(level).connect(output.music);
  const track: Track = { file, source, level };
  // 끝까지 다 들었으면 잠깐 쉬고 처음부터. 도중에 바뀐 곡(페이드 아웃)이면 아무것도 하지 않는다.
  source.addEventListener(
    'ended',
    () => {
      if (current !== track) return;
      current = null;
      restartTimer = setTimeout(() => {
        if (wanted === file && !current) start(output, file, buffer);
      }, GAP * 1000);
    },
    { once: true },
  );
  source.start(now);
  current = track;
}

function fadeOut(output: AudioOutput, track: Track): void {
  const now = output.context.currentTime;
  const { gain } = track.level;
  gain.cancelScheduledValues(now);
  gain.setValueAtTime(gain.value, now);
  gain.linearRampToValueAtTime(0, now + FADE_OUT);
  track.source.stop(now + FADE_OUT + 0.05);
}

// 첫 입력으로 소리를 낼 수 있게 되면 그때 정해져 있던 곡을 튼다.
whenAudioReady((output) => void switchTo(output, wanted));
