export default function DownloadButton({ disabled, onClick }) {
  return (
    <button
      className="download-btn"
      onClick={onClick}
      disabled={disabled}
      aria-label="Download as WAV"
    >
      ↓ WAV
    </button>
  )
}
