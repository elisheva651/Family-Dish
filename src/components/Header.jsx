import { useNavigate } from 'react-router-dom'
import './Header.css'

export default function Header({ title, showBack = false, rightAction = null }) {
  const navigate = useNavigate()

  return (
    <header className="header">
      <div className="header-left">
        {showBack && (
          <button className="header-back" onClick={() => navigate(-1)}>
            ‹
          </button>
        )}
        <h1 className="header-title">{title}</h1>
      </div>
      {rightAction && <div className="header-right">{rightAction}</div>}
    </header>
  )
}
