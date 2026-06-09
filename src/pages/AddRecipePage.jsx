import { useState, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { collection, addDoc, serverTimestamp } from 'firebase/firestore'
import { db } from '../firebase'
import { useAuth } from '../contexts/AuthContext'
import { extractRecipeFromImages, getErrorMessage } from '../utils/gemini'
import Header from '../components/Header'
import './AddRecipePage.css'

export default function AddRecipePage() {
  const { groupId } = useParams()
  const { user } = useAuth()
  const navigate = useNavigate()
  const fileInputRef = useRef(null)

  const [title, setTitle] = useState('')
  const [ingredients, setIngredients] = useState('')
  const [instructions, setInstructions] = useState('')
  const [tagInput, setTagInput] = useState('')
  const [tags, setTags] = useState([])
  const [saving, setSaving] = useState(false)

  // Image scanner state
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
    setTags(tags.filter(t => t !== tagToRemove))
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
    // Reset input so same file can be re-selected
    e.target.value = ''
  }

  const removeImage = (index) => {
    setSelectedImages(prev => prev.filter((_, i) => i !== index))
  }

  const handleScan = async () => {
    const hasContent = title.trim() || ingredients.trim() || instructions.trim()
    if (hasContent && !window.confirm('This will replace what you\'ve typed. Continue?')) {
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
      const recipeRef = await addDoc(collection(db, 'recipes'), {
        groupId,
        authorId: user.uid,
        title: title.trim(),
        ingredients: ingredients.trim(),
        instructions: instructions.trim(),
        photoURL: '',
        tags,
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
        title="New Recipe"
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
        {/* Image Scanner Section */}
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
            Scan Recipe from Image
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
                {scanning ? 'Reading recipe...' : 'Read Recipe'}
              </button>
            </>
          )}

          {scanError && <p className="scan-error">{scanError}</p>}
        </div>

        <div className="scan-divider">
          <span>or enter manually</span>
        </div>

        {/* Existing form fields */}
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
            placeholder={"Write each ingredient on a new line...\n\ne.g.\n4 cups flour\n2 eggs\n1/3 cup sugar"}
            value={ingredients}
            onChange={(e) => setIngredients(e.target.value)}
            rows={6}
          />
        </label>

        <label className="form-label">
          Instructions
          <textarea
            className="form-textarea"
            placeholder={"Write the steps...\n\ne.g.\n1. Mix yeast with warm water\n2. Add eggs and flour\n3. Knead for 10 minutes"}
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
