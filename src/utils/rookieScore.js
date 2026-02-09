// Rookie Scoring Engine
// Computes overall score with full breakdown for each rookie

// Valid positions
export const VALID_POSITIONS = ['QB', 'RB', 'WR', 'TE']

// Position weights for trait vs measurables
export const POSITION_WEIGHTS = {
  QB: { trait: 0.80, measurables: 0.20 },
  RB: { trait: 0.55, measurables: 0.45 },
  WR: { trait: 0.65, measurables: 0.35 },
  TE: { trait: 0.65, measurables: 0.35 }
}

// Measurable ranges by position (for normalization)
// These will be computed dynamically from the dataset
let measurableRanges = null

/**
 * Validate a rookie record
 * Throws error if invalid
 */
export function validateRookie(rookie) {
  const required = ['id', 'name', 'year', 'position', 'heightIn', 'weightLb', 'iq', 'routeRunning', 'vision', 'ballSkills']

  for (const field of required) {
    if (rookie[field] === undefined || rookie[field] === null) {
      throw new Error(`Missing required field "${field}" for rookie: ${rookie.name || rookie.id}`)
    }
  }

  if (!VALID_POSITIONS.includes(rookie.position)) {
    throw new Error(`Invalid position "${rookie.position}" for rookie: ${rookie.name}. Must be one of: ${VALID_POSITIONS.join(', ')}`)
  }

  // Validate trait grades are 0-10
  const traits = ['iq', 'routeRunning', 'vision', 'ballSkills']
  for (const trait of traits) {
    if (rookie[trait] < 0 || rookie[trait] > 10) {
      throw new Error(`Trait "${trait}" must be 0-10 for rookie: ${rookie.name}. Got: ${rookie[trait]}`)
    }
  }

  return true
}

/**
 * Validate all rookies in dataset
 */
export function validateDataset(rookies) {
  for (const rookie of rookies) {
    validateRookie(rookie)
  }
  return true
}

/**
 * Compute measurable ranges by position from dataset
 * This enables normalization across all years within each position
 */
export function computeMeasurableRanges(rookies) {
  const ranges = {}

  for (const pos of VALID_POSITIONS) {
    const posRookies = rookies.filter(r => r.position === pos)

    ranges[pos] = {
      heightIn: { min: Infinity, max: -Infinity },
      weightLb: { min: Infinity, max: -Infinity },
      forty: { min: Infinity, max: -Infinity },
      breakoutAge: { min: Infinity, max: -Infinity }
    }

    for (const rookie of posRookies) {
      if (rookie.heightIn != null) {
        ranges[pos].heightIn.min = Math.min(ranges[pos].heightIn.min, rookie.heightIn)
        ranges[pos].heightIn.max = Math.max(ranges[pos].heightIn.max, rookie.heightIn)
      }
      if (rookie.weightLb != null) {
        ranges[pos].weightLb.min = Math.min(ranges[pos].weightLb.min, rookie.weightLb)
        ranges[pos].weightLb.max = Math.max(ranges[pos].weightLb.max, rookie.weightLb)
      }
      if (rookie.forty != null) {
        ranges[pos].forty.min = Math.min(ranges[pos].forty.min, rookie.forty)
        ranges[pos].forty.max = Math.max(ranges[pos].forty.max, rookie.forty)
      }
      if (rookie.breakoutAge != null) {
        ranges[pos].breakoutAge.min = Math.min(ranges[pos].breakoutAge.min, rookie.breakoutAge)
        ranges[pos].breakoutAge.max = Math.max(ranges[pos].breakoutAge.max, rookie.breakoutAge)
      }
    }
  }

  measurableRanges = ranges
  return ranges
}

/**
 * Normalize a value to 0-100 scale
 * For "lower is better" metrics, invert the result
 */
function normalizeValue(value, min, max, lowerIsBetter = false) {
  if (min === max || min === Infinity || max === -Infinity) {
    return 50 // Default to middle if no range
  }

  let normalized = ((value - min) / (max - min)) * 100

  if (lowerIsBetter) {
    normalized = 100 - normalized
  }

  return Math.max(0, Math.min(100, normalized))
}

/**
 * Compute trait score (0-100)
 * Average of all trait grades, scaled from 0-10 to 0-100
 */
function computeTraitScore(rookie) {
  const traits = [rookie.iq, rookie.routeRunning, rookie.vision, rookie.ballSkills]
  const average = traits.reduce((sum, t) => sum + t, 0) / traits.length
  return average * 10 // Scale 0-10 to 0-100
}

/**
 * Compute measurables score (0-100)
 * Position-normalized, excludes missing values
 */
function computeMeasurablesScore(rookie, ranges) {
  const posRanges = ranges[rookie.position]
  const scores = []
  const breakdown = {
    height: null,
    weight: null,
    forty: null,
    breakoutAge: null
  }

  // Height - higher is generally better
  if (rookie.heightIn != null) {
    const score = normalizeValue(rookie.heightIn, posRanges.heightIn.min, posRanges.heightIn.max, false)
    scores.push(score)
    breakdown.height = Math.round(score)
  }

  // Weight - normalized (neither extreme is always better, but more mass can help)
  if (rookie.weightLb != null) {
    const score = normalizeValue(rookie.weightLb, posRanges.weightLb.min, posRanges.weightLb.max, false)
    scores.push(score)
    breakdown.weight = Math.round(score)
  }

  // Forty - lower is better
  if (rookie.forty != null) {
    const score = normalizeValue(rookie.forty, posRanges.forty.min, posRanges.forty.max, true)
    scores.push(score)
    breakdown.forty = Math.round(score)
  }

  // Breakout age - lower is better
  if (rookie.breakoutAge != null) {
    const score = normalizeValue(rookie.breakoutAge, posRanges.breakoutAge.min, posRanges.breakoutAge.max, true)
    scores.push(score)
    breakdown.breakoutAge = Math.round(score)
  }

  const measurablesScore = scores.length > 0
    ? scores.reduce((sum, s) => sum + s, 0) / scores.length
    : 50 // Default to middle if no measurables

  return { score: measurablesScore, breakdown }
}

/**
 * Compute overall rookie score
 * Returns full breakdown for UI display
 */
export function computeRookieScore(rookie, ranges = measurableRanges) {
  if (!ranges) {
    throw new Error('Measurable ranges not computed. Call computeMeasurableRanges first.')
  }

  const traitScore = computeTraitScore(rookie)
  const { score: measurablesScore, breakdown: measurablesBreakdown } = computeMeasurablesScore(rookie, ranges)

  const weights = POSITION_WEIGHTS[rookie.position]
  const overall = weights.trait * traitScore + weights.measurables * measurablesScore

  return {
    overall: Math.round(overall * 10) / 10,
    traitScore: Math.round(traitScore * 10) / 10,
    measurablesScore: Math.round(measurablesScore * 10) / 10,
    breakdown: {
      iq: rookie.iq * 10,
      routeRunning: rookie.routeRunning * 10,
      vision: rookie.vision * 10,
      ballSkills: rookie.ballSkills * 10,
      ...measurablesBreakdown
    }
  }
}

/**
 * Process entire dataset: validate, compute ranges, and score all rookies
 * Returns array of rookies with scores attached
 */
export function processRookieDataset(rookies) {
  // Validate all rookies
  validateDataset(rookies)

  // Compute position-based measurable ranges
  const ranges = computeMeasurableRanges(rookies)

  // Score each rookie
  const scoredRookies = rookies.map(rookie => {
    const score = computeRookieScore(rookie, ranges)
    return {
      ...rookie,
      ...score
    }
  })

  // Sort by overall score descending
  scoredRookies.sort((a, b) => b.overall - a.overall)

  return scoredRookies
}

/**
 * Assign ranks to rookies
 * Mode: 'all' = rank across all, 'year' = rank within each year
 */
export function assignRanks(rookies, mode = 'all') {
  if (mode === 'all') {
    // Sort by overall and assign sequential ranks
    const sorted = [...rookies].sort((a, b) => b.overall - a.overall)
    return sorted.map((rookie, index) => ({
      ...rookie,
      rank: index + 1
    }))
  }

  if (mode === 'year') {
    // Group by year, sort within each year, assign ranks
    const byYear = {}
    for (const rookie of rookies) {
      if (!byYear[rookie.year]) byYear[rookie.year] = []
      byYear[rookie.year].push(rookie)
    }

    const result = []
    for (const year of Object.keys(byYear)) {
      const yearRookies = byYear[year].sort((a, b) => b.overall - a.overall)
      yearRookies.forEach((rookie, index) => {
        result.push({
          ...rookie,
          rank: index + 1,
          rankLabel: `${year} #${index + 1}`
        })
      })
    }

    return result
  }

  return rookies
}

/**
 * Get unique years from dataset
 */
export function getYears(rookies) {
  const years = [...new Set(rookies.map(r => r.year))]
  return years.sort((a, b) => b - a) // Descending
}

/**
 * Filter rookies by criteria
 */
export function filterRookies(rookies, { year, position, search }) {
  let filtered = rookies

  if (year && year !== 'all') {
    filtered = filtered.filter(r => r.year === parseInt(year))
  }

  if (position && position !== 'all') {
    filtered = filtered.filter(r => r.position === position)
  }

  if (search && search.trim()) {
    const query = search.toLowerCase().trim()
    filtered = filtered.filter(r =>
      r.name.toLowerCase().includes(query) ||
      (r.school && r.school.toLowerCase().includes(query))
    )
  }

  return filtered
}

export default {
  validateRookie,
  validateDataset,
  computeMeasurableRanges,
  computeRookieScore,
  processRookieDataset,
  assignRanks,
  getYears,
  filterRookies,
  VALID_POSITIONS,
  POSITION_WEIGHTS
}
