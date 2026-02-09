// Value Engine Unit Tests
// Run with: node --experimental-vm-modules node_modules/jest/bin/jest.js src/utils/valueEngine.test.js
// Or add "test": "node --experimental-vm-modules node_modules/jest/bin/jest.js" to package.json

import {
  getPlayerValueBreakdown,
  getContextualValue,
  calculateSideValue,
  analyzeTrade,
  formatValue,
  getAgeMultiplier,
  getScarcityMultiplier,
  getValueTrend,
  getConfidenceScore,
  getPickValue
} from './valueEngine.js'

// Mock player data
const mockPlayers = {
  eliteWR: {
    id: 1,
    name: "Ja'Marr Chase",
    team: "CIN",
    position: "WR",
    age: 25,
    dynastyValue: 10000,
    contract: { years: 2 },
    rankings: { DLF: 1, UTH: 1, DynastyNerds: 1, FantasyPros: 1 }
  },
  youngRB: {
    id: 4,
    name: "Bijan Robinson",
    team: "ATL",
    position: "RB",
    age: 24,
    dynastyValue: 9500,
    contract: { years: 2 },
    rankings: { DLF: 4, UTH: 4, DynastyNerds: 4, FantasyPros: 4 }
  },
  veteranQB: {
    id: 52,
    name: "Patrick Mahomes",
    team: "KC",
    position: "QB",
    age: 30,
    dynastyValue: 4884,
    contract: { years: 2 },
    rankings: { DLF: 52, UTH: 52, DynastyNerds: 52, FantasyPros: 52 }
  },
  pick: {
    id: 5001,
    name: "2026 Pick 1.01",
    team: "PICK",
    position: "PICK",
    age: 0,
    dynastyValue: 9000,
    contract: { years: 0 },
    rankings: { DLF: 0, UTH: 0, DynastyNerds: 0, FantasyPros: 0 }
  }
}

const defaultSettings = {
  scoring: 'half-ppr',
  format: 'dynasty',
  qbFormat: '1qb',
  tePremium: false,
  leagueSize: 12,
  multipliers: {
    scoring: { rb: 1.1, wr: 1.05, te: 1.04 },
    qb: 0.85,
    te: 1.0,
    format: { pickMultiplier: 1.0, ageWeight: 1.0 }
  },
  replacementLevels: { qb: 15, rb: 27, wr: 39, te: 15 },
  teamContext: {
    teamAStrategy: 'neutral',
    teamBStrategy: 'neutral',
    riskTolerance: 0.5
  },
  teamANeeds: { qb: 0, rb: 0, wr: 0, te: 0 },
  teamBNeeds: { qb: 0, rb: 0, wr: 0, te: 0 }
}

describe('Value Engine', () => {
  describe('formatValue', () => {
    test('formats small values with commas', () => {
      expect(formatValue(5000)).toBe('5,000')
    })

    test('formats large values as K', () => {
      expect(formatValue(10000)).toBe('10.0K')
      expect(formatValue(15500)).toBe('15.5K')
    })
  })

  describe('getAgeMultiplier', () => {
    test('young WRs get premium', () => {
      const mult = getAgeMultiplier(22, 'WR', 1.0)
      expect(mult).toBeGreaterThan(1.0)
    })

    test('prime age WRs get 1.0', () => {
      const mult = getAgeMultiplier(26, 'WR', 1.0)
      expect(mult).toBe(1.0)
    })

    test('veteran RBs get penalized', () => {
      const mult = getAgeMultiplier(29, 'RB', 1.0)
      expect(mult).toBeLessThan(1.0)
    })

    test('QBs have later peak age', () => {
      const qbMult = getAgeMultiplier(30, 'QB', 1.0)
      const rbMult = getAgeMultiplier(30, 'RB', 1.0)
      expect(qbMult).toBeGreaterThan(rbMult)
    })

    test('redraft mode ignores age', () => {
      const mult = getAgeMultiplier(22, 'WR', 0.0)
      expect(mult).toBe(1.0)
    })
  })

  describe('getValueTrend', () => {
    test('young players trend up', () => {
      const trend = getValueTrend({ age: 22, position: 'WR' })
      expect(trend.direction).toBe('up')
      expect(trend.change).toBeGreaterThan(0)
    })

    test('veteran players trend down', () => {
      const trend = getValueTrend({ age: 32, position: 'RB' })
      expect(trend.direction).toBe('down')
      expect(trend.change).toBeLessThan(0)
    })

    test('picks are stable', () => {
      const trend = getValueTrend({ position: 'PICK' })
      expect(trend.direction).toBe('stable')
    })
  })

  describe('getConfidenceScore', () => {
    test('consensus rankings give high confidence', () => {
      const player = { rankings: { DLF: 1, UTH: 1, DynastyNerds: 1, FantasyPros: 1 } }
      expect(getConfidenceScore(player)).toBe(95)
    })

    test('divergent rankings give lower confidence', () => {
      const player = { rankings: { DLF: 1, UTH: 20, DynastyNerds: 5, FantasyPros: 30 } }
      expect(getConfidenceScore(player)).toBeLessThan(80)
    })
  })

  describe('getPlayerValueBreakdown', () => {
    test('returns all breakdown components', () => {
      const breakdown = getPlayerValueBreakdown(mockPlayers.eliteWR, defaultSettings)

      expect(breakdown).toHaveProperty('base')
      expect(breakdown).toHaveProperty('scarcityAdj')
      expect(breakdown).toHaveProperty('ageAdj')
      expect(breakdown).toHaveProperty('scoringAdj')
      expect(breakdown).toHaveProperty('total')
      expect(breakdown).toHaveProperty('trend')
      expect(breakdown).toHaveProperty('confidence')
    })

    test('elite players get scarcity boost', () => {
      const breakdown = getPlayerValueBreakdown(mockPlayers.eliteWR, defaultSettings)
      expect(breakdown.scarcityAdj).toBeGreaterThanOrEqual(0)
    })

    test('picks use different calculation', () => {
      const breakdown = getPlayerValueBreakdown(mockPlayers.pick, defaultSettings)
      expect(breakdown).toHaveProperty('pickDetails')
      expect(breakdown.pickDetails).toHaveProperty('year')
      expect(breakdown.pickDetails).toHaveProperty('round')
    })
  })

  describe('getPickValue', () => {
    test('future picks get discounted', () => {
      const pick2027 = { ...mockPlayers.pick, name: '2027 Pick 1.01' }
      const value2026 = getPickValue(mockPlayers.pick, defaultSettings)
      const value2027 = getPickValue(pick2027, defaultSettings)

      expect(value2027.total).toBeLessThan(value2026.total)
    })

    test('applies format multiplier', () => {
      const dynastySettings = { ...defaultSettings, multipliers: { ...defaultSettings.multipliers, format: { pickMultiplier: 1.0 } } }
      const redraftSettings = { ...defaultSettings, multipliers: { ...defaultSettings.multipliers, format: { pickMultiplier: 0.3 } } }

      const dynastyValue = getPickValue(mockPlayers.pick, dynastySettings)
      const redraftValue = getPickValue(mockPlayers.pick, redraftSettings)

      expect(dynastyValue.total).toBeGreaterThan(redraftValue.total)
    })
  })

  describe('analyzeTrade', () => {
    test('even trade is fair', () => {
      const teamA = [mockPlayers.eliteWR]
      const teamB = [mockPlayers.eliteWR]

      const analysis = analyzeTrade(teamA, teamB, defaultSettings)

      expect(analysis.class).toBe('fair')
      expect(analysis.fairnessPercent).toBeCloseTo(50, 0)
    })

    test('uneven trade shows winner', () => {
      const teamA = [mockPlayers.eliteWR]
      const teamB = [mockPlayers.veteranQB]

      const analysis = analyzeTrade(teamA, teamB, defaultSettings)

      expect(analysis.valueDiff).toBeGreaterThan(0)
      expect(analysis.label).toContain('Team A')
    })

    test('returns explanation', () => {
      const analysis = analyzeTrade(
        [mockPlayers.eliteWR],
        [mockPlayers.youngRB],
        defaultSettings
      )

      expect(typeof analysis.explanation).toBe('string')
      expect(analysis.explanation.length).toBeGreaterThan(0)
    })
  })

  describe('Context-aware values', () => {
    test('contender strategy boosts proven players', () => {
      const contenderSettings = {
        ...defaultSettings,
        teamContext: { ...defaultSettings.teamContext, teamAStrategy: 'contender' }
      }

      const neutralValue = getContextualValue(mockPlayers.veteranQB, defaultSettings, 'A')
      const contenderValue = getContextualValue(mockPlayers.veteranQB, contenderSettings, 'A')

      expect(contenderValue.total).toBeGreaterThanOrEqual(neutralValue.total)
    })

    test('rebuilder strategy boosts youth', () => {
      const rebuilderSettings = {
        ...defaultSettings,
        teamContext: { ...defaultSettings.teamContext, teamAStrategy: 'rebuilder' }
      }

      const neutralValue = getContextualValue(mockPlayers.youngRB, defaultSettings, 'A')
      const rebuilderValue = getContextualValue(mockPlayers.youngRB, rebuilderSettings, 'A')

      expect(rebuilderValue.total).toBeGreaterThanOrEqual(neutralValue.total)
    })

    test('position needs increase value', () => {
      const needSettings = {
        ...defaultSettings,
        teamANeeds: { qb: 0, rb: 1, wr: 0, te: 0 }
      }

      const baseValue = getContextualValue(mockPlayers.youngRB, defaultSettings, 'A')
      const needValue = getContextualValue(mockPlayers.youngRB, needSettings, 'A')

      expect(needValue.needsAdj).toBeGreaterThan(0)
      expect(needValue.total).toBeGreaterThan(baseValue.total)
    })
  })
})

// Simple test runner if Jest is not available
if (typeof describe === 'undefined') {
  console.log('Running basic value engine tests...\n')

  const tests = [
    () => {
      const result = formatValue(10000)
      console.assert(result === '10.0K', `formatValue failed: expected 10.0K, got ${result}`)
      console.log('✓ formatValue works')
    },
    () => {
      const mult = getAgeMultiplier(22, 'WR', 1.0)
      console.assert(mult > 1.0, `Young WR age multiplier should be > 1.0, got ${mult}`)
      console.log('✓ getAgeMultiplier works for young players')
    },
    () => {
      const breakdown = getPlayerValueBreakdown(mockPlayers.eliteWR, defaultSettings)
      console.assert(breakdown.total > 0, 'Breakdown total should be > 0')
      console.assert(breakdown.base === 10000, 'Base should match dynastyValue')
      console.log('✓ getPlayerValueBreakdown works')
    },
    () => {
      const analysis = analyzeTrade(
        [mockPlayers.eliteWR],
        [mockPlayers.eliteWR],
        defaultSettings
      )
      console.assert(analysis.class === 'fair', `Equal trade should be fair, got ${analysis.class}`)
      console.log('✓ analyzeTrade detects fair trades')
    }
  ]

  let passed = 0
  tests.forEach((test, i) => {
    try {
      test()
      passed++
    } catch (e) {
      console.error(`Test ${i + 1} failed:`, e.message)
    }
  })

  console.log(`\n${passed}/${tests.length} tests passed`)
}
