import { useState, useRef, useEffect } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { useTheme } from '../context/ThemeContext'

function Navbar() {
  const [isOpen, setIsOpen] = useState(false)
  const [toolsOpen, setToolsOpen] = useState(false)
  const location = useLocation()
  const { theme, toggleTheme } = useTheme()
  const toolsRef = useRef(null)

  const isActive = (path) => location.pathname === path

  // Close tools dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (toolsRef.current && !toolsRef.current.contains(e.target)) {
        setToolsOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  // Close mobile menu on route change
  useEffect(() => {
    setIsOpen(false)
    setToolsOpen(false)
  }, [location.pathname])

  const primaryLinks = [
    { path: '/', label: 'Trade' },
    { path: '/compare', label: 'Compare' },
    { path: '/rookies', label: 'Rookies' },
  ]

  const toolsLinks = [
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
          {/* Primary navigation */}
          {primaryLinks.map(link => (
            <li key={link.path}>
              <Link
                to={link.path}
                className={isActive(link.path) ? 'active' : ''}
              >
                {link.label}
              </Link>
            </li>
          ))}

          {/* Tools dropdown (desktop) */}
          <li className="nav-dropdown" ref={toolsRef}>
            <button
              className={`dropdown-trigger ${toolsLinks.some(l => isActive(l.path)) ? 'active' : ''}`}
              onClick={() => setToolsOpen(!toolsOpen)}
              aria-expanded={toolsOpen}
            >
              Tools
              <span className={`dropdown-arrow ${toolsOpen ? 'open' : ''}`}>▾</span>
            </button>
            {toolsOpen && (
              <ul className="dropdown-menu">
                {toolsLinks.map(link => (
                  <li key={link.path}>
                    <Link
                      to={link.path}
                      className={isActive(link.path) ? 'active' : ''}
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
                <li className="dropdown-divider"></li>
                <li>
                  <a
                    href="https://docs.google.com/spreadsheets/d/1bRV9EeepHqV_irsUySq_9AJdR4lh6nNJHGpdIFlM2Ss/edit?gid=2099268516#gid=2099268516"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="external-link"
                  >
                    Dynasty Sheets
                    <span className="external-icon">↗</span>
                  </a>
                </li>
              </ul>
            )}
          </li>

          {/* Mobile-only: show tools inline */}
          <li className="mobile-only mobile-section-label">Tools</li>
          {toolsLinks.map(link => (
            <li key={`mobile-${link.path}`} className="mobile-only">
              <Link
                to={link.path}
                className={isActive(link.path) ? 'active' : ''}
              >
                {link.label}
              </Link>
            </li>
          ))}
          <li className="mobile-only">
            <a
              href="https://docs.google.com/spreadsheets/d/1bRV9EeepHqV_irsUySq_9AJdR4lh6nNJHGpdIFlM2Ss/edit?gid=2099268516#gid=2099268516"
              target="_blank"
              rel="noopener noreferrer"
            >
              Dynasty Sheets ↗
            </a>
          </li>

          {/* Theme toggle */}
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
