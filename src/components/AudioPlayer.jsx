import { useRef, useEffect } from 'react'

export default function AudioPlayer({ isPlaying, isProcessing, progress, effectName, onPlayPause, disabled }) {
  const canvasRef = useRef(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    const w = canvas.width
    const h = canvas.height

    ctx.clearRect(0, 0, w, h)

    const barCount = 48
    const barWidth = 1.5
    const gap = (w - barCount * barWidth) / (barCount - 1)

    for (let i = 0; i < barCount; i++) {
      const x = i * (barWidth + gap)
      const barH = 3 + Math.sin(i * 0.45) * 6 + Math.cos(i * 0.28) * 3
      const y = (h - barH) / 2

      if (i / barCount < progress) {
        ctx.fillStyle = '#C4704B'
      } else {
        ctx.fillStyle = '#3D3630'
      }
      ctx.beginPath()
      ctx.roundRect(x, y, barWidth, barH, 0.75)
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
          height={28}
        />
      </div>

      <div className="player-info">
        <div className="player-effect-name">{effectName || '—'}</div>
        <div className="player-status">
          {isProcessing ? 'Applying...' : isPlaying ? 'Playing' : 'Ready'}
        </div>
      </div>
    </div>
  )
}
