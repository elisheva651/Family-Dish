import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { doc, getDoc, collection, query, where, getDocs } from 'firebase/firestore'
import { db } from '../firebase'
import { useAuth } from '../contexts/AuthContext'
import Header from '../components/Header'
import FloatingButton from '../components/FloatingButton'
import './GroupPage.css'

export default function GroupPage() {
  const { groupId } = useParams()
  const { user } = useAuth()
  const navigate = useNavigate()
  const [group, setGroup] = useState(null)
  const [members, setMembers] = useState([])
  const [recipes, setRecipes] = useState([])
  const [activeTab, setActiveTab] = useState('people')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchData() {
      const groupSnap = await getDoc(doc(db, 'groups', groupId))
      if (!groupSnap.exists()) return
      const groupData = { id: groupSnap.id, ...groupSnap.data() }
      setGroup(groupData)

      if (groupData.memberIds?.length) {
        const memberSnap = await getDocs(
          query(collection(db, 'users'), where('__name__', 'in', groupData.memberIds))
        )
        setMembers(memberSnap.docs.map(d => ({ uid: d.id, ...d.data() })))
      }

      const recipeSnap = await getDocs(
        query(collection(db, 'recipes'), where('groupId', '==', groupId))
      )
      setRecipes(recipeSnap.docs.map(d => ({ id: d.id, ...d.data() })))

      setLoading(false)
    }
    fetchData()
  }, [groupId])

  const tagCounts = recipes.reduce((acc, r) => {
    (r.tags || []).forEach(tag => {
      acc[tag] = (acc[tag] || 0) + 1
    })
    return acc
  }, {})

  const recipeCounts = recipes.reduce((acc, r) => {
    acc[r.authorId] = (acc[r.authorId] || 0) + 1
    return acc
  }, {})

  if (loading) return <div className="loading">Loading...</div>
  if (!group) return <div className="loading">Group not found</div>

  return (
    <div className="group-page">
      <Header
        title={group.name}
        showBack
        rightAction={
          <button
            className="header-settings"
            onClick={() => navigate(`/group/${groupId}/settings`)}
          >
            ⚙
          </button>
        }
      />

      <div className="group-tabs">
        <button
          className={`group-tab ${activeTab === 'people' ? 'active' : ''}`}
          onClick={() => setActiveTab('people')}
        >
          People
        </button>
        <button
          className={`group-tab ${activeTab === 'categories' ? 'active' : ''}`}
          onClick={() => setActiveTab('categories')}
        >
          Categories
        </button>
      </div>

      {activeTab === 'people' && (
        <div className="people-grid">
          {members.map(member => (
            <button
              key={member.uid}
              className="member-card"
              onClick={() => navigate(`/group/${groupId}/member/${member.uid}`)}
            >
              <div className="member-avatar">
                {member.photoURL ? (
                  <img src={member.photoURL} alt="" referrerPolicy="no-referrer" />
                ) : (
                  <span>{(member.displayName || '?')[0].toUpperCase()}</span>
                )}
              </div>
              <div className="member-name">{member.displayName || 'Anonymous'}</div>
              <div className="member-recipe-count">
                {recipeCounts[member.uid] || 0} recipes
              </div>
            </button>
          ))}
        </div>
      )}

      {activeTab === 'categories' && (
        <div className="categories-list">
          {Object.keys(tagCounts).length === 0 ? (
            <p className="categories-empty">No categories yet. Add tags when creating recipes!</p>
          ) : (
            Object.entries(tagCounts)
              .sort((a, b) => b[1] - a[1])
              .map(([tag, count]) => (
                <button
                  key={tag}
                  className="category-card"
                  onClick={() => navigate(`/group/${groupId}/tag/${encodeURIComponent(tag)}`)}
                >
                  <span className="category-name">{tag}</span>
                  <span className="category-count">{count} recipes</span>
                </button>
              ))
          )}
        </div>
      )}

      <FloatingButton onClick={() => navigate(`/group/${groupId}/add-recipe`)} />
    </div>
  )
}
