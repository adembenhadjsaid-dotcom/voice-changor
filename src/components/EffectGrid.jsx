const CATEGORIES = {
  baby: 'core', helium: 'core', chipmunk: 'core', 'deep voice': 'core',
  monster: 'core', dog: 'core', radio: 'core', cave: 'core', echo: 'core',
  drunk: 'funny', crying: 'funny', 'evil laugh': 'funny',
  cat: 'animal', duck: 'animal', alien: 'animal',
  'horror whisper': 'creative', autotune: 'creative', glitch: 'creative', reverse: 'creative',
}

const EMOJIS = {
  baby: '👶', helium: '🎈', chipmunk: '🐿️', 'deep voice': '📢',
  monster: '👾', dog: '🐕', radio: '📻', cave: '🕳️', echo: '🔊',
  drunk: '🥴', crying: '😭', 'evil laugh': '😈',
  cat: '🐱', duck: '🦆', alien: '👽',
  'horror whisper': '👻', autotune: '🎤', glitch: '⚡', reverse: '⏪',
}

export default function EffectGrid({ effects, selected, disabled, onSelect, isProcessing }) {
  return (
    <div className="effects-grid">
      {effects.map(name => (
        <button
          key={name}
          className={`effect-card ${selected === name ? 'selected' : ''} ${disabled ? 'disabled' : ''}`}
          data-category={CATEGORIES[name] || 'core'}
          onClick={() => !disabled && onSelect(name)}
          disabled={disabled || isProcessing}
        >
          <div className="effect-emoji">{EMOJIS[name] || '🎛️'}</div>
          <div className="effect-name">{name}</div>
        </button>
      ))}
    </div>
  )
}
