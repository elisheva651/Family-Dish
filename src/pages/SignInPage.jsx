import { useState } from 'react'
import { useAuth } from '../contexts/AuthContext'
import './SignInPage.css'

export default function SignInPage() {
  const { signInWithGoogle } = useAuth()
  const [error, setError] = useState(null)
  const [isLoading, setIsLoading] = useState(false)

  const handleSignIn = async () => {
    setError(null)
    setIsLoading(true)
    try {
      await signInWithGoogle()
    } catch (error) {
      console.error('Sign in failed:', error)
      setError('Sign in failed. Please try again.')
    }
    setIsLoading(false)
  }

  return (
    <div className="signin-page">
      <div className="signin-content">
        <div className="signin-logo">🍽️</div>
        <h1>Family Dish</h1>
        <p className="signin-subtitle">Share recipes with the people you love</p>
        {error && <p className="signin-error">{error}</p>}
        <button
          className="signin-button google"
          onClick={handleSignIn}
          disabled={isLoading}
        >
          {isLoading ? 'Signing in...' : 'Sign in with Google'}
        </button>
      </div>
    </div>
  )
}
