import { useState, useEffect } from 'react'

const SOURCES = [
  { key: 'all', label: 'All Sources' },
  { key: 'espn', label: 'ESPN' },
  { key: 'nfl', label: 'NFL' },
  { key: 'fantasypros', label: 'FantasyPros' },
  { key: 'rotowire', label: 'RotoWire' },
  { key: 'cbssports', label: 'CBS Sports' },
]

const CATEGORIES = [
  { key: 'all', label: 'All' },
  { key: 'breaking', label: 'Breaking' },
  { key: 'general', label: 'General' },
  { key: 'analytics', label: 'Analytics' },
]

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

function News() {
  const [articles, setArticles] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [sourceFilter, setSourceFilter] = useState('all')
  const [categoryFilter, setCategoryFilter] = useState('all')

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
    fetchNews()
  }, [sourceFilter])

  const filtered = categoryFilter === 'all'
    ? articles
    : articles.filter(a => a.category === categoryFilter)

  return (
    <div className="news-container">
      <div className="news-header-row">
        <div>
          <h1>Fantasy Football News</h1>
          <p className="news-subtitle">
            Latest articles from top fantasy football sources
          </p>
        </div>
        <button
          className="news-refresh-btn"
          onClick={fetchNews}
          disabled={loading}
        >
          {loading ? 'Refreshing...' : 'Refresh'}
        </button>
      </div>

      {/* Filters */}
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

      {/* Error */}
      {error && (
        <div className="news-error">
          Failed to load news: {error}
        </div>
      )}

      {/* Loading */}
      {loading && (
        <div className="news-loading">
          <div className="loading-spinner" />
          <p>Fetching latest news...</p>
        </div>
      )}

      {/* Articles */}
      {!loading && !error && filtered.length === 0 && (
        <div className="news-empty">
          No articles found. Try a different source or category.
        </div>
      )}

      {!loading && filtered.length > 0 && (
        <div className="news-articles">
          {filtered.map((article, i) => (
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
    </div>
  )
}

export default News
