import { useRef, useEffect } from 'react'

export default function AudioPlayer({ isPlaying, isProcessing, progress, effectName, onPlayPause, disabled }) {
  const canvasRef = useRef(null)

  // Draw waveform progress bar
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    const w = canvas.width
    const h = canvas.height

    ctx.clearRect(0, 0, w, h)

    // Background bars (static waveform)
    const barCount = 40
    const barWidth = 2
    const gap = (w - barCount * barWidth) / (barCount - 1)

    for (let i = 0; i < barCount; i++) {
      const x = i * (barWidth + gap)
      const barH = 4 + Math.sin(i * 0.5) * 8 + Math.cos(i * 0.3) * 4
      const y = (h - barH) / 2

      if (i / barCount < progress) {
        ctx.fillStyle = '#FF3366'
      } else {
        ctx.fillStyle = '#2A2D45'
      }
      ctx.beginPath()
      ctx.roundRect(x, y, barWidth, barH, 1)
      ctx.fill()
    }
  }, [progress])

  return (
    <div className="player-bar">
      <button
        className="play-btn"
        onClick={onPlayPause}
        disabled={disabled}
        aria-label={isPlaying ? 'Pause' : 'Play'}
      >
        {isProcessing ? (
          <span className="spinner" />
        ) : isPlaying ? (
          '⏸'
        ) : (
          '▶'
        )}
      </button>

      <div className="player-canvas-wrap">
        <canvas
          ref={canvasRef}
          className="player-canvas"
          width={320}
          height={32}
        />
      </div>

      <div className="player-info">
        <div className="player-effect-name">{effectName || '—'}</div>
        <div className="player-status">
          {isProcessing ? 'Applying effect...' : isPlaying ? 'Playing' : 'Ready'}
        </div>
      </div>
    </div>
  )
}
