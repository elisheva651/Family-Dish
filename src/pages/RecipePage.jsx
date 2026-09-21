import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import {
  doc, getDoc, updateDoc, collection, query, orderBy, onSnapshot,
  addDoc, deleteDoc, serverTimestamp, getDocs, where
} from 'firebase/firestore'
import { db } from '../firebase'
import { useAuth } from '../contexts/AuthContext'
import { useLanguage } from '../contexts/LanguageContext'
import { translateMultiple, detectLanguage } from '../utils/translate'
import Header from '../components/Header'
import CategoryPicker from '../components/CategoryPicker'
import {
  getRecipeCategory, getCategoryLabel, collectCustomCategories, resolveCategoryInput,
} from '../utils/categories'
import './RecipePage.css'

export default function RecipePage() {
  const { groupId, recipeId } = useParams()
  const { user } = useAuth()
  const { language, t } = useLanguage()
  const navigate = useNavigate()
  const [recipe, setRecipe] = useState(null)
  const [author, setAuthor] = useState(null)
  const [comments, setComments] = useState([])
  const [commentUsers, setCommentUsers] = useState({})
  const [activeTab, setActiveTab] = useState('recipe')
  const [commentText, setCommentText] = useState('')
  const [sending, setSending] = useState(false)
  const [loading, setLoading] = useState(true)

  // Categorizing a dish that predates categories. Only its owner may do this.
  const [pickerOpen, setPickerOpen] = useState(false)
  const [pendingCategory, setPendingCategory] = useState(null)
  const [suggestions, setSuggestions] = useState([])
  const [savingCategory, setSavingCategory] = useState(false)
  const [categoryError, setCategoryError] = useState(false)

  // Per-recipe language override (null = use global)
  const [recipeLanguage, setRecipeLanguage] = useState(null)
  const [translatedContent, setTranslatedContent] = useState(null)
  const [translating, setTranslating] = useState(false)
  const [translationError, setTranslationError] = useState(false)

  const effectiveLanguage = recipeLanguage || language
  const isAuthor = recipe?.authorId === user?.uid

  // Fetch recipe
  useEffect(() => {
    async function fetchRecipe() {
      const recipeSnap = await getDoc(doc(db, 'recipes', recipeId))
      if (!recipeSnap.exists()) return
      const recipeData = { id: recipeSnap.id, ...recipeSnap.data() }

      // Backfill originalLanguage for existing recipes
      if (!recipeData.originalLanguage) {
        try {
          const detected = await detectLanguage(
            recipeData.title + ' ' + (recipeData.ingredients || '').slice(0, 100)
          )
          await updateDoc(doc(db, 'recipes', recipeId), { originalLanguage: detected })
          recipeData.originalLanguage = detected
        } catch (err) {
          console.error('Language detection failed:', err)
          recipeData.originalLanguage = 'en'
        }
      }

      setRecipe(recipeData)

      const authorSnap = await getDoc(doc(db, 'users', recipeData.authorId))
      if (authorSnap.exists()) setAuthor(authorSnap.data())

      setLoading(false)
    }
    fetchRecipe()
  }, [recipeId])

  // Translate recipe content when language differs from original
  useEffect(() => {
    if (!recipe) return

    const targetLang = effectiveLanguage
    if (targetLang === recipe.originalLanguage) {
      setTranslatedContent(null)
      setTranslationError(false)
      return
    }

    // Check Firestore cache
    const cached = recipe.translations?.[targetLang]
    if (cached) {
      setTranslatedContent(cached)
      setTranslationError(false)
      return
    }

    // Translate on demand
    let cancelled = false
    async function translate() {
      setTranslating(true)
      setTranslationError(false)
      try {
        const [title, ingredients, instructions] = await translateMultiple(
          [recipe.title, recipe.ingredients, recipe.instructions],
          targetLang
        )
        if (cancelled) return

        const translation = {
          title,
          ingredients,
          instructions,
          translatedAt: new Date().toISOString()
        }

        // Cache to Firestore
        try {
          await updateDoc(doc(db, 'recipes', recipeId), {
            [`translations.${targetLang}`]: translation
          })
        } catch (cacheErr) {
          console.error('Failed to cache translation:', cacheErr)
        }

        setTranslatedContent(translation)
        setRecipe(prev => ({
          ...prev,
          translations: { ...prev.translations, [targetLang]: translation }
        }))
      } catch (err) {
        console.error('Translation failed:', err)
        if (!cancelled) setTranslationError(true)
      }
      if (!cancelled) setTranslating(false)
    }
    translate()
    return () => { cancelled = true }
  }, [effectiveLanguage, recipe?.originalLanguage, recipeId])

  // Get display content (translated or original)
  const displayTitle = translatedContent?.title || recipe?.title
  const displayIngredients = translatedContent?.ingredients || recipe?.ingredients
  const displayInstructions = translatedContent?.instructions || recipe?.instructions

  // Comments listener
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

  const category = recipe ? getRecipeCategory(recipe) : null

  const openCategoryPicker = async () => {
    setPickerOpen(true)
    setCategoryError(false)
    try {
      const snap = await getDocs(
        query(collection(db, 'recipes'), where('groupId', '==', groupId))
      )
      setSuggestions(collectCustomCategories(snap.docs.map(d => d.data())))
    } catch (err) {
      console.error('Failed to load categories:', err)
    }
  }

  const handleSaveCategory = async () => {
    const resolved = resolveCategoryInput(pendingCategory)
    if (!resolved || savingCategory) return
    setSavingCategory(true)
    setCategoryError(false)
    try {
      await updateDoc(doc(db, 'recipes', recipeId), { category: resolved })
      setRecipe(prev => ({ ...prev, category: resolved }))
      setPickerOpen(false)
      setPendingCategory(null)
    } catch (error) {
      console.error('Failed to save category:', error)
      setCategoryError(true)
    }
    setSavingCategory(false)
  }

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
    if (!confirm(t('recipe.deleteComment'))) return
    await deleteDoc(doc(db, 'recipes', recipeId, 'comments', commentId))
  }

  const handleDeleteRecipe = async () => {
    if (!confirm(t('recipe.deleteConfirm'))) return
    try {
      const commentsSnap = await getDocs(collection(db, 'recipes', recipeId, 'comments'))
      for (const commentDoc of commentsSnap.docs) {
        await deleteDoc(commentDoc.ref)
      }
      await deleteDoc(doc(db, 'recipes', recipeId))
      navigate(`/group/${groupId}`, { replace: true })
    } catch (error) {
      console.error('Failed to delete recipe:', error)
    }
  }

  const toggleRecipeLanguage = () => {
    const current = effectiveLanguage
    setRecipeLanguage(current === 'en' ? 'he' : 'en')
  }

  if (loading) return <div className="loading">{t('app.loading')}</div>
  if (!recipe) return <div className="loading">{t('recipe.notFound')}</div>

  return (
    <div className="recipe-page">
      <Header title={displayTitle || recipe.title} showBack />

      <div className="recipe-lang-toggle-bar">
        <button className="recipe-lang-toggle" onClick={toggleRecipeLanguage}>
          <span>🌐</span>
          <span className={effectiveLanguage === 'en' ? 'active' : ''}>EN</span>
          <span>/</span>
          <span className={effectiveLanguage === 'he' ? 'active' : ''}>עב</span>
        </button>
      </div>

      <div className="recipe-hero-placeholder">🍽️</div>

      <div className="recipe-meta">
        <span>{t('recipe.by')} {author?.displayName || t('recipe.unknown')}</span>
        {category && (
          <span className="recipe-meta-category">{getCategoryLabel(category, t)}</span>
        )}
      </div>

      {!category && isAuthor && (
        <div className="category-prompt">
          {pickerOpen ? (
            <>
              <CategoryPicker
                value={pendingCategory}
                onChange={setPendingCategory}
                suggestions={suggestions}
              />
              {categoryError && (
                <p className="category-prompt-error">{t('category.saveFailed')}</p>
              )}
              <div className="category-prompt-actions">
                <button
                  className="btn-category-save"
                  onClick={handleSaveCategory}
                  disabled={!resolveCategoryInput(pendingCategory) || savingCategory}
                >
                  {savingCategory ? t('category.saving') : t('category.save')}
                </button>
                <button
                  className="btn-category-cancel"
                  onClick={() => setPickerOpen(false)}
                >
                  {t('category.cancel')}
                </button>
              </div>
            </>
          ) : (
            <>
              <span className="category-prompt-text">{t('category.needsCategory')}</span>
              <button className="btn-category-choose" onClick={openCategoryPicker}>
                {t('category.chooseOne')}
              </button>
            </>
          )}
        </div>
      )}

      {isAuthor && (
        <div className="recipe-actions">
          <button
            className="btn-edit-recipe"
            onClick={() => navigate(`/group/${groupId}/recipe/${recipeId}/edit`)}
          >
            {t('recipe.editRecipe')}
          </button>
          <button className="btn-delete-recipe" onClick={handleDeleteRecipe}>
            {t('recipe.delete')}
          </button>
        </div>
      )}

      <div className="group-tabs">
        <button
          className={`group-tab ${activeTab === 'recipe' ? 'active' : ''}`}
          onClick={() => setActiveTab('recipe')}
        >
          {t('recipe.tab')}
        </button>
        <button
          className={`group-tab ${activeTab === 'comments' ? 'active' : ''}`}
          onClick={() => setActiveTab('comments')}
        >
          {t('recipe.comments')} ({comments.length})
        </button>
      </div>

      {activeTab === 'recipe' && (
        <div className="recipe-content">
          {translating && (
            <div className="recipe-translating">{t('recipe.translating')}</div>
          )}
          {translationError && (
            <div className="recipe-translation-error">{t('recipe.translationFailed')}</div>
          )}
          <div className="recipe-section">
            <h3>{t('recipe.ingredients')}</h3>
            <div className="recipe-text">
              {displayIngredients?.split('\n').map((line, i) => (
                <p key={i}>{line}</p>
              ))}
            </div>
          </div>
          <div className="recipe-section">
            <h3>{t('recipe.instructions')}</h3>
            <div className="recipe-text">
              {displayInstructions?.split('\n').map((line, i) => (
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
              <p className="comments-empty">{t('recipe.noComments')}</p>
            )}
            {comments.map(comment => (
              <div key={comment.id} className="comment-item">
                <div className="comment-header">
                  <span className="comment-author">
                    {commentUsers[comment.authorId]?.displayName || t('recipe.anonymous')}
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
              placeholder={t('recipe.commentPlaceholder')}
              value={commentText}
              onChange={(e) => setCommentText(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSendComment()}
            />
            <button
              className="comment-send-btn"
              onClick={handleSendComment}
              disabled={!commentText.trim() || sending}
            >
              {t('recipe.send')}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
