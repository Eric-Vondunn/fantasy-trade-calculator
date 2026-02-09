import { useState, useRef, useEffect, useMemo } from 'react'
import Fuse from 'fuse.js'
import { getAggregateRanking, players } from '../data/players'
import { formatValue, getPlayerValueBreakdown } from '../utils/valueEngine'
import { useLeagueSettings } from '../context/LeagueSettingsContext'
import { useWatchlist } from '../hooks/useLocalStorage'

function PlayerSearch({ onSelect, excludeIds = [] }) {
  const { settings, multipliers, replacementLevels } = useLeagueSettings()
  const { watchlist } = useWatchlist()
  const valueSettings = useMemo(() => ({
    ...settings,
    multipliers,
    replacementLevels
  }), [settings, multipliers, replacementLevels])

  const [query, setQuery] = useState('')
  const [results, setResults] = useState([])
  const [isOpen, setIsOpen] = useState(false)
  const [highlightedIndex, setHighlightedIndex] = useState(0)
  const [filters, setFilters] = useState({ position: null, showFavorites: false })
  const [showFilters, setShowFilters] = useState(false)
  const wrapperRef = useRef(null)
  const inputRef = useRef(null)

  // Fuse.js instance for fuzzy search
  const fuse = useMemo(() => new Fuse(players, {
    keys: [
      { name: 'name', weight: 0.7 },
      { name: 'team', weight: 0.2 },
      { name: 'position', weight: 0.1 }
    ],
    threshold: 0.3,
    includeScore: true,
    minMatchCharLength: 2
  }), [])

  useEffect(() => {
    function handleClickOutside(event) {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target)) {
        setIsOpen(false)
        setShowFilters(false)
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

    let filtered = []

    if (value.length >= 2) {
      // Use fuzzy search
      const fuseResults = fuse.search(value)
      filtered = fuseResults.map(r => r.item)
    } else if (filters.position || filters.showFavorites) {
      // Show filtered results even without query
      filtered = players
    }

    // Apply filters
    if (filters.position) {
      filtered = filtered.filter(p => p.position === filters.position)
    }

    if (filters.showFavorites) {
      filtered = filtered.filter(p => watchlist.includes(p.id))
    }

    // Exclude already selected
    filtered = filtered.filter(p => !excludeIds.includes(p.id))

    // Limit results
    filtered = filtered.slice(0, 15)

    setResults(filtered)
    setIsOpen(filtered.length > 0 || value.length >= 2)
    setHighlightedIndex(0)
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
      setShowFilters(false)
      inputRef.current?.blur()
    }
  }

  const handleFilterChange = (key, value) => {
    const newFilters = { ...filters, [key]: value }
    setFilters(newFilters)

    // Re-run search with new filters
    if (query.length >= 2 || newFilters.position || newFilters.showFavorites) {
      let filtered = []

      if (query.length >= 2) {
        const fuseResults = fuse.search(query)
        filtered = fuseResults.map(r => r.item)
      } else {
        filtered = players
      }

      if (newFilters.position) {
        filtered = filtered.filter(p => p.position === newFilters.position)
      }

      if (newFilters.showFavorites) {
        filtered = filtered.filter(p => watchlist.includes(p.id))
      }

      filtered = filtered.filter(p => !excludeIds.includes(p.id)).slice(0, 15)
      setResults(filtered)
      setIsOpen(filtered.length > 0)
    }
  }

  const clearFilters = () => {
    setFilters({ position: null, showFavorites: false })
    if (query.length < 2) {
      setResults([])
      setIsOpen(false)
    } else {
      handleSearch(query)
    }
  }

  const hasActiveFilters = filters.position || filters.showFavorites

  return (
    <div className="player-search" ref={wrapperRef}>
      <div className="search-input-row">
        <span className="player-search-icon">🔍</span>
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(e) => handleSearch(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Search players... (press / to focus)"
          onFocus={() => {
            if (query.length >= 2 || hasActiveFilters) {
              handleSearch(query)
            }
          }}
        />
        <button
          className={`filter-toggle ${showFilters || hasActiveFilters ? 'active' : ''}`}
          onClick={() => setShowFilters(!showFilters)}
          title="Toggle filters"
        >
          <span className="filter-icon">⚙</span>
          {hasActiveFilters && <span className="filter-badge" />}
        </button>
      </div>

      {/* Filter Panel */}
      {showFilters && (
        <div className="search-filters">
          <div className="filter-row">
            <label>Position:</label>
            <div className="filter-buttons">
              {['QB', 'RB', 'WR', 'TE', 'PICK'].map(pos => (
                <button
                  key={pos}
                  className={`filter-btn ${filters.position === pos ? 'active' : ''}`}
                  onClick={() => handleFilterChange('position', filters.position === pos ? null : pos)}
                >
                  {pos}
                </button>
              ))}
            </div>
          </div>
          <div className="filter-row">
            <label>
              <input
                type="checkbox"
                checked={filters.showFavorites}
                onChange={(e) => handleFilterChange('showFavorites', e.target.checked)}
              />
              Show favorites only
            </label>
            {hasActiveFilters && (
              <button className="clear-filters" onClick={clearFilters}>
                Clear filters
              </button>
            )}
          </div>
        </div>
      )}

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
                  <div className="search-result-name">
                    {player.name}
                    {watchlist.includes(player.id) && <span className="result-favorite">★</span>}
                  </div>
                  <div className="search-result-team">
                    {player.team} | #{getAggregateRanking(player)}
                    {player.age > 0 && ` | Age ${player.age}`}
                  </div>
                </div>
              </div>
              <div className="search-result-value">
                {formatValue(getPlayerValueBreakdown(player, valueSettings).total)}
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
          <div className="search-result-item empty">
            <span>No players found</span>
            {hasActiveFilters && (
              <button className="clear-filters-link" onClick={clearFilters}>
                Clear filters
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

export default PlayerSearch
