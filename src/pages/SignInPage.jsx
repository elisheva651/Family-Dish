import { useState } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { useLanguage } from '../contexts/LanguageContext'
import './SignInPage.css'

export default function SignInPage() {
  const { signInWithGoogle } = useAuth()
  const { t, language, setLanguage } = useLanguage()
  const [error, setError] = useState(null)
  const [isLoading, setIsLoading] = useState(false)

  const handleSignIn = async () => {
    setError(null)
    setIsLoading(true)
    try {
      await signInWithGoogle()
    } catch (error) {
      console.error('Sign in failed:', error)
      setError(t('signIn.error'))
    }
    setIsLoading(false)
  }

  const toggleLanguage = () => {
    setLanguage(language === 'en' ? 'he' : 'en')
  }

  return (
    <div className="signin-page">
      <div className="signin-content">
        <button className="signin-lang-toggle" onClick={toggleLanguage}>
          <span className={language === 'en' ? 'active' : ''}>EN</span>
          <span> | </span>
          <span className={language === 'he' ? 'active' : ''}>עב</span>
        </button>
        <div className="signin-logo">🍽️</div>
        <h1>{t('signIn.title')}</h1>
        <p className="signin-subtitle">{t('signIn.subtitle')}</p>
        {error && <p className="signin-error">{error}</p>}
        <button
          className="signin-button google"
          onClick={handleSignIn}
          disabled={isLoading}
        >
          {isLoading ? t('signIn.signingIn') : t('signIn.google')}
        </button>
      </div>
    </div>
  )
}
