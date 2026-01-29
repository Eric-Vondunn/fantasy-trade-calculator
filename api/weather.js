// Weather API Proxy for OpenWeatherMap
// Vercel Serverless Function

export default async function handler(req, res) {
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')

  if (req.method === 'OPTIONS') {
    return res.status(200).end()
  }

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const { city } = req.query

  if (!city) {
    return res.status(400).json({ error: 'City parameter is required' })
  }

  const apiKey = process.env.OPENWEATHERMAP_API_KEY

  if (!apiKey) {
    // Return mock data if no API key is configured
    return res.status(200).json(getMockWeatherData(city))
  }

  try {
    // Get current weather
    const currentResponse = await fetch(
      `https://api.openweathermap.org/data/2.5/weather?q=${encodeURIComponent(city)}&units=imperial&appid=${apiKey}`
    )

    if (!currentResponse.ok) {
      if (currentResponse.status === 404) {
        return res.status(404).json({ error: 'City not found' })
      }
      throw new Error('Weather API error')
    }

    const currentData = await currentResponse.json()

    // Get 5-day forecast (OpenWeatherMap free tier)
    const forecastResponse = await fetch(
      `https://api.openweathermap.org/data/2.5/forecast?q=${encodeURIComponent(city)}&units=imperial&appid=${apiKey}`
    )

    const forecastData = await forecastResponse.json()

    // Process forecast to get daily data
    const dailyForecast = processForecast(forecastData.list)

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
    })
  } catch (error) {
    console.error('Weather API error:', error)
    // Return mock data on error
    res.status(200).json(getMockWeatherData(city))
  }
}

function processForecast(list) {
  const dailyMap = new Map()

  list.forEach(item => {
    const date = item.dt_txt.split(' ')[0]

    if (!dailyMap.has(date)) {
      dailyMap.set(date, {
        date,
        temps: [],
        conditions: [],
        precipitation: 0,
        windSpeeds: []
      })
    }

    const day = dailyMap.get(date)
    day.temps.push(item.main.temp)
    day.conditions.push(item.weather[0].main)
    day.windSpeeds.push(item.wind.speed)

    if (item.pop) {
      day.precipitation = Math.max(day.precipitation, item.pop * 100)
    }
  })

  return Array.from(dailyMap.values()).slice(0, 7).map(day => ({
    date: day.date,
    high: Math.max(...day.temps),
    low: Math.min(...day.temps),
    condition: getMostCommon(day.conditions),
    precipitation: Math.round(day.precipitation),
    windSpeed: Math.round(day.windSpeeds.reduce((a, b) => a + b, 0) / day.windSpeeds.length)
  }))
}

function getMostCommon(arr) {
  const counts = {}
  arr.forEach(item => {
    counts[item] = (counts[item] || 0) + 1
  })
  return Object.entries(counts).sort((a, b) => b[1] - a[1])[0][0]
}

function getMockWeatherData(city) {
  const today = new Date()
  const forecast = []
  const cityLower = city.toLowerCase()

  // Create realistic mock weather based on city
  // Cold weather cities
  const coldCities = ['green bay', 'buffalo', 'chicago', 'denver', 'cleveland', 'pittsburgh', 'foxborough', 'new york']
  // Warm weather cities
  const warmCities = ['miami', 'tampa', 'jacksonville', 'new orleans', 'houston']

  const isCold = coldCities.some(c => cityLower.includes(c))
  const isWarm = warmCities.some(c => cityLower.includes(c))

  // Simulate different weather scenarios for testing
  const scenarios = [
    // Scenario 1: Cold with snow (good for testing blizzard logic)
    { conditions: ['Snow', 'Snow', 'Clouds', 'Clear', 'Clouds', 'Rain', 'Clear'], baseTemp: 25, windBase: 20 },
    // Scenario 2: Rainy week
    { conditions: ['Rain', 'Thunderstorm', 'Rain', 'Drizzle', 'Clouds', 'Clear', 'Clear'], baseTemp: 50, windBase: 12 },
    // Scenario 3: Windy conditions
    { conditions: ['Clear', 'Clouds', 'Clear', 'Clouds', 'Clear', 'Clouds', 'Clear'], baseTemp: 45, windBase: 22 },
    // Scenario 4: Perfect weather
    { conditions: ['Clear', 'Clear', 'Clouds', 'Clear', 'Clear', 'Clouds', 'Clear'], baseTemp: 65, windBase: 6 },
    // Scenario 5: Extreme cold
    { conditions: ['Clear', 'Clouds', 'Snow', 'Snow', 'Clouds', 'Clear', 'Clouds'], baseTemp: 12, windBase: 15 },
  ]

  // Pick scenario based on city or random
  let scenario
  if (isCold) {
    scenario = scenarios[Math.random() > 0.5 ? 0 : 4] // Cold or extreme cold
  } else if (isWarm) {
    scenario = scenarios[3] // Perfect weather for warm cities
  } else {
    scenario = scenarios[Math.floor(Math.random() * scenarios.length)]
  }

  for (let i = 0; i < 7; i++) {
    const date = new Date(today)
    date.setDate(date.getDate() + i)

    const condition = scenario.conditions[i]
    const tempVariation = Math.random() * 10 - 5
    const baseTemp = scenario.baseTemp + tempVariation

    // Weather-appropriate precipitation chances
    let precipitation = 0
    if (condition === 'Snow' || condition === 'Thunderstorm') {
      precipitation = Math.round(60 + Math.random() * 35)
    } else if (condition === 'Rain') {
      precipitation = Math.round(50 + Math.random() * 40)
    } else if (condition === 'Drizzle') {
      precipitation = Math.round(30 + Math.random() * 30)
    } else if (condition === 'Clouds') {
      precipitation = Math.round(Math.random() * 25)
    } else {
      precipitation = Math.round(Math.random() * 10)
    }

    // Wind variation
    const windSpeed = Math.round(scenario.windBase + (Math.random() * 10 - 5))

    forecast.push({
      date: date.toISOString().split('T')[0],
      high: Math.round(baseTemp + 8 + Math.random() * 5),
      low: Math.round(baseTemp - 8 + Math.random() * 5),
      condition: condition,
      precipitation: precipitation,
      windSpeed: Math.max(3, windSpeed) // Minimum 3 mph
    })
  }

  // Current weather matches first forecast day
  const currentCondition = forecast[0].condition
  const currentDesc = {
    'Clear': 'clear sky',
    'Clouds': 'partly cloudy',
    'Rain': 'moderate rain',
    'Drizzle': 'light drizzle',
    'Thunderstorm': 'thunderstorm',
    'Snow': 'light snow',
    'Mist': 'misty',
    'Fog': 'foggy'
  }[currentCondition] || 'partly cloudy'

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
  }
}
