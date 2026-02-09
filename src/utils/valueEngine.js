// Advanced Value Engine for Dynasty Fantasy Football
// Calculates player values with full breakdown and context-aware adjustments

import { players } from '../data/players'

// Position scarcity rankings for VORP calculation
const positionGroups = {
  QB: players.filter(p => p.position === 'QB').sort((a, b) => b.dynastyValue - a.dynastyValue),
  RB: players.filter(p => p.position === 'RB').sort((a, b) => b.dynastyValue - a.dynastyValue),
  WR: players.filter(p => p.position === 'WR').sort((a, b) => b.dynastyValue - a.dynastyValue),
  TE: players.filter(p => p.position === 'TE').sort((a, b) => b.dynastyValue - a.dynastyValue)
}

/**
 * Get replacement level value for a position
 */
export const getReplacementValue = (position, replacementLevels) => {
  const group = positionGroups[position]
  if (!group) return 0

  const replacementRank = replacementLevels[position.toLowerCase()] || 12
  const replacementPlayer = group[Math.min(replacementRank, group.length - 1)]
  return replacementPlayer?.dynastyValue || 0
}

/**
 * Calculate scarcity adjustment based on position depth
 */
export const getScarcityMultiplier = (player, replacementLevels) => {
  const group = positionGroups[player.position]
  if (!group || player.position === 'PICK' || player.position === 'K' || player.position === 'DEF') {
    return 1.0
  }

  const rank = group.findIndex(p => p.id === player.id) + 1
  const replacementRank = replacementLevels[player.position.toLowerCase()] || 12

  // Elite players get scarcity boost
  if (rank <= 5) return 1.15
  if (rank <= 10) return 1.08
  if (rank <= replacementRank * 0.5) return 1.04
  if (rank <= replacementRank) return 1.0
  // Below replacement level
  if (rank <= replacementRank * 1.5) return 0.92
  return 0.85
}

/**
 * Age-based value adjustment with dynasty/redraft awareness
 */
export const getAgeMultiplier = (age, position, formatAgeWeight = 1.0) => {
  if (position === 'K' || position === 'DEF' || position === 'PICK') return 1.0

  // Peak ages by position
  const peakAge = position === 'QB' ? 30 : position === 'RB' ? 25 : position === 'TE' ? 27 : 26
  const ageDiff = age - peakAge

  let multiplier = 1.0
  if (ageDiff <= -5) multiplier = 1.10      // Very young, high upside
  else if (ageDiff <= -3) multiplier = 1.075 // Young, entering prime
  else if (ageDiff <= -1) multiplier = 1.04  // Near prime
  else if (ageDiff <= 2) multiplier = 1.0    // In prime
  else if (ageDiff <= 4) multiplier = 0.88   // Starting decline
  else if (ageDiff <= 6) multiplier = 0.72   // Declining
  else multiplier = 0.55                      // Late career

  // Scale by format (redraft ignores age, keeper partially)
  return 1 + (multiplier - 1) * formatAgeWeight
}

/**
 * Contract value adjustment
 */
export const getContractMultiplier = (yearsRemaining, format) => {
  if (format !== 'dynasty') return 1.0
  if (yearsRemaining >= 4) return 1.1
  if (yearsRemaining >= 3) return 1.05
  if (yearsRemaining >= 2) return 1.0
  return 0.9
}

/**
 * Team strategy adjustment (contender vs rebuilder)
 */
export const getStrategyMultiplier = (player, strategy, riskTolerance) => {
  if (strategy === 'neutral') return 1.0
  if (player.position === 'PICK') {
    // Picks are more valuable to rebuilders
    return strategy === 'rebuilder' ? 1.15 : 0.9
  }

  const age = player.age
  const position = player.position

  if (strategy === 'contender') {
    // Contenders want proven production now
    if (position === 'RB' && age >= 28) return 1.0 // Don't penalize veteran RBs for contenders
    if (age <= 23) return 0.92 // Young unproven players less valuable
    if (age >= 30 && position !== 'QB') return 0.95
    return 1.05
  }

  if (strategy === 'rebuilder') {
    // Rebuilders want youth
    if (age <= 24) return 1.12
    if (age <= 26) return 1.05
    if (age >= 29 && position === 'RB') return 0.75
    if (age >= 30) return 0.85
    return 0.95
  }

  return 1.0
}

/**
 * Position needs adjustment
 */
export const getNeedsMultiplier = (player, needs) => {
  if (!needs || player.position === 'PICK') return 1.0
  const posNeed = needs[player.position.toLowerCase()]
  if (posNeed === undefined) return 1.0
  // Scale from 1.0 (no need) to 1.2 (desperate need)
  return 1 + posNeed * 0.2
}

/**
 * Calculate value trend (simulated based on age trajectory)
 */
export const getValueTrend = (player) => {
  if (player.position === 'PICK') {
    return { direction: 'stable', change: 0, label: '' }
  }

  const age = player.age
  const position = player.position
  const peakAge = position === 'QB' ? 30 : position === 'RB' ? 25 : position === 'TE' ? 27 : 26

  if (age <= peakAge - 3) {
    return { direction: 'up', change: 5, label: '+5%' }
  }
  if (age <= peakAge) {
    return { direction: 'up', change: 2, label: '+2%' }
  }
  if (age <= peakAge + 2) {
    return { direction: 'stable', change: 0, label: '' }
  }
  if (age <= peakAge + 4) {
    return { direction: 'down', change: -5, label: '-5%' }
  }
  return { direction: 'down', change: -10, label: '-10%' }
}

/**
 * Calculate confidence score based on ranking agreement
 */
export const getConfidenceScore = (player) => {
  if (player.position === 'PICK') return 95

  const { DLF, UTH, DynastyNerds, FantasyPros } = player.rankings
  const rankings = [DLF, UTH, DynastyNerds, FantasyPros]
  const avg = rankings.reduce((a, b) => a + b, 0) / 4
  const variance = rankings.reduce((sum, r) => sum + Math.pow(r - avg, 2), 0) / 4
  const stdDev = Math.sqrt(variance)

  // Lower stdDev = higher agreement = higher confidence
  if (stdDev <= 2) return 95
  if (stdDev <= 5) return 85
  if (stdDev <= 10) return 75
  if (stdDev <= 20) return 65
  return 55
}

/**
 * Get effective ranking value based on source preference
 */
export const getEffectiveRanking = (player, rankingSource, rankingBlend) => {
  if (rankingSource === 'consensus' || !rankingBlend) {
    const { DLF, UTH, DynastyNerds, FantasyPros } = player.rankings
    return Math.round((DLF + UTH + DynastyNerds + FantasyPros) / 4)
  }

  if (rankingBlend && rankingBlend.source1 && rankingBlend.source2) {
    const r1 = player.rankings[rankingBlend.source1] || 0
    const r2 = player.rankings[rankingBlend.source2] || 0
    const weight = rankingBlend.weight || 0.5
    return Math.round(r1 * weight + r2 * (1 - weight))
  }

  return player.rankings[rankingSource] || player.rankings.DLF
}

/**
 * Calculate pick value with year discount and slot adjustment
 */
export const getPickValue = (pick, settings) => {
  const baseValue = pick.dynastyValue
  const formatMultiplier = settings?.multipliers?.format?.pickMultiplier || 1.0

  // Extract year from pick name (e.g., "2026 Pick 1.01")
  const yearMatch = pick.name.match(/(\d{4})/)
  const pickYear = yearMatch ? parseInt(yearMatch[1]) : 2026
  const currentYear = new Date().getFullYear()
  const yearDiff = pickYear - currentYear

  // Future discount: 10% per year
  const futureDiscount = Math.pow(0.9, Math.max(0, yearDiff))

  // Round extraction
  const roundMatch = pick.name.match(/(\d+)\./)
  const round = roundMatch ? parseInt(roundMatch[1]) : 1

  // Round multiplier
  const roundMultiplier = round === 1 ? 1.0 : round === 2 ? 0.5 : round === 3 ? 0.25 : 0.15

  return {
    base: baseValue,
    formatAdj: Math.round(baseValue * (formatMultiplier - 1)),
    futureAdj: Math.round(baseValue * (futureDiscount - 1)),
    total: Math.round(baseValue * formatMultiplier * futureDiscount),
    year: pickYear,
    round,
    futureDiscount
  }
}

/**
 * Main value calculation with full breakdown
 */
export const getPlayerValueBreakdown = (player, settings) => {
  const {
    multipliers = {},
    replacementLevels = { qb: 12, rb: 24, wr: 36, te: 12 },
    teamContext = {},
    teamANeeds = {},
    teamBNeeds = {}
  } = settings || {}

  // Handle picks separately
  if (player.position === 'PICK') {
    const pickValue = getPickValue(player, settings)
    return {
      base: pickValue.base,
      scarcityAdj: 0,
      ageAdj: 0,
      scoringAdj: pickValue.formatAdj,
      formatAdj: 0,
      strategyAdj: 0,
      needsAdj: 0,
      trendAdj: 0,
      total: pickValue.total,
      trend: { direction: 'stable', change: 0, label: '' },
      confidence: 95,
      pickDetails: pickValue
    }
  }

  const base = player.dynastyValue

  // Scarcity adjustment
  const scarcityMult = getScarcityMultiplier(player, replacementLevels)
  const scarcityAdj = Math.round(base * (scarcityMult - 1))

  // Age adjustment
  const formatAgeWeight = multipliers.format?.ageWeight ?? 1.0
  const ageMult = getAgeMultiplier(player.age, player.position, formatAgeWeight)
  const ageAdj = Math.round(base * (ageMult - 1))

  // Scoring format adjustment (PPR/Half/Standard)
  let scoringMult = 1.0
  if (multipliers.scoring) {
    scoringMult = multipliers.scoring[player.position.toLowerCase()] || 1.0
  }
  const scoringAdj = Math.round(base * (scoringMult - 1))

  // QB format adjustment (SF/2QB)
  let formatAdj = 0
  if (player.position === 'QB' && multipliers.qb) {
    formatAdj = Math.round(base * (multipliers.qb - 0.85)) // Relative to default 1QB
  }

  // TE Premium adjustment
  let tePremiumAdj = 0
  if (player.position === 'TE' && multipliers.te && multipliers.te > 1) {
    tePremiumAdj = Math.round(base * (multipliers.te - 1))
  }

  // Contract adjustment
  const contractMult = getContractMultiplier(player.contract?.years || 2, settings?.format || 'dynasty')
  const contractAdj = Math.round(base * (contractMult - 1))

  // Trend
  const trend = getValueTrend(player)
  const trendAdj = Math.round(base * (trend.change / 100))

  // Confidence
  const confidence = getConfidenceScore(player)

  // Calculate total before context adjustments
  const preContextTotal = base + scarcityAdj + ageAdj + scoringAdj + formatAdj + tePremiumAdj + contractAdj

  return {
    base,
    scarcityAdj,
    ageAdj,
    scoringAdj,
    formatAdj: formatAdj + tePremiumAdj,
    contractAdj,
    strategyAdj: 0, // Applied per-team
    needsAdj: 0,    // Applied per-team
    trendAdj,
    total: Math.round(preContextTotal),
    trend,
    confidence
  }
}

/**
 * Get player value adjusted for team context
 */
export const getContextualValue = (player, settings, side = 'A') => {
  const breakdown = getPlayerValueBreakdown(player, settings)
  const { teamContext = {}, teamANeeds = {}, teamBNeeds = {} } = settings || {}

  const strategy = side === 'A' ? teamContext.teamAStrategy : teamContext.teamBStrategy
  const needs = side === 'A' ? teamANeeds : teamBNeeds
  const riskTolerance = teamContext.riskTolerance || 0.5

  // Strategy adjustment
  const strategyMult = getStrategyMultiplier(player, strategy, riskTolerance)
  const strategyAdj = Math.round(breakdown.base * (strategyMult - 1))

  // Needs adjustment
  const needsMult = getNeedsMultiplier(player, needs)
  const needsAdj = Math.round(breakdown.base * (needsMult - 1))

  return {
    ...breakdown,
    strategyAdj,
    needsAdj,
    total: breakdown.total + strategyAdj + needsAdj
  }
}

/**
 * Calculate total value for a side with context
 */
export const calculateSideValueWithContext = (players, settings, side = 'A') => {
  return players.reduce((total, player) => {
    const value = getContextualValue(player, settings, side)
    return total + value.total
  }, 0)
}

/**
 * Calculate simple total (no context)
 */
export const calculateSideValue = (players, settings) => {
  return players.reduce((total, player) => {
    const breakdown = getPlayerValueBreakdown(player, settings)
    return total + breakdown.total
  }, 0)
}

/**
 * Format value for display
 */
export const formatValue = (value) => {
  if (value >= 10000) {
    return `${(value / 1000).toFixed(1)}K`
  }
  return value.toLocaleString()
}

/**
 * Get fairness analysis
 */
export const analyzeTrade = (teamAPlayers, teamBPlayers, settings) => {
  const teamAValue = calculateSideValueWithContext(teamAPlayers, settings, 'A')
  const teamBValue = calculateSideValueWithContext(teamBPlayers, settings, 'B')
  const total = teamAValue + teamBValue

  const fairnessPercent = total > 0 ? (teamAValue / total) * 100 : 50
  const diff = Math.abs(fairnessPercent - 50)

  let label, cls
  if (diff <= 5) {
    label = 'Fair Trade'
    cls = 'fair'
  } else if (diff <= 12) {
    const winner = fairnessPercent > 50 ? 'Team A' : 'Team B'
    label = `Slight advantage ${winner}`
    cls = 'slight'
  } else {
    const winner = fairnessPercent > 50 ? 'Team A' : 'Team B'
    label = `${winner} wins big`
    cls = 'unfair'
  }

  // One-line explanation
  const valueDiff = Math.abs(teamAValue - teamBValue)
  const winner = teamAValue > teamBValue ? 'Team A' : 'Team B'
  const explanation = valueDiff === 0
    ? 'Values are perfectly balanced'
    : `${winner} receives ${formatValue(valueDiff)} more in value`

  // Average confidence
  const allPlayers = [...teamAPlayers, ...teamBPlayers]
  const avgConfidence = allPlayers.length > 0
    ? Math.round(allPlayers.reduce((sum, p) => sum + getConfidenceScore(p), 0) / allPlayers.length)
    : 0

  return {
    teamAValue,
    teamBValue,
    fairnessPercent,
    label,
    class: cls,
    explanation,
    confidence: avgConfidence,
    valueDiff
  }
}

export default {
  getPlayerValueBreakdown,
  getContextualValue,
  calculateSideValue,
  calculateSideValueWithContext,
  analyzeTrade,
  formatValue,
  getValueTrend,
  getConfidenceScore
}
