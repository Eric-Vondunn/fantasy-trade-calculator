import { useState, useRef, useEffect } from 'react'
import { searchPlayers, getAggregateRanking, getPlayerById } from '../data/players'
import { formatValue, calculateAdjustedValue } from '../utils/tradeLogic'

const QUICK_PICKS = [
  { label: '2026 1st', query: '2026 Pick 1' },
  { label: '2026 2nd', query: '2026 Pick 2' },
  { label: '2027 1st', query: '2027 Pick 1' },
  { label: '2027 2nd', query: '2027 Pick 2' },
  { label: '2028 1st', query: '2028 Pick 1' },
]

function PlayerSearch({ onSelect, excludeIds = [] }) {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState([])
  const [isOpen, setIsOpen] = useState(false)
  const [highlightedIndex, setHighlightedIndex] = useState(0)
  const wrapperRef = useRef(null)
  const inputRef = useRef(null)

  useEffect(() => {
    function handleClickOutside(event) {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target)) {
        setIsOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  // Global "/" shortcut to focus search
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === '/' && !e.shiftKey && !e.ctrlKey && !e.metaKey) {
        const tag = e.target.tagName
        if (tag !== 'INPUT' && tag !== 'TEXTAREA') {
          e.preventDefault()
          inputRef.current?.focus()
        }
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [])

  const handleSearch = (value) => {
    setQuery(value)
    if (value.length >= 2) {
      const filtered = searchPlayers(value)
        .filter(p => !excludeIds.includes(p.id))
        .slice(0, 10)
      setResults(filtered)
      setIsOpen(true)
      setHighlightedIndex(0)
    } else {
      setResults([])
      setIsOpen(false)
    }
  }

  const handleSelect = (player) => {
    onSelect(player)
    setQuery('')
    setResults([])
    setIsOpen(false)
    setHighlightedIndex(0)
  }

  const handleKeyDown = (e) => {
    if (!isOpen || results.length === 0) return

    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setHighlightedIndex(prev => Math.min(prev + 1, results.length - 1))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setHighlightedIndex(prev => Math.max(prev - 1, 0))
    } else if (e.key === 'Enter') {
      e.preventDefault()
      if (results[highlightedIndex]) {
        handleSelect(results[highlightedIndex])
      }
    } else if (e.key === 'Escape') {
      setIsOpen(false)
      setResults([])
      inputRef.current?.blur()
    }
  }

  const handleQuickAdd = (pickQuery) => {
    const filtered = searchPlayers(pickQuery)
      .filter(p => !excludeIds.includes(p.id))
    if (filtered.length > 0) {
      handleSelect(filtered[0])
    }
  }

  return (
    <div className="player-search" ref={wrapperRef}>
      <span className="player-search-icon">🔍</span>
      <input
        ref={inputRef}
        type="text"
        value={query}
        onChange={(e) => handleSearch(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder="Search players... (press / to focus)"
        onFocus={() => query.length >= 2 && setIsOpen(true)}
      />

      {isOpen && results.length > 0 && (
        <div className="search-results">
          {results.map((player, index) => (
            <div
              key={player.id}
              className={`search-result-item ${index === highlightedIndex ? 'highlighted' : ''}`}
              onClick={() => handleSelect(player)}
              onMouseEnter={() => setHighlightedIndex(index)}
            >
              <div className="search-result-left">
                <div className={`search-result-pos ${player.position}`}>
                  {player.position}
                </div>
                <div>
                  <div className="search-result-name">{player.name}</div>
                  <div className="search-result-team">
                    {player.team} | #{getAggregateRanking(player)}
                  </div>
                </div>
              </div>
              <div className="search-result-value">
                {formatValue(calculateAdjustedValue(player))}
              </div>
            </div>
          ))}
          <div className="search-keyboard-hint">
            <span><kbd>↑↓</kbd> navigate</span>
            <span><kbd>Enter</kbd> select</span>
            <span><kbd>Esc</kbd> close</span>
          </div>
        </div>
      )}

      {isOpen && query.length >= 2 && results.length === 0 && (
        <div className="search-results">
          <div className="search-result-item">
            <span>No players found</span>
          </div>
        </div>
      )}

      <div className="quick-add-section">
        <div className="quick-add-label">Quick Add Picks</div>
        <div className="quick-add-buttons">
          {QUICK_PICKS.map(pick => (
            <button
              key={pick.label}
              className="quick-add-btn"
              onClick={() => handleQuickAdd(pick.query)}
            >
              {pick.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}

export default PlayerSearch
