// Trade Value Calculation Logic
// 1QB, 0.5 PPR Dynasty League Format
// Aggregates rankings from multiple sources and calculates trade fairness

/**
 * Calculate aggregate ranking from multiple sources
 */
export const calculateAggregateRanking = (player) => {
  const { DLF, UTH, DynastyNerds, FantasyPros } = player.rankings;
  return Math.round((DLF + UTH + DynastyNerds + FantasyPros) / 4);
};

/**
 * Position value multipliers for 1QB 0.5 PPR
 * QBs are devalued in 1QB - only rushing QBs maintain value
 * RBs with receiving work get boosted in PPR
 * WRs are premium assets
 */
const positionMultipliers = {
  QB: 0.85,  // QBs less valuable in 1QB leagues
  RB: 1.1,   // RBs have shorter careers, premium on youth + PPR boost for pass-catchers
  WR: 1.05,  // WRs are premium in PPR formats
  TE: 1.0,   // Elite TEs valuable in 0.5 PPR
  K: 0.4,
  DEF: 0.4
};

/**
 * Age-based value adjustment
 * Younger players are worth more in dynasty formats
 */
const getAgeMultiplier = (age, position) => {
  if (position === 'K' || position === 'DEF') return 1.0;

  // QBs have longer careers, RBs decline earliest
  const peakAge = position === 'QB' ? 30 : position === 'RB' ? 25 : 26;
  const ageDiff = age - peakAge;

  if (ageDiff <= -4) return 1.075; // Very young, modest premium
  if (ageDiff <= -1) return 1.04;  // Young, entering prime
  if (ageDiff <= 2) return 1.0;    // In prime
  if (ageDiff <= 4) return 0.88;   // Starting decline
  if (ageDiff <= 6) return 0.72;   // Declining
  return 0.55;                      // Late career
};

/**
 * Contract value adjustment
 * Players with more years remaining are more valuable
 */
const getContractMultiplier = (yearsRemaining) => {
  if (yearsRemaining >= 4) return 1.1;
  if (yearsRemaining >= 3) return 1.05;
  if (yearsRemaining >= 2) return 1.0;
  return 0.9;  // 1 year or less
};

/**
 * Calculate adjusted dynasty value for a player
 */
export const calculateAdjustedValue = (player) => {
  const baseValue = player.dynastyValue;
  const positionMult = positionMultipliers[player.position] || 1.0;
  const ageMult = getAgeMultiplier(player.age, player.position);
  const contractMult = getContractMultiplier(player.contract.years);

  return Math.round(baseValue * positionMult * ageMult * contractMult);
};

/**
 * Calculate total trade value for a side
 */
export const calculateSideValue = (players) => {
  return players.reduce((total, player) => {
    return total + calculateAdjustedValue(player);
  }, 0);
};

/**
 * Calculate trade fairness percentage
 * Returns a value from 0-100 where 50 is perfectly fair
 */
export const calculateFairness = (teamAValue, teamBValue) => {
  const total = teamAValue + teamBValue;
  if (total === 0) return 50;

  // Calculate what percentage of total value Team A is getting
  const teamAPercentage = (teamAValue / total) * 100;

  return teamAPercentage;
};

/**
 * Get fairness label based on percentage
 */
export const getFairnessLabel = (fairnessPercentage, teamAValue, teamBValue) => {
  const diff = Math.abs(fairnessPercentage - 50);

  if (diff <= 5) {
    return { label: 'Fair Trade', class: 'fair' };
  } else if (diff <= 15) {
    const winner = fairnessPercentage > 50 ? 'Team A' : 'Team B';
    return { label: `Slight advantage ${winner}`, class: 'slight' };
  } else {
    const winner = fairnessPercentage > 50 ? 'Team A' : 'Team B';
    return { label: `${winner} wins big`, class: 'unfair' };
  }
};

/**
 * Get trade recommendation
 */
export const getTradeRecommendation = (teamAPlayers, teamBPlayers) => {
  const teamAValue = calculateSideValue(teamAPlayers);
  const teamBValue = calculateSideValue(teamBPlayers);
  const fairness = calculateFairness(teamAValue, teamBValue);
  const fairnessInfo = getFairnessLabel(fairness, teamAValue, teamBValue);

  const recommendations = [];

  // Check for position imbalances
  const teamAPositions = teamAPlayers.reduce((acc, p) => {
    acc[p.position] = (acc[p.position] || 0) + 1;
    return acc;
  }, {});

  const teamBPositions = teamBPlayers.reduce((acc, p) => {
    acc[p.position] = (acc[p.position] || 0) + 1;
    return acc;
  }, {});

  // Check ages
  const avgAgeA = teamAPlayers.length > 0
    ? teamAPlayers.reduce((sum, p) => sum + p.age, 0) / teamAPlayers.length
    : 0;
  const avgAgeB = teamBPlayers.length > 0
    ? teamBPlayers.reduce((sum, p) => sum + p.age, 0) / teamBPlayers.length
    : 0;

  if (avgAgeA > 0 && avgAgeB > 0) {
    if (avgAgeA < avgAgeB - 3) {
      recommendations.push('Team A is getting younger players - good for rebuilding');
    } else if (avgAgeB < avgAgeA - 3) {
      recommendations.push('Team B is getting younger players - good for rebuilding');
    }
  }

  return {
    teamAValue,
    teamBValue,
    fairness,
    fairnessInfo,
    recommendations
  };
};

/**
 * Format value for display
 */
export const formatValue = (value) => {
  if (value >= 10000) {
    return `${(value / 1000).toFixed(1)}K`;
  }
  return value.toLocaleString();
};

/**
 * Get value difference description
 */
export const getValueDifference = (teamAValue, teamBValue) => {
  const diff = Math.abs(teamAValue - teamBValue);
  const winner = teamAValue > teamBValue ? 'Team A' : 'Team B';

  if (diff === 0) {
    return 'Values are equal';
  }

  return `${winner} receives ${formatValue(diff)} more in value`;
};

/**
 * Generate a shareable trade URL with player IDs encoded
 */
export const generateTradeShareUrl = (teamAPlayers, teamBPlayers) => {
  const teamAIds = teamAPlayers.map(p => p.id).join(',')
  const teamBIds = teamBPlayers.map(p => p.id).join(',')
  const params = new URLSearchParams()
  if (teamAIds) params.set('a', teamAIds)
  if (teamBIds) params.set('b', teamBIds)
  return `${window.location.origin}/?${params.toString()}`
}

/**
 * Parse trade from URL params
 */
export const parseTradeFromUrl = (searchParams) => {
  const teamAIds = searchParams.get('a')
  const teamBIds = searchParams.get('b')
  return {
    teamAIds: teamAIds ? teamAIds.split(',').map(Number) : [],
    teamBIds: teamBIds ? teamBIds.split(',').map(Number) : []
  }
}

export default {
  calculateAggregateRanking,
  calculateAdjustedValue,
  calculateSideValue,
  calculateFairness,
  getFairnessLabel,
  getTradeRecommendation,
  formatValue,
  getValueDifference,
  generateTradeShareUrl,
  parseTradeFromUrl
};
