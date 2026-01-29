import { useState, useEffect, useRef, useCallback } from 'react'

function Curveball() {
  const canvasRef = useRef(null)
  const gameStateRef = useRef(null)
  const animationRef = useRef(null)
  const gameStatusRef = useRef('menu')
  const scoreRef = useRef(0)
  const levelRef = useRef(1)
  const livesRef = useRef(3)
  const gameLoopRef = useRef(null)

  const [gameStatus, setGameStatus] = useState('menu')
  const [score, setScore] = useState(0)
  const [level, setLevel] = useState(1)
  const [playerLives, setPlayerLives] = useState(3)
  const [leaderboard, setLeaderboard] = useState([])
  const [playerName, setPlayerName] = useState('')
  const [finalScore, setFinalScore] = useState(0)

  // Keep gameStatusRef in sync
  useEffect(() => {
    gameStatusRef.current = gameStatus
  }, [gameStatus])

  // Load leaderboard from localStorage
  useEffect(() => {
    const saved = localStorage.getItem('curveballLeaderboard')
    if (saved) {
      setLeaderboard(JSON.parse(saved))
    }
  }, [])

  // Save leaderboard to localStorage
  const saveLeaderboard = (newLeaderboard) => {
    localStorage.setItem('curveballLeaderboard', JSON.stringify(newLeaderboard))
    setLeaderboard(newLeaderboard)
  }

  // Check if score qualifies for leaderboard
  const isHighScoreCheck = useCallback((checkScore) => {
    const saved = localStorage.getItem('curveballLeaderboard')
    const board = saved ? JSON.parse(saved) : []
    if (board.length < 10) return true
    return checkScore > board[board.length - 1].score
  }, [])

  // Add score to leaderboard
  const addToLeaderboard = (name, newScore) => {
    const newEntry = {
      name: name.trim() || 'Anonymous',
      score: newScore,
      date: new Date().toLocaleDateString(),
      level: levelRef.current
    }
    const newLeaderboard = [...leaderboard, newEntry]
      .sort((a, b) => b.score - a.score)
      .slice(0, 10)
    saveLeaderboard(newLeaderboard)
    setGameStatus('menu')
    setPlayerName('')
  }

  // Initialize game state
  const initGame = useCallback(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const width = canvas.width
    const height = canvas.height
    const currentLevel = levelRef.current

    gameStateRef.current = {
      // Court dimensions (3D space)
      courtDepth: 800,
      courtWidth: 400,
      courtHeight: 300,

      // Ball — curveX/curveY are acceleration applied to vx/vy each frame
      ball: {
        x: 0,
        y: 0,
        z: 400,
        vx: 0,
        vy: 0,
        vz: -8,
        radius: 15,
        curveX: 0,
        curveY: 0
      },

      // Player paddle (near side, z = 0)
      player: {
        x: 0,
        y: 0,
        prevX: 0,
        prevY: 0,
        width: 80,
        height: 60
      },

      // AI paddle (far side, z = courtDepth)
      ai: {
        x: 0,
        y: 0,
        prevX: 0,
        prevY: 0,
        width: Math.max(40, 90 - currentLevel * 4),
        height: Math.max(30, 70 - currentLevel * 3),
        speed: 1.5 + currentLevel * 0.4,
        lives: 3
      },

      // Mouse position
      mouse: {
        x: width / 2,
        y: height / 2
      },

      // Game settings — maxCurve multiplies paddle velocity into lateral ball speed
      ballSpeed: 4 + currentLevel * 0.8,
      maxCurve: 0.3 + currentLevel * 0.06,

      // Prevent double-hit on same paddle traversal
      lastHit: null
    }
  }, [])

  // Reset ball toward a target side ('player' or 'ai')
  function resetBall(state, toward) {
    const speed = state.ballSpeed
    if (toward === 'player') {
      state.ball = {
        x: (Math.random() - 0.5) * state.courtWidth * 0.4,
        y: (Math.random() - 0.5) * state.courtHeight * 0.4,
        z: state.courtDepth - 100,
        vx: 0, vy: 0, vz: -speed,
        radius: 15, curveX: 0, curveY: 0
      }
    } else {
      state.ball = {
        x: 0, y: 0, z: 100,
        vx: 0, vy: 0, vz: speed,
        radius: 15, curveX: 0, curveY: 0
      }
    }
    state.lastHit = null
  }

  // Set up stable game loop function
  useEffect(() => {
    gameLoopRef.current = () => {
      const canvas = canvasRef.current
      const ctx = canvas?.getContext('2d')
      const state = gameStateRef.current

      if (!canvas || !ctx || !state || gameStatusRef.current !== 'playing') return

      const width = canvas.width
      const height = canvas.height

      // Clear canvas
      ctx.fillStyle = '#000020'
      ctx.fillRect(0, 0, width, height)

      // --- Update player paddle position based on mouse ---
      const centerX = width / 2
      const centerY = height / 2

      state.player.prevX = state.player.x
      state.player.prevY = state.player.y

      state.player.x = ((state.mouse.x - centerX) / centerX) * (state.courtWidth / 2)
      state.player.y = ((state.mouse.y - centerY) / centerY) * (state.courtHeight / 2)

      // Clamp player paddle
      const halfPW = state.player.width / 2
      const halfPH = state.player.height / 2
      state.player.x = Math.max(-state.courtWidth/2 + halfPW, Math.min(state.courtWidth/2 - halfPW, state.player.x))
      state.player.y = Math.max(-state.courtHeight/2 + halfPH, Math.min(state.courtHeight/2 - halfPH, state.player.y))

      // Player paddle velocity (for curve calculation)
      const playerVelX = state.player.x - state.player.prevX
      const playerVelY = state.player.y - state.player.prevY

      // --- Update ball ---
      // Lateral velocity is fixed at paddle hit (curveX/curveY).
      // No per-frame acceleration — ball travels in a straight diagonal
      // like the original game. The "curve" is the lateral direction set on hit.

      // Clamp total lateral speed so the ball stays controllable
      const maxLateral = 2.5 + levelRef.current * 0.5
      const totalVx = state.ball.vx + state.ball.curveX
      const totalVy = state.ball.vy + state.ball.curveY
      const lateralSpeed = Math.sqrt(totalVx * totalVx + totalVy * totalVy)
      let clampedVx = totalVx
      let clampedVy = totalVy
      if (lateralSpeed > maxLateral) {
        const scale = maxLateral / lateralSpeed
        clampedVx = totalVx * scale
        clampedVy = totalVy * scale
      }

      // Move ball
      state.ball.x += clampedVx
      state.ball.y += clampedVy
      state.ball.z += state.ball.vz

      // --- Wall collisions (bounce both velocity AND curve) ---
      const wallMinX = -state.courtWidth/2 + state.ball.radius
      const wallMaxX =  state.courtWidth/2 - state.ball.radius
      const wallMinY = -state.courtHeight/2 + state.ball.radius
      const wallMaxY =  state.courtHeight/2 - state.ball.radius

      if (state.ball.x <= wallMinX) {
        state.ball.x = wallMinX
        state.ball.vx = Math.abs(state.ball.vx)
        state.ball.curveX = Math.abs(state.ball.curveX)
      } else if (state.ball.x >= wallMaxX) {
        state.ball.x = wallMaxX
        state.ball.vx = -Math.abs(state.ball.vx)
        state.ball.curveX = -Math.abs(state.ball.curveX)
      }

      if (state.ball.y <= wallMinY) {
        state.ball.y = wallMinY
        state.ball.vy = Math.abs(state.ball.vy)
        state.ball.curveY = Math.abs(state.ball.curveY)
      } else if (state.ball.y >= wallMaxY) {
        state.ball.y = wallMaxY
        state.ball.vy = -Math.abs(state.ball.vy)
        state.ball.curveY = -Math.abs(state.ball.curveY)
      }

      // --- Paddle collisions ---

      // Player paddle hit (z near 0, ball travelling toward player)
      if (state.ball.z <= 30 && state.ball.vz < 0 && state.lastHit !== 'player') {
        const dx = state.ball.x - state.player.x
        const dy = state.ball.y - state.player.y

        if (Math.abs(dx) < state.player.width/2 + state.ball.radius &&
            Math.abs(dy) < state.player.height/2 + state.ball.radius) {
          // Reverse Z direction
          state.ball.vz = Math.abs(state.ball.vz)
          state.ball.z = 30

          // Curve from paddle velocity (original Curveball mechanic)
          state.ball.curveX = playerVelX * state.maxCurve
          state.ball.curveY = playerVelY * state.maxCurve

          // Small lateral kick from hit offset
          state.ball.vx = dx * 0.08
          state.ball.vy = dy * 0.08

          state.lastHit = 'player'

          // Score for returning the ball
          const curveBonus = Math.round((Math.abs(playerVelX) + Math.abs(playerVelY)) * 2)
          scoreRef.current += (10 + curveBonus) * levelRef.current
          setScore(scoreRef.current)
        }
      }

      // AI paddle hit (z near courtDepth, ball travelling toward AI)
      if (state.ball.z >= state.courtDepth - 30 && state.ball.vz > 0 && state.lastHit !== 'ai') {
        const dx = state.ball.x - state.ai.x
        const dy = state.ball.y - state.ai.y

        if (Math.abs(dx) < state.ai.width/2 + state.ball.radius &&
            Math.abs(dy) < state.ai.height/2 + state.ball.radius) {
          state.ball.vz = -Math.abs(state.ball.vz)
          state.ball.z = state.courtDepth - 30

          // AI applies curve based on its own velocity (weaker at low levels)
          const aiVelX = state.ai.x - state.ai.prevX
          const aiVelY = state.ai.y - state.ai.prevY
          const aiCurveStrength = Math.min(0.8, 0.2 + levelRef.current * 0.08)
          state.ball.curveX = aiVelX * state.maxCurve * aiCurveStrength
          state.ball.curveY = aiVelY * state.maxCurve * aiCurveStrength
          state.ball.vx = dx * 0.05
          state.ball.vy = dy * 0.05

          state.lastHit = 'ai'
        }
      }

      // --- Ball passed player (player loses a life) ---
      if (state.ball.z < -50) {
        livesRef.current -= 1
        const newLives = livesRef.current
        setPlayerLives(newLives)

        if (newLives <= 0) {
          const currentScore = scoreRef.current
          setFinalScore(currentScore)
          if (isHighScoreCheck(currentScore)) {
            setGameStatus('highscore')
          } else {
            setGameStatus('gameover')
          }
          return
        } else {
          resetBall(state, 'player')
        }
      }

      // --- Ball passed AI (AI loses a life) ---
      if (state.ball.z > state.courtDepth + 50) {
        state.ai.lives -= 1

        // Points for getting ball past AI
        scoreRef.current += 100 * levelRef.current
        setScore(scoreRef.current)

        if (state.ai.lives <= 0) {
          // Level up! Bonus points for clearing the level
          scoreRef.current += 200 * levelRef.current
          setScore(scoreRef.current)

          levelRef.current += 1
          setLevel(levelRef.current)

          // Increase difficulty gradually
          const lvl = levelRef.current
          state.ai.speed = 1.5 + lvl * 0.4
          state.ballSpeed = 4 + lvl * 0.8
          state.maxCurve = 0.3 + lvl * 0.06
          state.ai.lives = 3 + Math.floor(lvl / 3)

          // Shrink AI paddle slightly each level (min 40x30)
          state.ai.width = Math.max(40, 90 - lvl * 4)
          state.ai.height = Math.max(30, 70 - lvl * 3)
        }

        resetBall(state, 'player')
      }

      // --- AI movement ---
      state.ai.prevX = state.ai.x
      state.ai.prevY = state.ai.y

      // AI predicts where ball will be — smarter at higher levels
      const aiLookahead = Math.min(8, 1 + levelRef.current * 0.7)
      const aiTargetX = state.ball.x + state.ball.vx * aiLookahead
      const aiTargetY = state.ball.y + state.ball.vy * aiLookahead
      const aiDx = aiTargetX - state.ai.x
      const aiDy = aiTargetY - state.ai.y
      state.ai.x += Math.sign(aiDx) * Math.min(Math.abs(aiDx), state.ai.speed)
      state.ai.y += Math.sign(aiDy) * Math.min(Math.abs(aiDy), state.ai.speed)

      // Clamp AI paddle
      state.ai.x = Math.max(-state.courtWidth/2 + state.ai.width/2,
                           Math.min(state.courtWidth/2 - state.ai.width/2, state.ai.x))
      state.ai.y = Math.max(-state.courtHeight/2 + state.ai.height/2,
                           Math.min(state.courtHeight/2 - state.ai.height/2, state.ai.y))

      // ===================== RENDERING =====================

      const project = (x, y, z) => {
        const scale = 300 / (z + 300)
        return {
          x: centerX + x * scale,
          y: centerY + y * scale,
          scale
        }
      }

      // Draw court lines
      ctx.strokeStyle = '#0066ff'
      ctx.lineWidth = 2

      // Back wall
      const corners = [
        project(-state.courtWidth/2, -state.courtHeight/2, state.courtDepth),
        project(state.courtWidth/2, -state.courtHeight/2, state.courtDepth),
        project(state.courtWidth/2, state.courtHeight/2, state.courtDepth),
        project(-state.courtWidth/2, state.courtHeight/2, state.courtDepth)
      ]
      ctx.beginPath()
      ctx.moveTo(corners[0].x, corners[0].y)
      for (let i = 1; i < corners.length; i++) {
        ctx.lineTo(corners[i].x, corners[i].y)
      }
      ctx.closePath()
      ctx.stroke()

      // Side lines connecting front to back
      const frontCorners = [
        project(-state.courtWidth/2, -state.courtHeight/2, 0),
        project(state.courtWidth/2, -state.courtHeight/2, 0),
        project(state.courtWidth/2, state.courtHeight/2, 0),
        project(-state.courtWidth/2, state.courtHeight/2, 0)
      ]

      ctx.strokeStyle = '#003388'
      for (let i = 0; i < 4; i++) {
        ctx.beginPath()
        ctx.moveTo(frontCorners[i].x, frontCorners[i].y)
        ctx.lineTo(corners[i].x, corners[i].y)
        ctx.stroke()
      }

      // Grid lines on floor and ceiling
      ctx.strokeStyle = '#002255'
      ctx.lineWidth = 1
      for (let z = 0; z <= state.courtDepth; z += 100) {
        const left = project(-state.courtWidth/2, state.courtHeight/2, z)
        const right = project(state.courtWidth/2, state.courtHeight/2, z)
        ctx.beginPath()
        ctx.moveTo(left.x, left.y)
        ctx.lineTo(right.x, right.y)
        ctx.stroke()
      }

      // Draw AI paddle
      const aiProj = project(state.ai.x, state.ai.y, state.courtDepth - 10)
      const aiWidth = state.ai.width * aiProj.scale
      const aiHeight = state.ai.height * aiProj.scale
      ctx.fillStyle = '#ff3333'
      ctx.fillRect(aiProj.x - aiWidth/2, aiProj.y - aiHeight/2, aiWidth, aiHeight)
      ctx.strokeStyle = '#ff6666'
      ctx.lineWidth = 2
      ctx.strokeRect(aiProj.x - aiWidth/2, aiProj.y - aiHeight/2, aiWidth, aiHeight)

      // Draw ball with trail effect
      const ballProj = project(state.ball.x, state.ball.y, state.ball.z)
      const ballRadius = state.ball.radius * ballProj.scale

      // Ball glow
      const gradient = ctx.createRadialGradient(
        ballProj.x, ballProj.y, 0,
        ballProj.x, ballProj.y, ballRadius * 2
      )
      gradient.addColorStop(0, '#ffffff')
      gradient.addColorStop(0.3, '#00ffff')
      gradient.addColorStop(1, 'transparent')
      ctx.fillStyle = gradient
      ctx.beginPath()
      ctx.arc(ballProj.x, ballProj.y, ballRadius * 2, 0, Math.PI * 2)
      ctx.fill()

      // Ball
      ctx.fillStyle = '#00ffff'
      ctx.beginPath()
      ctx.arc(ballProj.x, ballProj.y, ballRadius, 0, Math.PI * 2)
      ctx.fill()

      // Draw player paddle (outline only, at screen edge)
      ctx.strokeStyle = '#00ff00'
      ctx.lineWidth = 3
      const playerProj = project(state.player.x, state.player.y, 50)
      const playerWidth = state.player.width * playerProj.scale
      const playerHeight = state.player.height * playerProj.scale
      ctx.strokeRect(playerProj.x - playerWidth/2, playerProj.y - playerHeight/2, playerWidth, playerHeight)

      // Crosshair at paddle center
      ctx.strokeStyle = '#00ff00'
      ctx.lineWidth = 2
      const crossSize = 10
      ctx.beginPath()
      ctx.moveTo(playerProj.x - crossSize, playerProj.y)
      ctx.lineTo(playerProj.x + crossSize, playerProj.y)
      ctx.moveTo(playerProj.x, playerProj.y - crossSize)
      ctx.lineTo(playerProj.x, playerProj.y + crossSize)
      ctx.stroke()

      // Draw HUD
      ctx.fillStyle = '#ffffff'
      ctx.font = 'bold 20px monospace'
      ctx.textAlign = 'left'
      ctx.fillText(`Score: ${scoreRef.current}`, 20, 30)
      ctx.fillText(`Level: ${levelRef.current}`, 20, 55)

      ctx.textAlign = 'right'
      ctx.fillText(`Lives: ${'♥'.repeat(Math.max(0, livesRef.current))}`, width - 20, 30)

      // Show AI lives remaining
      ctx.textAlign = 'center'
      ctx.font = '16px monospace'
      ctx.fillStyle = '#ff6666'
      ctx.fillText(`AI: ${'♥'.repeat(Math.max(0, state.ai.lives))}`, centerX, 25)

      // Continue game loop
      animationRef.current = requestAnimationFrame(gameLoopRef.current)
    }
  }, [isHighScoreCheck])

  // Start game
  const startGame = () => {
    scoreRef.current = 0
    levelRef.current = 1
    livesRef.current = 3
    setScore(0)
    setLevel(1)
    setPlayerLives(3)
    setGameStatus('playing')
  }

  // Handle mouse movement
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const handleMouseMove = (e) => {
      const rect = canvas.getBoundingClientRect()
      if (gameStateRef.current) {
        gameStateRef.current.mouse.x = e.clientX - rect.left
        gameStateRef.current.mouse.y = e.clientY - rect.top
      }
    }

    canvas.addEventListener('mousemove', handleMouseMove)
    return () => canvas.removeEventListener('mousemove', handleMouseMove)
  }, [])

  // Run game loop — only reacts to gameStatus changes
  useEffect(() => {
    if (gameStatus === 'playing') {
      initGame()
      animationRef.current = requestAnimationFrame(gameLoopRef.current)
    }
    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current)
      }
    }
  }, [gameStatus, initGame])

  // Handle high score submission
  const handleSubmitScore = (e) => {
    e.preventDefault()
    addToLeaderboard(playerName, finalScore)
  }

  return (
    <div className="curveball-container">
      <h1>Curveball</h1>

      <div className="game-area">
        <canvas
          ref={canvasRef}
          width={800}
          height={600}
          className="curveball-canvas"
        />

        {gameStatus === 'menu' && (
          <div className="game-overlay">
            <div className="menu-content">
              <h2>CURVEBALL</h2>
              <p>Move your paddle to hit the ball.</p>
              <p>Move while hitting to add curve!</p>
              <button onClick={startGame} className="play-btn">
                PLAY GAME
              </button>
            </div>
          </div>
        )}

        {gameStatus === 'gameover' && (
          <div className="game-overlay">
            <div className="menu-content">
              <h2>GAME OVER</h2>
              <p>Final Score: {finalScore}</p>
              <p>Level Reached: {level}</p>
              <button onClick={startGame} className="play-btn">
                PLAY AGAIN
              </button>
              <button onClick={() => setGameStatus('menu')} className="menu-btn">
                MAIN MENU
              </button>
            </div>
          </div>
        )}

        {gameStatus === 'highscore' && (
          <div className="game-overlay">
            <div className="menu-content">
              <h2>NEW HIGH SCORE!</h2>
              <p className="big-score">{finalScore}</p>
              <form onSubmit={handleSubmitScore}>
                <input
                  type="text"
                  value={playerName}
                  onChange={(e) => setPlayerName(e.target.value)}
                  placeholder="Enter your name"
                  maxLength={20}
                  className="name-input"
                  autoFocus
                />
                <button type="submit" className="play-btn">
                  SUBMIT SCORE
                </button>
              </form>
            </div>
          </div>
        )}
      </div>

      <div className="leaderboard">
        <h2>Leaderboard</h2>
        {leaderboard.length === 0 ? (
          <p className="no-scores">No scores yet. Be the first!</p>
        ) : (
          <table>
            <thead>
              <tr>
                <th>Rank</th>
                <th>Name</th>
                <th>Score</th>
                <th>Level</th>
                <th>Date</th>
              </tr>
            </thead>
            <tbody>
              {leaderboard.map((entry, index) => (
                <tr key={index} className={index < 3 ? `rank-${index + 1}` : ''}>
                  <td>{index + 1}</td>
                  <td>{entry.name}</td>
                  <td>{entry.score.toLocaleString()}</td>
                  <td>{entry.level}</td>
                  <td>{entry.date}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <div className="game-instructions">
        <h3>How to Play</h3>
        <ul>
          <li>Move your mouse to control the green paddle</li>
          <li>Hit the ball back to the red AI paddle</li>
          <li>Move your paddle while hitting to add curve!</li>
          <li>Deplete the AI's lives to advance levels</li>
          <li>Don't let the ball get past you!</li>
          <li>Difficulty increases with each level</li>
        </ul>
      </div>
    </div>
  )
}

export default Curveball
