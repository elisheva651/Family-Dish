import { useState, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { collection, addDoc, serverTimestamp } from 'firebase/firestore'
import { db } from '../firebase'
import { useAuth } from '../contexts/AuthContext'
import { useLanguage } from '../contexts/LanguageContext'
import { extractRecipeFromImages, getErrorMessage } from '../utils/gemini'
import { detectLanguage } from '../utils/translate'
import Header from '../components/Header'
import './AddRecipePage.css'

export default function AddRecipePage() {
  const { groupId } = useParams()
  const { user } = useAuth()
  const { t } = useLanguage()
  const navigate = useNavigate()
  const fileInputRef = useRef(null)

  const [title, setTitle] = useState('')
  const [ingredients, setIngredients] = useState('')
  const [instructions, setInstructions] = useState('')
  const [tagInput, setTagInput] = useState('')
  const [tags, setTags] = useState([])
  const [saving, setSaving] = useState(false)

  const [selectedImages, setSelectedImages] = useState([])
  const [scanning, setScanning] = useState(false)
  const [scanError, setScanError] = useState('')

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

  const handleImageSelect = (e) => {
    const files = Array.from(e.target.files)
    if (files.length) {
      setSelectedImages(prev => [...prev, ...files])
      setScanError('')
    }
    e.target.value = ''
  }

  const removeImage = (index) => {
    setSelectedImages(prev => prev.filter((_, i) => i !== index))
  }

  const handleScan = async () => {
    const hasContent = title.trim() || ingredients.trim() || instructions.trim()
    if (hasContent && !window.confirm(t('addRecipe.replaceConfirm'))) {
      return
    }

    setScanning(true)
    setScanError('')
    try {
      const recipe = await extractRecipeFromImages(selectedImages)
      setTitle(recipe.title)
      setIngredients(recipe.ingredients)
      setInstructions(recipe.instructions)
      setSelectedImages([])
    } catch (error) {
      setScanError(getErrorMessage(error))
    } finally {
      setScanning(false)
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
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

      const recipeRef = await addDoc(collection(db, 'recipes'), {
        groupId,
        authorId: user.uid,
        title: title.trim(),
        ingredients: ingredients.trim(),
        instructions: instructions.trim(),
        photoURL: '',
        tags,
        originalLanguage,
        createdAt: serverTimestamp(),
      })
      navigate(`/group/${groupId}/recipe/${recipeRef.id}`, { replace: true })
    } catch (error) {
      console.error('Failed to add recipe:', error)
      setSaving(false)
    }
  }

  return (
    <div className="add-recipe-page">
      <Header
        title={t('addRecipe.title')}
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
        <div className="scan-section">
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            multiple
            onChange={handleImageSelect}
            hidden
          />

          <button
            type="button"
            className="btn-scan"
            onClick={() => fileInputRef.current.click()}
            disabled={scanning}
          >
            <span className="btn-scan-icon">📷</span>
            {t('addRecipe.scanButton')}
          </button>

          {selectedImages.length > 0 && (
            <>
              <div className="image-preview-strip">
                {selectedImages.map((file, index) => (
                  <div key={index} className="preview-thumb">
                    <img src={URL.createObjectURL(file)} alt={`Selected ${index + 1}`} />
                    <button
                      type="button"
                      className="preview-remove"
                      onClick={() => removeImage(index)}
                    >
                      ×
                    </button>
                  </div>
                ))}
                <button
                  type="button"
                  className="btn-add-more"
                  onClick={() => fileInputRef.current.click()}
                >
                  +
                </button>
              </div>

              <button
                type="button"
                className="btn-read-recipe"
                onClick={handleScan}
                disabled={scanning}
              >
                {scanning ? t('addRecipe.reading') : t('addRecipe.readRecipe')}
              </button>
            </>
          )}

          {scanError && <p className="scan-error">{scanError}</p>}
        </div>

        <div className="scan-divider">
          <span>{t('addRecipe.orManual')}</span>
        </div>

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
