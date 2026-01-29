import { getAggregateRanking, formatSalary, getByeWeek } from '../data/players'
import { calculateAdjustedValue, formatValue } from '../utils/tradeLogic'

function PlayerCard({ player, onRemove, showDetails = false, draggable = false, onDragStart, onWatchlistToggle, isWatched = false }) {
  const initials = player.name
    .split(' ')
    .map(n => n[0])
    .join('')
    .slice(0, 2)

  const adjustedValue = calculateAdjustedValue(player)
  const aggregateRank = getAggregateRanking(player)

  // Simulate a value trend based on player age and position
  const getTrend = () => {
    if (player.position === 'PICK') return null
    if (player.age <= 24) return { direction: 'up', label: '+' }
    if (player.age >= 30) return { direction: 'down', label: '-' }
    return null
  }

  const trend = getTrend()

  const handleDragStart = (e) => {
    if (onDragStart) {
      onDragStart(e, player)
    }
    e.dataTransfer.setData('text/plain', JSON.stringify(player))
    e.dataTransfer.effectAllowed = 'move'
  }

  return (
    <div
      className="player-card"
      data-position={player.position}
      draggable={draggable}
      onDragStart={draggable ? handleDragStart : undefined}
    >
      <div className={`player-avatar ${player.position}`}>
        {initials}
      </div>

      <div className="player-info">
        <div className="player-name">{player.name}</div>
        <div className="player-details">
          <span className="player-team">{player.team}</span>
          <span>{player.position}</span>
          {player.age > 0 && <span>Age {player.age}</span>}
          {trend && (
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

      <div className="player-value">
        {formatValue(adjustedValue)}
      </div>

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
          onClick={() => onRemove(player.id)}
          aria-label={`Remove ${player.name}`}
        >
          &times;
        </button>
      )}
    </div>
  )
}

export default PlayerCard
