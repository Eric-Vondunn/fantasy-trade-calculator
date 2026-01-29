import { useState, useEffect, useCallback, useRef } from 'react'
import PlayerSearch from './PlayerSearch'
import PlayerCard from './PlayerCard'
import Confetti from './Confetti'
import { useToast } from './Toast'
import { useTradeHistory, useWatchlist } from '../hooks/useLocalStorage'
import {
  calculateSideValue,
  calculateFairness,
  getFairnessLabel,
  getTradeRecommendation,
  formatValue,
  getValueDifference
} from '../utils/tradeLogic'

function TradeCalculator() {
  const [teamAPlayers, setTeamAPlayers] = useState([])
  const [teamBPlayers, setTeamBPlayers] = useState([])
  const [undoStack, setUndoStack] = useState([])
  const [showConfetti, setShowConfetti] = useState(false)
  const [dragOverSide, setDragOverSide] = useState(null)
  const confettiKey = useRef(0)

  const toast = useToast()
  const { history, addTrade, clearHistory } = useTradeHistory()
  const { isWatched, toggleWatchlist } = useWatchlist()

  const allSelectedIds = [...teamAPlayers, ...teamBPlayers].map(p => p.id)

  // Save state for undo
  const saveForUndo = useCallback(() => {
    setUndoStack(prev => [...prev.slice(-19), { teamA: [...teamAPlayers], teamB: [...teamBPlayers] }])
  }, [teamAPlayers, teamBPlayers])

  // Undo keyboard shortcut
  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'z') {
        e.preventDefault()
        handleUndo()
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [undoStack])

  const handleUndo = () => {
    if (undoStack.length === 0) return
    const prev = undoStack[undoStack.length - 1]
    setTeamAPlayers(prev.teamA)
    setTeamBPlayers(prev.teamB)
    setUndoStack(s => s.slice(0, -1))
    toast.info('Undone')
  }

  const handleAddToTeamA = (player) => {
    saveForUndo()
    setTeamAPlayers(prev => [...prev, player])
    toast.success(`Added ${player.name} to Team A`)
  }

  const handleAddToTeamB = (player) => {
    saveForUndo()
    setTeamBPlayers(prev => [...prev, player])
    toast.success(`Added ${player.name} to Team B`)
  }

  const handleRemoveFromTeamA = (playerId) => {
    saveForUndo()
    const removed = teamAPlayers.find(p => p.id === playerId)
    setTeamAPlayers(prev => prev.filter(p => p.id !== playerId))
    if (removed) {
      toast.undoToast(`Removed ${removed.name}`, () => {
        setTeamAPlayers(prev => [...prev, removed])
      })
    }
  }

  const handleRemoveFromTeamB = (playerId) => {
    saveForUndo()
    const removed = teamBPlayers.find(p => p.id === playerId)
    setTeamBPlayers(prev => prev.filter(p => p.id !== playerId))
    if (removed) {
      toast.undoToast(`Removed ${removed.name}`, () => {
        setTeamBPlayers(prev => [...prev, removed])
      })
    }
  }

  const handleSaveTrade = () => {
    addTrade({
      teamA: teamAPlayers.map(p => ({ id: p.id, name: p.name, position: p.position, value: p.dynastyValue })),
      teamB: teamBPlayers.map(p => ({ id: p.id, name: p.name, position: p.position, value: p.dynastyValue })),
      teamAValue,
      teamBValue,
      fairness: fairnessInfo.label
    })
    toast.success('Trade saved to history')
  }

  const handleClearAll = () => {
    saveForUndo()
    setTeamAPlayers([])
    setTeamBPlayers([])
  }

  // Drag and drop handlers
  const handleDragOver = (e, side) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
    setDragOverSide(side)
  }

  const handleDragLeave = () => {
    setDragOverSide(null)
  }

  const handleDrop = (e, side) => {
    e.preventDefault()
    setDragOverSide(null)
    try {
      const playerData = JSON.parse(e.dataTransfer.getData('text/plain'))
      if (!playerData || !playerData.id) return

      // Check if already on this side
      const sideList = side === 'A' ? teamAPlayers : teamBPlayers
      if (sideList.find(p => p.id === playerData.id)) return

      // Remove from other side if present
      const otherSide = side === 'A' ? teamBPlayers : teamAPlayers
      const wasOnOther = otherSide.find(p => p.id === playerData.id)

      saveForUndo()

      if (wasOnOther) {
        if (side === 'A') {
          setTeamBPlayers(prev => prev.filter(p => p.id !== playerData.id))
          setTeamAPlayers(prev => [...prev, playerData])
        } else {
          setTeamAPlayers(prev => prev.filter(p => p.id !== playerData.id))
          setTeamBPlayers(prev => [...prev, playerData])
        }
        toast.info(`Moved ${playerData.name} to Team ${side}`)
      } else {
        if (side === 'A') {
          setTeamAPlayers(prev => [...prev, playerData])
        } else {
          setTeamBPlayers(prev => [...prev, playerData])
        }
        toast.success(`Added ${playerData.name} to Team ${side}`)
      }
    } catch (err) {
      // Invalid drag data
    }
  }

  const teamAValue = calculateSideValue(teamAPlayers)
  const teamBValue = calculateSideValue(teamBPlayers)
  const fairness = calculateFairness(teamAValue, teamBValue)
  const fairnessInfo = getFairnessLabel(fairness, teamAValue, teamBValue)
  const recommendation = getTradeRecommendation(teamAPlayers, teamBPlayers)

  const hasTrade = teamAPlayers.length > 0 && teamBPlayers.length > 0
  const hasAnyPlayers = teamAPlayers.length > 0 || teamBPlayers.length > 0

  // Trigger confetti on fair trade
  useEffect(() => {
    if (hasTrade && fairnessInfo.class === 'fair') {
      confettiKey.current += 1
      setShowConfetti(true)
      const timer = setTimeout(() => setShowConfetti(false), 100)
      return () => clearTimeout(timer)
    }
  }, [hasTrade, fairnessInfo.class])

  // Trade breakdown analysis
  const getTradeBreakdown = () => {
    const breakdown = []
    const ageDiffA = teamAPlayers.filter(p => p.age > 0).length > 0
      ? teamAPlayers.filter(p => p.age > 0).reduce((sum, p) => sum + p.age, 0) / teamAPlayers.filter(p => p.age > 0).length
      : 0
    const ageDiffB = teamBPlayers.filter(p => p.age > 0).length > 0
      ? teamBPlayers.filter(p => p.age > 0).reduce((sum, p) => sum + p.age, 0) / teamBPlayers.filter(p => p.age > 0).length
      : 0

    if (ageDiffA > 0 && ageDiffB > 0) {
      breakdown.push({
        label: 'Age Factor',
        detail: ageDiffA < ageDiffB
          ? `Team A gets younger assets (avg ${ageDiffA.toFixed(1)} vs ${ageDiffB.toFixed(1)})`
          : ageDiffB < ageDiffA
          ? `Team B gets younger assets (avg ${ageDiffB.toFixed(1)} vs ${ageDiffA.toFixed(1)})`
          : 'Age is similar on both sides'
      })
    }

    const positionsA = teamAPlayers.map(p => p.position).filter(p => p !== 'PICK')
    const positionsB = teamBPlayers.map(p => p.position).filter(p => p !== 'PICK')

    if (positionsA.length > 0 || positionsB.length > 0) {
      breakdown.push({
        label: 'Position Mix',
        detail: `Team A: ${positionsA.join(', ') || 'Picks only'} | Team B: ${positionsB.join(', ') || 'Picks only'}`
      })
    }

    const picksA = teamAPlayers.filter(p => p.position === 'PICK').length
    const picksB = teamBPlayers.filter(p => p.position === 'PICK').length

    if (picksA > 0 || picksB > 0) {
      breakdown.push({
        label: 'Draft Capital',
        detail: `Team A: ${picksA} pick(s) | Team B: ${picksB} pick(s)`
      })
    }

    return breakdown
  }

  return (
    <div>
      <Confetti trigger={showConfetti} key={confettiKey.current} />

      <div className="trade-calculator">
        {/* Team A Side */}
        <div
          className={`trade-side ${dragOverSide === 'A' ? 'drag-over' : ''}`}
          onDragOver={(e) => handleDragOver(e, 'A')}
          onDragLeave={handleDragLeave}
          onDrop={(e) => handleDrop(e, 'A')}
        >
          <h2 className="trade-side-header">Team A Receives</h2>

          <PlayerSearch
            onSelect={handleAddToTeamA}
            excludeIds={allSelectedIds}
          />

          <div className={`trade-players ${dragOverSide === 'A' ? 'drag-over' : ''}`}>
            {teamAPlayers.length === 0 ? (
              <div className="trade-players-empty">
                <p>Add players or drag here</p>
              </div>
            ) : (
              teamAPlayers.map(player => (
                <PlayerCard
                  key={player.id}
                  player={player}
                  onRemove={handleRemoveFromTeamA}
                  onWatchlistToggle={toggleWatchlist}
                  isWatched={isWatched(player.id)}
                  showDetails
                  draggable
                />
              ))
            )}
          </div>

          <div className="trade-total">
            <div className="trade-total-value">{formatValue(teamAValue)}</div>
            <div className="trade-total-label">Total Dynasty Value</div>
          </div>
        </div>

        {/* VS Divider */}
        <div className="trade-vs">VS</div>

        {/* Team B Side */}
        <div
          className={`trade-side ${dragOverSide === 'B' ? 'drag-over' : ''}`}
          onDragOver={(e) => handleDragOver(e, 'B')}
          onDragLeave={handleDragLeave}
          onDrop={(e) => handleDrop(e, 'B')}
        >
          <h2 className="trade-side-header">Team B Receives</h2>

          <PlayerSearch
            onSelect={handleAddToTeamB}
            excludeIds={allSelectedIds}
          />

          <div className={`trade-players ${dragOverSide === 'B' ? 'drag-over' : ''}`}>
            {teamBPlayers.length === 0 ? (
              <div className="trade-players-empty">
                <p>Add players or drag here</p>
              </div>
            ) : (
              teamBPlayers.map(player => (
                <PlayerCard
                  key={player.id}
                  player={player}
                  onRemove={handleRemoveFromTeamB}
                  onWatchlistToggle={toggleWatchlist}
                  isWatched={isWatched(player.id)}
                  showDetails
                  draggable
                />
              ))
            )}
          </div>

          <div className="trade-total">
            <div className="trade-total-value">{formatValue(teamBValue)}</div>
            <div className="trade-total-label">Total Dynasty Value</div>
          </div>
        </div>

        {/* Trade Result */}
        {hasAnyPlayers && (
          <div className="trade-result">
            <h3>Trade Analysis</h3>

            {hasTrade && (
              <>
                <div className="fairness-gauge">
                  <div className="gauge-bar">
                    <div
                      className="gauge-indicator"
                      style={{ left: `${fairness}%` }}
                    />
                  </div>
                </div>

                <div className={`fairness-label ${fairnessInfo.class}`}>
                  {fairnessInfo.label}
                </div>
              </>
            )}

            <p style={{ marginTop: '1rem', color: 'var(--text-secondary)' }}>
              {getValueDifference(teamAValue, teamBValue)}
            </p>

            {hasTrade && recommendation.recommendations.length > 0 && (
              <div style={{ marginTop: '1rem' }}>
                {recommendation.recommendations.map((rec, i) => (
                  <p key={i} style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
                    {rec}
                  </p>
                ))}
              </div>
            )}

            {/* Trade Breakdown */}
            {hasTrade && (
              <div className="trade-breakdown">
                <h4>Trade Breakdown</h4>
                {getTradeBreakdown().map((item, i) => (
                  <div key={i} className="breakdown-item">
                    <strong>{item.label}</strong>
                    <span>{item.detail}</span>
                  </div>
                ))}
              </div>
            )}

            <div className="trade-action-buttons">
              {hasTrade && (
                <button
                  className="trade-btn trade-btn-save"
                  onClick={handleSaveTrade}
                >
                  Save Trade
                </button>
              )}
              <button
                className="trade-btn trade-btn-clear"
                onClick={handleClearAll}
              >
                Clear Trade
              </button>
              {undoStack.length > 0 && (
                <button
                  className="trade-btn trade-btn-undo"
                  onClick={handleUndo}
                >
                  Undo (Ctrl+Z)
                </button>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Trade History */}
      {history.length > 0 && (
        <div className="trade-history">
          <div className="trade-history-header">
            <h3>Trade History</h3>
            <button className="clear-history-btn" onClick={clearHistory}>
              Clear History
            </button>
          </div>
          {history.slice(0, 10).map(trade => (
            <div key={trade.id} className="trade-history-item">
              <div className="trade-history-side">
                <strong>Team A Receives</strong>
                {trade.teamA.map(p => p.name).join(', ')}
              </div>
              <div className="trade-history-vs">VS</div>
              <div className="trade-history-side">
                <strong>Team B Receives</strong>
                {trade.teamB.map(p => p.name).join(', ')}
              </div>
              <div className="trade-history-result">
                <div className={`fairness-label ${trade.fairness?.includes('Fair') ? 'fair' : trade.fairness?.includes('Slight') ? 'slight' : 'unfair'}`} style={{ fontSize: '0.875rem' }}>
                  {trade.fairness}
                </div>
                <div className="trade-history-date">
                  {new Date(trade.date).toLocaleDateString()}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Info Card */}
      <div className="card" style={{ marginTop: '2rem' }}>
        <h3 className="card-header">About Dynasty Values</h3>
        <p style={{ color: 'var(--text-secondary)', lineHeight: 1.6 }}>
          Dynasty values are aggregated from 4 major sources: Dynasty League Football (DLF),
          Under The Helmet (UTH), Dynasty Nerds, and FantasyPros. Values are adjusted based on:
        </p>
        <ul style={{ color: 'var(--text-secondary)', marginTop: '0.5rem', paddingLeft: '1.5rem' }}>
          <li>Position scarcity (RBs get slight premium due to shorter careers)</li>
          <li>Age relative to position peak (younger = more valuable)</li>
          <li>Contract years remaining</li>
        </ul>
        <p style={{ color: 'var(--text-secondary)', marginTop: '0.5rem', fontSize: '0.875rem' }}>
          Last updated: January 28, 2026 | Press <kbd style={{ padding: '2px 6px', background: 'var(--bg-card-hover)', borderRadius: '4px', border: '1px solid var(--border-color)' }}>Shift + ?</kbd> for keyboard shortcuts
        </p>
      </div>
    </div>
  )
}

export default TradeCalculator
