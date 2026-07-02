import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider, useAuth } from './contexts/AuthContext'
import { LanguageProvider } from './contexts/LanguageContext'
import SignInPage from './pages/SignInPage'
import HomePage from './pages/HomePage'
import CreateGroupPage from './pages/CreateGroupPage'
import JoinGroupPage from './pages/JoinGroupPage'
import GroupPage from './pages/GroupPage'
import RecipeListPage from './pages/RecipeListPage'
import AddRecipePage from './pages/AddRecipePage'
import RecipePage from './pages/RecipePage'
import EditRecipePage from './pages/EditRecipePage'
import GroupSettingsPage from './pages/GroupSettingsPage'
import './App.css'

function ProtectedRoute({ children }) {
  const { user, loading } = useAuth()
  if (loading) return <div className="loading">Loading...</div>
  if (!user) return <Navigate to="/signin" />
  return children
}

function PublicRoute({ children }) {
  const { user, loading } = useAuth()
  if (loading) return <div className="loading">Loading...</div>
  if (user) return <Navigate to="/" />
  return children
}

function AppRoutes() {
  return (
    <Routes>
      <Route path="/signin" element={<PublicRoute><SignInPage /></PublicRoute>} />
      <Route path="/" element={<ProtectedRoute><HomePage /></ProtectedRoute>} />
      <Route path="/create-group" element={<ProtectedRoute><CreateGroupPage /></ProtectedRoute>} />
      <Route path="/join-group" element={<ProtectedRoute><JoinGroupPage /></ProtectedRoute>} />
      <Route path="/group/:groupId" element={<ProtectedRoute><GroupPage /></ProtectedRoute>} />
      <Route path="/group/:groupId/settings" element={<ProtectedRoute><GroupSettingsPage /></ProtectedRoute>} />
      <Route path="/group/:groupId/member/:memberId" element={<ProtectedRoute><RecipeListPage /></ProtectedRoute>} />
      <Route path="/group/:groupId/tag/:tag" element={<ProtectedRoute><RecipeListPage /></ProtectedRoute>} />
      <Route path="/group/:groupId/add-recipe" element={<ProtectedRoute><AddRecipePage /></ProtectedRoute>} />
      <Route path="/group/:groupId/recipe/:recipeId" element={<ProtectedRoute><RecipePage /></ProtectedRoute>} />
      <Route path="/group/:groupId/recipe/:recipeId/edit" element={<ProtectedRoute><EditRecipePage /></ProtectedRoute>} />
    </Routes>
  )
}

function App() {
  return (
    <BrowserRouter>
      <LanguageProvider>
        <AuthProvider>
          <div className="app">
            <AppRoutes />
          </div>
        </AuthProvider>
      </LanguageProvider>
    </BrowserRouter>
  )
}

export default App
