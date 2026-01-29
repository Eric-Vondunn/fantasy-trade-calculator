import { useState, useEffect, useRef } from 'react'
import { searchPlayers, getPlayerById } from '../data/players'

function PlayerComparison() {
  const [players, setPlayers] = useState([null, null, null])
  const [searches, setSearches] = useState(['', '', ''])
  const [results, setResults] = useState([[], [], []])
  const [activeSearch, setActiveSearch] = useState(null)
  const [highlightedIndex, setHighlightedIndex] = useState(0)
  const searchRefs = useRef([])

  const handleSearch = (index, query) => {
    const newSearches = [...searches]
    newSearches[index] = query
    setSearches(newSearches)

    if (query.length >= 2) {
      const newResults = [...results]
      newResults[index] = searchPlayers(query).slice(0, 10)
      setResults(newResults)
      setActiveSearch(index)
      setHighlightedIndex(0)
    } else {
      const newResults = [...results]
      newResults[index] = []
      setResults(newResults)
      setActiveSearch(null)
    }
  }

  const selectPlayer = (index, player) => {
    const newPlayers = [...players]
    newPlayers[index] = player
    setPlayers(newPlayers)

    const newSearches = [...searches]
    newSearches[index] = ''
    setSearches(newSearches)

    const newResults = [...results]
    newResults[index] = []
    setResults(newResults)
    setActiveSearch(null)
  }

  const clearPlayer = (index) => {
    const newPlayers = [...players]
    newPlayers[index] = null
    setPlayers(newPlayers)
  }

  const handleKeyDown = (e, index) => {
    const currentResults = results[index]
    if (!currentResults.length) return

    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setHighlightedIndex(prev => Math.min(prev + 1, currentResults.length - 1))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setHighlightedIndex(prev => Math.max(prev - 1, 0))
    } else if (e.key === 'Enter' && currentResults[highlightedIndex]) {
      e.preventDefault()
      selectPlayer(index, currentResults[highlightedIndex])
    } else if (e.key === 'Escape') {
      setActiveSearch(null)
      const newResults = [...results]
      newResults[index] = []
      setResults(newResults)
    }
  }

  // Get max value for comparison
  const getMaxValue = () => {
    const validPlayers = players.filter(Boolean)
    if (validPlayers.length === 0) return 10000
    return Math.max(...validPlayers.map(p => p.dynastyValue))
  }

  const maxValue = getMaxValue()

  const getStatValue = (player, stat) => {
    if (!player.projections) return 'N/A'
    return player.projections[stat] || 'N/A'
  }

  const isBestValue = (player, stat) => {
    const validPlayers = players.filter(Boolean)
    if (validPlayers.length < 2) return false

    const values = validPlayers.map(p => {
      if (stat === 'dynastyValue') return p.dynastyValue
      if (stat === 'age') return -p.age // Lower age is better
      return p.projections?.[stat] || 0
    })

    const playerValue = stat === 'dynastyValue' ? player.dynastyValue :
                        stat === 'age' ? -player.age :
                        player.projections?.[stat] || 0

    return playerValue === Math.max(...values)
  }

  const getPositionStats = (position) => {
    switch (position) {
      case 'QB':
        return ['passYards', 'passTD', 'rushYards', 'interceptions']
      case 'RB':
        return ['rushYards', 'rushTD', 'receptions', 'recYards']
      case 'WR':
      case 'TE':
        return ['receptions', 'recYards', 'recTD']
      default:
        return []
    }
  }

  const formatStatLabel = (stat) => {
    const labels = {
      passYards: 'Pass Yards',
      passTD: 'Pass TDs',
      rushYards: 'Rush Yards',
      rushTD: 'Rush TDs',
      receptions: 'Receptions',
      recYards: 'Rec Yards',
      recTD: 'Rec TDs',
      interceptions: 'INTs'
    }
    return labels[stat] || stat
  }

  return (
    <div className="comparison-container">
      <h1>Player Comparison</h1>

      <div className="comparison-selectors">
        {[0, 1, 2].map(index => (
          <div key={index} className="comparison-selector">
            <h3>Player {index + 1}</h3>
            {players[index] ? (
              <div className="selected-player-preview">
                <div className="player-card" data-position={players[index].position}>
                  <div className={`player-avatar ${players[index].position}`}>
                    {players[index].position}
                  </div>
                  <div className="player-info">
                    <div className="player-name">{players[index].name}</div>
                    <div className="player-details">
                      {players[index].team} | Age {players[index].age}
                    </div>
                  </div>
                  <button
                    className="player-remove"
                    onClick={() => clearPlayer(index)}
                    style={{ opacity: 1 }}
                  >
                    ×
                  </button>
                </div>
              </div>
            ) : (
              <div className="player-search">
                <span className="player-search-icon">🔍</span>
                <input
                  ref={el => searchRefs.current[index] = el}
                  type="text"
                  placeholder="Search players..."
                  value={searches[index]}
                  onChange={(e) => handleSearch(index, e.target.value)}
                  onKeyDown={(e) => handleKeyDown(e, index)}
                  onFocus={() => setActiveSearch(index)}
                />
                {activeSearch === index && results[index].length > 0 && (
                  <div className="search-results">
                    {results[index].map((player, i) => (
                      <div
                        key={player.id}
                        className={`search-result-item ${i === highlightedIndex ? 'highlighted' : ''}`}
                        onClick={() => selectPlayer(index, player)}
                      >
                        <div className="search-result-left">
                          <div className={`search-result-pos ${player.position}`}>
                            {player.position}
                          </div>
                          <div>
                            <div className="search-result-name">{player.name}</div>
                            <div className="search-result-team">{player.team}</div>
                          </div>
                        </div>
                        <div className="search-result-value">{player.dynastyValue}</div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        ))}
      </div>

      <div className="comparison-grid">
        {players.map((player, index) => (
          <div key={index} className={`comparison-card ${!player ? 'empty' : ''}`}>
            {player ? (
              <>
                <div className="comparison-player-header">
                  <div className={`comparison-avatar player-avatar ${player.position}`}>
                    {player.position}
                  </div>
                  <div className="comparison-name">{player.name}</div>
                  <div className="comparison-meta">
                    {player.team} | {player.position} | Age {player.age}
                  </div>
                </div>

                <div className="comparison-stats">
                  <div className="comparison-stat">
                    <span className="comparison-stat-label">Dynasty Value</span>
                    <span className={`comparison-stat-value ${isBestValue(player, 'dynastyValue') ? 'best' : ''}`}>
                      {player.dynastyValue.toLocaleString()}
                    </span>
                  </div>

                  <div className="comparison-stat">
                    <span className="comparison-stat-label">Age</span>
                    <span className={`comparison-stat-value ${isBestValue(player, 'age') ? 'best' : ''}`}>
                      {player.age}
                    </span>
                  </div>

                  <div className="comparison-stat">
                    <span className="comparison-stat-label">Experience</span>
                    <span className="comparison-stat-value">{player.experience} yrs</span>
                  </div>

                  <div className="comparison-stat">
                    <span className="comparison-stat-label">Contract</span>
                    <span className="comparison-stat-value">
                      {player.contract.years} yrs / ${(player.contract.salary / 1000000).toFixed(1)}M
                    </span>
                  </div>

                  {getPositionStats(player.position).map(stat => (
                    <div key={stat} className="comparison-stat">
                      <span className="comparison-stat-label">{formatStatLabel(stat)}</span>
                      <span className={`comparison-stat-value ${isBestValue(player, stat) ? 'best' : ''}`}>
                        {getStatValue(player, stat)}
                      </span>
                    </div>
                  ))}
                </div>

                <div className="comparison-value-chart">
                  <span className="comparison-stat-label">Relative Value</span>
                  <div className="value-bar">
                    <div
                      className="value-bar-fill"
                      style={{ width: `${(player.dynastyValue / maxValue) * 100}%` }}
                    />
                  </div>
                </div>
              </>
            ) : (
              <span>Select a player to compare</span>
            )}
          </div>
        ))}
      </div>

      {players.filter(Boolean).length >= 2 && (
        <div className="card" style={{ marginTop: '2rem' }}>
          <div className="card-header">Rankings Comparison</div>
          <table className="rankings-table">
            <thead>
              <tr>
                <th>Source</th>
                {players.filter(Boolean).map(p => (
                  <th key={p.id}>{p.name}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {['DLF', 'UTH', 'DynastyNerds', 'FantasyPros'].map(source => (
                <tr key={source}>
                  <td>{source}</td>
                  {players.filter(Boolean).map(p => (
                    <td key={p.id}>#{p.rankings[source]}</td>
                  ))}
                </tr>
              ))}
              <tr>
                <td><strong>Average</strong></td>
                {players.filter(Boolean).map(p => {
                  const avg = Math.round(
                    (p.rankings.DLF + p.rankings.UTH + p.rankings.DynastyNerds + p.rankings.FantasyPros) / 4
                  )
                  return <td key={p.id}><strong>#{avg}</strong></td>
                })}
              </tr>
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

export default PlayerComparison
