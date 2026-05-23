import { useAuth } from '../contexts/AuthContext'
import './SignInPage.css'

export default function SignInPage() {
  const { signInWithGoogle } = useAuth()

  const handleSignIn = async () => {
    try {
      await signInWithGoogle()
    } catch (error) {
      console.error('Sign in failed:', error)
    }
  }

  return (
    <div className="signin-page">
      <div className="signin-content">
        <div className="signin-logo">🍽️</div>
        <h1>Family Dish</h1>
        <p className="signin-subtitle">Share recipes with the people you love</p>
        <button className="signin-button google" onClick={handleSignIn}>
          Sign in with Google
        </button>
      </div>
    </div>
  )
}
