import { useState, useCallback, useEffect, useRef } from 'react'
import { useAudioRecorder } from './hooks/useAudioRecorder'
import { EFFECTS, renderEffect, getEffectNames } from './effects/index'
import RecordButton from './components/RecordButton'
import EffectGrid from './components/EffectGrid'
import DownloadButton from './components/DownloadButton'

const effectNames = getEffectNames()

export default function App() {
  const { start, stop, audioBlob, isRecording, duration, error } = useAudioRecorder()
  const [audioBuffer, setAudioBuffer] = useState(null)
  const [selectedEffect, setSelectedEffect] = useState(null)
  const [processedBuffer, setProcessedBuffer] = useState(null)
  const [isPlaying, setIsPlaying] = useState(false)
  const [isProcessing, setIsProcessing] = useState(false)
  const audioCtxRef = useRef(null)
  const sourceRef = useRef(null)

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
    setIsPlaying(false)
  }, [])

  const handleEffectSelect = useCallback(async (effectName) => {
    if (!audioBuffer || isProcessing) return
    stopPlayback()
    setSelectedEffect(effectName)
    setIsProcessing(true)

    try {
      const effectFn = EFFECTS[effectName]
      const result = await renderEffect(audioBuffer, effectFn)
      setProcessedBuffer(result)
    } catch {
      setProcessedBuffer(null)
    } finally {
      setIsProcessing(false)
    }
  }, [audioBuffer, isProcessing, stopPlayback])

  const handlePlay = useCallback(() => {
    if (!processedBuffer) return
    if (isPlaying) {
      stopPlayback()
      return
    }

    const ctx = new (window.AudioContext || window.webkitAudioContext)()
    audioCtxRef.current = ctx
    const source = ctx.createBufferSource()
    source.buffer = processedBuffer
    source.connect(ctx.destination)
    source.onended = () => {
      setIsPlaying(false)
      sourceRef.current = null
    }
    source.start()
    sourceRef.current = source
    setIsPlaying(true)
  }, [processedBuffer, isPlaying, stopPlayback])

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
        if (hasRecording) stop()
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
  }, [hasRecording, start, stop, stopPlayback, handleEffectSelect])

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

      <div className={`player-section ${hasEffect ? 'visible' : ''}`}>
        <div className="player-bar">
          <button
            className="play-btn"
            onClick={handlePlay}
            disabled={!hasEffect}
            aria-label={isPlaying ? 'Pause' : 'Play'}
          >
            {isPlaying ? '⏸' : '▶'}
          </button>
          <div className="player-info">
            <div className="player-effect-name">{selectedEffect || '—'}</div>
            <div className="player-status">
              {isProcessing ? 'Processing...' : isPlaying ? 'Playing' : 'Ready'}
            </div>
          </div>
          <DownloadButton
            disabled={!hasEffect}
            onClick={handleDownload}
          />
        </div>
      </div>

      <div className="keyboard-hint">
        <kbd>Space</kbd> record · <kbd>1</kbd>–<kbd>9</kbd> effects · <kbd>Esc</kbd> stop
      </div>
    </div>
  )
}
