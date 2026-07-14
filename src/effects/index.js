// ponytail: all effects in one file — each is ~10-15 lines, not worth splitting

export async function renderEffect(audioBuffer, effectFn) {
  const sampleRate = audioBuffer.sampleRate
  const length = audioBuffer.length
  const channels = audioBuffer.numberOfChannels
  const ctx = new OfflineAudioContext(channels, length, sampleRate)
  effectFn(ctx, ctx.destination, audioBuffer)
  return ctx.startRendering()
}

// --- Helpers ---

function makeSource(ctx, buffer) {
  const src = ctx.createBufferSource()
  src.buffer = buffer
  return src
}

function makeImpulse(ctx, duration = 0.8, decay = 2) {
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

// --- Pitch-based effects ---

function pitchEffect(rate, filterType, filterFreq, filterQ = 1, extra) {
  return (ctx, dest, buffer) => {
    const src = makeSource(ctx, buffer)
    src.playbackRate.value = rate
    const filter = ctx.createBiquadFilter()
    filter.type = filterType
    filter.frequency.value = filterFreq
    filter.Q.value = filterQ
    src.connect(filter)
    if (extra) extra(ctx, filter, dest)
    else filter.connect(dest)
    src.start()
  }
}

export const baby = pitchEffect(1.6, 'highpass', 800)
export const helium = pitchEffect(2.2, 'highpass', 1000)
export const chipmunk = pitchEffect(1.8, 'peaking', 3000, 2)

export const deepVoice = (ctx, dest, buffer) => {
  const src = makeSource(ctx, buffer)
  src.playbackRate.value = 0.6
  const lowpass = ctx.createBiquadFilter()
  lowpass.type = 'lowpass'
  lowpass.frequency.value = 400
  const bass = ctx.createBiquadFilter()
  bass.type = 'lowshelf'
  bass.frequency.value = 200
  bass.gain.value = 12
  src.connect(lowpass).connect(bass).connect(dest)
  src.start()
}

export const monster = (ctx, dest, buffer) => {
  const src = makeSource(ctx, buffer)
  src.playbackRate.value = 0.4
  const lowpass = ctx.createBiquadFilter()
  lowpass.type = 'lowpass'
  lowpass.frequency.value = 300
  const distortion = ctx.createWaveShaper()
  distortion.curve = makeDistortionCurve(200)
  distortion.oversample = '4x'
  src.connect(lowpass).connect(distortion).connect(dest)
  src.start()
}

export const dog = (ctx, dest, buffer) => {
  const src = makeSource(ctx, buffer)
  src.playbackRate.value = 0.5
  const tremolo = ctx.createGain()
  tremolo.gain.value = 1
  const lfo = ctx.createOscillator()
  lfo.frequency.value = 8
  const lfoGain = ctx.createGain()
  lfoGain.gain.value = 0.7
  lfo.connect(lfoGain).connect(tremolo.gain)
  lfo.start()
  src.connect(tremolo).connect(dest)
  src.start()
}

// --- Filter-based effects ---

export const radio = (ctx, dest, buffer) => {
  const src = makeSource(ctx, buffer)
  const bp = ctx.createBiquadFilter()
  bp.type = 'bandpass'
  bp.frequency.value = 1000
  bp.Q.value = 5
  src.connect(bp).connect(dest)
  src.start()
}

export const cave = (ctx, dest, buffer) => {
  const src = makeSource(ctx, buffer)
  const convolver = ctx.createConvolver()
  convolver.buffer = makeImpulse(ctx, 0.8, 2)
  src.connect(convolver).connect(dest)
  src.start()
}

export const horrorWhisper = (ctx, dest, buffer) => {
  const src = makeSource(ctx, buffer)
  const lowpass = ctx.createBiquadFilter()
  lowpass.type = 'lowpass'
  lowpass.frequency.value = 600
  const gain = ctx.createGain()
  gain.gain.value = 0.3
  const convolver = ctx.createConvolver()
  convolver.buffer = makeImpulse(ctx, 1, 3)
  src.connect(lowpass).connect(gain).connect(convolver).connect(dest)
  src.start()
}

// --- Delay/modulation effects ---

export const echo = (ctx, dest, buffer) => {
  const src = makeSource(ctx, buffer)
  const dry = ctx.createGain()
  dry.gain.value = 0.6
  const delay1 = ctx.createDelay(2)
  delay1.delayTime.value = 0.3
  const fb1 = ctx.createGain()
  fb1.gain.value = 0.4
  const delay2 = ctx.createDelay(2)
  delay2.delayTime.value = 0.6
  const fb2 = ctx.createGain()
  fb2.gain.value = 0.2
  src.connect(dry).connect(dest)
  src.connect(delay1).connect(fb1).connect(delay1)
  fb1.connect(delay2).connect(fb2).connect(delay2)
  fb2.connect(dest)
  src.start()
}

export const drunk = (ctx, dest, buffer) => {
  const src = makeSource(ctx, buffer)
  src.playbackRate.value = 1
  const delay = ctx.createDelay(1)
  delay.delayTime.value = 0.15
  const fb = ctx.createGain()
  fb.gain.value = 0.3
  const lfo = ctx.createOscillator()
  lfo.frequency.value = 0.5
  const lfoGain = ctx.createGain()
  lfoGain.gain.value = 0.15
  lfo.connect(lfoGain).connect(src.playbackRate)
  lfo.start()
  src.connect(delay).connect(fb).connect(delay)
  fb.connect(dest)
  src.start()
}

export const crying = (ctx, dest, buffer) => {
  const src = makeSource(ctx, buffer)
  src.playbackRate.value = 1
  const lfo = ctx.createOscillator()
  lfo.frequency.value = 3
  const lfoGain = ctx.createGain()
  lfoGain.gain.value = 0.3
  lfo.connect(lfoGain).connect(src.playbackRate)
  lfo.start()
  src.connect(dest)
  src.start()
}

export const duck = (ctx, dest, buffer) => {
  const src = makeSource(ctx, buffer)
  src.playbackRate.value = 1
  const lfo = ctx.createOscillator()
  lfo.frequency.value = 6
  const lfoGain = ctx.createGain()
  lfoGain.gain.value = 0.5
  lfo.connect(lfoGain).connect(src.playbackRate)
  lfo.start()
  src.connect(dest)
  src.start()
}

export const cat = (ctx, dest, buffer) => {
  const src = makeSource(ctx, buffer)
  src.playbackRate.value = 1
  const sampleRate = ctx.sampleRate
  const length = buffer.length
  // Schedule random pitch jumps
  const jumpInterval = Math.floor(sampleRate * 0.2)
  for (let t = 0; t < length; t += jumpInterval) {
    src.playbackRate.setValueAtTime(0.8 + Math.random() * 0.8, t / sampleRate)
  }
  src.connect(dest)
  src.start()
}

// --- Distortion/modulation effects ---

export const robot = (ctx, dest, buffer) => {
  const src = makeSource(ctx, buffer)
  const waveshaper = ctx.createWaveShaper()
  waveshaper.curve = makeDistortionCurve(100)
  waveshaper.oversample = '2x'
  const bp = ctx.createBiquadFilter()
  bp.type = 'bandpass'
  bp.frequency.value = 1500
  bp.Q.value = 3
  src.connect(waveshaper).connect(bp).connect(dest)
  src.start()
}

export const evilLaugh = (ctx, dest, buffer) => {
  const src = makeSource(ctx, buffer)
  const distortion = ctx.createWaveShaper()
  distortion.curve = makeDistortionCurve(300)
  const chorus = ctx.createDelay(1)
  chorus.delayTime.value = 0.02
  const lfo = ctx.createOscillator()
  lfo.frequency.value = 4
  const lfoGain = ctx.createGain()
  lfoGain.gain.value = 0.01
  lfo.connect(lfoGain).connect(chorus.delayTime)
  lfo.start()
  const wet = ctx.createGain()
  wet.gain.value = 0.5
  src.connect(distortion).connect(dest)
  src.connect(distortion).connect(chorus).connect(wet).connect(dest)
  src.start()
}

export const alien = (ctx, dest, buffer) => {
  const src = makeSource(ctx, buffer)
  src.playbackRate.value = 1
  const sampleRate = ctx.sampleRate
  const length = buffer.length
  // Sample-and-hold random modulation
  const holdInterval = Math.floor(sampleRate * 0.15)
  for (let t = 0; t < length; t += holdInterval) {
    const val = 0.7 + Math.random() * 0.6
    src.playbackRate.setValueAtTime(val, t / sampleRate)
  }
  const delay = ctx.createDelay(1)
  delay.delayTime.value = 0.05
  src.connect(delay).connect(dest)
  src.start()
}

export const glitch = (ctx, dest, buffer) => {
  const src = makeSource(ctx, buffer)
  const sampleRate = ctx.sampleRate
  const duration = buffer.duration
  // Create a gain node that stutters
  const gain = ctx.createGain()
  gain.gain.value = 1
  const chunkLen = 0.1
  for (let t = 0; t < duration; t += chunkLen) {
    const on = Math.random() > 0.4
    gain.gain.setValueAtTime(on ? 1 : 0, t)
    gain.gain.setValueAtTime(on ? 0 : 1, t + chunkLen * 0.05)
    if (on) {
      gain.gain.setValueAtTime(1, t + chunkLen * 0.05)
      gain.gain.setValueAtTime(0, t + chunkLen * 0.95)
    }
  }
  src.connect(gain).connect(dest)
  src.start()
}

// --- Utility effects ---

export const autotune = (ctx, dest, buffer) => {
  const src = makeSource(ctx, buffer)
  src.playbackRate.value = 1
  // Quantize to nearest semitone from 1.0
  const semitone = Math.round(Math.log2(src.playbackRate) * 12) / 12
  src.playbackRate.value = Math.pow(2, semitone)
  const sampleRate = ctx.sampleRate
  const length = buffer.length
  const interval = Math.floor(sampleRate * 0.05)
  for (let t = 0; t < length; t += interval) {
    const base = 0.85 + Math.sin(t / sampleRate * 0.3) * 0.15
    const snapped = Math.pow(2, Math.round(Math.log2(base) * 12) / 12)
    src.playbackRate.setValueAtTime(snapped, t / sampleRate)
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

// --- Registry ---

export const EFFECTS = {
  baby, helium, chipmunk, 'deep voice': deepVoice, monster, dog,
  radio, cave, 'horror whisper': horrorWhisper,
  echo, drunk, crying, duck, cat,
  robot, 'evil laugh': evilLaugh, alien, glitch,
  autotune, reverse,
}

export function getEffectNames() {
  return Object.keys(EFFECTS)
}
