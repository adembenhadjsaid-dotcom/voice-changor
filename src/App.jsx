import { useState, useCallback, useEffect, useRef } from 'react'
import { useAudioRecorder } from './hooks/useAudioRecorder'
import { EFFECTS, renderEffectChain, getEffectNames } from './effects/index'
import RecordButton from './components/RecordButton'
import EffectGrid from './components/EffectGrid'
import AudioPlayer from './components/AudioPlayer'
import DownloadButton from './components/DownloadButton'

const effectNames = getEffectNames()
const MAX_EFFECTS = 4

export default function App() {
  const { start, stop, audioBlob, isRecording, duration, error } = useAudioRecorder()
  const [audioBuffer, setAudioBuffer] = useState(null)
  const [selectedEffects, setSelectedEffects] = useState([])
  const [processedBuffer, setProcessedBuffer] = useState(null)
  const [isPlaying, setIsPlaying] = useState(false)
  const [isProcessing, setIsProcessing] = useState(false)
  const [progress, setProgress] = useState(0)
  const audioCtxRef = useRef(null)
  const sourceRef = useRef(null)
  const startTimeRef = useRef(0)
  const durationRef = useRef(0)
  const rafRef = useRef(null)
  const chainRef = useRef('')

  const hasRecording = !!audioBlob
  const hasEffect = selectedEffects.length > 0 && !!processedBuffer

  useEffect(() => {
    if (!audioBlob) return
    setSelectedEffects([])
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

  const handleToggleEffect = useCallback((effectName) => {
    if (!audioBuffer || isProcessing) return
    stopPlayback()

    setSelectedEffects(prev => {
      const idx = prev.indexOf(effectName)
      if (idx !== -1) {
        return prev.filter((_, i) => i !== idx)
      }
      if (prev.length >= MAX_EFFECTS) return prev
      return [...prev, effectName]
    })
  }, [audioBuffer, isProcessing, stopPlayback])

  const handleClearChain = useCallback(() => {
    stopPlayback()
    setSelectedEffects([])
    setProcessedBuffer(null)
  }, [stopPlayback])

  // Render chain whenever selection changes
  useEffect(() => {
    if (!audioBuffer || selectedEffects.length === 0) {
      setProcessedBuffer(null)
      return
    }

    const key = selectedEffects.join(',')
    if (key === chainRef.current) return
    chainRef.current = key

    let cancelled = false
    const fns = selectedEffects.map(n => EFFECTS[n]).filter(Boolean)

    if (fns.length === 0) { setProcessedBuffer(null); return }

    setIsProcessing(true)
    renderEffectChain(audioBuffer, fns).then(result => {
      if (cancelled) return
      setProcessedBuffer(result)
      setIsProcessing(false)
      playBuffer(result)
    }).catch(() => {
      if (!cancelled) { setProcessedBuffer(null); setIsProcessing(false) }
    })

    return () => { cancelled = true }
  }, [audioBuffer, selectedEffects, playBuffer])

  const handlePlayPause = useCallback(() => {
    if (isPlaying) {
      stopPlayback()
    } else if (processedBuffer) {
      playBuffer(processedBuffer)
    }
  }, [isPlaying, processedBuffer, stopPlayback, playBuffer])

  const handleDownload = useCallback(async () => {
    if (!processedBuffer || selectedEffects.length === 0) return
    const { encodeWav } = await import('./utils/exportWav')
    const blob = encodeWav(processedBuffer)
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${selectedEffects.join('-')}-voice.wav`
    a.click()
    URL.revokeObjectURL(url)
  }, [processedBuffer, selectedEffects])

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
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [hasEffect, isRecording, start, stop, stopPlayback, handlePlayPause])

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
        <EffectGrid
          effects={effectNames}
          selectedEffects={selectedEffects}
          disabled={!hasRecording}
          onSelect={handleToggleEffect}
          isProcessing={isProcessing}
          onClear={handleClearChain}
        />
      </section>

      <div className={`player-section ${hasEffect || isProcessing ? 'visible' : ''}`}>
        <AudioPlayer
          isPlaying={isPlaying}
          isProcessing={isProcessing}
          progress={progress}
          effectName={selectedEffects.join(' → ')}
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
        <kbd>Space</kbd> record / play · <kbd>Esc</kbd> stop
      </div>
    </div>
  )
}
