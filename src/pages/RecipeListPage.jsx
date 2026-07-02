import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { collection, query, where, getDocs, doc, getDoc } from 'firebase/firestore'
import { db } from '../firebase'
import { useLanguage } from '../contexts/LanguageContext'
import Header from '../components/Header'
import './RecipeListPage.css'

export default function RecipeListPage() {
  const { groupId, memberId, tag } = useParams()
  const { t } = useLanguage()
  const navigate = useNavigate()
  const [recipes, setRecipes] = useState([])
  const [title, setTitle] = useState('')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchRecipes() {
      let q
      if (memberId) {
        q = query(
          collection(db, 'recipes'),
          where('groupId', '==', groupId),
          where('authorId', '==', memberId)
        )
        const memberSnap = await getDoc(doc(db, 'users', memberId))
        setTitle(memberSnap.exists() ? memberSnap.data().displayName || t('recipeList.recipes') : t('recipeList.recipes'))
      } else if (tag) {
        q = query(
          collection(db, 'recipes'),
          where('groupId', '==', groupId),
          where('tags', 'array-contains', decodeURIComponent(tag))
        )
        setTitle(decodeURIComponent(tag))
      }

      const snap = await getDocs(q)
      setRecipes(snap.docs.map(d => ({ id: d.id, ...d.data() })))
      setLoading(false)
    }
    fetchRecipes()
  }, [groupId, memberId, tag])

  if (loading) return <div className="loading">{t('app.loading')}</div>

  return (
    <div className="recipe-list-page">
      <Header title={title} showBack />

      {recipes.length === 0 ? (
        <p className="recipe-list-empty">{t('recipeList.noRecipes')}</p>
      ) : (
        <div className="recipe-list">
          {recipes.map(recipe => (
            <button
              key={recipe.id}
              className="recipe-card"
              onClick={() => navigate(`/group/${groupId}/recipe/${recipe.id}`)}
            >
              <div className="recipe-card-photo">
                <span>🍽️</span>
              </div>
              <div className="recipe-card-info">
                <div className="recipe-card-title">{recipe.title}</div>
                {recipe.tags?.length > 0 && (
                  <div className="recipe-card-tags">
                    {recipe.tags.map(tagName => (
                      <span key={tagName} className="recipe-tag">{tagName}</span>
                    ))}
                  </div>
                )}
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
