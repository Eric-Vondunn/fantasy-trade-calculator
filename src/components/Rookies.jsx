import { useState, useMemo, useEffect } from 'react'
import rookiesData from '../data/rookies.json'
import {
  processRookieDataset,
  assignRanks,
  getYears,
  filterRookies,
  VALID_POSITIONS
} from '../utils/rookieScore'

function Rookies() {
  const [yearFilter, setYearFilter] = useState('all')
  const [positionFilter, setPositionFilter] = useState('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [rankingMode, setRankingMode] = useState('all') // 'all' or 'year'
  const [sortConfig, setSortConfig] = useState({ key: 'overall', direction: 'desc' })
  const [error, setError] = useState(null)

  // Process dataset on mount
  const scoredRookies = useMemo(() => {
    try {
      return processRookieDataset(rookiesData)
    } catch (err) {
      setError(err.message)
      return []
    }
  }, [])

  // Get available years
  const years = useMemo(() => getYears(scoredRookies), [scoredRookies])

  // Apply filters
  const filteredRookies = useMemo(() => {
    return filterRookies(scoredRookies, {
      year: yearFilter,
      position: positionFilter,
      search: searchQuery
    })
  }, [scoredRookies, yearFilter, positionFilter, searchQuery])

  // Assign ranks based on mode
  const rankedRookies = useMemo(() => {
    return assignRanks(filteredRookies, rankingMode)
  }, [filteredRookies, rankingMode])

  // Apply sorting
  const sortedRookies = useMemo(() => {
    const sorted = [...rankedRookies]
    sorted.sort((a, b) => {
      let aVal = a[sortConfig.key]
      let bVal = b[sortConfig.key]

      // Handle nulls
      if (aVal == null) aVal = sortConfig.direction === 'asc' ? Infinity : -Infinity
      if (bVal == null) bVal = sortConfig.direction === 'asc' ? Infinity : -Infinity

      // Handle strings
      if (typeof aVal === 'string') {
        aVal = aVal.toLowerCase()
        bVal = bVal.toLowerCase()
      }

      if (aVal < bVal) return sortConfig.direction === 'asc' ? -1 : 1
      if (aVal > bVal) return sortConfig.direction === 'asc' ? 1 : -1
      return 0
    })
    return sorted
  }, [rankedRookies, sortConfig])

  const handleSort = (key) => {
    setSortConfig(prev => ({
      key,
      direction: prev.key === key && prev.direction === 'desc' ? 'asc' : 'desc'
    }))
  }

  const getSortIndicator = (key) => {
    if (sortConfig.key !== key) return null
    return sortConfig.direction === 'asc' ? ' ▲' : ' ▼'
  }

  const formatValue = (val, decimals = 1) => {
    if (val == null) return '—'
    return typeof val === 'number' ? val.toFixed(decimals) : val
  }

  if (error) {
    return (
      <div className="rookies-page">
        <div className="rookies-error">
          <h2>Data Error</h2>
          <p>{error}</p>
        </div>
      </div>
    )
  }

  return (
    <div className="rookies-page">
      <div className="rookies-header">
        <h1>Rookie Rankings Database</h1>
        <p className="rookies-subtitle">
          {sortedRookies.length} rookies across {years.length} draft classes (2014–{years[0]})
        </p>
      </div>

      {/* Filters */}
      <div className="rookies-filters">
        <div className="filter-group">
          <label htmlFor="year-filter">Year</label>
          <select
            id="year-filter"
            value={yearFilter}
            onChange={(e) => setYearFilter(e.target.value)}
          >
            <option value="all">All Years</option>
            {years.map(year => (
              <option key={year} value={year}>{year}</option>
            ))}
          </select>
        </div>

        <div className="filter-group">
          <label htmlFor="position-filter">Position</label>
          <select
            id="position-filter"
            value={positionFilter}
            onChange={(e) => setPositionFilter(e.target.value)}
          >
            <option value="all">All Positions</option>
            {VALID_POSITIONS.map(pos => (
              <option key={pos} value={pos}>{pos}</option>
            ))}
          </select>
        </div>

        <div className="filter-group search-group">
          <label htmlFor="search-input">Search</label>
          <input
            id="search-input"
            type="text"
            placeholder="Search by name or school..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>

        <div className="filter-group">
          <label>Ranking Mode</label>
          <div className="toggle-buttons">
            <button
              className={`toggle-btn ${rankingMode === 'all' ? 'active' : ''}`}
              onClick={() => setRankingMode('all')}
            >
              All Years
            </button>
            <button
              className={`toggle-btn ${rankingMode === 'year' ? 'active' : ''}`}
              onClick={() => setRankingMode('year')}
            >
              Within Year
            </button>
          </div>
        </div>
      </div>

      {/* Results count */}
      <div className="rookies-count">
        Showing {sortedRookies.length} {sortedRookies.length === 1 ? 'rookie' : 'rookies'}
        {yearFilter !== 'all' && ` from ${yearFilter}`}
        {positionFilter !== 'all' && ` at ${positionFilter}`}
      </div>

      {/* Table */}
      <div className="rookies-table-wrapper">
        <table className="rookies-table">
          <thead>
            <tr>
              <th className="sticky-col rank-col" onClick={() => handleSort('rank')}>
                Rank{getSortIndicator('rank')}
              </th>
              <th className="sticky-col name-col" onClick={() => handleSort('name')}>
                Name{getSortIndicator('name')}
              </th>
              <th onClick={() => handleSort('year')}>Year{getSortIndicator('year')}</th>
              <th onClick={() => handleSort('position')}>Pos{getSortIndicator('position')}</th>
              <th onClick={() => handleSort('school')}>School{getSortIndicator('school')}</th>
              <th className="numeric" onClick={() => handleSort('heightIn')}>Ht{getSortIndicator('heightIn')}</th>
              <th className="numeric" onClick={() => handleSort('weightLb')}>Wt{getSortIndicator('weightLb')}</th>
              <th className="numeric" onClick={() => handleSort('forty')}>40{getSortIndicator('forty')}</th>
              <th className="numeric" onClick={() => handleSort('breakoutAge')}>BOA{getSortIndicator('breakoutAge')}</th>
              <th className="numeric trait-col" onClick={() => handleSort('iq')}>IQ{getSortIndicator('iq')}</th>
              <th className="numeric trait-col" onClick={() => handleSort('routeRunning')}>RR{getSortIndicator('routeRunning')}</th>
              <th className="numeric trait-col" onClick={() => handleSort('vision')}>Vis{getSortIndicator('vision')}</th>
              <th className="numeric trait-col" onClick={() => handleSort('ballSkills')}>Ball{getSortIndicator('ballSkills')}</th>
              <th className="numeric score-col" onClick={() => handleSort('traitScore')}>Trait{getSortIndicator('traitScore')}</th>
              <th className="numeric score-col" onClick={() => handleSort('measurablesScore')}>Meas{getSortIndicator('measurablesScore')}</th>
              <th className="numeric score-col overall-col" onClick={() => handleSort('overall')}>
                Overall{getSortIndicator('overall')}
              </th>
            </tr>
          </thead>
          <tbody>
            {sortedRookies.map((rookie) => (
              <tr key={rookie.id} data-position={rookie.position}>
                <td className="sticky-col rank-col">
                  <span className="rank-badge">
                    {rankingMode === 'year' ? rookie.rankLabel : `#${rookie.rank}`}
                  </span>
                </td>
                <td className="sticky-col name-col">
                  <div className="player-name-cell">
                    <span className={`pos-badge ${rookie.position}`}>{rookie.position}</span>
                    <span className="player-name">{rookie.name}</span>
                  </div>
                </td>
                <td>{rookie.year}</td>
                <td className="mobile-hide">{rookie.position}</td>
                <td className="mobile-hide">{rookie.school || '—'}</td>
                <td className="numeric">{formatHeight(rookie.heightIn)}</td>
                <td className="numeric">{rookie.weightLb}</td>
                <td className="numeric">{formatValue(rookie.forty, 2)}</td>
                <td className="numeric">{formatValue(rookie.breakoutAge, 1)}</td>
                <td className="numeric trait-col">{rookie.iq}</td>
                <td className="numeric trait-col">{rookie.routeRunning}</td>
                <td className="numeric trait-col">{rookie.vision}</td>
                <td className="numeric trait-col">{rookie.ballSkills}</td>
                <td className="numeric score-col">
                  <span className="score-value">{formatValue(rookie.traitScore, 1)}</span>
                </td>
                <td className="numeric score-col">
                  <span className="score-value">{formatValue(rookie.measurablesScore, 1)}</span>
                </td>
                <td className="numeric score-col overall-col">
                  <span className={`overall-score ${getScoreClass(rookie.overall)}`}>
                    {formatValue(rookie.overall, 1)}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {sortedRookies.length === 0 && (
        <div className="no-results">
          <p>No rookies match your filters.</p>
          <button onClick={() => {
            setYearFilter('all')
            setPositionFilter('all')
            setSearchQuery('')
          }}>
            Clear Filters
          </button>
        </div>
      )}

      {/* Legend */}
      <div className="rookies-legend">
        <h4>Legend</h4>
        <div className="legend-items">
          <span><strong>Ht</strong> = Height</span>
          <span><strong>Wt</strong> = Weight</span>
          <span><strong>40</strong> = 40-yard dash</span>
          <span><strong>BOA</strong> = Breakout Age</span>
          <span><strong>IQ</strong> = Football IQ</span>
          <span><strong>RR</strong> = Route Running</span>
          <span><strong>Vis</strong> = Vision</span>
          <span><strong>Ball</strong> = Ball Skills</span>
          <span><strong>Trait</strong> = Trait Score (0-100)</span>
          <span><strong>Meas</strong> = Measurables Score (0-100)</span>
        </div>
        <p className="legend-note">
          Trait grades are on a 0-10 scale. Overall Score weighs traits vs measurables by position
          (QB: 80/20, RB: 55/45, WR/TE: 65/35).
        </p>
      </div>
    </div>
  )
}

// Helper to format height from inches to feet'inches"
function formatHeight(inches) {
  if (inches == null) return '—'
  const feet = Math.floor(inches / 12)
  const remaining = inches % 12
  return `${feet}'${remaining}"`
}

// Helper to get score class for styling
function getScoreClass(score) {
  if (score >= 90) return 'elite'
  if (score >= 80) return 'excellent'
  if (score >= 70) return 'good'
  if (score >= 60) return 'average'
  return 'below'
}

export default Rookies
