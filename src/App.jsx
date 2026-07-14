import { useState, useCallback, useEffect, useRef } from 'react'
import { useAudioRecorder } from './hooks/useAudioRecorder'
import { EFFECTS, renderEffect, getEffectNames } from './effects/index'
import RecordButton from './components/RecordButton'
import EffectGrid from './components/EffectGrid'
import AudioPlayer from './components/AudioPlayer'
import DownloadButton from './components/DownloadButton'

const effectNames = getEffectNames()

export default function App() {
  const { start, stop, audioBlob, isRecording, duration, error } = useAudioRecorder()
  const [audioBuffer, setAudioBuffer] = useState(null)
  const [selectedEffect, setSelectedEffect] = useState(null)
  const [processedBuffer, setProcessedBuffer] = useState(null)
  const [isPlaying, setIsPlaying] = useState(false)
  const [isProcessing, setIsProcessing] = useState(false)
  const [progress, setProgress] = useState(0)
  const audioCtxRef = useRef(null)
  const sourceRef = useRef(null)
  const startTimeRef = useRef(0)
  const durationRef = useRef(0)
  const rafRef = useRef(null)

  const hasRecording = !!audioBlob
  const hasEffect = !!selectedEffect && !!processedBuffer

  // Decode blob to audio buffer when recording stops
  useEffect(() => {
    if (!audioBlob) return
    setSelectedEffect(null)
    setProcessedBuffer(null)
    setIsPlaying(false)
    stopPlayback()

    const ctx = new (window.AudioContext || window.webkitAudioContext)()
    audioBlob.arrayBuffer().then(buf => ctx.decodeAudioData(buf)).then(decoded => {
      setAudioBuffer(decoded)
      ctx.close()
    }).catch(() => {})
  }, [audioBlob])

  const stopPlayback = useCallback(() => {
    if (sourceRef.current) {
      try { sourceRef.current.stop() } catch {}
      sourceRef.current = null
    }
    if (audioCtxRef.current) {
      try { audioCtxRef.current.close() } catch {}
      audioCtxRef.current = null
    }
    if (rafRef.current) cancelAnimationFrame(rafRef.current)
    setIsPlaying(false)
    setProgress(0)
  }, [])

  const playBuffer = useCallback(async (buffer) => {
    stopPlayback()
    const ctx = new (window.AudioContext || window.webkitAudioContext)()
    await ctx.resume()
    audioCtxRef.current = ctx
    const source = ctx.createBufferSource()
    source.buffer = buffer
    source.connect(ctx.destination)
    startTimeRef.current = ctx.currentTime
    durationRef.current = buffer.duration

    const tick = () => {
      if (!audioCtxRef.current) return
      const elapsed = ctx.currentTime - startTimeRef.current
      const pct = Math.min(elapsed / durationRef.current, 1)
      setProgress(pct)
      if (pct < 1) rafRef.current = requestAnimationFrame(tick)
    }

    source.onended = () => {
      setIsPlaying(false)
      setProgress(0)
      sourceRef.current = null
      if (rafRef.current) cancelAnimationFrame(rafRef.current)
    }
    source.start()
    sourceRef.current = source
    setIsPlaying(true)
    rafRef.current = requestAnimationFrame(tick)
  }, [stopPlayback])

  const handleEffectSelect = useCallback(async (effectName) => {
    if (!audioBuffer || isProcessing) return
    stopPlayback()
    setSelectedEffect(effectName)
    setIsProcessing(true)

    try {
      const effectFn = EFFECTS[effectName]
      const result = await renderEffect(audioBuffer, effectFn)
      setProcessedBuffer(result)
      // Auto-play the effect
      playBuffer(result)
    } catch {
      setProcessedBuffer(null)
    } finally {
      setIsProcessing(false)
    }
  }, [audioBuffer, isProcessing, stopPlayback, playBuffer])

  const handlePlayPause = useCallback(() => {
    if (isPlaying) {
      stopPlayback()
    } else if (processedBuffer) {
      playBuffer(processedBuffer)
    }
  }, [isPlaying, processedBuffer, stopPlayback, playBuffer])

  const handleDownload = useCallback(async () => {
    if (!processedBuffer || !selectedEffect) return
    const { encodeWav } = await import('./utils/exportWav')
    const blob = encodeWav(processedBuffer)
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${selectedEffect.toLowerCase().replace(/\s+/g, '-')}-voice.wav`
    a.click()
    URL.revokeObjectURL(url)
  }, [processedBuffer, selectedEffect])

  // Keyboard shortcuts
  useEffect(() => {
    const handler = (e) => {
      if (e.target.tagName === 'INPUT') return
      if (e.code === 'Space') {
        e.preventDefault()
        if (hasEffect) handlePlayPause()
        else if (isRecording) stop()
        else start()
      }
      if (e.code === 'Escape') stopPlayback()
      const num = parseInt(e.key)
      if (num >= 1 && num <= 9 && num <= effectNames.length) {
        handleEffectSelect(effectNames[num - 1])
      }
      if (e.key === '0' && effectNames.length >= 10) {
        handleEffectSelect(effectNames[9])
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [hasEffect, isRecording, start, stop, stopPlayback, handleEffectSelect, handlePlayPause])

  return (
    <div className={`app ${isRecording ? 'recording' : ''}`}>
      <header className="header">
        <h1>VoiceFun</h1>
        <p>Record your voice, apply effects, have fun</p>
      </header>

      {error && <div className="error-msg">{error}</div>}

      <div className="record-section">
        <RecordButton
          isRecording={isRecording}
          hasRecording={hasRecording}
          onToggle={isRecording ? stop : start}
          duration={duration}
        />
      </div>

      <section className="effects-section">
        <h2>Effects</h2>
        <EffectGrid
          effects={effectNames}
          selected={selectedEffect}
          disabled={!hasRecording}
          onSelect={handleEffectSelect}
          isProcessing={isProcessing}
        />
      </section>

      <div className={`player-section ${hasEffect || isProcessing ? 'visible' : ''}`}>
        <AudioPlayer
          isPlaying={isPlaying}
          isProcessing={isProcessing}
          progress={progress}
          effectName={selectedEffect}
          onPlayPause={handlePlayPause}
          disabled={!hasEffect && !isProcessing}
        />
        <div className="player-actions">
          <DownloadButton
            disabled={!hasEffect}
            onClick={handleDownload}
          />
        </div>
      </div>

      <div className="keyboard-hint">
        <kbd>Space</kbd> record / play · <kbd>1</kbd>–<kbd>9</kbd> effects · <kbd>Esc</kbd> stop
      </div>
    </div>
  )
}
