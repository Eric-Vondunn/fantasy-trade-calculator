import { useState } from 'react'

const weatherIcons = {
  Clear: '\u2600',
  Clouds: '\u2601',
  Rain: '\uD83C\uDF27',
  Drizzle: '\uD83C\uDF27',
  Thunderstorm: '\u26C8',
  Snow: '\u2744',
  Mist: '\uD83C\uDF2B',
  Fog: '\uD83C\uDF2B',
  default: '\u2601'
}

const getWeatherIcon = (condition) => {
  return weatherIcons[condition] || weatherIcons.default
}

// Football impact analysis based on weather conditions
const getFootballImpact = (weather) => {
  const impacts = []
  const temp = weather.temp || weather.high
  const windSpeed = weather.windSpeed || 0
  const precipitation = weather.precipitation || 0
  const condition = weather.condition || weather.description || ''
  const conditionLower = condition.toLowerCase()

  // Severity levels: 'extreme', 'high', 'moderate', 'low'
  let overallSeverity = 'low'

  // EXTREME CONDITIONS
  // Blizzard / Heavy Snow
  if (conditionLower.includes('blizzard') ||
      (conditionLower.includes('snow') && windSpeed > 25) ||
      (conditionLower.includes('snow') && precipitation > 70)) {
    impacts.push({
      severity: 'extreme',
      icon: '\uD83C\uDF28',
      title: 'Blizzard Conditions',
      description: 'Extreme conditions - passing game will be severely limited. Teams will abandon the air attack and lean heavily on the run game. Expect 35+ rushing attempts per team.',
      advice: [
        'Start all viable RBs in this game',
        'Downgrade WRs significantly (50%+ reduction expected)',
        'QBs will struggle - consider benching unless elite rusher',
        'Kickers are nearly unstartable',
        'Defense/ST could boom with turnovers'
      ]
    })
    overallSeverity = 'extreme'
  }
  // Heavy Snow
  else if (conditionLower.includes('snow') || (temp < 32 && precipitation > 50)) {
    impacts.push({
      severity: 'high',
      icon: '\u2744',
      title: 'Snow Expected',
      description: 'Snowy conditions will impact the passing game and footing. Ball security becomes a major concern. Run-heavy game scripts likely.',
      advice: [
        'Boost RB projections by 15-20%',
        'Reduce WR expectations, especially deep threats',
        'Possession receivers may hold value',
        'Monitor kicker - accuracy drops significantly',
        'Fumbles more likely - defense streamers look good'
      ]
    })
    if (overallSeverity !== 'extreme') overallSeverity = 'high'
  }

  // Thunderstorm
  if (conditionLower.includes('thunderstorm') || conditionLower.includes('thunder')) {
    impacts.push({
      severity: 'high',
      icon: '\u26C8',
      title: 'Thunderstorm Warning',
      description: 'Potential game delays and dangerous conditions. If play continues, expect conservative playcalling and run-heavy approach.',
      advice: [
        'Game delays possible - monitor for updates',
        'If played through, RBs benefit significantly',
        'Deep passing virtually eliminated',
        'Turnovers likely - boost DST projections',
        'Kickers unreliable in these conditions'
      ]
    })
    if (overallSeverity !== 'extreme') overallSeverity = 'high'
  }

  // Heavy Rain
  if (conditionLower.includes('rain') && precipitation > 60) {
    impacts.push({
      severity: 'high',
      icon: '\uD83C\uDF27',
      title: 'Heavy Rain Expected',
      description: 'Wet conditions significantly impact ball handling. Expect fumbles, dropped passes, and a shift to ground attack.',
      advice: [
        'RBs become more valuable - bump projections 10-15%',
        'WRs with drop issues become risky plays',
        'Slot receivers slightly safer than outside WRs',
        'Ball-hawking defenses could feast',
        'Avoid kickers if possible'
      ]
    })
    if (overallSeverity !== 'extreme') overallSeverity = 'high'
  }
  // Light/Moderate Rain
  else if (conditionLower.includes('rain') || conditionLower.includes('drizzle')) {
    impacts.push({
      severity: 'moderate',
      icon: '\uD83C\uDF27',
      title: 'Rain/Drizzle',
      description: 'Light rain affects grip but games typically proceed normally. Slightly favors run game and short passing.',
      advice: [
        'Minor boost to RB volume expected',
        'Deep ball accuracy decreases',
        'Possession receivers over speedsters',
        'Slight downgrade to kickers on long FGs'
      ]
    })
    if (overallSeverity === 'low') overallSeverity = 'moderate'
  }

  // Extreme Cold
  if (temp < 20) {
    impacts.push({
      severity: 'high',
      icon: '\uD83E\uDD76',
      title: 'Extreme Cold',
      description: `Temperatures around ${Math.round(temp)}\u00B0F will significantly impact player performance. Hands get numb, balls become harder to catch and throw accurately.`,
      advice: [
        'Warm-weather players may struggle (check team history)',
        'Drop rates increase - target sure-handed receivers',
        'Ball travels differently - long FGs less reliable',
        'Teams from cold-weather cities have advantage',
        'Consider reducing overall scoring projections'
      ]
    })
    if (overallSeverity !== 'extreme') overallSeverity = 'high'
  }
  // Cold
  else if (temp < 35) {
    impacts.push({
      severity: 'moderate',
      icon: '\uD83E\uDD76',
      title: 'Cold Weather',
      description: `Temperature around ${Math.round(temp)}\u00B0F. Players can manage but grip and comfort affected. Slight advantage to running game.`,
      advice: [
        'Minor impact expected overall',
        'Dome team players may underperform slightly',
        'Running game gets small boost',
        'Long field goals slightly less reliable'
      ]
    })
    if (overallSeverity === 'low') overallSeverity = 'moderate'
  }

  // Extreme Heat
  if (temp > 95) {
    impacts.push({
      severity: 'high',
      icon: '\uD83D\uDD25',
      title: 'Extreme Heat',
      description: `Temperatures around ${Math.round(temp)}\u00B0F. Fatigue becomes major factor, especially in 4th quarter. Hydration issues possible.`,
      advice: [
        'Backup RBs may see increased late-game work',
        'Conditioning matters - older players may fade',
        'Monitor for cramping issues during game',
        '4th quarter could see sloppy play'
      ]
    })
    if (overallSeverity !== 'extreme') overallSeverity = 'high'
  }

  // High Winds
  if (windSpeed > 25) {
    impacts.push({
      severity: 'high',
      icon: '\uD83C\uDF2C',
      title: 'Dangerous Winds',
      description: `Sustained winds of ${Math.round(windSpeed)}+ mph will devastate the passing game. Deep balls nearly impossible. Field goals over 40 yards very risky.`,
      advice: [
        'RBs are the play - massive volume increase expected',
        'Bench all but the most elite WRs',
        'QBs without rushing upside should be benched',
        'DO NOT start kickers - FG% drops dramatically',
        'Punting becomes chaotic - block/return TDs possible'
      ]
    })
    if (overallSeverity !== 'extreme') overallSeverity = 'high'
  }
  // Moderate Winds
  else if (windSpeed > 15) {
    impacts.push({
      severity: 'moderate',
      icon: '\uD83C\uDF2C',
      title: 'Windy Conditions',
      description: `Winds around ${Math.round(windSpeed)} mph will affect deep passing and kicking. Short/intermediate game should be fine.`,
      advice: [
        'Deep threat WRs lose value',
        'Slot receivers and TEs slightly boosted',
        'Long FG attempts (50+) become risky',
        'Slight bump to RB usage expected'
      ]
    })
    if (overallSeverity === 'low') overallSeverity = 'moderate'
  }

  // Fog/Mist
  if (conditionLower.includes('fog') || conditionLower.includes('mist')) {
    impacts.push({
      severity: 'moderate',
      icon: '\uD83C\uDF2B',
      title: 'Fog/Low Visibility',
      description: 'Reduced visibility affects deep passing and tracking the ball. Short game becomes more reliable.',
      advice: [
        'Deep passes harder to complete',
        'Underneath routes and screens favored',
        'RBs and TEs could see uptick in targets',
        'Usually clears as game progresses'
      ]
    })
    if (overallSeverity === 'low') overallSeverity = 'moderate'
  }

  // Perfect Conditions
  if (impacts.length === 0 && temp >= 50 && temp <= 80 && windSpeed < 10) {
    impacts.push({
      severity: 'low',
      icon: '\u2705',
      title: 'Ideal Conditions',
      description: 'Perfect football weather! No weather-related adjustments needed. Let talent and matchups drive your decisions.',
      advice: [
        'No weather adjustments necessary',
        'Trust your normal rankings and projections',
        'Focus on matchups and usage patterns'
      ]
    })
  }

  return { impacts, overallSeverity }
}

const getSeverityColor = (severity) => {
  switch (severity) {
    case 'extreme': return '#dc2626'
    case 'high': return '#ea580c'
    case 'moderate': return '#ca8a04'
    case 'low': return '#16a34a'
    default: return '#6b7280'
  }
}

const getSeverityBg = (severity) => {
  switch (severity) {
    case 'extreme': return '#fef2f2'
    case 'high': return '#fff7ed'
    case 'moderate': return '#fefce8'
    case 'low': return '#f0fdf4'
    default: return '#f9fafb'
  }
}

const ImpactCard = ({ impact }) => (
  <div
    className="weather-impact-card"
    style={{
      background: getSeverityBg(impact.severity),
      border: `2px solid ${getSeverityColor(impact.severity)}`,
      borderRadius: '12px',
      padding: '1rem',
      marginBottom: '1rem'
    }}
  >
    <div className="weather-impact-header" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem', flexWrap: 'wrap' }}>
      <span style={{ fontSize: '1.5rem' }}>{impact.icon}</span>
      <strong style={{ color: getSeverityColor(impact.severity), fontSize: '1.1rem' }}>
        {impact.title}
      </strong>
      <span className="weather-impact-badge" style={{
        marginLeft: 'auto',
        padding: '0.25rem 0.75rem',
        background: getSeverityColor(impact.severity),
        color: 'white',
        borderRadius: '12px',
        fontSize: '0.75rem',
        fontWeight: '600',
        textTransform: 'uppercase'
      }}>
        {impact.severity} impact
      </span>
    </div>
    <p style={{ marginBottom: '0.75rem', color: '#374151' }}>{impact.description}</p>
    <div style={{ background: 'rgba(255,255,255,0.7)', borderRadius: '8px', padding: '0.75rem' }}>
      <strong style={{ fontSize: '0.875rem', color: '#1f2937' }}>Fantasy Advice:</strong>
      <ul className="weather-advice-list" style={{ margin: '0.5rem 0 0 1.25rem', padding: 0, fontSize: '0.875rem', color: '#4b5563' }}>
        {impact.advice.map((tip, tipIdx) => (
          <li key={tipIdx} style={{ marginBottom: '0.25rem' }}>{tip}</li>
        ))}
      </ul>
    </div>
  </div>
)

function WeatherWidget() {
  const [city, setCity] = useState('')
  const [weather, setWeather] = useState(null)
  const [forecast, setForecast] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [selectedDay, setSelectedDay] = useState(null)

  const handleSearch = async (e) => {
    e.preventDefault()
    if (!city.trim()) return

    setLoading(true)
    setError('')
    setSelectedDay(null)

    try {
      const response = await fetch(`/api/weather?city=${encodeURIComponent(city)}`)
      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch weather')
      }

      setWeather(data.current)
      setForecast(data.forecast)
    } catch (err) {
      setError(err.message)
      setWeather(null)
      setForecast([])
    } finally {
      setLoading(false)
    }
  }

  const getDayName = (dateStr) => {
    const date = new Date(dateStr)
    const today = new Date()
    const tomorrow = new Date(today)
    tomorrow.setDate(tomorrow.getDate() + 1)

    if (date.toDateString() === today.toDateString()) return 'Today'
    if (date.toDateString() === tomorrow.toDateString()) return 'Tomorrow'

    return date.toLocaleDateString('en-US', { weekday: 'short' })
  }

  const isGameDay = (dayName) => {
    return dayName === 'Sun' || dayName === 'Mon' || dayName === 'Thu' || dayName === 'Today'
  }

  // Get impact for current weather
  const currentImpact = weather ? getFootballImpact(weather) : null

  // Get impact for selected forecast day
  const selectedDayData = selectedDay !== null ? forecast[selectedDay] : null
  const selectedDayImpact = selectedDayData ? getFootballImpact({
    temp: selectedDayData.high,
    windSpeed: selectedDayData.windSpeed || 10,
    precipitation: selectedDayData.precipitation,
    condition: selectedDayData.condition
  }) : null

  const STADIUM_CITIES = [
    'Kansas City', 'Denver', 'Green Bay', 'Chicago', 'Buffalo',
    'Foxborough', 'Philadelphia', 'Cleveland', 'Pittsburgh', 'Baltimore',
    'Miami', 'Tampa', 'New Orleans', 'Charlotte', 'Jacksonville',
    'Nashville', 'Seattle', 'San Francisco', 'Los Angeles', 'New York'
  ]

  return (
    <div className="weather-container">
      <div className="card">
        <h2 className="card-header">Game Day Weather Forecast</h2>

        <form className="weather-search" onSubmit={handleSearch}>
          <div className="weather-search-input">
            <input
              type="text"
              value={city}
              onChange={(e) => setCity(e.target.value)}
              placeholder="Enter city name (e.g., Kansas City)"
            />
            <button type="submit" disabled={loading}>
              {loading ? 'Loading...' : 'Get Forecast'}
            </button>
          </div>
        </form>

        {error && (
          <div style={{ color: 'var(--red)', marginTop: '1rem', textAlign: 'center' }}>
            {error}
          </div>
        )}

        {loading && (
          <div className="loading">
            <div className="loading-spinner"></div>
          </div>
        )}

        {weather && !loading && (
          <>
            <div className="weather-current card" style={{ background: 'var(--gray-100)' }}>
              <div className="weather-city">{weather.city}</div>
              <div className="weather-temp">{Math.round(weather.temp)}&deg;F</div>
              <div className="weather-condition">{weather.description}</div>
              <div className="weather-details-row">
                Feels like {Math.round(weather.feelsLike)}&deg;F |
                Humidity: {weather.humidity}% |
                Wind: {Math.round(weather.windSpeed)} mph
              </div>
            </div>

            {/* Current Weather Football Impact */}
            {currentImpact && currentImpact.impacts.length > 0 && (
              <div style={{ marginTop: '1.5rem' }}>
                <h3 className="weather-impact-title">
                  {'\uD83C\uDFC8'} Current Conditions - Fantasy Impact
                </h3>
                {currentImpact.impacts.map((impact, idx) => (
                  <ImpactCard key={idx} impact={impact} />
                ))}
              </div>
            )}

            {forecast.length > 0 && (
              <>
                <h3 className="weather-forecast-heading">
                  7-Day Forecast
                  <span className="weather-forecast-hint">
                    (tap a day for fantasy analysis)
                  </span>
                </h3>
                <div className="weather-forecast">
                  {forecast.map((day, index) => {
                    const dayName = getDayName(day.date)
                    const gameDay = isGameDay(dayName)
                    const isSelected = selectedDay === index
                    const dayImpact = getFootballImpact({
                      temp: day.high,
                      windSpeed: day.windSpeed || 10,
                      precipitation: day.precipitation,
                      condition: day.condition
                    })

                    return (
                      <div
                        key={index}
                        className={`forecast-day ${isSelected ? 'selected' : ''} ${gameDay ? 'game-day' : ''}`}
                        onClick={() => setSelectedDay(isSelected ? null : index)}
                        style={{
                          cursor: 'pointer',
                          border: isSelected
                            ? `3px solid ${getSeverityColor(dayImpact.overallSeverity)}`
                            : gameDay
                              ? '2px solid var(--orange)'
                              : '1px solid var(--gray-200)',
                          transform: isSelected ? 'scale(1.05)' : 'scale(1)',
                          transition: 'all 0.2s'
                        }}
                      >
                        <div className="forecast-day-name">
                          {dayName}
                          {gameDay && <span style={{ color: 'var(--orange)' }}> *</span>}
                        </div>
                        <div className="forecast-icon">
                          {getWeatherIcon(day.condition)}
                        </div>
                        <div className="forecast-temp">
                          {Math.round(day.high)}&deg;
                        </div>
                        <div className="forecast-temp-low">
                          {Math.round(day.low)}&deg;
                        </div>
                        {day.precipitation > 30 && (
                          <div className="forecast-precip">
                            {day.precipitation}% precip
                          </div>
                        )}
                        {day.windSpeed > 15 && (
                          <div className="forecast-wind">
                            {Math.round(day.windSpeed)} mph
                          </div>
                        )}
                        {/* Severity indicator dot */}
                        <div className="forecast-severity-dot" style={{
                          background: getSeverityColor(dayImpact.overallSeverity)
                        }} />
                      </div>
                    )
                  })}
                </div>

                {/* Selected Day Football Impact */}
                {selectedDayImpact && selectedDayData && (
                  <div style={{ marginTop: '1.5rem' }}>
                    <h3 className="weather-impact-title">
                      {'\uD83C\uDFC8'} {getDayName(selectedDayData.date)} Forecast - Fantasy Impact
                    </h3>
                    {selectedDayImpact.impacts.map((impact, idx) => (
                      <ImpactCard key={idx} impact={impact} />
                    ))}
                  </div>
                )}

                <div className="weather-legend">
                  <strong>Legend:</strong>
                  <span>
                    <span className="legend-dot" style={{ background: '#16a34a' }}></span> Low Impact
                  </span>
                  <span>
                    <span className="legend-dot" style={{ background: '#ca8a04' }}></span> Moderate
                  </span>
                  <span>
                    <span className="legend-dot" style={{ background: '#ea580c' }}></span> High
                  </span>
                  <span>
                    <span className="legend-dot" style={{ background: '#dc2626' }}></span> Extreme
                  </span>
                  <span>| * = Game Day (Sun/Mon/Thu)</span>
                </div>
              </>
            )}
          </>
        )}

        {!weather && !loading && !error && (
          <div className="empty-state" style={{ marginTop: '2rem' }}>
            <p>Enter a city name to see the 7-day forecast with fantasy football analysis.</p>
            <p className="empty-state-hint">
              Get weather impact analysis for game day decisions!
            </p>
          </div>
        )}
      </div>

      <div className="card" style={{ marginTop: '1.5rem' }}>
        <h3 className="card-header">NFL Stadium Cities (Outdoor Stadiums)</h3>
        <div className="stadium-city-buttons">
          {STADIUM_CITIES.map(cityName => (
            <button
              key={cityName}
              className={`stadium-city-btn ${city === cityName ? 'active' : ''}`}
              onClick={() => {
                setCity(cityName)
                setSelectedDay(null)
              }}
            >
              {cityName}
            </button>
          ))}
        </div>
        <p className="stadium-note">
          Note: Dome stadiums (Indianapolis, Detroit, Minnesota, Arizona, Atlanta, Las Vegas, Dallas)
          are climate-controlled and unaffected by weather.
        </p>
      </div>
    </div>
  )
}

export default WeatherWidget
