import { useState } from 'react'
import { useLeagueSettings } from '../context/LeagueSettingsContext'

function LeagueSettings({ isOpen, onClose }) {
  const { settings, updateSetting, updateNestedSetting, resetSettings } = useLeagueSettings()
  const [activeTab, setActiveTab] = useState('scoring')

  if (!isOpen) return null

  const handleBackdropClick = (e) => {
    if (e.target === e.currentTarget) {
      onClose()
    }
  }

  return (
    <div className="modal-backdrop" onClick={handleBackdropClick}>
      <div className="modal league-settings-modal" role="dialog" aria-labelledby="settings-title">
        <div className="modal-header">
          <h2 id="settings-title">League Settings</h2>
          <button className="modal-close" onClick={onClose} aria-label="Close settings">
            &times;
          </button>
        </div>

        <div className="settings-tabs">
          <button
            className={`settings-tab ${activeTab === 'scoring' ? 'active' : ''}`}
            onClick={() => setActiveTab('scoring')}
          >
            Scoring
          </button>
          <button
            className={`settings-tab ${activeTab === 'roster' ? 'active' : ''}`}
            onClick={() => setActiveTab('roster')}
          >
            Roster
          </button>
          <button
            className={`settings-tab ${activeTab === 'context' ? 'active' : ''}`}
            onClick={() => setActiveTab('context')}
          >
            Team Context
          </button>
          <button
            className={`settings-tab ${activeTab === 'sources' ? 'active' : ''}`}
            onClick={() => setActiveTab('sources')}
          >
            Rankings
          </button>
        </div>

        <div className="modal-body settings-content">
          {/* Scoring Tab */}
          {activeTab === 'scoring' && (
            <div className="settings-section">
              <h3>Scoring Format</h3>
              <div className="settings-group">
                <label>PPR Setting</label>
                <div className="settings-buttons">
                  {[
                    { value: 'standard', label: 'Standard' },
                    { value: 'half-ppr', label: 'Half PPR' },
                    { value: 'ppr', label: 'Full PPR' }
                  ].map(opt => (
                    <button
                      key={opt.value}
                      className={`setting-btn ${settings.scoring === opt.value ? 'active' : ''}`}
                      onClick={() => updateSetting('scoring', opt.value)}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="settings-group">
                <label>League Format</label>
                <div className="settings-buttons">
                  {[
                    { value: 'dynasty', label: 'Dynasty' },
                    { value: 'keeper', label: 'Keeper' },
                    { value: 'redraft', label: 'Redraft' }
                  ].map(opt => (
                    <button
                      key={opt.value}
                      className={`setting-btn ${settings.format === opt.value ? 'active' : ''}`}
                      onClick={() => updateSetting('format', opt.value)}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
                <p className="settings-hint">
                  {settings.format === 'dynasty' && 'Age and picks are fully weighted'}
                  {settings.format === 'keeper' && 'Age partially weighted, picks discounted'}
                  {settings.format === 'redraft' && 'Current year value only, picks minimal'}
                </p>
              </div>

              <div className="settings-group">
                <label>QB Format</label>
                <div className="settings-buttons">
                  {[
                    { value: '1qb', label: '1QB' },
                    { value: 'superflex', label: 'Superflex' },
                    { value: '2qb', label: '2QB' }
                  ].map(opt => (
                    <button
                      key={opt.value}
                      className={`setting-btn ${settings.qbFormat === opt.value ? 'active' : ''}`}
                      onClick={() => updateSetting('qbFormat', opt.value)}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="settings-group">
                <label className="settings-toggle">
                  <input
                    type="checkbox"
                    checked={settings.tePremium}
                    onChange={(e) => updateSetting('tePremium', e.target.checked)}
                  />
                  <span className="toggle-slider"></span>
                  TE Premium (+0.5 PPR or +1 PPR to TEs)
                </label>
              </div>
            </div>
          )}

          {/* Roster Tab */}
          {activeTab === 'roster' && (
            <div className="settings-section">
              <h3>League Size</h3>
              <div className="settings-group">
                <label>Teams in League</label>
                <div className="settings-buttons">
                  {[8, 10, 12, 14, 16].map(size => (
                    <button
                      key={size}
                      className={`setting-btn ${settings.leagueSize === size ? 'active' : ''}`}
                      onClick={() => updateSetting('leagueSize', size)}
                    >
                      {size}
                    </button>
                  ))}
                </div>
              </div>

              <h3>Starting Roster</h3>
              <p className="settings-hint">Set your starting lineup to calculate replacement value</p>

              <div className="settings-starters">
                {[
                  { key: 'qb', label: 'QB', max: 2 },
                  { key: 'rb', label: 'RB', max: 4 },
                  { key: 'wr', label: 'WR', max: 5 },
                  { key: 'te', label: 'TE', max: 3 },
                  { key: 'flex', label: 'FLEX', max: 4 },
                  { key: 'superflex', label: 'SF', max: 2 }
                ].map(pos => (
                  <div key={pos.key} className="starter-input">
                    <label>{pos.label}</label>
                    <div className="number-input">
                      <button
                        onClick={() => updateNestedSetting('starters', pos.key, Math.max(0, settings.starters[pos.key] - 1))}
                        disabled={settings.starters[pos.key] <= 0}
                      >
                        -
                      </button>
                      <span>{settings.starters[pos.key]}</span>
                      <button
                        onClick={() => updateNestedSetting('starters', pos.key, Math.min(pos.max, settings.starters[pos.key] + 1))}
                        disabled={settings.starters[pos.key] >= pos.max}
                      >
                        +
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Team Context Tab */}
          {activeTab === 'context' && (
            <div className="settings-section">
              <h3>Team Strategies</h3>
              <p className="settings-hint">Adjust values based on each team's goals</p>

              <div className="settings-group">
                <label>Team A Strategy</label>
                <div className="settings-buttons">
                  {[
                    { value: 'contender', label: 'Contender' },
                    { value: 'neutral', label: 'Neutral' },
                    { value: 'rebuilder', label: 'Rebuilder' }
                  ].map(opt => (
                    <button
                      key={opt.value}
                      className={`setting-btn ${settings.teamContext.teamAStrategy === opt.value ? 'active' : ''}`}
                      onClick={() => updateNestedSetting('teamContext', 'teamAStrategy', opt.value)}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="settings-group">
                <label>Team B Strategy</label>
                <div className="settings-buttons">
                  {[
                    { value: 'contender', label: 'Contender' },
                    { value: 'neutral', label: 'Neutral' },
                    { value: 'rebuilder', label: 'Rebuilder' }
                  ].map(opt => (
                    <button
                      key={opt.value}
                      className={`setting-btn ${settings.teamContext.teamBStrategy === opt.value ? 'active' : ''}`}
                      onClick={() => updateNestedSetting('teamContext', 'teamBStrategy', opt.value)}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="settings-group">
                <label>Risk Tolerance</label>
                <div className="slider-container">
                  <span>Conservative</span>
                  <input
                    type="range"
                    min="0"
                    max="100"
                    value={settings.teamContext.riskTolerance * 100}
                    onChange={(e) => updateNestedSetting('teamContext', 'riskTolerance', e.target.value / 100)}
                    className="settings-slider"
                  />
                  <span>Aggressive</span>
                </div>
              </div>

              <h3>Position Needs</h3>
              <p className="settings-hint">Boost value for positions you need</p>

              <div className="needs-grid">
                <div className="needs-column">
                  <h4>Team A Needs</h4>
                  {['qb', 'rb', 'wr', 'te'].map(pos => (
                    <div key={pos} className="need-slider">
                      <label>{pos.toUpperCase()}</label>
                      <input
                        type="range"
                        min="0"
                        max="100"
                        value={settings.teamANeeds[pos] * 100}
                        onChange={(e) => updateNestedSetting('teamANeeds', pos, e.target.value / 100)}
                      />
                      <span className="need-value">{Math.round(settings.teamANeeds[pos] * 100)}%</span>
                    </div>
                  ))}
                </div>
                <div className="needs-column">
                  <h4>Team B Needs</h4>
                  {['qb', 'rb', 'wr', 'te'].map(pos => (
                    <div key={pos} className="need-slider">
                      <label>{pos.toUpperCase()}</label>
                      <input
                        type="range"
                        min="0"
                        max="100"
                        value={settings.teamBNeeds[pos] * 100}
                        onChange={(e) => updateNestedSetting('teamBNeeds', pos, e.target.value / 100)}
                      />
                      <span className="need-value">{Math.round(settings.teamBNeeds[pos] * 100)}%</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Rankings Tab */}
          {activeTab === 'sources' && (
            <div className="settings-section">
              <h3>Ranking Source</h3>
              <p className="settings-hint">Choose which rankings to use for values</p>

              <div className="settings-group">
                <div className="settings-buttons vertical">
                  {[
                    { value: 'consensus', label: 'Consensus (Average of all)', desc: 'Blends DLF, UTH, DynastyNerds, FantasyPros' },
                    { value: 'DLF', label: 'Dynasty League Football', desc: 'Industry standard dynasty rankings' },
                    { value: 'UTH', label: 'Under The Helmet', desc: 'Analytics-focused rankings' },
                    { value: 'DynastyNerds', label: 'Dynasty Nerds', desc: 'Community-driven rankings' },
                    { value: 'FantasyPros', label: 'FantasyPros', desc: 'Expert consensus rankings' }
                  ].map(opt => (
                    <button
                      key={opt.value}
                      className={`setting-btn source-btn ${settings.rankingSource === opt.value ? 'active' : ''}`}
                      onClick={() => updateSetting('rankingSource', opt.value)}
                    >
                      <span className="source-name">{opt.label}</span>
                      <span className="source-desc">{opt.desc}</span>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="modal-footer">
          <button className="btn-secondary" onClick={resetSettings}>
            Reset to Defaults
          </button>
          <button className="btn-primary" onClick={onClose}>
            Apply Settings
          </button>
        </div>
      </div>
    </div>
  )
}

export default LeagueSettings
