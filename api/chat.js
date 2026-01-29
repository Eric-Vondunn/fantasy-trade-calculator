// Claude AI Chat API
// Vercel Serverless Function

export default async function handler(req, res) {
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')

  if (req.method === 'OPTIONS') {
    return res.status(200).end()
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const { message, history, context, stream: useStream } = req.body

  if (!message) {
    return res.status(400).json({ error: 'Message is required' })
  }

  const apiKey = process.env.ANTHROPIC_API_KEY

  if (!apiKey) {
    // Return mock response if no API key (no streaming for mock)
    return res.status(200).json({
      response: getMockResponse(message)
    })
  }

  // Build messages array from history
  const messages = []

  if (history && Array.isArray(history)) {
    history.forEach(msg => {
      messages.push({
        role: msg.role,
        content: msg.content
      })
    })
  }

  // Add the current message
  messages.push({
    role: 'user',
    content: message
  })

  if (useStream) {
    // Streaming response via SSE
    res.setHeader('Content-Type', 'text/event-stream')
    res.setHeader('Cache-Control', 'no-cache')
    res.setHeader('Connection', 'keep-alive')

    try {
      const response = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': apiKey,
          'anthropic-version': '2023-06-01'
        },
        body: JSON.stringify({
          model: 'claude-sonnet-4-20250514',
          max_tokens: 1024,
          stream: true,
          system: buildSystemPrompt(context),
          messages: messages
        })
      })

      if (!response.ok) {
        const errorData = await response.json()
        console.error('Claude API error:', errorData)
        res.write(`data: ${JSON.stringify({ type: 'error', error: 'Claude API error' })}\n\n`)
        res.end()
        return
      }

      const reader = response.body.getReader()
      const decoder = new TextDecoder()
      let buffer = ''

      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        buffer += decoder.decode(value, { stream: true })
        const lines = buffer.split('\n')
        buffer = lines.pop() || ''

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = line.slice(6).trim()
            if (data === '[DONE]') continue

            try {
              const parsed = JSON.parse(data)
              if (parsed.type === 'content_block_delta' && parsed.delta?.text) {
                res.write(`data: ${JSON.stringify({ type: 'delta', text: parsed.delta.text })}\n\n`)
              } else if (parsed.type === 'message_stop') {
                res.write(`data: ${JSON.stringify({ type: 'done' })}\n\n`)
              }
            } catch {}
          }
        }
      }

      res.write(`data: ${JSON.stringify({ type: 'done' })}\n\n`)
      res.end()
    } catch (error) {
      console.error('Chat API stream error:', error)
      res.write(`data: ${JSON.stringify({ type: 'error', text: getMockResponse(message) })}\n\n`)
      res.end()
    }
  } else {
    // Non-streaming response (fallback)
    try {
      const response = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': apiKey,
          'anthropic-version': '2023-06-01'
        },
        body: JSON.stringify({
          model: 'claude-sonnet-4-20250514',
          max_tokens: 1024,
          system: buildSystemPrompt(context),
          messages: messages
        })
      })

      if (!response.ok) {
        const errorData = await response.json()
        console.error('Claude API error:', errorData)
        throw new Error('Claude API error')
      }

      const data = await response.json()

      res.status(200).json({
        response: data.content[0].text
      })
    } catch (error) {
      console.error('Chat API error:', error)
      res.status(200).json({
        response: getMockResponse(message)
      })
    }
  }
}

function buildSystemPrompt(context) {
  let prompt = `You are a knowledgeable fantasy football assistant for the 2026 NFL season. You help users with:
- Trade analysis and advice
- Player valuations and rankings
- Lineup decisions and start/sit questions
- Injury updates and news
- Draft strategy
- Waiver wire pickups
- NFL stats, schedules, and matchups

Be concise, helpful, and provide specific actionable advice. Reference current 2026 season information when relevant. If asked about specific players, provide their team, position, and recent performance context.

Important context for 2026:
- Patrick Mahomes remains the top dynasty QB
- Young stars like C.J. Stroud, Caleb Williams, and Jayden Daniels are rising
- Ja'Marr Chase and CeeDee Lamb lead the WR rankings
- Bijan Robinson is the top dynasty RB
- Sam LaPorta and Brock Bowers lead the TE position

Keep responses focused and under 200 words unless more detail is specifically requested.`

  if (context) {
    prompt += `\n\n--- USER'S LEAGUE CONTEXT ---`

    if (context.leagueMemory && context.leagueMemory.length > 0) {
      prompt += `\nLeague Notes:`
      context.leagueMemory.forEach(item => {
        prompt += `\n- ${item.fact}`
      })
    }

    if (context.tradeHistory && context.tradeHistory.length > 0) {
      prompt += `\nRecent Trades:`
      context.tradeHistory.slice(0, 5).forEach(trade => {
        const side1 = trade.side1?.map(p => p.name).join(', ') || 'Unknown'
        const side2 = trade.side2?.map(p => p.name).join(', ') || 'Unknown'
        const date = trade.date ? new Date(trade.date).toLocaleDateString() : ''
        prompt += `\n- Traded ${side1} for ${side2}${date ? ` (${date})` : ''}`
      })
    }

    if (context.watchlist && context.watchlist.length > 0) {
      prompt += `\nWatchlist: ${context.watchlist.join(', ')}`
    }

    prompt += `\n\nUse this context to personalize your advice. Reference the user's specific roster, league, and preferences when relevant.`
  }

  return prompt
}

function getMockResponse(message) {
  const lowerMessage = message.toLowerCase()

  // Trade related
  if (lowerMessage.includes('trade') || lowerMessage.includes('value')) {
    return "When evaluating trades, consider: 1) Dynasty value rankings from multiple sources, 2) Age and contract status, 3) Team situation and opportunity, 4) Your team's needs (competing vs rebuilding). Use the trade calculator on this site to compare values!"
  }

  // Player specific
  if (lowerMessage.includes('mahomes')) {
    return "Patrick Mahomes (KC, QB) remains the top dynasty QB heading into 2026. At 30, he's still in his prime with elite rushing upside. His contract runs through 2031. He's a cornerstone piece for any contending team."
  }

  if (lowerMessage.includes('chase') || lowerMessage.includes('ja\'marr')) {
    return "Ja'Marr Chase (CIN, WR) is the #1 dynasty WR. At 26, he's entering his prime years with elite production. He just signed a major extension and his chemistry with Joe Burrow is unmatched. Buy if possible."
  }

  if (lowerMessage.includes('bijan') || lowerMessage.includes('robinson')) {
    return "Bijan Robinson (ATL, RB) tops the dynasty RB rankings. At 23, he's a rare three-down back with elite receiving skills. He's the safest RB asset in dynasty due to his age and talent."
  }

  // Lineup help
  if (lowerMessage.includes('start') || lowerMessage.includes('sit') || lowerMessage.includes('lineup')) {
    return "For lineup decisions, I'd need specific players to compare. Generally, prioritize: 1) Matchup (check opponent defense rankings), 2) Weather conditions for outdoor games, 3) Recent usage trends, 4) Injury status. What players are you deciding between?"
  }

  // Waiver/pickup
  if (lowerMessage.includes('waiver') || lowerMessage.includes('pickup') || lowerMessage.includes('add')) {
    return "Top waiver priorities depend on your league's available players. Look for: 1) Backup RBs behind injury-prone starters, 2) WRs seeing increased targets, 3) Emerging young TEs, 4) Streaming QBs with good matchups. What positions do you need help with?"
  }

  // Default response
  return "I'm here to help with your fantasy football questions! Ask me about:\n- Trade analysis and player values\n- Start/sit decisions\n- Player news and updates\n- Draft strategy\n- Waiver wire pickups\n\nWhat would you like to know?"
}
