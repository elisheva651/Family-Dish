import { useNavigate } from 'react-router-dom'
import { useLanguage } from '../contexts/LanguageContext'
import './Header.css'

export default function Header({ title, showBack = false, rightAction = null }) {
  const navigate = useNavigate()
  const { language, setLanguage } = useLanguage()

  const toggleLanguage = () => {
    setLanguage(language === 'en' ? 'he' : 'en')
  }

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
      <div className="header-right-group">
        <button className="lang-toggle" onClick={toggleLanguage}>
          <span className={`lang-option ${language === 'en' ? 'active' : ''}`}>EN</span>
          <span className={`lang-option ${language === 'he' ? 'active' : ''}`}>עב</span>
        </button>
        {rightAction && <div className="header-right">{rightAction}</div>}
      </div>
    </header>
  )
}
