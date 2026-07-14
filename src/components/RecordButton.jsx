export default function RecordButton({ isRecording, hasRecording, onToggle, duration }) {
  const formatTime = (ms) => {
    const s = Math.floor(ms / 1000)
    const m = Math.floor(s / 60)
    return `${String(m).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`
  }

  return (
    <>
      <button
        className="record-btn"
        onClick={onToggle}
        aria-label={isRecording ? 'Stop recording' : 'Start recording'}
      >
        <div className="record-btn-inner" />
      </button>
      <div className="record-label">
        {isRecording
          ? formatTime(duration)
          : hasRecording
            ? 'Tap to re-record'
            : 'Tap to record'
        }
      </div>
      <div className="waveform">
        {Array.from({ length: 9 }, (_, i) => (
          <div key={i} className="waveform-bar" />
        ))}
      </div>
    </>
  )
}
