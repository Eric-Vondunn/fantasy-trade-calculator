import { useState, useEffect, useCallback, useRef, useMemo } from 'react'
import { useSearchParams } from 'react-router-dom'
import PlayerSearch from './PlayerSearch'
import PlayerCard from './PlayerCard'
import Confetti from './Confetti'
import LeagueSettings from './LeagueSettings'
import { useToast } from './Toast'
import { useTradeHistory, useWatchlist } from '../hooks/useLocalStorage'
import { useLeagueSettings } from '../context/LeagueSettingsContext'
import { players, getPlayerById } from '../data/players'
import {
  calculateSideValueWithContext,
  analyzeTrade,
  formatValue,
  getPlayerValueBreakdown
} from '../utils/valueEngine'

function TradeCalculator() {
  const [searchParams, setSearchParams] = useSearchParams()
  const [teamAPlayers, setTeamAPlayers] = useState([])
  const [teamBPlayers, setTeamBPlayers] = useState([])
  const [undoStack, setUndoStack] = useState([])
  const [showConfetti, setShowConfetti] = useState(false)
  const [dragOverSide, setDragOverSide] = useState(null)
  const [showSettings, setShowSettings] = useState(false)
  const confettiKey = useRef(0)
  const initialLoadDone = useRef(false)

  const toast = useToast()
  const { history, addTrade, clearHistory } = useTradeHistory()
  const { isWatched, toggleWatchlist } = useWatchlist()
  const { settings, multipliers, replacementLevels } = useLeagueSettings()

  // Build settings object for value engine
  const valueSettings = useMemo(() => ({
    ...settings,
    multipliers,
    replacementLevels
  }), [settings, multipliers, replacementLevels])

  const allSelectedIds = [...teamAPlayers, ...teamBPlayers].map(p => p.id)

  // Load trade from URL params on mount
  useEffect(() => {
    if (initialLoadDone.current) return
    initialLoadDone.current = true

    const teamAIds = searchParams.get('a')
    const teamBIds = searchParams.get('b')

    if (teamAIds) {
      const ids = teamAIds.split(',').map(Number).filter(Boolean)
      const foundPlayers = ids.map(id => getPlayerById(id)).filter(Boolean)
      if (foundPlayers.length > 0) setTeamAPlayers(foundPlayers)
    }

    if (teamBIds) {
      const ids = teamBIds.split(',').map(Number).filter(Boolean)
      const foundPlayers = ids.map(id => getPlayerById(id)).filter(Boolean)
      if (foundPlayers.length > 0) setTeamBPlayers(foundPlayers)
    }
  }, [searchParams])

  // Update URL when trade changes
  useEffect(() => {
    const params = new URLSearchParams()
    if (teamAPlayers.length > 0) {
      params.set('a', teamAPlayers.map(p => p.id).join(','))
    }
    if (teamBPlayers.length > 0) {
      params.set('b', teamBPlayers.map(p => p.id).join(','))
    }
    const newSearch = params.toString()
    if (newSearch !== searchParams.toString()) {
      setSearchParams(params, { replace: true })
    }
  }, [teamAPlayers, teamBPlayers, setSearchParams, searchParams])

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

  // Calculate trade analysis with new value engine
  const tradeAnalysis = useMemo(() => {
    return analyzeTrade(teamAPlayers, teamBPlayers, valueSettings)
  }, [teamAPlayers, teamBPlayers, valueSettings])

  const teamAValue = tradeAnalysis.teamAValue
  const teamBValue = tradeAnalysis.teamBValue
  const fairness = tradeAnalysis.fairnessPercent
  const fairnessInfo = { label: tradeAnalysis.label, class: tradeAnalysis.class }

  const hasTrade = teamAPlayers.length > 0 && teamBPlayers.length > 0
  const hasAnyPlayers = teamAPlayers.length > 0 || teamBPlayers.length > 0

  // Calculate trade-balancing suggestions
  const tradeSuggestions = useMemo(() => {
    if (!hasTrade || fairnessInfo.class === 'fair') return null

    const diff = Math.abs(teamAValue - teamBValue)
    if (diff === 0) return null

    const losingSide = teamAValue < teamBValue ? 'A' : 'B'
    const excludeIds = new Set(allSelectedIds)

    // Find players closest to the value difference
    const candidates = players
      .filter(p => !excludeIds.has(p.id) && p.dynastyValue > 0)
      .map(p => {
        const breakdown = getPlayerValueBreakdown(p, valueSettings)
        return {
          player: p,
          adjustedValue: breakdown.total,
        }
      })
      .map(c => ({
        ...c,
        gap: Math.abs(c.adjustedValue - diff),
      }))
      .sort((a, b) => a.gap - b.gap)
      .slice(0, 3)

    if (candidates.length === 0) return null

    return { losingSide, diff, candidates }
  }, [hasTrade, teamAValue, teamBValue, fairnessInfo.class, allSelectedIds, valueSettings])

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

  // Copy shareable link
  const handleCopyLink = () => {
    const url = window.location.href
    navigator.clipboard.writeText(url).then(() => {
      toast.success('Trade link copied to clipboard!')
    }).catch(() => {
      toast.error('Failed to copy link')
    })
  }

  return (
    <div>
      <Confetti trigger={showConfetti} key={confettiKey.current} />
      <LeagueSettings isOpen={showSettings} onClose={() => setShowSettings(false)} />

      {/* Sticky Trade Summary Header */}
      {hasTrade && (
        <div className="trade-summary-header">
          <div className="trade-summary-values">
            <div className="summary-side">
              <span className="summary-label">Team A</span>
              <span className="summary-value">{formatValue(teamAValue)}</span>
            </div>
            <div className="summary-vs">
              <span className={`summary-fairness ${fairnessInfo.class}`}>
                {fairnessInfo.label}
              </span>
              <div className="summary-confidence" title={`${tradeAnalysis.confidence}% confidence`}>
                <div
                  className="confidence-fill"
                  style={{ width: `${tradeAnalysis.confidence}%` }}
                />
              </div>
            </div>
            <div className="summary-side">
              <span className="summary-label">Team B</span>
              <span className="summary-value">{formatValue(teamBValue)}</span>
            </div>
          </div>
          <p className="summary-explanation">{tradeAnalysis.explanation}</p>
        </div>
      )}

      {/* Settings Bar */}
      <div className="trade-toolbar">
        <button className="toolbar-btn" onClick={() => setShowSettings(true)}>
          <span className="toolbar-icon">⚙️</span>
          <span className="toolbar-label">
            {settings.qbFormat === 'superflex' ? 'SF' : settings.qbFormat.toUpperCase()} · {settings.scoring === 'ppr' ? 'PPR' : settings.scoring === 'half-ppr' ? '0.5 PPR' : 'STD'} · {settings.format.charAt(0).toUpperCase() + settings.format.slice(1)}
          </span>
        </button>
        {hasTrade && (
          <button className="toolbar-btn" onClick={handleCopyLink}>
            <span className="toolbar-icon">🔗</span>
            <span className="toolbar-label">Share Trade</span>
          </button>
        )}
      </div>

      <div className="trade-calculator">
        {/* Team A Side */}
        <div
          className={`trade-side ${dragOverSide === 'A' ? 'drag-over' : ''}`}
          onDragOver={(e) => handleDragOver(e, 'A')}
          onDragLeave={handleDragLeave}
          onDrop={(e) => handleDrop(e, 'A')}
          role="region"
          aria-label="Team A trade assets"
        >
          <h2 className="trade-side-header">Team A Receives</h2>

          <PlayerSearch
            onSelect={handleAddToTeamA}
            excludeIds={allSelectedIds}
          />

          <div className={`trade-players ${dragOverSide === 'A' ? 'drag-over' : ''}`}>
            {teamAPlayers.length === 0 ? (
              <div className="trade-players-empty">
                <div className="empty-state">
                  <p>Add players or drag here</p>
                  <span className="empty-hint">Try: Ja'Marr Chase, 2026 1st</span>
                </div>
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
                  valueSettings={valueSettings}
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
          role="region"
          aria-label="Team B trade assets"
        >
          <h2 className="trade-side-header">Team B Receives</h2>

          <PlayerSearch
            onSelect={handleAddToTeamB}
            excludeIds={allSelectedIds}
          />

          <div className={`trade-players ${dragOverSide === 'B' ? 'drag-over' : ''}`}>
            {teamBPlayers.length === 0 ? (
              <div className="trade-players-empty">
                <div className="empty-state">
                  <p>Add players or drag here</p>
                  <span className="empty-hint">Try: Bijan Robinson, 2027 2nd</span>
                </div>
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
                  valueSettings={valueSettings}
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
              {tradeAnalysis.explanation}
            </p>

            {/* Context indicators */}
            {(settings.teamContext.teamAStrategy !== 'neutral' || settings.teamContext.teamBStrategy !== 'neutral') && (
              <div className="trade-context-badges">
                {settings.teamContext.teamAStrategy !== 'neutral' && (
                  <span className={`context-badge ${settings.teamContext.teamAStrategy}`}>
                    Team A: {settings.teamContext.teamAStrategy}
                  </span>
                )}
                {settings.teamContext.teamBStrategy !== 'neutral' && (
                  <span className={`context-badge ${settings.teamContext.teamBStrategy}`}>
                    Team B: {settings.teamContext.teamBStrategy}
                  </span>
                )}
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

            {/* Trade Balancing Suggestions */}
            {tradeSuggestions && (
              <div className="trade-suggestions">
                <h4>Balance the Trade</h4>
                <p className="trade-suggestions-desc">
                  Add one of these players to Team {tradeSuggestions.losingSide} to even it out ({formatValue(tradeSuggestions.diff)} gap):
                </p>
                <div className="trade-suggestions-list">
                  {tradeSuggestions.candidates.map(({ player, adjustedValue }) => (
                    <button
                      key={player.id}
                      className="trade-suggestion-btn"
                      onClick={() => {
                        if (tradeSuggestions.losingSide === 'A') {
                          handleAddToTeamA(player)
                        } else {
                          handleAddToTeamB(player)
                        }
                      }}
                    >
                      <div className="suggestion-player-info">
                        <span className={`suggestion-pos ${player.position}`}>{player.position}</span>
                        <span className="suggestion-name">{player.name}</span>
                      </div>
                      <span className="suggestion-value">{formatValue(adjustedValue)}</span>
                    </button>
                  ))}
                </div>
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

    </div>
  )
}

export default TradeCalculator
