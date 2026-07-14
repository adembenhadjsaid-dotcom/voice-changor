import { useRef, useEffect } from 'react'

const BAR_COUNT = 48
const INNER_RADIUS = 0.38
const MAX_BAR_HEIGHT = 0.28

export default function RecordButton({ isRecording, hasRecording, onToggle, duration, analyser }) {
  const canvasRef = useRef(null)
  const rafRef = useRef(null)
  const freqData = useRef(null)

  const formatTime = (ms) => {
    const s = Math.floor(ms / 1000)
    const m = Math.floor(s / 60)
    return `${String(m).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`
  }

  // Canvas circular visualizer
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    const dpr = window.devicePixelRatio || 1

    const resize = () => {
      const rect = canvas.parentElement.getBoundingClientRect()
      canvas.width = rect.width * dpr
      canvas.height = rect.height * dpr
      ctx.scale(dpr, dpr)
    }
    resize()

    let phase = 0

    const draw = () => {
      const w = canvas.width / dpr
      const h = canvas.height / dpr
      const cx = w / 2
      const cy = h / 2
      const baseRadius = Math.min(cx, cy) * INNER_RADIUS
      const maxBar = Math.min(cx, cy) * MAX_BAR_HEIGHT

      ctx.clearRect(0, 0, w, h)

      // Get frequency data
      let avgLevel = 0
      if (analyser && freqData.current) {
        analyser.getByteFrequencyData(freqData.current)
        for (let i = 0; i < freqData.current.length; i++) {
          avgLevel += freqData.current[i]
        }
        avgLevel /= freqData.current.length * 255
      }

      // Idle breathing
      const breathe = isRecording ? 0 : Math.sin(phase * 0.02) * 2
      const radius = baseRadius + breathe + avgLevel * 4

      // Draw frequency bars
      const step = (Math.PI * 2) / BAR_COUNT
      for (let i = 0; i < BAR_COUNT; i++) {
        const angle = i * step - Math.PI / 2
        let barH = 2

        if (freqData.current && analyser) {
          const dataIdx = Math.floor((i / BAR_COUNT) * freqData.current.length)
          barH = 2 + (freqData.current[dataIdx] / 255) * maxBar
        }

        const x1 = cx + Math.cos(angle) * (radius + 2)
        const y1 = cy + Math.sin(angle) * (radius + 2)
        const x2 = cx + Math.cos(angle) * (radius + 2 + barH)
        const y2 = cy + Math.sin(angle) * (radius + 2 + barH)

        const alpha = 0.3 + (barH / maxBar) * 0.7
        ctx.strokeStyle = isRecording
          ? `rgba(217, 83, 79, ${alpha})`
          : `rgba(196, 112, 75, ${alpha * 0.6})`
        ctx.lineWidth = 2
        ctx.lineCap = 'round'
        ctx.beginPath()
        ctx.moveTo(x1, y1)
        ctx.lineTo(x2, y2)
        ctx.stroke()
      }

      // Center ring
      ctx.beginPath()
      ctx.arc(cx, cy, radius, 0, Math.PI * 2)
      ctx.strokeStyle = isRecording ? 'rgba(217, 83, 79, 0.5)' : 'rgba(196, 112, 75, 0.25)'
      ctx.lineWidth = 1.5
      ctx.stroke()

      // Subtle outer glow
      if (avgLevel > 0.05 || isRecording) {
        const glowRadius = radius + maxBar + 10
        const grad = ctx.createRadialGradient(cx, cy, radius, cx, cy, glowRadius)
        const glowColor = isRecording ? '217, 83, 79' : '196, 112, 75'
        grad.addColorStop(0, `rgba(${glowColor}, ${0.08 + avgLevel * 0.12})`)
        grad.addColorStop(1, `rgba(${glowColor}, 0)`)
        ctx.fillStyle = grad
        ctx.beginPath()
        ctx.arc(cx, cy, glowRadius, 0, Math.PI * 2)
        ctx.fill()
      }

      phase++
      rafRef.current = requestAnimationFrame(draw)
    }

    // Initialize frequency data buffer
    if (analyser) {
      freqData.current = new Uint8Array(analyser.frequencyBinCount)
    }

    rafRef.current = requestAnimationFrame(draw)

    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current)
    }
  }, [analyser, isRecording])

  // Resize observer
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ro = new ResizeObserver(() => {
      const ctx = canvas.getContext('2d')
      const dpr = window.devicePixelRatio || 1
      const rect = canvas.parentElement.getBoundingClientRect()
      canvas.width = rect.width * dpr
      canvas.height = rect.height * dpr
      ctx.scale(dpr, dpr)
    })
    ro.observe(canvas.parentElement)
    return () => ro.disconnect()
  }, [])

  return (
    <>
      <div className="visualizer-wrap">
        <canvas ref={canvasRef} className="visualizer-canvas" />
        <button
          className="record-btn"
          onClick={onToggle}
          aria-label={isRecording ? 'Stop recording' : 'Start recording'}
        >
          <div className="record-btn-inner" />
        </button>
      </div>
      <div className="record-label">
        {isRecording
          ? formatTime(duration)
          : hasRecording
            ? 'Tap to re-record'
            : 'Tap to record'
        }
      </div>
    </>
  )
}
