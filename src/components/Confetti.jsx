import { useEffect, useState } from 'react'

const COLORS = ['#27ae60', '#3498db', '#f39c12', '#e74c3c', '#9b59b6', '#1abc9c']

function Confetti({ trigger }) {
  const [particles, setParticles] = useState([])

  useEffect(() => {
    if (trigger) {
      const newParticles = Array.from({ length: 50 }, (_, i) => ({
        id: Date.now() + i,
        left: Math.random() * 100,
        color: COLORS[Math.floor(Math.random() * COLORS.length)],
        delay: Math.random() * 0.5,
        rotation: Math.random() * 360
      }))
      setParticles(newParticles)

      const timer = setTimeout(() => {
        setParticles([])
      }, 3500)

      return () => clearTimeout(timer)
    }
  }, [trigger])

  if (particles.length === 0) return null

  return (
    <div className="confetti-container">
      {particles.map(p => (
        <div
          key={p.id}
          className="confetti"
          style={{
            left: `${p.left}%`,
            backgroundColor: p.color,
            animationDelay: `${p.delay}s`,
            transform: `rotate(${p.rotation}deg)`
          }}
        />
      ))}
    </div>
  )
}

export default Confetti
