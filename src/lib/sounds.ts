// Sonidos y vibración del juego. Se generan con la Web Audio API (no hay archivos de audio) y se pueden silenciar.

const SOUND_KEY = 'chronos_sound';

let audioContext: AudioContext | null = null;

export function isSoundOn(): boolean {
  if (typeof window === 'undefined') return false;
  try {
    return window.localStorage.getItem(SOUND_KEY) !== 'off';
  } catch {
    return true;
  }
}

export function setSoundOn(on: boolean): void {
  try {
    window.localStorage.setItem(SOUND_KEY, on ? 'on' : 'off');
  } catch {
    // Storage blocked: the choice just won't be remembered.
  }
}

function context(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  const Ctor = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!Ctor) return null;
  audioContext = audioContext ?? new Ctor();
  if (audioContext.state === 'suspended') void audioContext.resume();
  return audioContext;
}

/** Plays a short note. `start` is the delay in seconds. */
function tone(frequency: number, start: number, duration: number, type: OscillatorType = 'sine', volume = 0.12): void {
  const ctx = context();
  if (!ctx) return;
  const oscillator = ctx.createOscillator();
  const gain = ctx.createGain();
  const t0 = ctx.currentTime + start;
  oscillator.type = type;
  oscillator.frequency.setValueAtTime(frequency, t0);
  gain.gain.setValueAtTime(0.0001, t0);
  gain.gain.exponentialRampToValueAtTime(volume, t0 + 0.02);
  gain.gain.exponentialRampToValueAtTime(0.0001, t0 + duration);
  oscillator.connect(gain).connect(ctx.destination);
  oscillator.start(t0);
  oscillator.stop(t0 + duration + 0.05);
}

function vibrate(pattern: number | number[]): void {
  if (typeof navigator !== 'undefined' && 'vibrate' in navigator) navigator.vibrate(pattern);
}

function play(sound: () => void, pattern?: number | number[]): void {
  if (!isSoundOn()) return;
  try {
    sound();
    if (pattern) vibrate(pattern);
  } catch {
    // Audio is a nice-to-have: never break the game because of it.
  }
}

export const playCorrect = () => play(() => { tone(660, 0, 0.12); tone(880, 0.1, 0.2); }, 25);
export const playWrong = () => play(() => tone(200, 0, 0.25, 'triangle', 0.14), [40, 30, 40]);
export const playComplete = () => play(() => [523, 659, 784].forEach((f, i) => tone(f, i * 0.12, 0.2)));
export const playLevelUp = () => play(() => [523, 659, 784, 1047].forEach((f, i) => tone(f, i * 0.11, 0.25)), [30, 40, 60]);
