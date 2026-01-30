// Curveball Leaderboard API
// Vercel Serverless Function

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')

  if (req.method === 'OPTIONS') {
    return res.status(200).end()
  }

  const supabaseUrl = process.env.SUPABASE_URL
  const supabaseKey = process.env.SUPABASE_ANON_KEY

  if (!supabaseUrl || !supabaseKey) {
    return res.status(500).json({ error: 'Supabase not configured' })
  }

  const headers = {
    'apikey': supabaseKey,
    'Authorization': `Bearer ${supabaseKey}`,
    'Content-Type': 'application/json'
  }

  if (req.method === 'GET') {
    try {
      const response = await fetch(
        `${supabaseUrl}/rest/v1/leaderboard?select=name,score,level,created_at&order=score.desc&limit=10`,
        { headers }
      )

      if (!response.ok) {
        const error = await response.text()
        console.error('Supabase GET error:', error)
        return res.status(500).json({ error: 'Failed to fetch leaderboard' })
      }

      const data = await response.json()
      const entries = data.map(row => ({
        name: row.name,
        score: row.score,
        level: row.level,
        date: new Date(row.created_at).toLocaleDateString()
      }))

      return res.status(200).json({ leaderboard: entries })
    } catch (error) {
      console.error('Leaderboard GET error:', error)
      return res.status(500).json({ error: 'Failed to fetch leaderboard' })
    }
  }

  if (req.method === 'POST') {
    const { name, score, level } = req.body

    if (!name || score == null || level == null) {
      return res.status(400).json({ error: 'name, score, and level are required' })
    }

    try {
      const response = await fetch(
        `${supabaseUrl}/rest/v1/leaderboard`,
        {
          method: 'POST',
          headers: { ...headers, 'Prefer': 'return=representation' },
          body: JSON.stringify({ name, score, level })
        }
      )

      if (!response.ok) {
        const error = await response.text()
        console.error('Supabase POST error:', error)
        return res.status(500).json({ error: 'Failed to save score' })
      }

      const data = await response.json()
      return res.status(201).json({ entry: data[0] })
    } catch (error) {
      console.error('Leaderboard POST error:', error)
      return res.status(500).json({ error: 'Failed to save score' })
    }
  }

  return res.status(405).json({ error: 'Method not allowed' })
}
