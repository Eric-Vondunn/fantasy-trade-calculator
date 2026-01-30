import { useState, useEffect, useRef } from 'react'

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

// ==================== TWITTER/X ACCOUNTS ====================

const TWITTER_ACCOUNTS = [
  { name: 'Adam Schefter', handle: 'AdamSchefter', outlet: 'ESPN', category: 'breaking' },
  { name: 'Ian Rapoport', handle: 'RapSheet', outlet: 'NFL Network', category: 'breaking' },
  { name: 'Matthew Berry', handle: 'MatthewBerryTMR', outlet: 'NBC Sports', category: 'fantasy' },
  { name: 'Field Yates', handle: 'FieldYates', outlet: 'ESPN', category: 'fantasy' },
  { name: 'Mike Clay', handle: 'MikeClayNFL', outlet: 'ESPN', category: 'analytics' },
  { name: 'Fantasy Pros', handle: 'FantasyPros', outlet: 'FantasyPros', category: 'fantasy' },
  { name: 'JJ Zachariason', handle: 'LateRoundQB', outlet: 'Late Round QB', category: 'analytics' },
  { name: 'Dynasty Nerds', handle: 'DynastyNerds', outlet: 'Dynasty Nerds', category: 'dynasty' },
  { name: 'Dynasty League Football', handle: 'DynastyLeague', outlet: 'DLF', category: 'dynasty' },
  { name: 'Pat Fitzmaurice', handle: 'PatFitzmaurice', outlet: 'FantasyPros', category: 'fantasy' },
  { name: 'Matt Kelley', handle: 'Fantasy_Mansion', outlet: 'PlayerProfiler', category: 'analytics' },
  { name: 'Tom Pelissero', handle: 'TomPelissero', outlet: 'NFL Network', category: 'breaking' },
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

// ==================== TWITTER TIMELINE COMPONENT ====================

function TwitterTimeline({ handle, height = 600 }) {
  const containerRef = useRef(null)
  const [loaded, setLoaded] = useState(false)
  const [failed, setFailed] = useState(false)

  useEffect(() => {
    setLoaded(false)
    setFailed(false)
    const node = containerRef.current
    if (!node) return

    node.innerHTML = ''

    const anchor = document.createElement('a')
    anchor.className = 'twitter-timeline'
    anchor.setAttribute('data-height', String(height))
    anchor.setAttribute('data-theme', document.documentElement.getAttribute('data-theme') === 'dark' ? 'dark' : 'light')
    anchor.setAttribute('data-chrome', 'noheader nofooter noborders')
    anchor.href = `https://x.com/${handle}`
    anchor.textContent = `Loading @${handle}...`
    node.appendChild(anchor)

    const loadWidgets = () => {
      if (window.twttr && window.twttr.widgets) {
        window.twttr.widgets.load(node).then(() => {
          // Check if an iframe was actually rendered
          setTimeout(() => {
            const iframe = node.querySelector('iframe')
            if (iframe) {
              setLoaded(true)
            } else {
              setFailed(true)
            }
          }, 3000)
        })
      }
    }

    if (window.twttr && window.twttr.widgets) {
      loadWidgets()
    } else {
      const script = document.createElement('script')
      script.src = 'https://platform.x.com/widgets.js'
      script.async = true
      script.charset = 'utf-8'
      script.onload = loadWidgets
      script.onerror = () => setFailed(true)
      document.head.appendChild(script)
    }

    return () => {
      node.innerHTML = ''
    }
  }, [handle, height])

  return (
    <div className="twitter-timeline-wrapper">
      {!loaded && !failed && (
        <div className="timeline-loading">
          <div className="loading-spinner" />
          <p>Loading timeline...</p>
        </div>
      )}
      {failed && (
        <div className="timeline-failed">
          <p>Timeline unavailable. Visit their profile directly:</p>
          <a
            href={`https://x.com/${handle}`}
            target="_blank"
            rel="noopener noreferrer"
            className="timeline-fallback-link"
          >
            @{handle} on X
          </a>
        </div>
      )}
      <div ref={containerRef} className="twitter-timeline-container" />
    </div>
  )
}

// ==================== MAIN NEWS COMPONENT ====================

function News() {
  const [tab, setTab] = useState('articles')
  const [articles, setArticles] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [sourceFilter, setSourceFilter] = useState('all')
  const [categoryFilter, setCategoryFilter] = useState('all')
  const [selectedAccount, setSelectedAccount] = useState(TWITTER_ACCOUNTS[0])

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

  const filtered = categoryFilter === 'all'
    ? articles
    : articles.filter(a => a.category === categoryFilter)

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
          className={`news-tab ${tab === 'twitter' ? 'active' : ''}`}
          onClick={() => setTab('twitter')}
        >
          Analyst Feeds (X)
        </button>
      </div>

      {/* ==================== ARTICLES TAB ==================== */}
      {tab === 'articles' && (
        <>
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
        </>
      )}

      {/* ==================== TWITTER TAB ==================== */}
      {tab === 'twitter' && (
        <div className="news-twitter-layout">
          <div className="news-sidebar">
            <div className="news-sidebar-header">Analysts</div>
            {TWITTER_ACCOUNTS.map(account => (
              <button
                key={account.handle}
                className={`analyst-btn ${selectedAccount.handle === account.handle ? 'active' : ''}`}
                onClick={() => setSelectedAccount(account)}
              >
                <div className="analyst-name">{account.name}</div>
                <div className="analyst-outlet">@{account.handle} &middot; {account.outlet}</div>
              </button>
            ))}
          </div>

          <div className="news-timeline">
            <div className="news-timeline-header">
              <div>
                <strong>{selectedAccount.name}</strong>
                <span className="news-handle">@{selectedAccount.handle}</span>
              </div>
              <a
                href={`https://x.com/${selectedAccount.handle}`}
                target="_blank"
                rel="noopener noreferrer"
                className="news-follow-link"
              >
                View on X
              </a>
            </div>
            <TwitterTimeline
              handle={selectedAccount.handle}
              height={600}
            />
          </div>
        </div>
      )}
    </div>
  )
}

export default News
