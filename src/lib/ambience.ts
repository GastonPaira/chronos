// Ambiente sonoro por era (viento, mar, zumbido...). Se genera con la Web Audio API, así que no hay archivos de audio.
// Es muy suave, entra y sale con fundido, baja cuando suena la narración y se corta con el botón de sonido.

import { readFlag } from '@/lib/prefs';
import { context, isSoundOn } from '@/lib/sounds';

/** A running piece of the ambience: `stop` ends its sources and timers. */
interface Layer {
  stop: () => void;
}

type Recipe = (ctx: AudioContext, out: AudioNode) => Layer[];

const FADE_IN_TC = 1.0;
const FADE_OUT_S = 0.8;
const DUCKED_LEVEL = 0.3;
const SILENCE = 0.0001;

let master: GainNode | null = null;
let currentEra: string | null = null;
let layers: Layer[] = [];
let ducked = false;
let noise: AudioBuffer | null = null;

/** Brown-ish noise (soft, like wind and waves), looped. Built once. */
function noiseBuffer(ctx: AudioContext): AudioBuffer {
  if (noise && noise.sampleRate === ctx.sampleRate) return noise;
  const length = ctx.sampleRate * 6;
  noise = ctx.createBuffer(1, length, ctx.sampleRate);
  const data = noise.getChannelData(0);
  let last = 0;
  for (let i = 0; i < length; i++) {
    last = (last + 0.02 * (Math.random() * 2 - 1)) / 1.02;
    data[i] = last * 3.5;
  }
  return noise;
}

interface NoiseOptions {
  type: BiquadFilterType;
  freq: number;
  q?: number;
  level: number;
  /** Speed of the slow swell, in Hz. */
  swellHz: number;
  /** How deep the swell is, 0 to 1 of `level`. */
  swell: number;
}

/** Filtered noise whose volume rises and falls slowly: wind, waves, rain. */
function noiseLayer(ctx: AudioContext, out: AudioNode, o: NoiseOptions): Layer {
  const source = ctx.createBufferSource();
  source.buffer = noiseBuffer(ctx);
  source.loop = true;
  const filter = ctx.createBiquadFilter();
  filter.type = o.type;
  filter.frequency.value = o.freq;
  filter.Q.value = o.q ?? 0.7;
  const gain = ctx.createGain();
  gain.gain.value = o.level;
  const lfo = ctx.createOscillator();
  lfo.frequency.value = o.swellHz;
  const depth = ctx.createGain();
  depth.gain.value = o.level * o.swell;
  lfo.connect(depth).connect(gain.gain);
  source.connect(filter).connect(gain).connect(out);
  source.start();
  lfo.start();
  return { stop: () => { source.stop(); lfo.stop(); } };
}

interface DroneOptions {
  freqs: number[];
  type: OscillatorType;
  level: number;
  cutoff: number;
}

/** Long low notes that breathe slowly. */
function droneLayer(ctx: AudioContext, out: AudioNode, o: DroneOptions): Layer {
  const filter = ctx.createBiquadFilter();
  filter.type = 'lowpass';
  filter.frequency.value = o.cutoff;
  const gain = ctx.createGain();
  gain.gain.value = o.level;
  const lfo = ctx.createOscillator();
  lfo.frequency.value = 0.07;
  const depth = ctx.createGain();
  depth.gain.value = o.level * 0.4;
  lfo.connect(depth).connect(gain.gain);
  const oscillators = o.freqs.map(freq => {
    const osc = ctx.createOscillator();
    osc.type = o.type;
    osc.frequency.value = freq;
    osc.connect(filter);
    osc.start();
    return osc;
  });
  filter.connect(gain).connect(out);
  lfo.start();
  return { stop: () => { oscillators.forEach(osc => osc.stop()); lfo.stop(); } };
}

interface PluckOptions {
  notes: number[];
  type: OscillatorType;
  level: number;
  /** Seconds a note takes to fade out. */
  decay: number;
  /** Random wait between notes, in seconds. */
  gap: [number, number];
  cutoff?: number;
}

/** Sparse notes now and then, with an echo: a lyre, a bell, a harpsichord. */
function pluckLayer(ctx: AudioContext, out: AudioNode, o: PluckOptions): Layer {
  const bus = ctx.createGain();
  bus.connect(out);
  const echo = ctx.createDelay(1);
  echo.delayTime.value = 0.42;
  const feedback = ctx.createGain();
  feedback.gain.value = 0.38;
  const wet = ctx.createGain();
  wet.gain.value = 0.5;
  bus.connect(echo);
  echo.connect(feedback).connect(echo);
  echo.connect(wet).connect(out);

  let timer: ReturnType<typeof setTimeout> | null = null;
  let stopped = false;
  const next = () => {
    const wait = (o.gap[0] + Math.random() * (o.gap[1] - o.gap[0])) * 1000;
    timer = setTimeout(() => {
      if (stopped) return;
      const t0 = ctx.currentTime;
      const osc = ctx.createOscillator();
      osc.type = o.type;
      osc.frequency.value = o.notes[Math.floor(Math.random() * o.notes.length)];
      const gain = ctx.createGain();
      gain.gain.setValueAtTime(SILENCE, t0);
      gain.gain.exponentialRampToValueAtTime(o.level, t0 + 0.02);
      gain.gain.exponentialRampToValueAtTime(SILENCE, t0 + o.decay);
      if (o.cutoff) {
        const filter = ctx.createBiquadFilter();
        filter.type = 'lowpass';
        filter.frequency.value = o.cutoff;
        osc.connect(filter).connect(gain);
      } else {
        osc.connect(gain);
      }
      gain.connect(bus);
      osc.start(t0);
      osc.stop(t0 + o.decay + 0.1);
      next();
    }, wait);
  };
  next();
  return {
    stop: () => {
      stopped = true;
      if (timer) clearTimeout(timer);
    },
  };
}

/** One recipe per era id of `src/data/catalog.ts`. */
const RECIPES: Record<string, Recipe> = {
  // Warm desert wind and a lyre.
  'ancient-age': (ctx, out) => [
    noiseLayer(ctx, out, { type: 'bandpass', freq: 650, q: 0.7, level: 0.05, swellHz: 0.08, swell: 0.5 }),
    droneLayer(ctx, out, { freqs: [110, 164.81], type: 'sine', level: 0.035, cutoff: 600 }),
    pluckLayer(ctx, out, { notes: [220, 261.63, 293.66, 329.63, 392, 440, 523.25], type: 'triangle', level: 0.05, decay: 2.5, gap: [5, 11] }),
  ],
  // Cold wind, a deep drone and far-away bells.
  'middle-ages': (ctx, out) => [
    noiseLayer(ctx, out, { type: 'lowpass', freq: 420, level: 0.06, swellHz: 0.06, swell: 0.6 }),
    droneLayer(ctx, out, { freqs: [73.42, 110], type: 'sine', level: 0.05, cutoff: 400 }),
    pluckLayer(ctx, out, { notes: [146.83, 174.61, 196, 220, 293.66], type: 'sine', level: 0.045, decay: 4, gap: [8, 15] }),
  ],
  // Waves on a ship's hull and a distant harpsichord.
  'early-modern': (ctx, out) => [
    noiseLayer(ctx, out, { type: 'lowpass', freq: 380, level: 0.07, swellHz: 0.11, swell: 0.9 }),
    noiseLayer(ctx, out, { type: 'highpass', freq: 2200, level: 0.012, swellHz: 0.2, swell: 0.8 }),
    pluckLayer(ctx, out, { notes: [261.63, 329.63, 392, 523.25, 659.25], type: 'sawtooth', level: 0.03, decay: 1.2, gap: [4, 9], cutoff: 1800 }),
  ],
  // Machinery hum, rain on the roof and a faint ping.
  'modern-era': (ctx, out) => [
    droneLayer(ctx, out, { freqs: [55, 82.41], type: 'sawtooth', level: 0.04, cutoff: 160 }),
    noiseLayer(ctx, out, { type: 'highpass', freq: 3500, level: 0.014, swellHz: 0.3, swell: 0.6 }),
    pluckLayer(ctx, out, { notes: [440, 659.25], type: 'sine', level: 0.025, decay: 3, gap: [9, 18] }),
  ],
};

const DEFAULT_RECIPE = 'ancient-age';

/** Sound is on and the player did not turn the ambience off. */
export function canPlayAmbience(): boolean {
  return isSoundOn() && readFlag('chronos_ambience');
}

function level(): number {
  return ducked ? DUCKED_LEVEL : 1;
}

/** Starts the ambience of an era with a fade-in. Does nothing if that era is already playing. */
export function startAmbience(eraId: string): void {
  if (!canPlayAmbience()) return;
  const ctx = context();
  if (!ctx) return;
  if (master && currentEra === eraId) return;
  stopAmbience();

  try {
    master = ctx.createGain();
    master.gain.value = SILENCE;
    master.connect(ctx.destination);
    layers = (RECIPES[eraId] ?? RECIPES[DEFAULT_RECIPE])(ctx, master);
    master.gain.setTargetAtTime(level(), ctx.currentTime, FADE_IN_TC);
    currentEra = eraId;
  } catch {
    // The ambience is a nice-to-have: never break the game because of it.
    stopAmbience();
    return;
  }

  // Browsers keep audio suspended until the player touches the page.
  if (ctx.state === 'suspended') {
    const resume = () => { void ctx.resume(); };
    document.addEventListener('pointerdown', resume, { once: true });
  }
}

/** Fades the ambience out and releases its sources. */
export function stopAmbience(): void {
  const gain = master;
  const stopping = layers;
  master = null;
  layers = [];
  currentEra = null;
  if (!gain) return;
  try {
    gain.gain.setTargetAtTime(SILENCE, gain.context.currentTime, FADE_OUT_S / 4);
  } catch {
    // Context already closed.
  }
  setTimeout(() => {
    for (const layer of stopping) {
      try { layer.stop(); } catch { /* already stopped */ }
    }
    gain.disconnect();
  }, FADE_OUT_S * 1000 + 200);
}

/** Lowers the ambience while the narration is speaking, and brings it back after. */
export function duckAmbience(on: boolean): void {
  ducked = on;
  if (!master) return;
  master.gain.setTargetAtTime(level(), master.context.currentTime, 0.4);
}

/** Pauses all audio while the tab is hidden (phones keep playing in the background otherwise). Returns the cleanup. */
export function pauseWhenHidden(): () => void {
  const onChange = () => {
    const ctx = context();
    if (!ctx) return;
    if (document.hidden) void ctx.suspend();
    else void ctx.resume();
  };
  document.addEventListener('visibilitychange', onChange);
  return () => document.removeEventListener('visibilitychange', onChange);
}
