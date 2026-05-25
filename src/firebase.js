import { initializeApp } from 'firebase/app'
import { getAuth, GoogleAuthProvider } from 'firebase/auth'
import { getFirestore } from 'firebase/firestore'
// import { getStorage } from 'firebase/storage' // Enable when Blaze plan is activated

const firebaseConfig = {
  apiKey: "AIzaSyDtiGV9IB0rQ98kAz6FWxaH2eByPr97b20",
  authDomain: "family-dish.firebaseapp.com",
  projectId: "family-dish",
  storageBucket: "family-dish.firebasestorage.app",
  messagingSenderId: "393649454288",
  appId: "1:393649454288:web:4ad4659bf3d2e74060b2d5"
}

const app = initializeApp(firebaseConfig)

export const auth = getAuth(app)
export const googleProvider = new GoogleAuthProvider()
export const db = getFirestore(app)
// export const storage = getStorage(app) // Enable when Blaze plan is activated
