import { useState, useEffect, useRef } from 'react'

const ANALYSTS = [
  { name: 'Matthew Berry', handle: 'MatthewBerryTMR', outlet: 'NBC Sports', category: 'general' },
  { name: 'Adam Schefter', handle: 'AdamSchefter', outlet: 'ESPN', category: 'breaking' },
  { name: 'Ian Rapoport', handle: 'RapSheet', outlet: 'NFL Network', category: 'breaking' },
  { name: 'Field Yates', handle: 'FieldYates', outlet: 'ESPN', category: 'general' },
  { name: 'Mike Clay', handle: 'MikeClayNFL', outlet: 'ESPN', category: 'analytics' },
  { name: 'Fantasy Pros', handle: 'FantasyPros', outlet: 'FantasyPros', category: 'general' },
  { name: 'Matt Kelley', handle: 'Fantasy_Mansion', outlet: 'PlayerProfiler', category: 'analytics' },
  { name: 'JJ Zachariason', handle: 'LateRoundQB', outlet: 'Late Round QB', category: 'analytics' },
  { name: 'Pat Fitzmaurice', handle: 'PatFitzmaurice', outlet: 'FantasyPros', category: 'general' },
  { name: 'Dynasty Nerds', handle: 'DynastyNerds', outlet: 'Dynasty Nerds', category: 'dynasty' },
  { name: 'Matt Betz', handle: 'MattBetzDN', outlet: 'Dynasty Nerds', category: 'dynasty' },
  { name: 'Dynasty League Football', handle: 'DynastyLeague', outlet: 'DLF', category: 'dynasty' },
]

const CATEGORIES = [
  { key: 'all', label: 'All' },
  { key: 'dynasty', label: 'Dynasty' },
  { key: 'breaking', label: 'Breaking News' },
  { key: 'analytics', label: 'Analytics' },
  { key: 'general', label: 'General' },
]

function TwitterTimeline({ handle, height = 500 }) {
  const containerRef = useRef(null)
  const [loaded, setLoaded] = useState(false)

  useEffect(() => {
    setLoaded(false)

    // Clean previous embed
    if (containerRef.current) {
      containerRef.current.innerHTML = ''
    }

    // Create the anchor element Twitter's widget script looks for
    const anchor = document.createElement('a')
    anchor.className = 'twitter-timeline'
    anchor.setAttribute('data-height', String(height))
    anchor.setAttribute('data-theme', document.documentElement.getAttribute('data-theme') === 'dark' ? 'dark' : 'light')
    anchor.setAttribute('data-chrome', 'noheader nofooter noborders')
    anchor.href = `https://x.com/${handle}`
    anchor.textContent = `Loading @${handle}...`
    containerRef.current.appendChild(anchor)

    // Load or re-run the Twitter widget script
    if (window.twttr && window.twttr.widgets) {
      window.twttr.widgets.load(containerRef.current).then(() => setLoaded(true))
    } else {
      const script = document.createElement('script')
      script.src = 'https://platform.x.com/widgets.js'
      script.async = true
      script.charset = 'utf-8'
      script.onload = () => {
        if (window.twttr && window.twttr.widgets) {
          window.twttr.widgets.load(containerRef.current).then(() => setLoaded(true))
        }
      }
      document.head.appendChild(script)
    }
  }, [handle, height])

  return (
    <div ref={containerRef} className="twitter-timeline-container">
      {!loaded && (
        <div className="timeline-loading">
          <div className="loading-spinner" />
          <p>Loading timeline...</p>
        </div>
      )}
    </div>
  )
}

function News() {
  const [selectedAnalyst, setSelectedAnalyst] = useState(ANALYSTS[0])
  const [filter, setFilter] = useState('all')

  const filteredAnalysts = filter === 'all'
    ? ANALYSTS
    : ANALYSTS.filter(a => a.category === filter)

  return (
    <div className="news-container">
      <h1>Fantasy Football News</h1>
      <p className="news-subtitle">
        Live feeds from top fantasy football and NFL analysts
      </p>

      {/* Category Filter */}
      <div className="news-filters">
        {CATEGORIES.map(cat => (
          <button
            key={cat.key}
            className={`news-filter-btn ${filter === cat.key ? 'active' : ''}`}
            onClick={() => {
              setFilter(cat.key)
              const available = cat.key === 'all' ? ANALYSTS : ANALYSTS.filter(a => a.category === cat.key)
              if (available.length > 0 && !available.find(a => a.handle === selectedAnalyst.handle)) {
                setSelectedAnalyst(available[0])
              }
            }}
          >
            {cat.label}
          </button>
        ))}
      </div>

      <div className="news-layout">
        {/* Analyst Sidebar */}
        <div className="news-sidebar">
          <div className="news-sidebar-header">Analysts</div>
          {filteredAnalysts.map(analyst => (
            <button
              key={analyst.handle}
              className={`analyst-btn ${selectedAnalyst.handle === analyst.handle ? 'active' : ''}`}
              onClick={() => setSelectedAnalyst(analyst)}
            >
              <div className="analyst-name">{analyst.name}</div>
              <div className="analyst-outlet">@{analyst.handle} &middot; {analyst.outlet}</div>
            </button>
          ))}
        </div>

        {/* Timeline */}
        <div className="news-timeline">
          <div className="news-timeline-header">
            <div>
              <strong>{selectedAnalyst.name}</strong>
              <span className="news-handle">@{selectedAnalyst.handle}</span>
            </div>
            <a
              href={`https://x.com/${selectedAnalyst.handle}`}
              target="_blank"
              rel="noopener noreferrer"
              className="news-follow-link"
            >
              View on X
            </a>
          </div>
          <TwitterTimeline
            handle={selectedAnalyst.handle}
            height={600}
          />
        </div>
      </div>
    </div>
  )
}

export default News
