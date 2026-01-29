import { useState, useRef, useEffect, useCallback } from 'react'
import { useLocalStorage, useLeagueMemory } from '../hooks/useLocalStorage'
import { getPlayerById } from '../data/players'

const WELCOME_MESSAGE = {
  role: 'assistant',
  content: "Hi! I'm your Fantasy Football AI assistant. Ask me about trade advice, player stats, lineup decisions, or anything else about the 2026 NFL season! Tip: Use /remember to save league notes (e.g. \"/remember My team name is Dynasty Destroyers\")."
}

function ChatBot() {
  const [isOpen, setIsOpen] = useState(false)
  const [chatHistory, setChatHistory] = useLocalStorage('chatHistory', [WELCOME_MESSAGE])
  const [input, setInput] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [streamingContent, setStreamingContent] = useState('')
  const [showMemory, setShowMemory] = useState(false)
  const [memoryInput, setMemoryInput] = useState('')
  const [copyFeedback, setCopyFeedback] = useState(false)
  const messagesEndRef = useRef(null)
  const abortRef = useRef(null)

  const { memory, addFact, removeFact } = useLeagueMemory()

  // Read trade history and watchlist from localStorage directly
  const getTradeHistory = () => {
    try {
      return JSON.parse(localStorage.getItem('tradeHistory')) || []
    } catch { return [] }
  }

  const getWatchlistNames = () => {
    try {
      const ids = JSON.parse(localStorage.getItem('watchlist')) || []
      return ids.map(id => {
        const player = getPlayerById(id)
        return player ? player.name : `Player #${id}`
      })
    } catch { return [] }
  }

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  useEffect(() => {
    scrollToBottom()
  }, [chatHistory, streamingContent])

  const addMessage = useCallback((msg) => {
    setChatHistory(prev => {
      const updated = [...prev, msg]
      return updated.length > 50 ? updated.slice(updated.length - 50) : updated
    })
  }, [setChatHistory])

  const clearChat = () => {
    setChatHistory([WELCOME_MESSAGE])
  }

  // Build suggested prompts based on current context
  const getSuggestions = () => {
    const suggestions = []
    const watchlistNames = getWatchlistNames()
    const trades = getTradeHistory()

    if (watchlistNames.length > 0) {
      suggestions.push({ label: 'Analyze my watchlist', prompt: 'Analyze the players on my watchlist. Who should I prioritize targeting and why?' })
    }
    if (trades.length > 0) {
      suggestions.push({ label: 'Rate my last trade', prompt: 'Look at my most recent trade. Did I win or lose that deal?' })
    }
    if (memory.length > 0) {
      suggestions.push({ label: 'Roster advice', prompt: 'Based on what you know about my team, what moves should I make to improve?' })
    }

    // Always-available suggestions to fill remaining slots
    const defaults = [
      { label: 'Who should I trade?', prompt: 'Who are the best sell-high candidates in dynasty right now?' },
      { label: 'Buy low targets', prompt: 'Who are the best buy-low dynasty targets right now?' },
      { label: 'Rebuild strategy', prompt: 'What does a good rebuild strategy look like in dynasty? What kind of players should I target?' },
      { label: 'Top rookies', prompt: 'Who are the top rookies to target in dynasty leagues this year?' },
    ]

    for (const d of defaults) {
      if (suggestions.length >= 4) break
      if (!suggestions.some(s => s.label === d.label)) {
        suggestions.push(d)
      }
    }

    return suggestions.slice(0, 4)
  }

  const handleExport = async () => {
    const text = chatHistory
      .map(msg => {
        const prefix = msg.role === 'user' ? 'You' : 'AI'
        return `${prefix}: ${msg.content}`
      })
      .join('\n\n')

    const header = `Fantasy AI Chat Export - ${new Date().toLocaleDateString()}\n${'='.repeat(50)}\n\n`

    try {
      await navigator.clipboard.writeText(header + text)
      setCopyFeedback(true)
      setTimeout(() => setCopyFeedback(false), 2000)
    } catch {
      // Fallback for older browsers
      const textarea = document.createElement('textarea')
      textarea.value = header + text
      document.body.appendChild(textarea)
      textarea.select()
      document.execCommand('copy')
      document.body.removeChild(textarea)
      setCopyFeedback(true)
      setTimeout(() => setCopyFeedback(false), 2000)
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!input.trim() || isLoading) return
    sendMessage(input.trim())
  }

  const sendMessage = async (userMessage) => {
    setInput('')

    // Handle /remember command
    if (userMessage.toLowerCase().startsWith('/remember ')) {
      const fact = userMessage.slice(10).trim()
      if (fact) {
        addFact(fact)
        addMessage({ role: 'user', content: userMessage })
        addMessage({
          role: 'assistant',
          content: `Saved to memory: "${fact}". I'll reference this in future conversations.`
        })
      }
      return
    }

    addMessage({ role: 'user', content: userMessage })
    setIsLoading(true)
    setStreamingContent('')

    const context = {
      leagueMemory: memory,
      tradeHistory: getTradeHistory(),
      watchlist: getWatchlistNames()
    }

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: userMessage,
          history: chatHistory.slice(-10),
          context,
          stream: true
        })
      })

      const contentType = response.headers.get('content-type') || ''

      if (contentType.includes('text/event-stream')) {
        // Handle SSE streaming
        const reader = response.body.getReader()
        const decoder = new TextDecoder()
        let accumulated = ''
        let buffer = ''

        while (true) {
          const { done, value } = await reader.read()
          if (done) break

          buffer += decoder.decode(value, { stream: true })
          const lines = buffer.split('\n')
          buffer = lines.pop() || ''

          for (const line of lines) {
            if (line.startsWith('data: ')) {
              try {
                const parsed = JSON.parse(line.slice(6))
                if (parsed.type === 'delta' && parsed.text) {
                  accumulated += parsed.text
                  setStreamingContent(accumulated)
                } else if (parsed.type === 'error' && parsed.text) {
                  // Mock fallback from server error
                  accumulated = parsed.text
                  setStreamingContent(accumulated)
                } else if (parsed.type === 'done') {
                  break
                }
              } catch {}
            }
          }
        }

        if (accumulated) {
          addMessage({ role: 'assistant', content: accumulated })
        }
        setStreamingContent('')
      } else {
        // Non-streaming JSON response (mock mode)
        const data = await response.json()
        if (!response.ok) {
          throw new Error(data.error || 'Failed to get response')
        }
        addMessage({ role: 'assistant', content: data.response })
      }
    } catch (error) {
      addMessage({
        role: 'assistant',
        content: "I'm sorry, I encountered an error. Please make sure the API is configured correctly and try again."
      })
      setStreamingContent('')
    } finally {
      setIsLoading(false)
    }
  }

  const handleAddMemory = (e) => {
    e.preventDefault()
    const fact = memoryInput.trim()
    if (fact) {
      addFact(fact)
      setMemoryInput('')
    }
  }

  const handleSuggestionClick = (prompt) => {
    if (isLoading) return
    sendMessage(prompt)
  }

  const suggestions = getSuggestions()
  const showSuggestions = !isLoading && chatHistory.length <= 1

  return (
    <>
      {/* Chat Button */}
      <button
        className="chatbot-button"
        onClick={() => setIsOpen(!isOpen)}
        aria-label={isOpen ? 'Close chat' : 'Open chat'}
      >
        {isOpen ? '\u2715' : '\uD83D\uDCAC'}
      </button>

      {/* Chat Window */}
      {isOpen && (
        <div className="chatbot-window">
          <div className="chatbot-header">
            <h3>Fantasy AI Assistant</h3>
            <div className="chatbot-header-actions">
              <button
                className="chatbot-header-btn"
                onClick={() => setShowMemory(!showMemory)}
                aria-label="Toggle memory panel"
                title="League Memory"
              >
                {showMemory ? '\u2716' : '\uD83E\uDDE0'}
              </button>
              <button
                className={`chatbot-header-btn${copyFeedback ? ' copy-success' : ''}`}
                onClick={handleExport}
                aria-label="Export chat"
                title={copyFeedback ? 'Copied!' : 'Export Chat'}
              >
                {copyFeedback ? '\u2713' : '\uD83D\uDCCB'}
              </button>
              <button
                className="chatbot-header-btn"
                onClick={clearChat}
                aria-label="Clear chat"
                title="Clear Chat"
              >
                {'\uD83D\uDDD1'}
              </button>
              <button
                className="chatbot-close"
                onClick={() => setIsOpen(false)}
                aria-label="Close chat"
              >
                &times;
              </button>
            </div>
          </div>

          {/* Memory Panel */}
          {showMemory && (
            <div className="chatbot-memory-panel">
              <div className="memory-panel-header">
                <strong>League Memory ({memory.length}/50)</strong>
              </div>
              {memory.length === 0 ? (
                <p className="memory-empty">No saved facts yet. Add notes about your league, roster, or preferences.</p>
              ) : (
                <ul className="memory-list">
                  {memory.map((item, index) => (
                    <li key={index} className="memory-item">
                      <span>{item.fact}</span>
                      <button
                        className="memory-remove"
                        onClick={() => removeFact(index)}
                        aria-label="Remove fact"
                      >
                        &times;
                      </button>
                    </li>
                  ))}
                </ul>
              )}
              <form className="memory-add-form" onSubmit={handleAddMemory}>
                <input
                  type="text"
                  value={memoryInput}
                  onChange={(e) => setMemoryInput(e.target.value)}
                  placeholder="Add a league note..."
                />
                <button type="submit" disabled={!memoryInput.trim()}>+</button>
              </form>
            </div>
          )}

          <div className="chatbot-messages">
            {chatHistory.map((msg, index) => (
              <div
                key={index}
                className={`chat-message ${msg.role}`}
              >
                {msg.content}
              </div>
            ))}

            {streamingContent && (
              <div className="chat-message assistant streaming">
                {streamingContent}
                <span className="streaming-cursor" />
              </div>
            )}

            {isLoading && !streamingContent && (
              <div className="chat-message assistant typing">
                Thinking...
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Suggested Prompts */}
          {showSuggestions && (
            <div className="chatbot-suggestions">
              {suggestions.map((s, i) => (
                <button
                  key={i}
                  className="suggestion-chip"
                  onClick={() => handleSuggestionClick(s.prompt)}
                  disabled={isLoading}
                >
                  {s.label}
                </button>
              ))}
            </div>
          )}

          <form className="chatbot-input" onSubmit={handleSubmit}>
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask about trades, players... or /remember"
              disabled={isLoading}
            />
            <button type="submit" disabled={isLoading || !input.trim()}>
              Send
            </button>
          </form>
        </div>
      )}
    </>
  )
}

export default ChatBot
