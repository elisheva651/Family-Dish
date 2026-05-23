import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import {
  doc, getDoc, collection, query, orderBy, onSnapshot,
  addDoc, deleteDoc, serverTimestamp, getDocs
} from 'firebase/firestore'
import { db } from '../firebase'
import { useAuth } from '../contexts/AuthContext'
import Header from '../components/Header'
import './RecipePage.css'

export default function RecipePage() {
  const { groupId, recipeId } = useParams()
  const { user } = useAuth()
  const navigate = useNavigate()
  const [recipe, setRecipe] = useState(null)
  const [author, setAuthor] = useState(null)
  const [comments, setComments] = useState([])
  const [commentUsers, setCommentUsers] = useState({})
  const [activeTab, setActiveTab] = useState('recipe')
  const [commentText, setCommentText] = useState('')
  const [sending, setSending] = useState(false)
  const [loading, setLoading] = useState(true)

  const isAuthor = recipe?.authorId === user?.uid

  useEffect(() => {
    async function fetchRecipe() {
      const recipeSnap = await getDoc(doc(db, 'recipes', recipeId))
      if (!recipeSnap.exists()) return
      const recipeData = { id: recipeSnap.id, ...recipeSnap.data() }
      setRecipe(recipeData)

      const authorSnap = await getDoc(doc(db, 'users', recipeData.authorId))
      if (authorSnap.exists()) setAuthor(authorSnap.data())

      setLoading(false)
    }
    fetchRecipe()
  }, [recipeId])

  useEffect(() => {
    const q = query(
      collection(db, 'recipes', recipeId, 'comments'),
      orderBy('createdAt', 'asc')
    )
    const unsubscribe = onSnapshot(q, async (snap) => {
      const commentsData = snap.docs.map(d => ({ id: d.id, ...d.data() }))
      setComments(commentsData)

      const uniqueUids = [...new Set(commentsData.map(c => c.authorId))]
      const newUsers = { ...commentUsers }
      for (const uid of uniqueUids) {
        if (!newUsers[uid]) {
          const userSnap = await getDoc(doc(db, 'users', uid))
          if (userSnap.exists()) newUsers[uid] = userSnap.data()
        }
      }
      setCommentUsers(newUsers)
    })
    return unsubscribe
  }, [recipeId])

  const handleSendComment = async () => {
    if (!commentText.trim() || sending) return
    setSending(true)
    try {
      await addDoc(collection(db, 'recipes', recipeId, 'comments'), {
        recipeId,
        authorId: user.uid,
        text: commentText.trim(),
        photoURL: '',
        createdAt: serverTimestamp(),
      })
      setCommentText('')
    } catch (error) {
      console.error('Failed to send comment:', error)
    }
    setSending(false)
  }

  const handleDeleteComment = async (commentId) => {
    if (!confirm('Delete this comment?')) return
    await deleteDoc(doc(db, 'recipes', recipeId, 'comments', commentId))
  }

  const handleDeleteRecipe = async () => {
    if (!confirm('Delete this recipe? This cannot be undone.')) return
    try {
      // Delete all comments first
      const commentsSnap = await getDocs(collection(db, 'recipes', recipeId, 'comments'))
      for (const commentDoc of commentsSnap.docs) {
        await deleteDoc(commentDoc.ref)
      }
      // Delete the recipe
      await deleteDoc(doc(db, 'recipes', recipeId))
      navigate(`/group/${groupId}`, { replace: true })
    } catch (error) {
      console.error('Failed to delete recipe:', error)
    }
  }

  if (loading) return <div className="loading">Loading...</div>
  if (!recipe) return <div className="loading">Recipe not found</div>

  return (
    <div className="recipe-page">
      <Header title={recipe.title} showBack />

      <div className="recipe-hero-placeholder">🍽️</div>

      <div className="recipe-meta">
        <span>By {author?.displayName || 'Unknown'}</span>
        {recipe.tags?.length > 0 && (
          <span className="recipe-meta-tags">
            {recipe.tags.join(', ')}
          </span>
        )}
      </div>

      {isAuthor && (
        <div className="recipe-actions">
          <button
            className="btn-edit-recipe"
            onClick={() => navigate(`/group/${groupId}/recipe/${recipeId}/edit`)}
          >
            Edit Recipe
          </button>
          <button className="btn-delete-recipe" onClick={handleDeleteRecipe}>
            Delete
          </button>
        </div>
      )}

      <div className="group-tabs">
        <button
          className={`group-tab ${activeTab === 'recipe' ? 'active' : ''}`}
          onClick={() => setActiveTab('recipe')}
        >
          Recipe
        </button>
        <button
          className={`group-tab ${activeTab === 'comments' ? 'active' : ''}`}
          onClick={() => setActiveTab('comments')}
        >
          Comments ({comments.length})
        </button>
      </div>

      {activeTab === 'recipe' && (
        <div className="recipe-content">
          <div className="recipe-section">
            <h3>Ingredients</h3>
            <div className="recipe-text">
              {recipe.ingredients.split('\n').map((line, i) => (
                <p key={i}>{line}</p>
              ))}
            </div>
          </div>
          <div className="recipe-section">
            <h3>Instructions</h3>
            <div className="recipe-text">
              {recipe.instructions.split('\n').map((line, i) => (
                <p key={i}>{line}</p>
              ))}
            </div>
          </div>
        </div>
      )}

      {activeTab === 'comments' && (
        <div className="comments-section">
          <div className="comments-list">
            {comments.length === 0 && (
              <p className="comments-empty">No comments yet. Be the first!</p>
            )}
            {comments.map(comment => (
              <div key={comment.id} className="comment-item">
                <div className="comment-header">
                  <span className="comment-author">
                    {commentUsers[comment.authorId]?.displayName || 'Anonymous'}
                  </span>
                  {(comment.authorId === user.uid || isAuthor) && (
                    <button
                      className="comment-delete"
                      onClick={() => handleDeleteComment(comment.id)}
                    >
                      ×
                    </button>
                  )}
                </div>
                {comment.text && <p className="comment-text">{comment.text}</p>}
              </div>
            ))}
          </div>

          <div className="comment-input-bar">
            <input
              className="comment-input"
              type="text"
              placeholder="Add a comment..."
              value={commentText}
              onChange={(e) => setCommentText(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSendComment()}
            />
            <button
              className="comment-send-btn"
              onClick={handleSendComment}
              disabled={!commentText.trim() || sending}
            >
              Send
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
