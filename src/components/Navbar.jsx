import { useState, useEffect } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { useTheme } from '../context/ThemeContext'

function Navbar() {
  const [isOpen, setIsOpen] = useState(false)
  const location = useLocation()
  const { theme, toggleTheme } = useTheme()

  const isActive = (path) => location.pathname === path

  // Close mobile menu on route change
  useEffect(() => {
    setIsOpen(false)
  }, [location.pathname])

  const links = [
    { path: '/', label: 'Trade' },
    { path: '/compare', label: 'Compare' },
    { path: '/rookies', label: 'Rookies' },
    { path: '/news', label: 'News' },
    { path: '/weather', label: 'Weather' },
    { path: '/curveball', label: 'Curveball' },
  ]

  return (
    <nav className="navbar">
      <div className="navbar-container">
        <Link to="/" className="navbar-logo">
          <span className="logo-icon">⚡</span>
          <span className="logo-text">Elite Dynasty</span>
        </Link>

        <button
          className="mobile-menu-btn"
          onClick={() => setIsOpen(!isOpen)}
          aria-label="Toggle menu"
          aria-expanded={isOpen}
        >
          <span className={`hamburger ${isOpen ? 'open' : ''}`}>
            <span></span>
            <span></span>
            <span></span>
          </span>
        </button>

        <ul className={`navbar-links ${isOpen ? 'open' : ''}`}>
          {links.map(link => (
            <li key={link.path}>
              <Link
                to={link.path}
                className={isActive(link.path) ? 'active' : ''}
              >
                {link.label}
              </Link>
            </li>
          ))}

          <li className="nav-divider"></li>

          <li>
            <a
              href="https://docs.google.com/spreadsheets/d/1bRV9EeepHqV_irsUySq_9AJdR4lh6nNJHGpdIFlM2Ss/edit?gid=2099268516#gid=2099268516"
              target="_blank"
              rel="noopener noreferrer"
              className="external-link"
            >
              Sheets<span className="external-icon">↗</span>
            </a>
          </li>

          <li className="theme-toggle-wrapper">
            <button
              className="theme-toggle"
              onClick={toggleTheme}
              aria-label="Toggle theme"
              title={`Switch to ${theme === 'light' ? 'dark' : 'light'} mode`}
            >
              {theme === 'light' ? '🌙' : '☀️'}
            </button>
          </li>
        </ul>
      </div>
    </nav>
  )
}

export default Navbar
