import { useState, useEffect } from 'react'
import { Routes, Route } from 'react-router-dom'
import Navbar from './components/Navbar'
import TradeCalculator from './components/TradeCalculator'
import WeatherWidget from './components/WeatherWidget'
import ChatBot from './components/ChatBot'
import Curveball from './components/Curveball'
import PlayerComparison from './components/PlayerComparison'
import News from './components/News'

function App() {
  const [showShortcuts, setShowShortcuts] = useState(false)

  // Global keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === '?' && e.shiftKey) {
        e.preventDefault()
        setShowShortcuts(prev => !prev)
      }
      if (e.key === 'Escape' && showShortcuts) {
        setShowShortcuts(false)
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [showShortcuts])

  return (
    <div className="app">
      <Navbar />
      <main className="main-content">
        <Routes>
          <Route path="/" element={<TradeCalculator />} />
          <Route path="/compare" element={<PlayerComparison />} />
          <Route path="/weather" element={<WeatherWidget />} />
          <Route path="/curveball" element={<Curveball />} />
          <Route path="/news" element={<News />} />
        </Routes>
      </main>
      <ChatBot />

      {showShortcuts && (
        <div className="shortcuts-modal" onClick={() => setShowShortcuts(false)}>
          <div className="shortcuts-content" onClick={e => e.stopPropagation()}>
            <h2>Keyboard Shortcuts</h2>
            <div className="shortcut-item">
              <span>Show/hide this panel</span>
              <div className="shortcut-keys"><kbd>Shift</kbd><kbd>?</kbd></div>
            </div>
            <div className="shortcut-item">
              <span>Search players (in calculator)</span>
              <div className="shortcut-keys"><kbd>/</kbd></div>
            </div>
            <div className="shortcut-item">
              <span>Navigate search results</span>
              <div className="shortcut-keys"><kbd>↑</kbd><kbd>↓</kbd></div>
            </div>
            <div className="shortcut-item">
              <span>Select player</span>
              <div className="shortcut-keys"><kbd>Enter</kbd></div>
            </div>
            <div className="shortcut-item">
              <span>Close search / dialogs</span>
              <div className="shortcut-keys"><kbd>Esc</kbd></div>
            </div>
            <div className="shortcut-item">
              <span>Undo last action</span>
              <div className="shortcut-keys"><kbd>Ctrl</kbd><kbd>Z</kbd></div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default App
