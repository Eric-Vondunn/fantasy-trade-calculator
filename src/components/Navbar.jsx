import { useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { useTheme } from '../context/ThemeContext'

function Navbar() {
  const [isOpen, setIsOpen] = useState(false)
  const location = useLocation()
  const { theme, toggleTheme } = useTheme()

  const isActive = (path) => location.pathname === path

  return (
    <nav className="navbar">
      <div className="navbar-container">
        <Link to="/" className="navbar-logo">
          Elite Dynasty Trade Calculator
        </Link>

        <button
          className="mobile-menu-btn"
          onClick={() => setIsOpen(!isOpen)}
          aria-label="Toggle menu"
        >
          {isOpen ? '\u2715' : '\u2630'}
        </button>

        <ul className={`navbar-links ${isOpen ? 'open' : ''}`}>
          <li>
            <Link
              to="/"
              className={isActive('/') ? 'active' : ''}
              onClick={() => setIsOpen(false)}
            >
              Trade Calculator
            </Link>
          </li>
          <li>
            <Link
              to="/compare"
              className={isActive('/compare') ? 'active' : ''}
              onClick={() => setIsOpen(false)}
            >
              Compare
            </Link>
          </li>
          <li>
            <Link
              to="/rookies"
              className={isActive('/rookies') ? 'active' : ''}
              onClick={() => setIsOpen(false)}
            >
              Rookies
            </Link>
          </li>
          <li>
            <Link
              to="/weather"
              className={isActive('/weather') ? 'active' : ''}
              onClick={() => setIsOpen(false)}
            >
              Weather
            </Link>
          </li>
          <li>
            <Link
              to="/news"
              className={isActive('/news') ? 'active' : ''}
              onClick={() => setIsOpen(false)}
            >
              News
            </Link>
          </li>
          <li>
            <Link
              to="/curveball"
              className={isActive('/curveball') ? 'active' : ''}
              onClick={() => setIsOpen(false)}
            >
              Curveball
            </Link>
          </li>
          <li>
            <a
              href="https://docs.google.com/spreadsheets/d/1bRV9EeepHqV_irsUySq_9AJdR4lh6nNJHGpdIFlM2Ss/edit?gid=2099268516#gid=2099268516"
              target="_blank"
              rel="noopener noreferrer"
              onClick={() => setIsOpen(false)}
            >
              Elite Dynasty Sheets
            </a>
          </li>
          <li>
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
