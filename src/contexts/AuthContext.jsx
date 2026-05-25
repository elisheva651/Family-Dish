import { createContext, useContext, useState, useEffect } from 'react'
import { onAuthStateChanged, signInWithPopup, signOut } from 'firebase/auth'
import { doc, setDoc, getDoc } from 'firebase/firestore'
import { auth, googleProvider, db } from '../firebase'

const AuthContext = createContext(null)

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      try {
        if (firebaseUser) {
          const userRef = doc(db, 'users', firebaseUser.uid)
          const userSnap = await getDoc(userRef)
          if (!userSnap.exists()) {
            const userData = {
              uid: firebaseUser.uid,
              displayName: firebaseUser.displayName || '',
              email: firebaseUser.email || '',
              photoURL: firebaseUser.photoURL || '',
              groupIds: [],
            }
            await setDoc(userRef, userData)
            setUser(userData)
          } else {
            setUser({ uid: firebaseUser.uid, ...userSnap.data() })
          }
        } else {
          setUser(null)
        }
      } catch (error) {
        console.error('Auth state change error:', error)
        setUser(null)
      }
      setLoading(false)
    })
    return unsubscribe
  }, [])

  const signInWithGoogle = () => signInWithPopup(auth, googleProvider)
  const logOut = () => signOut(auth)

  const refreshUser = async () => {
    if (auth.currentUser) {
      const userRef = doc(db, 'users', auth.currentUser.uid)
      const userSnap = await getDoc(userRef)
      if (userSnap.exists()) {
        setUser({ uid: auth.currentUser.uid, ...userSnap.data() })
      }
    }
  }

  return (
    <AuthContext.Provider value={{ user, loading, signInWithGoogle, logOut, refreshUser }}>
      {children}
    </AuthContext.Provider>
  )
}
