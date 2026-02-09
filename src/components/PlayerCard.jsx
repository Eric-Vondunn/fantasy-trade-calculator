import { useState } from 'react'
import { getAggregateRanking, formatSalary, getByeWeek } from '../data/players'
import { getPlayerValueBreakdown, formatValue } from '../utils/valueEngine'

function PlayerCard({ player, onRemove, showDetails = false, draggable = false, onDragStart, onWatchlistToggle, isWatched = false, valueSettings = {} }) {
  const [expanded, setExpanded] = useState(false)

  const initials = player.name
    .split(' ')
    .map(n => n[0])
    .join('')
    .slice(0, 2)

  const breakdown = getPlayerValueBreakdown(player, valueSettings)
  const adjustedValue = breakdown.total
  const aggregateRank = getAggregateRanking(player)
  const trend = breakdown.trend

  const handleDragStart = (e) => {
    if (onDragStart) {
      onDragStart(e, player)
    }
    e.dataTransfer.setData('text/plain', JSON.stringify(player))
    e.dataTransfer.effectAllowed = 'move'
  }

  const hasAdjustments = breakdown.scarcityAdj !== 0 || breakdown.ageAdj !== 0 ||
    breakdown.scoringAdj !== 0 || breakdown.formatAdj !== 0

  return (
    <div
      className={`player-card ${expanded ? 'expanded' : ''}`}
      data-position={player.position}
      draggable={draggable}
      onDragStart={draggable ? handleDragStart : undefined}
    >
      <div className="player-card-main" onClick={() => showDetails && setExpanded(!expanded)}>
        <div className={`player-avatar ${player.position}`}>
          {initials}
        </div>

        <div className="player-info">
          <div className="player-name">{player.name}</div>
          <div className="player-details">
            <span className="player-team">{player.team}</span>
            <span>{player.position}</span>
            {player.age > 0 && <span>Age {player.age}</span>}
            {trend && trend.direction !== 'stable' && (
              <span className={`player-trend ${trend.direction}`}>
                {trend.direction === 'up' ? '▲' : '▼'} {trend.label}
              </span>
            )}
            {showDetails && player.position !== 'PICK' && (
              <>
                <br />
                <span>Bye: Wk {getByeWeek(player.team)}</span>
                <span>{formatSalary(player.contract.salary)}/yr</span>
                <span>Rank: #{aggregateRank}</span>
              </>
            )}
          </div>
        </div>

        <div className="player-value-section">
          <div className="player-value">
            {formatValue(adjustedValue)}
          </div>
          <div className="player-confidence" title={`${breakdown.confidence}% confidence`}>
            <div className="confidence-bar">
              <div className="confidence-fill" style={{ width: `${breakdown.confidence}%` }} />
            </div>
          </div>
        </div>

        {showDetails && hasAdjustments && (
          <button
            className="expand-btn"
            onClick={(e) => { e.stopPropagation(); setExpanded(!expanded) }}
            aria-label={expanded ? 'Collapse details' : 'Show value breakdown'}
          >
            {expanded ? '▲' : '▼'}
          </button>
        )}

        {onWatchlistToggle && (
          <button
            className={`watchlist-btn ${isWatched ? 'active' : ''}`}
            onClick={(e) => {
              e.stopPropagation()
              onWatchlistToggle(player.id)
            }}
            title={isWatched ? 'Remove from watchlist' : 'Add to watchlist'}
          >
            {isWatched ? '★' : '☆'}
          </button>
        )}

        {onRemove && (
          <button
            className="player-remove"
            onClick={(e) => { e.stopPropagation(); onRemove(player.id) }}
            aria-label={`Remove ${player.name}`}
          >
            &times;
          </button>
        )}
      </div>

      {/* Value Breakdown Panel */}
      {expanded && showDetails && (
        <div className="value-breakdown">
          <div className="breakdown-row">
            <span className="breakdown-label">Base Value</span>
            <span className="breakdown-value">{formatValue(breakdown.base)}</span>
          </div>
          {breakdown.scarcityAdj !== 0 && (
            <div className="breakdown-row">
              <span className="breakdown-label">Scarcity</span>
              <span className={`breakdown-value ${breakdown.scarcityAdj > 0 ? 'positive' : 'negative'}`}>
                {breakdown.scarcityAdj > 0 ? '+' : ''}{formatValue(breakdown.scarcityAdj)}
              </span>
            </div>
          )}
          {breakdown.ageAdj !== 0 && (
            <div className="breakdown-row">
              <span className="breakdown-label">Age Curve</span>
              <span className={`breakdown-value ${breakdown.ageAdj > 0 ? 'positive' : 'negative'}`}>
                {breakdown.ageAdj > 0 ? '+' : ''}{formatValue(breakdown.ageAdj)}
              </span>
            </div>
          )}
          {breakdown.scoringAdj !== 0 && (
            <div className="breakdown-row">
              <span className="breakdown-label">Scoring Format</span>
              <span className={`breakdown-value ${breakdown.scoringAdj > 0 ? 'positive' : 'negative'}`}>
                {breakdown.scoringAdj > 0 ? '+' : ''}{formatValue(breakdown.scoringAdj)}
              </span>
            </div>
          )}
          {breakdown.formatAdj !== 0 && (
            <div className="breakdown-row">
              <span className="breakdown-label">League Format</span>
              <span className={`breakdown-value ${breakdown.formatAdj > 0 ? 'positive' : 'negative'}`}>
                {breakdown.formatAdj > 0 ? '+' : ''}{formatValue(breakdown.formatAdj)}
              </span>
            </div>
          )}
          {breakdown.trendAdj !== 0 && (
            <div className="breakdown-row">
              <span className="breakdown-label">Trend</span>
              <span className={`breakdown-value ${breakdown.trendAdj > 0 ? 'positive' : 'negative'}`}>
                {breakdown.trendAdj > 0 ? '+' : ''}{formatValue(breakdown.trendAdj)}
              </span>
            </div>
          )}
          <div className="breakdown-row total">
            <span className="breakdown-label">Total</span>
            <span className="breakdown-value">{formatValue(breakdown.total)}</span>
          </div>
        </div>
      )}
    </div>
  )
}

export default PlayerCard
