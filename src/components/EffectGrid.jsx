const MAX = 4

const EMOJIS = {
  baby: '👶', helium: '🎈', chipmunk: '🐿️', 'deep voice': '📢',
  monster: '👾', dog: '🐕', radio: '📻', cave: '🕳️', echo: '🔊',
  drunk: '🥴', crying: '😭', 'evil laugh': '😈',
  cat: '🐱', duck: '🦆', alien: '👽',
  'horror whisper': '👻', autotune: '🎤', glitch: '⚡', reverse: '⏪',
  megaphone: '📣', underwater: '🫧',
}

export default function EffectGrid({ effects, selectedEffects, disabled, onSelect, isProcessing, onClear }) {
  const count = selectedEffects.length

  return (
    <div>
      <div className="effects-header">
        <h2>Effects {count > 0 && <span className="chain-count">{count}/{MAX}</span>}</h2>
        {count > 0 && (
          <button className="chain-clear" onClick={onClear} disabled={isProcessing}>
            Clear chain
          </button>
        )}
      </div>

      {count > 0 && (
        <div className="chain-bar">
          {selectedEffects.map((name, i) => (
            <div key={name} className="chain-pill">
              <span className="chain-pill-num">{i + 1}</span>
              <span className="chain-pill-name">{name}</span>
              <button className="chain-pill-x" onClick={() => onSelect(name)} disabled={isProcessing}>
                ×
              </button>
            </div>
          ))}
          {count < MAX && <span className="chain-hint">+ add up to {MAX}</span>}
        </div>
      )}

      <div className="effects-grid">
        {effects.map(name => {
          const idx = selectedEffects.indexOf(name)
          const isSelected = idx !== -1
          return (
            <button
              key={name}
              className={`effect-card ${isSelected ? 'selected' : ''} ${disabled ? 'disabled' : ''}`}
              onClick={() => !disabled && onSelect(name)}
              disabled={disabled || isProcessing}
            >
              {isSelected && <div className="effect-order">{idx + 1}</div>}
              <div className="effect-emoji">{EMOJIS[name] || '🎛️'}</div>
              <div className="effect-name">{name}</div>
            </button>
          )
        })}
      </div>
    </div>
  )
}
