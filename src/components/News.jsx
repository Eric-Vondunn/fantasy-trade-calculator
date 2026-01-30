import { useState, useEffect } from 'react'

// ==================== RSS FEED CONFIG ====================

const SOURCES = [
  { key: 'all', label: 'All Sources' },
  { key: 'espn', label: 'ESPN' },
  { key: 'pft', label: 'Pro Football Talk' },
  { key: 'cbssports', label: 'CBS Sports' },
  { key: 'yahoo', label: 'Yahoo' },
  { key: 'fantasypros', label: 'FantasyPros' },
  { key: 'rotoballer', label: 'RotoBaller' },
  { key: 'dlf', label: 'DLF' },
]

const CATEGORIES = [
  { key: 'all', label: 'All' },
  { key: 'breaking', label: 'Breaking' },
  { key: 'general', label: 'General' },
  { key: 'fantasy', label: 'Fantasy' },
  { key: 'dynasty', label: 'Dynasty' },
]

// ==================== ANALYST ACCOUNTS ====================

const ANALYSTS = [
  { name: 'Adam Schefter', handle: 'AdamSchefter', outlet: 'ESPN', category: 'breaking', description: 'NFL insider, breaking news and transactions' },
  { name: 'Ian Rapoport', handle: 'RapSheet', outlet: 'NFL Network', category: 'breaking', description: 'NFL insider, injury reports and roster moves' },
  { name: 'Tom Pelissero', handle: 'TomPelissero', outlet: 'NFL Network', category: 'breaking', description: 'NFL insider, contracts and breaking news' },
  { name: 'Matthew Berry', handle: 'MatthewBerryTMR', outlet: 'NBC Sports', category: 'fantasy', description: 'Fantasy football analyst and advice' },
  { name: 'Field Yates', handle: 'FieldYates', outlet: 'ESPN', category: 'fantasy', description: 'Fantasy analyst, waiver wire and rankings' },
  { name: 'Mike Clay', handle: 'MikeClayNFL', outlet: 'ESPN', category: 'analytics', description: 'Projections, data-driven analysis' },
  { name: 'Fantasy Pros', handle: 'FantasyPros', outlet: 'FantasyPros', category: 'fantasy', description: 'Consensus rankings and start/sit advice' },
  { name: 'JJ Zachariason', handle: 'LateRoundQB', outlet: 'Late Round QB', category: 'analytics', description: 'Analytics-driven fantasy strategy' },
  { name: 'Matt Kelley', handle: 'Fantasy_Mansion', outlet: 'PlayerProfiler', category: 'analytics', description: 'Advanced metrics and player profiles' },
  { name: 'Pat Fitzmaurice', handle: 'PatFitzmaurice', outlet: 'FantasyPros', category: 'fantasy', description: 'Weekly rankings and matchup analysis' },
  { name: 'Dynasty Nerds', handle: 'DynastyNerds', outlet: 'Dynasty Nerds', category: 'dynasty', description: 'Dynasty rankings, trades, and rookie analysis' },
  { name: 'Dynasty League Football', handle: 'DynastyLeague', outlet: 'DLF', category: 'dynasty', description: 'Dynasty startup rankings and strategy' },
]

const ANALYST_CATEGORIES = [
  { key: 'all', label: 'All' },
  { key: 'breaking', label: 'Breaking News' },
  { key: 'fantasy', label: 'Fantasy' },
  { key: 'analytics', label: 'Analytics' },
  { key: 'dynasty', label: 'Dynasty' },
]

// ==================== HELPERS ====================

function timeAgo(dateStr) {
  if (!dateStr) return ''
  const now = new Date()
  const then = new Date(dateStr)
  const diffMs = now - then
  if (isNaN(diffMs)) return ''

  const mins = Math.floor(diffMs / 60000)
  if (mins < 1) return 'Just now'
  if (mins < 60) return `${mins}m ago`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  if (days < 7) return `${days}d ago`
  return then.toLocaleDateString()
}

// ==================== MAIN NEWS COMPONENT ====================

function News() {
  const [tab, setTab] = useState('articles')
  const [articles, setArticles] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [sourceFilter, setSourceFilter] = useState('all')
  const [categoryFilter, setCategoryFilter] = useState('all')
  const [analystFilter, setAnalystFilter] = useState('all')

  const fetchNews = async () => {
    setLoading(true)
    setError('')
    try {
      const url = sourceFilter === 'all'
        ? '/api/news'
        : `/api/news?source=${sourceFilter}`
      const response = await fetch(url)
      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch news')
      }

      setArticles(data.articles || [])
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (tab === 'articles') {
      fetchNews()
    }
  }, [sourceFilter, tab])

  const filteredArticles = categoryFilter === 'all'
    ? articles
    : articles.filter(a => a.category === categoryFilter)

  const filteredAnalysts = analystFilter === 'all'
    ? ANALYSTS
    : ANALYSTS.filter(a => a.category === analystFilter)

  return (
    <div className="news-container">
      <div className="news-header-row">
        <div>
          <h1>Fantasy Football News</h1>
          <p className="news-subtitle">
            Latest articles and analyst feeds
          </p>
        </div>
      </div>

      {/* Tab Switcher */}
      <div className="news-tabs">
        <button
          className={`news-tab ${tab === 'articles' ? 'active' : ''}`}
          onClick={() => setTab('articles')}
        >
          Articles
        </button>
        <button
          className={`news-tab ${tab === 'analysts' ? 'active' : ''}`}
          onClick={() => setTab('analysts')}
        >
          Analysts
        </button>
      </div>

      {/* ==================== ARTICLES TAB ==================== */}
      {tab === 'articles' && (
        <>
          <div className="news-filters">
            <div className="news-filter-group">
              {SOURCES.map(s => (
                <button
                  key={s.key}
                  className={`news-filter-btn ${sourceFilter === s.key ? 'active' : ''}`}
                  onClick={() => setSourceFilter(s.key)}
                >
                  {s.label}
                </button>
              ))}
            </div>
            <div className="news-filter-group">
              {CATEGORIES.map(c => (
                <button
                  key={c.key}
                  className={`news-filter-btn category ${categoryFilter === c.key ? 'active' : ''}`}
                  onClick={() => setCategoryFilter(c.key)}
                >
                  {c.label}
                </button>
              ))}
            </div>
          </div>

          {error && (
            <div className="news-error">
              Failed to load news: {error}
            </div>
          )}

          {loading && (
            <div className="news-loading">
              <div className="loading-spinner" />
              <p>Fetching latest news...</p>
            </div>
          )}

          {!loading && !error && filteredArticles.length === 0 && (
            <div className="news-empty">
              No articles found. Try a different source or category.
            </div>
          )}

          {!loading && filteredArticles.length > 0 && (
            <div className="news-articles">
              {filteredArticles.map((article, i) => (
                <a
                  key={i}
                  href={article.link}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="news-article-card"
                >
                  <div className="news-article-meta">
                    <span className="news-article-source">{article.source}</span>
                    <span className="news-article-time">{timeAgo(article.pubDate)}</span>
                  </div>
                  <h3 className="news-article-title">{article.title}</h3>
                  {article.description && (
                    <p className="news-article-desc">{article.description}</p>
                  )}
                </a>
              ))}
            </div>
          )}
        </>
      )}

      {/* ==================== ANALYSTS TAB ==================== */}
      {tab === 'analysts' && (
        <>
          <div className="news-filters">
            <div className="news-filter-group">
              {ANALYST_CATEGORIES.map(c => (
                <button
                  key={c.key}
                  className={`news-filter-btn ${analystFilter === c.key ? 'active' : ''}`}
                  onClick={() => setAnalystFilter(c.key)}
                >
                  {c.label}
                </button>
              ))}
            </div>
          </div>

          <div className="analyst-grid">
            {filteredAnalysts.map(analyst => (
              <div key={analyst.handle} className="analyst-card">
                <div className="analyst-card-header">
                  <div className="analyst-card-avatar">
                    {analyst.name.charAt(0)}
                  </div>
                  <div className="analyst-card-info">
                    <div className="analyst-card-name">{analyst.name}</div>
                    <div className="analyst-card-handle">@{analyst.handle}</div>
                  </div>
                  <span className={`analyst-card-badge ${analyst.category}`}>
                    {analyst.category}
                  </span>
                </div>
                <p className="analyst-card-desc">{analyst.description}</p>
                <div className="analyst-card-outlet">{analyst.outlet}</div>
                <div className="analyst-card-actions">
                  <a
                    href={`https://x.com/${analyst.handle}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="analyst-card-link x-link"
                  >
                    View on X
                  </a>
                  <a
                    href={`https://x.com/intent/follow?screen_name=${analyst.handle}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="analyst-card-link follow-link"
                  >
                    Follow
                  </a>
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  )
}

export default News
