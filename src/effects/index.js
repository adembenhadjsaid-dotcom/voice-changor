// ponytail: all effects in one file, chain renderer supports up to 4 sequential effects

const MAX_CHAIN = 4

// --- Core rendering ---

function makeSource(ctx, buffer) {
  const src = ctx.createBufferSource()
  src.buffer = buffer
  return src
}

function makeImpulse(ctx, duration = 1.2, decay = 2.5) {
  const length = ctx.sampleRate * duration
  const impulse = ctx.createBuffer(2, length, ctx.sampleRate)
  for (let ch = 0; ch < 2; ch++) {
    const data = impulse.getChannelData(ch)
    for (let i = 0; i < length; i++) {
      data[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / length, decay)
    }
  }
  return impulse
}

function makeDistortionCurve(amount = 50) {
  const n = 44100
  const curve = new Float32Array(n)
  for (let i = 0; i < n; i++) {
    const x = (i * 2) / n - 1
    curve[i] = ((3 + amount) * x * 20 * (Math.PI / 180)) / (Math.PI + amount * Math.abs(x))
  }
  return curve
}

// Render a single effect onto an AudioBuffer, return new AudioBuffer
async function renderSingle(audioBuffer, effectFn) {
  const sr = audioBuffer.sampleRate
  const len = audioBuffer.length
  const ch = audioBuffer.numberOfChannels
  const ctx = new OfflineAudioContext(ch, len, sr)
  effectFn(ctx, ctx.destination, audioBuffer)
  return ctx.startRendering()
}

// Chain multiple effects: apply them sequentially (output of one feeds next)
export async function renderEffectChain(audioBuffer, effectFns) {
  let current = audioBuffer
  for (const fn of effectFns) {
    current = await renderSingle(current, fn)
  }
  return current
}

// Backward compat: single effect
export async function renderEffect(audioBuffer, effectFn) {
  return renderEffectChain(audioBuffer, [effectFn])
}

// --- Pitch-based (formant-aware) ---

function pitchEffect(rate, opts = {}) {
  const { filterType, filterFreq, filterQ = 1, extra } = opts
  return (ctx, dest, buffer) => {
    const src = makeSource(ctx, buffer)
    src.playbackRate.value = rate
    if (filterType) {
      const filter = ctx.createBiquadFilter()
      filter.type = filterType
      filter.frequency.value = filterFreq
      filter.Q.value = filterQ
      src.connect(filter)
      if (extra) extra(ctx, filter, dest)
      else filter.connect(dest)
    } else {
      src.connect(dest)
    }
    src.start()
  }
}

export const baby = (ctx, dest, buffer) => {
  const src = makeSource(ctx, buffer)
  src.playbackRate.value = 1.5
  const hp = ctx.createBiquadFilter()
  hp.type = 'highpass'
  hp.frequency.value = 600
  hp.Q.value = 0.7
  const peak = ctx.createBiquadFilter()
  peak.type = 'peaking'
  peak.frequency.value = 3500
  peak.gain.value = 6
  peak.Q.value = 1.5
  const gain = ctx.createGain()
  gain.gain.value = 1.3
  src.connect(hp).connect(peak).connect(gain).connect(dest)
  src.start()
}

export const helium = (ctx, dest, buffer) => {
  const src = makeSource(ctx, buffer)
  src.playbackRate.value = 2.0
  const hp = ctx.createBiquadFilter()
  hp.type = 'highpass'
  hp.frequency.value = 800
  hp.Q.value = 0.5
  const peak = ctx.createBiquadFilter()
  peak.type = 'peaking'
  peak.frequency.value = 4000
  peak.gain.value = 8
  peak.Q.value = 2
  src.connect(hp).connect(peak).connect(dest)
  src.start()
}

export const chipmunk = (ctx, dest, buffer) => {
  const src = makeSource(ctx, buffer)
  src.playbackRate.value = 1.7
  const peak = ctx.createBiquadFilter()
  peak.type = 'peaking'
  peak.frequency.value = 3000
  peak.gain.value = 5
  peak.Q.value = 1.5
  const hp = ctx.createBiquadFilter()
  hp.type = 'highpass'
  hp.frequency.value = 500
  src.connect(peak).connect(hp).connect(dest)
  src.start()
}

export const deepVoice = (ctx, dest, buffer) => {
  const src = makeSource(ctx, buffer)
  src.playbackRate.value = 0.7
  const lp = ctx.createBiquadFilter()
  lp.type = 'lowpass'
  lp.frequency.value = 350
  lp.Q.value = 0.8
  const bass = ctx.createBiquadFilter()
  bass.type = 'lowshelf'
  bass.frequency.value = 250
  bass.gain.value = 10
  const peak = ctx.createBiquadFilter()
  peak.type = 'peaking'
  peak.frequency.value = 150
  peak.gain.value = 6
  peak.Q.value = 1
  src.connect(lp).connect(bass).connect(peak).connect(dest)
  src.start()
}

export const monster = (ctx, dest, buffer) => {
  const src = makeSource(ctx, buffer)
  src.playbackRate.value = 0.5
  const lp = ctx.createBiquadFilter()
  lp.type = 'lowpass'
  lp.frequency.value = 250
  lp.Q.value = 1
  const distortion = ctx.createWaveShaper()
  distortion.curve = makeDistortionCurve(150)
  distortion.oversample = '4x'
  const bass = ctx.createBiquadFilter()
  bass.type = 'lowshelf'
  bass.frequency.value = 200
  bass.gain.value = 8
  src.connect(lp).connect(distortion).connect(bass).connect(dest)
  src.start()
}

export const dog = (ctx, dest, buffer) => {
  const src = makeSource(ctx, buffer)
  src.playbackRate.value = 0.6
  const tremolo = ctx.createGain()
  tremolo.gain.value = 1
  const lfo = ctx.createOscillator()
  lfo.frequency.value = 10
  const lfoGain = ctx.createGain()
  lfoGain.gain.value = 0.8
  lfo.connect(lfoGain).connect(tremolo.gain)
  lfo.start()
  const lp = ctx.createBiquadFilter()
  lp.type = 'lowpass'
  lp.frequency.value = 500
  src.connect(lp).connect(tremolo).connect(dest)
  src.start()
}

// --- Filter-based ---

export const radio = (ctx, dest, buffer) => {
  const src = makeSource(ctx, buffer)
  const hp = ctx.createBiquadFilter()
  hp.type = 'highpass'
  hp.frequency.value = 800
  hp.Q.value = 1
  const lp = ctx.createBiquadFilter()
  lp.type = 'lowpass'
  lp.frequency.value = 3000
  lp.Q.value = 1
  const peak = ctx.createBiquadFilter()
  peak.type = 'peaking'
  peak.frequency.value = 1800
  peak.gain.value = 4
  peak.Q.value = 2
  const distortion = ctx.createWaveShaper()
  distortion.curve = makeDistortionCurve(20)
  distortion.oversample = '2x'
  const gain = ctx.createGain()
  gain.gain.value = 1.5
  src.connect(hp).connect(lp).connect(peak).connect(distortion).connect(gain).connect(dest)
  src.start()
}

export const cave = (ctx, dest, buffer) => {
  const src = makeSource(ctx, buffer)
  const convolver = ctx.createConvolver()
  convolver.buffer = makeImpulse(ctx, 1.5, 2)
  const wet = ctx.createGain()
  wet.gain.value = 0.6
  const dry = ctx.createGain()
  dry.gain.value = 0.7
  src.connect(dry).connect(dest)
  src.connect(convolver).connect(wet).connect(dest)
  src.start()
}

export const horrorWhisper = (ctx, dest, buffer) => {
  const src = makeSource(ctx, buffer)
  const lp = ctx.createBiquadFilter()
  lp.type = 'lowpass'
  lp.frequency.value = 500
  lp.Q.value = 1.5
  const gain = ctx.createGain()
  gain.gain.value = 0.4
  const convolver = ctx.createConvolver()
  convolver.buffer = makeImpulse(ctx, 2, 3)
  const wet = ctx.createGain()
  wet.gain.value = 0.5
  src.connect(lp).connect(gain).connect(convolver).connect(wet).connect(dest)
  src.start()
}

// --- Delay/modulation ---

export const echo = (ctx, dest, buffer) => {
  const src = makeSource(ctx, buffer)
  const dry = ctx.createGain()
  dry.gain.value = 0.65
  const delay1 = ctx.createDelay(2)
  delay1.delayTime.value = 0.25
  const fb1 = ctx.createGain()
  fb1.gain.value = 0.35
  const delay2 = ctx.createDelay(2)
  delay2.delayTime.value = 0.5
  const fb2 = ctx.createGain()
  fb2.gain.value = 0.15
  const filter = ctx.createBiquadFilter()
  filter.type = 'lowpass'
  filter.frequency.value = 3000
  src.connect(dry).connect(dest)
  src.connect(delay1).connect(filter).connect(fb1).connect(delay1)
  fb1.connect(delay2).connect(fb2).connect(delay2)
  fb2.connect(dest)
  src.start()
}

export const drunk = (ctx, dest, buffer) => {
  const src = makeSource(ctx, buffer)
  src.playbackRate.value = 1
  const delay = ctx.createDelay(1)
  delay.delayTime.value = 0.12
  const fb = ctx.createGain()
  fb.gain.value = 0.25
  const lfo = ctx.createOscillator()
  lfo.frequency.value = 0.4
  const lfoGain = ctx.createGain()
  lfoGain.gain.value = 0.12
  lfo.connect(lfoGain).connect(src.playbackRate)
  lfo.start()
  const lfo2 = ctx.createOscillator()
  lfo2.frequency.value = 0.15
  const lfo2Gain = ctx.createGain()
  lfo2Gain.gain.value = 0.04
  lfo2.connect(lfo2Gain).connect(delay.delayTime)
  lfo2.start()
  src.connect(delay).connect(fb).connect(delay)
  fb.connect(dest)
  src.start()
}

export const crying = (ctx, dest, buffer) => {
  const src = makeSource(ctx, buffer)
  src.playbackRate.value = 1
  const lfo = ctx.createOscillator()
  lfo.frequency.value = 5
  const lfoGain = ctx.createGain()
  lfoGain.gain.value = 0.25
  lfo.connect(lfoGain).connect(src.playbackRate)
  lfo.start()
  const lfo2 = ctx.createOscillator()
  lfo2.frequency.value = 7
  const lfo2Gain = ctx.createGain()
  lfo2Gain.gain.value = 0.15
  lfo2.connect(lfo2Gain).connect(src.playbackRate)
  lfo2.start()
  const gain = ctx.createGain()
  gain.gain.value = 1.2
  src.connect(gain).connect(dest)
  src.start()
}

export const duck = (ctx, dest, buffer) => {
  const src = makeSource(ctx, buffer)
  src.playbackRate.value = 1.1
  const lfo = ctx.createOscillator()
  lfo.frequency.value = 8
  const lfoGain = ctx.createGain()
  lfoGain.gain.value = 0.4
  lfo.connect(lfoGain).connect(src.playbackRate)
  lfo.start()
  const peak = ctx.createBiquadFilter()
  peak.type = 'peaking'
  peak.frequency.value = 2500
  peak.gain.value = 6
  peak.Q.value = 2
  src.connect(peak).connect(dest)
  src.start()
}

export const cat = (ctx, dest, buffer) => {
  const src = makeSource(ctx, buffer)
  src.playbackRate.value = 1
  const sr = ctx.sampleRate
  const len = buffer.length
  const interval = Math.floor(sr * 0.18)
  for (let t = 0; t < len; t += interval) {
    const rate = 0.85 + Math.random() * 0.6
    src.playbackRate.setValueAtTime(rate, t / sr)
  }
  const peak = ctx.createBiquadFilter()
  peak.type = 'peaking'
  peak.frequency.value = 2000
  peak.gain.value = 4
  src.connect(peak).connect(dest)
  src.start()
}

// --- Distortion/modulation ---

export const robot = (ctx, dest, buffer) => {
  const src = makeSource(ctx, buffer)
  // Ring modulation for metallic sound
  const ring = ctx.createOscillator()
  ring.frequency.value = 50
  const ringGain = ctx.createGain()
  ringGain.gain.value = 0
  ring.connect(ringGain.gain)
  ring.start()
  const waveshaper = ctx.createWaveShaper()
  waveshaper.curve = makeDistortionCurve(80)
  waveshaper.oversample = '4x'
  const bp = ctx.createBiquadFilter()
  bp.type = 'bandpass'
  bp.frequency.value = 1200
  bp.Q.value = 4
  src.connect(waveshaper).connect(ringGain).connect(bp).connect(dest)
  src.start()
}

export const evilLaugh = (ctx, dest, buffer) => {
  const src = makeSource(ctx, buffer)
  const distortion = ctx.createWaveShaper()
  distortion.curve = makeDistortionCurve(200)
  distortion.oversample = '4x'
  // Chorus via modulated delay
  const chorus = ctx.createDelay(0.1)
  chorus.delayTime.value = 0.015
  const lfo = ctx.createOscillator()
  lfo.frequency.value = 3
  const lfoGain = ctx.createGain()
  lfoGain.gain.value = 0.008
  lfo.connect(lfoGain).connect(chorus.delayTime)
  lfo.start()
  const wet = ctx.createGain()
  wet.gain.value = 0.4
  const dry = ctx.createGain()
  dry.gain.value = 0.7
  src.connect(distortion).connect(dry).connect(dest)
  src.connect(distortion).connect(chorus).connect(wet).connect(dest)
  src.start()
}

export const alien = (ctx, dest, buffer) => {
  const src = makeSource(ctx, buffer)
  src.playbackRate.value = 1
  const sr = ctx.sampleRate
  const len = buffer.length
  // Sample-and-hold random pitch
  const hold = Math.floor(sr * 0.12)
  for (let t = 0; t < len; t += hold) {
    src.playbackRate.setValueAtTime(0.75 + Math.random() * 0.5, t / sr)
  }
  const delay = ctx.createDelay(0.1)
  delay.delayTime.value = 0.04
  const lfo = ctx.createOscillator()
  lfo.frequency.value = 12
  const lfoGain = ctx.createGain()
  lfoGain.gain.value = 0.02
  lfo.connect(lfoGain).connect(delay.delayTime)
  lfo.start()
  src.connect(delay).connect(dest)
  src.start()
}

export const glitch = (ctx, dest, buffer) => {
  const src = makeSource(ctx, buffer)
  const duration = buffer.duration
  const gain = ctx.createGain()
  gain.gain.value = 1
  const chunk = 0.08
  for (let t = 0; t < duration; t += chunk) {
    const on = Math.random() > 0.35
    gain.gain.setValueAtTime(on ? 1 : 0.02, t)
    if (on && Math.random() > 0.6) {
      gain.gain.setValueAtTime(0, t + chunk * 0.1)
      gain.gain.setValueAtTime(1, t + chunk * 0.2)
    }
  }
  const bp = ctx.createBiquadFilter()
  bp.type = 'bandpass'
  bp.frequency.value = 2000
  bp.Q.value = 2
  src.connect(gain).connect(bp).connect(dest)
  src.start()
}

// --- Utility ---

export const autotune = (ctx, dest, buffer) => {
  const src = makeSource(ctx, buffer)
  src.playbackRate.value = 1
  const sr = ctx.sampleRate
  const len = buffer.length
  const interval = Math.floor(sr * 0.04)
  for (let t = 0; t < len; t += interval) {
    const base = 0.88 + Math.sin(t / sr * 0.25) * 0.12
    const snapped = Math.pow(2, Math.round(Math.log2(base) * 12) / 12)
    src.playbackRate.setValueAtTime(snapped, t / sr)
  }
  src.connect(dest)
  src.start()
}

export const reverse = (ctx, dest, buffer) => {
  const reversed = ctx.createBuffer(buffer.numberOfChannels, buffer.length, buffer.sampleRate)
  for (let ch = 0; ch < buffer.numberOfChannels; ch++) {
    const srcData = buffer.getChannelData(ch)
    const dstData = reversed.getChannelData(ch)
    for (let i = 0; i < srcData.length; i++) {
      dstData[i] = srcData[srcData.length - 1 - i]
    }
  }
  const src = makeSource(ctx, reversed)
  src.connect(dest)
  src.start()
}

// --- New effects ---

export const megaphone = (ctx, dest, buffer) => {
  const src = makeSource(ctx, buffer)
  const hp = ctx.createBiquadFilter()
  hp.type = 'highpass'
  hp.frequency.value = 500
  const lp = ctx.createBiquadFilter()
  lp.type = 'lowpass'
  lp.frequency.value = 4000
  const distortion = ctx.createWaveShaper()
  distortion.curve = makeDistortionCurve(60)
  distortion.oversample = '2x'
  const gain = ctx.createGain()
  gain.gain.value = 1.8
  src.connect(hp).connect(lp).connect(distortion).connect(gain).connect(dest)
  src.start()
}

export const underwater = (ctx, dest, buffer) => {
  const src = makeSource(ctx, buffer)
  const lp = ctx.createBiquadFilter()
  lp.type = 'lowpass'
  lp.frequency.value = 300
  lp.Q.value = 8
  const lfo = ctx.createOscillator()
  lfo.frequency.value = 0.3
  const lfoGain = ctx.createGain()
  lfoGain.gain.value = 150
  lfo.connect(lfoGain).connect(lp.frequency)
  lfo.start()
  const convolver = ctx.createConvolver()
  convolver.buffer = makeImpulse(ctx, 0.6, 3)
  const wet = ctx.createGain()
  wet.gain.value = 0.5
  src.connect(lp).connect(convolver).connect(wet).connect(dest)
  src.start()
}

// --- Registry ---

export const EFFECTS = {
  baby, helium, chipmunk, 'deep voice': deepVoice, monster, dog,
  radio, cave, 'horror whisper': horrorWhisper,
  echo, drunk, crying, duck, cat,
  robot, 'evil laugh': evilLaugh, alien, glitch,
  autotune, reverse, megaphone, underwater,
}

export function getEffectNames() {
  return Object.keys(EFFECTS)
}

export function getEffectFn(name) {
  return EFFECTS[name]
}

export { MAX_CHAIN }
