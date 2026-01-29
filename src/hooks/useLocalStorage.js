import { useState, useEffect } from 'react'

export function useLocalStorage(key, initialValue) {
  const [storedValue, setStoredValue] = useState(() => {
    try {
      const item = localStorage.getItem(key)
      return item ? JSON.parse(item) : initialValue
    } catch (error) {
      console.error(`Error reading localStorage key "${key}":`, error)
      return initialValue
    }
  })

  useEffect(() => {
    try {
      localStorage.setItem(key, JSON.stringify(storedValue))
    } catch (error) {
      console.error(`Error setting localStorage key "${key}":`, error)
    }
  }, [key, storedValue])

  return [storedValue, setStoredValue]
}

export function useTradeHistory() {
  const [history, setHistory] = useLocalStorage('tradeHistory', [])

  const addTrade = (trade) => {
    const newTrade = {
      ...trade,
      id: Date.now(),
      date: new Date().toISOString()
    }
    setHistory(prev => [newTrade, ...prev].slice(0, 50)) // Keep last 50
  }

  const clearHistory = () => setHistory([])

  const removeTrade = (id) => {
    setHistory(prev => prev.filter(t => t.id !== id))
  }

  return { history, addTrade, clearHistory, removeTrade }
}

export function useWatchlist() {
  const [watchlist, setWatchlist] = useLocalStorage('watchlist', [])

  const addToWatchlist = (playerId) => {
    setWatchlist(prev => [...new Set([...prev, playerId])])
  }

  const removeFromWatchlist = (playerId) => {
    setWatchlist(prev => prev.filter(id => id !== playerId))
  }

  const isWatched = (playerId) => watchlist.includes(playerId)

  const toggleWatchlist = (playerId) => {
    if (isWatched(playerId)) {
      removeFromWatchlist(playerId)
    } else {
      addToWatchlist(playerId)
    }
  }

  return { watchlist, addToWatchlist, removeFromWatchlist, isWatched, toggleWatchlist }
}

export function useLeagueMemory() {
  const [memory, setMemory] = useLocalStorage('leagueMemory', [])

  const addFact = (fact) => {
    const entry = { fact, date: new Date().toISOString() }
    setMemory(prev => [entry, ...prev].slice(0, 50))
  }

  const removeFact = (index) => {
    setMemory(prev => prev.filter((_, i) => i !== index))
  }

  const clearMemory = () => setMemory([])

  return { memory, addFact, removeFact, clearMemory }
}
