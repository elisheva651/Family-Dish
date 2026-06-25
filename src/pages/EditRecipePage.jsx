import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { doc, getDoc, updateDoc, deleteField } from 'firebase/firestore'
import { db } from '../firebase'
import { useAuth } from '../contexts/AuthContext'
import { useLanguage } from '../contexts/LanguageContext'
import { detectLanguage } from '../utils/translate'
import Header from '../components/Header'
import './AddRecipePage.css'

export default function EditRecipePage() {
  const { groupId, recipeId } = useParams()
  const { user } = useAuth()
  const { t } = useLanguage()
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
    setTags(tags.filter(tg => tg !== tagToRemove))
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
      const textForDetection = title.trim() + ' ' + ingredients.trim().slice(0, 100)
      let originalLanguage = 'en'
      try {
        const detected = await detectLanguage(textForDetection)
        originalLanguage = detected === 'he' ? 'he' : 'en'
      } catch {
        // Default to 'en' if detection fails
      }

      await updateDoc(doc(db, 'recipes', recipeId), {
        title: title.trim(),
        ingredients: ingredients.trim(),
        instructions: instructions.trim(),
        tags,
        originalLanguage,
        translations: deleteField(),
      })
      navigate(`/group/${groupId}/recipe/${recipeId}`, { replace: true })
    } catch (error) {
      console.error('Failed to update recipe:', error)
      setSaving(false)
    }
  }

  if (loading) return <div className="loading">{t('app.loading')}</div>

  return (
    <div className="add-recipe-page">
      <Header
        title={t('editRecipe.title')}
        showBack
        rightAction={
          <button
            className="header-save"
            onClick={handleSubmit}
            disabled={!title.trim() || saving}
          >
            {saving ? t('addRecipe.saving') : t('addRecipe.save')}
          </button>
        }
      />

      <form className="recipe-form" onSubmit={handleSubmit}>
        <label className="form-label">
          {t('addRecipe.nameLabel')}
          <input
            className="form-input"
            type="text"
            placeholder={t('addRecipe.namePlaceholder')}
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            autoFocus
          />
        </label>

        <label className="form-label">
          {t('addRecipe.ingredientsLabel')}
          <textarea
            className="form-textarea"
            placeholder={t('addRecipe.ingredientsPlaceholder')}
            value={ingredients}
            onChange={(e) => setIngredients(e.target.value)}
            rows={6}
          />
        </label>

        <label className="form-label">
          {t('addRecipe.instructionsLabel')}
          <textarea
            className="form-textarea"
            placeholder={t('addRecipe.instructionsPlaceholder')}
            value={instructions}
            onChange={(e) => setInstructions(e.target.value)}
            rows={6}
          />
        </label>

        <div className="form-label">
          {t('addRecipe.tagsLabel')}
          <div className="tags-input-row">
            <input
              className="form-input"
              type="text"
              placeholder={t('addRecipe.tagPlaceholder')}
              value={tagInput}
              onChange={(e) => setTagInput(e.target.value)}
              onKeyDown={handleTagKeyDown}
            />
            <button type="button" className="btn-tag-add" onClick={addTag}>
              {t('addRecipe.addTag')}
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
