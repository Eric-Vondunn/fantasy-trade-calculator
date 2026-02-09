import { createContext, useContext, useState, useEffect, useMemo } from 'react'

// Default league settings
const defaultSettings = {
  // Scoring format
  scoring: 'half-ppr', // 'standard', 'half-ppr', 'ppr'

  // League format
  format: 'dynasty', // 'dynasty', 'keeper', 'redraft'

  // QB format
  qbFormat: '1qb', // '1qb', 'superflex', '2qb'

  // TE Premium
  tePremium: false,

  // IDP (not yet implemented in values)
  idp: false,

  // League size (affects replacement level)
  leagueSize: 12,

  // Roster spots per position (for replacement level calc)
  starters: {
    qb: 1,
    rb: 2,
    wr: 3,
    te: 1,
    flex: 1,
    superflex: 0
  },

  // Ranking source preference
  rankingSource: 'consensus', // 'consensus', 'DLF', 'UTH', 'DynastyNerds', 'FantasyPros'
  rankingBlend: null, // { source1: 'DLF', source2: 'UTH', weight: 0.5 } or null for single source

  // Team context for value adjustments
  teamContext: {
    teamAStrategy: 'neutral', // 'contender', 'rebuilder', 'neutral'
    teamBStrategy: 'neutral',
    riskTolerance: 0.5 // 0 = risk-averse, 1 = risk-seeking
  },

  // Position needs (0-1 scale, 0 = no need, 1 = desperate)
  teamANeeds: { qb: 0, rb: 0, wr: 0, te: 0 },
  teamBNeeds: { qb: 0, rb: 0, wr: 0, te: 0 }
}

const LeagueSettingsContext = createContext()

export function LeagueSettingsProvider({ children }) {
  const [settings, setSettings] = useState(() => {
    try {
      const saved = localStorage.getItem('leagueSettings')
      if (saved) {
        const parsed = JSON.parse(saved)
        // Merge with defaults to handle new fields
        return { ...defaultSettings, ...parsed }
      }
    } catch (e) {
      console.error('Error loading league settings:', e)
    }
    return defaultSettings
  })

  // Persist to localStorage
  useEffect(() => {
    try {
      localStorage.setItem('leagueSettings', JSON.stringify(settings))
    } catch (e) {
      console.error('Error saving league settings:', e)
    }
  }, [settings])

  // Update a single setting
  const updateSetting = (key, value) => {
    setSettings(prev => ({ ...prev, [key]: value }))
  }

  // Update nested settings (like starters or teamContext)
  const updateNestedSetting = (key, nestedKey, value) => {
    setSettings(prev => ({
      ...prev,
      [key]: { ...prev[key], [nestedKey]: value }
    }))
  }

  // Reset to defaults
  const resetSettings = () => {
    setSettings(defaultSettings)
  }

  // Computed multipliers based on settings
  const multipliers = useMemo(() => {
    const m = {
      // Scoring multipliers
      scoring: {
        rb: settings.scoring === 'ppr' ? 1.15 : settings.scoring === 'half-ppr' ? 1.1 : 1.0,
        wr: settings.scoring === 'ppr' ? 1.1 : settings.scoring === 'half-ppr' ? 1.05 : 1.0,
        te: settings.scoring === 'ppr' ? 1.08 : settings.scoring === 'half-ppr' ? 1.04 : 1.0
      },
      // QB format multipliers
      qb: settings.qbFormat === 'superflex' ? 1.8 : settings.qbFormat === '2qb' ? 2.0 : 0.85,
      // TE Premium
      te: settings.tePremium ? 1.25 : 1.0,
      // Format multipliers (affects picks and age curves)
      format: {
        pickMultiplier: settings.format === 'dynasty' ? 1.0 : settings.format === 'keeper' ? 0.7 : 0.3,
        ageWeight: settings.format === 'dynasty' ? 1.0 : settings.format === 'keeper' ? 0.6 : 0.0
      }
    }
    return m
  }, [settings])

  // Calculate replacement level by position based on league size and starters
  const replacementLevels = useMemo(() => {
    const { leagueSize, starters } = settings
    // Replacement level = (leagueSize * starters) + buffer
    const buffer = Math.ceil(leagueSize * 0.25) // 25% buffer
    return {
      qb: leagueSize * (starters.qb + (starters.superflex || 0)) + buffer,
      rb: leagueSize * (starters.rb + starters.flex * 0.4) + buffer,
      wr: leagueSize * (starters.wr + starters.flex * 0.4) + buffer,
      te: leagueSize * (starters.te + starters.flex * 0.2) + buffer
    }
  }, [settings])

  const value = {
    settings,
    setSettings,
    updateSetting,
    updateNestedSetting,
    resetSettings,
    multipliers,
    replacementLevels,
    defaultSettings
  }

  return (
    <LeagueSettingsContext.Provider value={value}>
      {children}
    </LeagueSettingsContext.Provider>
  )
}

export const useLeagueSettings = () => {
  const context = useContext(LeagueSettingsContext)
  if (!context) {
    throw new Error('useLeagueSettings must be used within a LeagueSettingsProvider')
  }
  return context
}

export { defaultSettings }
