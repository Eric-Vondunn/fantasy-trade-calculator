// Local development server for API routes
// Run with: node server.js

import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

// Chat API endpoint
app.post('/api/chat', async (req, res) => {
  const { message, history, context, stream: useStream } = req.body;

  if (!message) {
    return res.status(400).json({ error: 'Message is required' });
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;

  if (!apiKey) {
    return res.status(200).json({
      response: getMockResponse(message)
    });
  }

  const messages = [];

  if (history && Array.isArray(history)) {
    history.forEach(msg => {
      messages.push({
        role: msg.role,
        content: msg.content
      });
    });
  }

  messages.push({
    role: 'user',
    content: message
  });

  if (useStream) {
    // Streaming response via SSE
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');

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
      });

      if (!response.ok) {
        const errorData = await response.json();
        console.error('Claude API error:', errorData);
        res.write(`data: ${JSON.stringify({ type: 'error', error: 'Claude API error' })}\n\n`);
        res.end();
        return;
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = line.slice(6).trim();
            if (data === '[DONE]') continue;

            try {
              const parsed = JSON.parse(data);
              if (parsed.type === 'content_block_delta' && parsed.delta?.text) {
                res.write(`data: ${JSON.stringify({ type: 'delta', text: parsed.delta.text })}\n\n`);
              } else if (parsed.type === 'message_stop') {
                res.write(`data: ${JSON.stringify({ type: 'done' })}\n\n`);
              }
            } catch {}
          }
        }
      }

      res.write(`data: ${JSON.stringify({ type: 'done' })}\n\n`);
      res.end();
    } catch (error) {
      console.error('Chat API stream error:', error);
      res.write(`data: ${JSON.stringify({ type: 'error', text: getMockResponse(message) })}\n\n`);
      res.end();
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
      });

      if (!response.ok) {
        const errorData = await response.json();
        console.error('Claude API error:', errorData);
        throw new Error('Claude API error');
      }

      const data = await response.json();

      res.status(200).json({
        response: data.content[0].text
      });
    } catch (error) {
      console.error('Chat API error:', error);
      res.status(200).json({
        response: getMockResponse(message)
      });
    }
  }
});

// Weather API endpoint
app.get('/api/weather', async (req, res) => {
  const { city } = req.query;

  if (!city) {
    return res.status(400).json({ error: 'City parameter is required' });
  }

  const apiKey = process.env.OPENWEATHERMAP_API_KEY;

  if (!apiKey) {
    return res.status(200).json(getMockWeatherData(city));
  }

  try {
    const currentResponse = await fetch(
      `https://api.openweathermap.org/data/2.5/weather?q=${encodeURIComponent(city)}&units=imperial&appid=${apiKey}`
    );

    if (!currentResponse.ok) {
      if (currentResponse.status === 404) {
        return res.status(404).json({ error: 'City not found' });
      }
      throw new Error('Weather API error');
    }

    const currentData = await currentResponse.json();

    const forecastResponse = await fetch(
      `https://api.openweathermap.org/data/2.5/forecast?q=${encodeURIComponent(city)}&units=imperial&appid=${apiKey}`
    );

    const forecastData = await forecastResponse.json();
    const dailyForecast = processForecast(forecastData.list);

    res.status(200).json({
      current: {
        city: currentData.name,
        temp: currentData.main.temp,
        feelsLike: currentData.main.feels_like,
        humidity: currentData.main.humidity,
        description: currentData.weather[0].description,
        condition: currentData.weather[0].main,
        windSpeed: currentData.wind.speed
      },
      forecast: dailyForecast
    });
  } catch (error) {
    console.error('Weather API error:', error);
    res.status(200).json(getMockWeatherData(city));
  }
});

function processForecast(list) {
  const dailyMap = new Map();

  list.forEach(item => {
    const date = item.dt_txt.split(' ')[0];

    if (!dailyMap.has(date)) {
      dailyMap.set(date, {
        date,
        temps: [],
        conditions: [],
        precipitation: 0,
        windSpeeds: []
      });
    }

    const day = dailyMap.get(date);
    day.temps.push(item.main.temp);
    day.conditions.push(item.weather[0].main);
    day.windSpeeds.push(item.wind.speed);

    if (item.pop) {
      day.precipitation = Math.max(day.precipitation, item.pop * 100);
    }
  });

  return Array.from(dailyMap.values()).slice(0, 7).map(day => ({
    date: day.date,
    high: Math.max(...day.temps),
    low: Math.min(...day.temps),
    condition: getMostCommon(day.conditions),
    precipitation: Math.round(day.precipitation),
    windSpeed: Math.round(day.windSpeeds.reduce((a, b) => a + b, 0) / day.windSpeeds.length)
  }));
}

function getMostCommon(arr) {
  const counts = {};
  arr.forEach(item => {
    counts[item] = (counts[item] || 0) + 1;
  });
  return Object.entries(counts).sort((a, b) => b[1] - a[1])[0][0];
}

function buildSystemPrompt(context) {
  let prompt = `You are a knowledgeable fantasy football assistant for the 2026 NFL season in a 1QB, 0.5 PPR dynasty league format. You help users with:
- Trade analysis and advice (remember: QBs are less valuable in 1QB leagues!)
- Player valuations and rankings
- Lineup decisions and start/sit questions
- Injury updates and news
- Draft strategy
- Waiver wire pickups
- NFL stats, schedules, and matchups

Key context for 1QB 0.5 PPR dynasty:
- RBs and WRs are the most valuable assets
- Only rushing QBs (Allen, Lamar, Hurts, Daniels) maintain significant value
- Pocket passers like Mahomes are good but not elite trade assets
- Pass-catching RBs get a boost (Bijan, Gibbs, Achane, Breece)
- Elite WRs (Chase, Lamb, Jefferson) are the safest long-term assets

Top dynasty assets in 1QB 0.5 PPR:
1. Ja'Marr Chase, CeeDee Lamb, Justin Jefferson (WR)
2. Bijan Robinson, Breece Hall, Jahmyr Gibbs (RB)
3. Josh Allen, Lamar Jackson, Jalen Hurts (rushing QBs)

Be concise, helpful, and provide specific actionable advice. Keep responses under 200 words unless more detail is specifically requested.`;

  if (context) {
    prompt += `\n\n--- USER'S LEAGUE CONTEXT ---`;

    if (context.leagueMemory && context.leagueMemory.length > 0) {
      prompt += `\nLeague Notes:`;
      context.leagueMemory.forEach(item => {
        prompt += `\n- ${item.fact}`;
      });
    }

    if (context.tradeHistory && context.tradeHistory.length > 0) {
      prompt += `\nRecent Trades:`;
      context.tradeHistory.slice(0, 5).forEach(trade => {
        const side1 = trade.side1?.map(p => p.name).join(', ') || 'Unknown';
        const side2 = trade.side2?.map(p => p.name).join(', ') || 'Unknown';
        const date = trade.date ? new Date(trade.date).toLocaleDateString() : '';
        prompt += `\n- Traded ${side1} for ${side2}${date ? ` (${date})` : ''}`;
      });
    }

    if (context.watchlist && context.watchlist.length > 0) {
      prompt += `\nWatchlist: ${context.watchlist.join(', ')}`;
    }

    prompt += `\n\nUse this context to personalize your advice. Reference the user's specific roster, league, and preferences when relevant.`;
  }

  return prompt;
}

function getMockWeatherData(city) {
  const today = new Date();
  const forecast = [];
  const cityLower = city.toLowerCase();

  const coldCities = ['green bay', 'buffalo', 'chicago', 'denver', 'cleveland', 'pittsburgh', 'foxborough', 'new york'];
  const warmCities = ['miami', 'tampa', 'jacksonville', 'new orleans', 'houston'];

  const isCold = coldCities.some(c => cityLower.includes(c));
  const isWarm = warmCities.some(c => cityLower.includes(c));

  const scenarios = [
    { conditions: ['Snow', 'Snow', 'Clouds', 'Clear', 'Clouds', 'Rain', 'Clear'], baseTemp: 25, windBase: 20 },
    { conditions: ['Rain', 'Thunderstorm', 'Rain', 'Drizzle', 'Clouds', 'Clear', 'Clear'], baseTemp: 50, windBase: 12 },
    { conditions: ['Clear', 'Clouds', 'Clear', 'Clouds', 'Clear', 'Clouds', 'Clear'], baseTemp: 45, windBase: 22 },
    { conditions: ['Clear', 'Clear', 'Clouds', 'Clear', 'Clear', 'Clouds', 'Clear'], baseTemp: 65, windBase: 6 },
    { conditions: ['Clear', 'Clouds', 'Snow', 'Snow', 'Clouds', 'Clear', 'Clouds'], baseTemp: 12, windBase: 15 },
  ];

  let scenario;
  if (isCold) {
    scenario = scenarios[Math.random() > 0.5 ? 0 : 4];
  } else if (isWarm) {
    scenario = scenarios[3];
  } else {
    scenario = scenarios[Math.floor(Math.random() * scenarios.length)];
  }

  for (let i = 0; i < 7; i++) {
    const date = new Date(today);
    date.setDate(date.getDate() + i);

    const condition = scenario.conditions[i];
    const tempVariation = Math.random() * 10 - 5;
    const baseTemp = scenario.baseTemp + tempVariation;

    let precipitation = 0;
    if (condition === 'Snow' || condition === 'Thunderstorm') {
      precipitation = Math.round(60 + Math.random() * 35);
    } else if (condition === 'Rain') {
      precipitation = Math.round(50 + Math.random() * 40);
    } else if (condition === 'Drizzle') {
      precipitation = Math.round(30 + Math.random() * 30);
    } else if (condition === 'Clouds') {
      precipitation = Math.round(Math.random() * 25);
    } else {
      precipitation = Math.round(Math.random() * 10);
    }

    const windSpeed = Math.round(scenario.windBase + (Math.random() * 10 - 5));

    forecast.push({
      date: date.toISOString().split('T')[0],
      high: Math.round(baseTemp + 8 + Math.random() * 5),
      low: Math.round(baseTemp - 8 + Math.random() * 5),
      condition: condition,
      precipitation: precipitation,
      windSpeed: Math.max(3, windSpeed)
    });
  }

  const currentCondition = forecast[0].condition;
  const currentDesc = {
    'Clear': 'clear sky',
    'Clouds': 'partly cloudy',
    'Rain': 'moderate rain',
    'Drizzle': 'light drizzle',
    'Thunderstorm': 'thunderstorm',
    'Snow': 'light snow',
    'Mist': 'misty',
    'Fog': 'foggy'
  }[currentCondition] || 'partly cloudy';

  return {
    current: {
      city: city.split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join(' '),
      temp: Math.round((forecast[0].high + forecast[0].low) / 2 + Math.random() * 5),
      feelsLike: Math.round((forecast[0].high + forecast[0].low) / 2 - 3 + Math.random() * 5),
      humidity: Math.round(40 + Math.random() * 35),
      description: currentDesc,
      condition: currentCondition,
      windSpeed: forecast[0].windSpeed
    },
    forecast
  };
}

function getMockResponse(message) {
  const lowerMessage = message.toLowerCase();

  if (lowerMessage.includes('trade') || lowerMessage.includes('value')) {
    return "In 1QB 0.5 PPR dynasty, remember that QBs are less valuable than in Superflex. Focus on elite RBs (Bijan, Breece, Gibbs) and WRs (Chase, Lamb, Jefferson) as your core assets. Only rushing QBs like Josh Allen and Lamar Jackson maintain significant trade value. Use the trade calculator to compare values!";
  }

  if (lowerMessage.includes('allen') && lowerMessage.includes('josh')) {
    return "Josh Allen (BUF, QB) is the #1 QB in 1QB leagues due to his elite rushing. He's the only QB who can approach RB1/WR1 value. In 1QB, he's worth around 6200 - still below elite RBs/WRs but the top QB asset.";
  }

  if (lowerMessage.includes('mahomes')) {
    return "Patrick Mahomes (KC, QB) is still elite but in 1QB leagues, pocket passers are devalued. He's worth around 5200 - a mid-tier asset. You wouldn't trade a top RB or WR for him straight up in 1QB format.";
  }

  if (lowerMessage.includes('chase') || lowerMessage.includes('ja\'marr')) {
    return "Ja'Marr Chase (CIN, WR) is the #1 dynasty asset in 1QB 0.5 PPR. At 26, he's in his prime with elite production. His value (9800) exceeds any QB significantly. He's untouchable in most trades.";
  }

  if (lowerMessage.includes('bijan') || lowerMessage.includes('robinson')) {
    return "Bijan Robinson (ATL, RB) is the top RB in dynasty at 9600 value. His receiving work makes him extra valuable in 0.5 PPR. At 23, he has years of elite production ahead. Only the top 2-3 WRs are worth as much.";
  }

  if (lowerMessage.includes('start') || lowerMessage.includes('sit') || lowerMessage.includes('lineup')) {
    return "For start/sit in 0.5 PPR, prioritize: 1) Target share and receptions, 2) Matchup vs defense, 3) Weather for outdoor games, 4) Recent usage trends. Pass-catching RBs get extra value. Which players are you deciding between?";
  }

  return "I'm your 1QB 0.5 PPR dynasty assistant! I can help with:\n- Trade analysis (RBs/WRs are king, QBs are devalued)\n- Player valuations\n- Start/sit decisions\n- Lineup advice\n\nWhat would you like to know?";
}

// News RSS endpoint
const RSS_FEEDS = {
  espn: { name: 'ESPN Fantasy', url: 'https://www.espn.com/espn/rss/nfl/news', category: 'general' },
  nfl: { name: 'NFL News', url: 'https://www.nfl.com/rss/rsslanding?searchString=home', category: 'breaking' },
  fantasypros: { name: 'FantasyPros', url: 'https://www.fantasypros.com/nfl/rss/news.xml', category: 'general' },
  rotowire: { name: 'RotoWire', url: 'https://www.rotowire.com/rss/nfl.xml', category: 'analytics' },
  cbssports: { name: 'CBS Sports Fantasy', url: 'https://www.cbssports.com/rss/headlines/fantasy', category: 'general' },
};

function extractTag(xml, tag) {
  const regex = new RegExp(`<${tag}[^>]*><!\\[CDATA\\[([\\s\\S]*?)\\]\\]><\\/${tag}>|<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`);
  const match = xml.match(regex);
  if (!match) return '';
  return (match[1] || match[2] || '').trim();
}

function extractItems(xml) {
  const items = [];
  const itemRegex = /<item[\s>]([\s\S]*?)<\/item>/gi;
  let match;
  while ((match = itemRegex.exec(xml)) !== null) {
    const block = match[1];
    const title = extractTag(block, 'title');
    const link = extractTag(block, 'link');
    const description = extractTag(block, 'description');
    const pubDate = extractTag(block, 'pubDate');
    if (title) {
      const cleanDesc = description.replace(/<[^>]*>/g, '').slice(0, 200);
      items.push({ title, link, description: cleanDesc, pubDate });
    }
  }
  return items;
}

app.get('/api/news', async (req, res) => {
  const { source } = req.query;
  const feedKeys = source && RSS_FEEDS[source] ? [source] : Object.keys(RSS_FEEDS);
  const results = [];

  await Promise.allSettled(
    feedKeys.map(async (key) => {
      const feed = RSS_FEEDS[key];
      try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 5000);
        const response = await fetch(feed.url, {
          signal: controller.signal,
          headers: { 'User-Agent': 'FantasyTradeCalculator/1.0', 'Accept': 'application/rss+xml, application/xml, text/xml, */*' },
        });
        clearTimeout(timeout);
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        const xml = await response.text();
        const items = extractItems(xml).slice(0, 10);
        items.forEach(item => {
          results.push({ ...item, source: feed.name, sourceKey: key, category: feed.category });
        });
      } catch (err) {
        console.error(`Failed to fetch ${feed.name}:`, err.message);
      }
    })
  );

  results.sort((a, b) => {
    const da = a.pubDate ? new Date(a.pubDate) : new Date(0);
    const db = b.pubDate ? new Date(b.pubDate) : new Date(0);
    return db - da;
  });

  res.status(200).json({ articles: results });
});

const PORT = 3000;
app.listen(PORT, () => {
  console.log(`API server running on http://localhost:${PORT}`);
  console.log('Anthropic API Key:', process.env.ANTHROPIC_API_KEY ? 'Configured' : 'Not configured (using mock)');
  console.log('Weather API Key:', process.env.OPENWEATHERMAP_API_KEY ? 'Configured' : 'Not configured (using mock)');
});
