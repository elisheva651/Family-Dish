import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { doc, getDoc, updateDoc } from 'firebase/firestore'
import { db } from '../firebase'
import { useAuth } from '../contexts/AuthContext'
import Header from '../components/Header'
import './AddRecipePage.css'

export default function EditRecipePage() {
  const { groupId, recipeId } = useParams()
  const { user } = useAuth()
  const navigate = useNavigate()
  const [title, setTitle] = useState('')
  const [ingredients, setIngredients] = useState('')
  const [instructions, setInstructions] = useState('')
  const [tagInput, setTagInput] = useState('')
  const [tags, setTags] = useState([])
  const [saving, setSaving] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchRecipe() {
      const recipeSnap = await getDoc(doc(db, 'recipes', recipeId))
      if (!recipeSnap.exists()) return
      const data = recipeSnap.data()
      if (data.authorId !== user.uid) {
        navigate(-1)
        return
      }
      setTitle(data.title || '')
      setIngredients(data.ingredients || '')
      setInstructions(data.instructions || '')
      setTags(data.tags || [])
      setLoading(false)
    }
    fetchRecipe()
  }, [recipeId])

  const addTag = () => {
    const tag = tagInput.trim().toLowerCase()
    if (tag && !tags.includes(tag)) {
      setTags([...tags, tag])
    }
    setTagInput('')
  }

  const removeTag = (tagToRemove) => {
    setTags(tags.filter(t => t !== tagToRemove))
  }

  const handleTagKeyDown = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      addTag()
    }
  }

  const handleSubmit = async (e) => {
    if (e) e.preventDefault()
    if (!title.trim() || saving) return
    setSaving(true)
    try {
      await updateDoc(doc(db, 'recipes', recipeId), {
        title: title.trim(),
        ingredients: ingredients.trim(),
        instructions: instructions.trim(),
        tags,
      })
      navigate(`/group/${groupId}/recipe/${recipeId}`, { replace: true })
    } catch (error) {
      console.error('Failed to update recipe:', error)
      setSaving(false)
    }
  }

  if (loading) return <div className="loading">Loading...</div>

  return (
    <div className="add-recipe-page">
      <Header
        title="Edit Recipe"
        showBack
        rightAction={
          <button
            className="header-save"
            onClick={handleSubmit}
            disabled={!title.trim() || saving}
          >
            {saving ? 'Saving...' : 'Save'}
          </button>
        }
      />

      <form className="recipe-form" onSubmit={handleSubmit}>
        <label className="form-label">
          Recipe Name
          <input
            className="form-input"
            type="text"
            placeholder="e.g. Grandma's Challah"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            autoFocus
          />
        </label>

        <label className="form-label">
          Ingredients
          <textarea
            className="form-textarea"
            placeholder={"Write each ingredient on a new line..."}
            value={ingredients}
            onChange={(e) => setIngredients(e.target.value)}
            rows={6}
          />
        </label>

        <label className="form-label">
          Instructions
          <textarea
            className="form-textarea"
            placeholder={"Write the steps..."}
            value={instructions}
            onChange={(e) => setInstructions(e.target.value)}
            rows={6}
          />
        </label>

        <div className="form-label">
          Tags (optional)
          <div className="tags-input-row">
            <input
              className="form-input"
              type="text"
              placeholder="e.g. dessert"
              value={tagInput}
              onChange={(e) => setTagInput(e.target.value)}
              onKeyDown={handleTagKeyDown}
            />
            <button type="button" className="btn-tag-add" onClick={addTag}>
              + Add
            </button>
          </div>
          {tags.length > 0 && (
            <div className="tags-list">
              {tags.map(tag => (
                <span key={tag} className="tag-chip">
                  {tag}
                  <button type="button" className="tag-remove" onClick={() => removeTag(tag)}>
                    ×
                  </button>
                </span>
              ))}
            </div>
          )}
        </div>
      </form>
    </div>
  )
}
