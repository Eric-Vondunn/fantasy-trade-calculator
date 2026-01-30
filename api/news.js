const RSS_FEEDS = {
  espn: {
    name: 'ESPN Fantasy',
    url: 'https://www.espn.com/espn/rss/nfl/news',
    category: 'general',
  },
  nfl: {
    name: 'NFL News',
    url: 'https://www.nfl.com/rss/rsslanding?searchString=home',
    category: 'breaking',
  },
  fantasypros: {
    name: 'FantasyPros',
    url: 'https://www.fantasypros.com/nfl/rss/news.xml',
    category: 'general',
  },
  rotowire: {
    name: 'RotoWire',
    url: 'https://www.rotowire.com/rss/nfl.xml',
    category: 'analytics',
  },
  bleacher: {
    name: 'Bleacher Report',
    url: 'https://bleacherreport.com/articles/feed',
    category: 'general',
  },
  pff: {
    name: 'PFF',
    url: 'https://www.pff.com/rss/nfl.xml',
    category: 'analytics',
  },
  cbssports: {
    name: 'CBS Sports Fantasy',
    url: 'https://www.cbssports.com/rss/headlines/fantasy',
    category: 'general',
  },
}

// Simple XML tag extractor (no dependency needed)
function extractTag(xml, tag) {
  const regex = new RegExp(`<${tag}[^>]*><!\\[CDATA\\[([\\s\\S]*?)\\]\\]><\\/${tag}>|<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`)
  const match = xml.match(regex)
  if (!match) return ''
  return (match[1] || match[2] || '').trim()
}

function extractItems(xml) {
  const items = []
  const itemRegex = /<item[\s>]([\s\S]*?)<\/item>/gi
  let match
  while ((match = itemRegex.exec(xml)) !== null) {
    const block = match[1]
    const title = extractTag(block, 'title')
    const link = extractTag(block, 'link')
    const description = extractTag(block, 'description')
    const pubDate = extractTag(block, 'pubDate')

    if (title) {
      // Strip HTML from description
      const cleanDesc = description.replace(/<[^>]*>/g, '').slice(0, 200)
      items.push({ title, link, description: cleanDesc, pubDate })
    }
  }
  return items
}

export default async function handler(req, res) {
  const { source } = req.query

  // If a specific source is requested
  const feedKeys = source && RSS_FEEDS[source] ? [source] : Object.keys(RSS_FEEDS)

  const results = []

  await Promise.allSettled(
    feedKeys.map(async (key) => {
      const feed = RSS_FEEDS[key]
      try {
        const controller = new AbortController()
        const timeout = setTimeout(() => controller.abort(), 5000)

        const response = await fetch(feed.url, {
          signal: controller.signal,
          headers: {
            'User-Agent': 'FantasyTradeCalculator/1.0',
            'Accept': 'application/rss+xml, application/xml, text/xml, */*',
          },
        })
        clearTimeout(timeout)

        if (!response.ok) throw new Error(`HTTP ${response.status}`)

        const xml = await response.text()
        const items = extractItems(xml).slice(0, 10)

        items.forEach(item => {
          results.push({
            ...item,
            source: feed.name,
            sourceKey: key,
            category: feed.category,
          })
        })
      } catch (err) {
        // Silently skip failed feeds
        console.error(`Failed to fetch ${feed.name}:`, err.message)
      }
    })
  )

  // Sort by date (newest first)
  results.sort((a, b) => {
    const da = a.pubDate ? new Date(a.pubDate) : new Date(0)
    const db = b.pubDate ? new Date(b.pubDate) : new Date(0)
    return db - da
  })

  res.status(200).json({ articles: results })
}
