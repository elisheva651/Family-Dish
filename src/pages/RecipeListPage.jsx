import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { collection, query, where, getDocs, doc, getDoc } from 'firebase/firestore'
import { db } from '../firebase'
import { useLanguage } from '../contexts/LanguageContext'
import {
  getRecipeCategory, getCategoryLabel, groupRecipesByCategory, UNCATEGORIZED_PARAM,
} from '../utils/categories'
import Header from '../components/Header'
import './RecipeListPage.css'

export default function RecipeListPage() {
  const { groupId, memberId, tag } = useParams()
  const { t } = useLanguage()
  const navigate = useNavigate()
  const [recipes, setRecipes] = useState([])
  const [title, setTitle] = useState('')
  const [openCategories, setOpenCategories] = useState([])
  const [loading, setLoading] = useState(true)

  const selectedCategory = tag
    ? (decodeURIComponent(tag) === UNCATEGORIZED_PARAM ? null : decodeURIComponent(tag))
    : undefined

  useEffect(() => {
    async function fetchRecipes() {
      // Always read the group's recipes and narrow them here: recipes written
      // before categories existed carry a `tags` array instead, and only
      // getRecipeCategory knows how to read both.
      const snap = await getDocs(
        query(collection(db, 'recipes'), where('groupId', '==', groupId))
      )
      const all = snap.docs.map(d => ({ id: d.id, ...d.data() }))

      if (memberId) {
        setRecipes(all.filter(r => r.authorId === memberId))
        const memberSnap = await getDoc(doc(db, 'users', memberId))
        setTitle(
          memberSnap.exists()
            ? memberSnap.data().displayName || t('recipeList.recipes')
            : t('recipeList.recipes')
        )
      } else {
        setRecipes(all.filter(r => getRecipeCategory(r) === selectedCategory))
        setTitle(getCategoryLabel(selectedCategory, t))
      }

      setLoading(false)
    }
    fetchRecipes()
  }, [groupId, memberId, tag])

  const toggleCategory = (category) => {
    setOpenCategories(prev =>
      prev.includes(category) ? prev.filter(c => c !== category) : [...prev, category]
    )
  }

  const openRecipe = (recipeId) => navigate(`/group/${groupId}/recipe/${recipeId}`)

  if (loading) return <div className="loading">{t('app.loading')}</div>

  const groups = groupRecipesByCategory(recipes)

  return (
    <div className="recipe-list-page">
      <Header title={title} showBack />

      {recipes.length === 0 ? (
        <p className="recipe-list-empty">{t('recipeList.noRecipes')}</p>
      ) : memberId ? (
        <div className="category-accordion">
          {groups.map(({ category, recipes: categoryRecipes }) => {
            const isOpen = openCategories.includes(category)
            return (
              <div
                key={category === null ? UNCATEGORIZED_PARAM : category}
                className={`accordion-section ${category === null ? 'uncategorized' : ''}`}
              >
                <button
                  className="accordion-header"
                  aria-expanded={isOpen}
                  onClick={() => toggleCategory(category)}
                >
                  <span className="accordion-arrow">{isOpen ? '▾' : '▸'}</span>
                  <span className="accordion-name">{getCategoryLabel(category, t)}</span>
                  <span className="accordion-count">{categoryRecipes.length}</span>
                </button>

                {isOpen && (
                  <div className="accordion-body">
                    {categoryRecipes.map(recipe => (
                      <button
                        key={recipe.id}
                        className="accordion-recipe"
                        onClick={() => openRecipe(recipe.id)}
                      >
                        <span className="accordion-recipe-icon">🍽️</span>
                        <span className="accordion-recipe-title">{recipe.title}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      ) : (
        <div className="recipe-list">
          {recipes.map(recipe => (
            <button
              key={recipe.id}
              className="recipe-card"
              onClick={() => openRecipe(recipe.id)}
            >
              <div className="recipe-card-photo">
                <span>🍽️</span>
              </div>
              <div className="recipe-card-info">
                <div className="recipe-card-title">{recipe.title}</div>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
