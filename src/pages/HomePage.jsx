import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { collection, query, where, getDocs } from 'firebase/firestore'
import { db } from '../firebase'
import { useAuth } from '../contexts/AuthContext'
import Header from '../components/Header'
import './HomePage.css'

export default function HomePage() {
  const { user, logOut } = useAuth()
  const navigate = useNavigate()
  const [groups, setGroups] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchGroups() {
      if (!user?.groupIds?.length) {
        setGroups([])
        setLoading(false)
        return
      }
      const q = query(
        collection(db, 'groups'),
        where('__name__', 'in', user.groupIds)
      )
      const snap = await getDocs(q)
      setGroups(snap.docs.map(d => ({ id: d.id, ...d.data() })))
      setLoading(false)
    }
    fetchGroups()
  }, [user?.groupIds])

  return (
    <div className="home-page">
      <Header
        title="Family Dish"
        rightAction={
          <button className="header-logout" onClick={logOut}>
            Sign out
          </button>
        }
      />

      {loading ? (
        <div className="home-loading">Loading groups...</div>
      ) : groups.length === 0 ? (
        <div className="home-empty">
          <div className="home-empty-icon">🍽️</div>
          <p>No groups yet</p>
          <p className="home-empty-sub">Create a group or join one to start sharing recipes!</p>
        </div>
      ) : (
        <div className="group-list">
          {groups.map(group => (
            <button
              key={group.id}
              className="group-card"
              onClick={() => navigate(`/group/${group.id}`)}
            >
              <div
                className="group-card-icon"
                style={{ background: `hsl(${group.name.length * 40}, 60%, 55%)` }}
              >
                {group.name[0].toUpperCase()}
              </div>
              <div className="group-card-info">
                <div className="group-card-name">{group.name}</div>
                <div className="group-card-meta">
                  {group.memberIds?.length || 0} members
                </div>
              </div>
              <span className="group-card-arrow">›</span>
            </button>
          ))}
        </div>
      )}

      <div className="home-actions">
        <button className="btn-primary" onClick={() => navigate('/create-group')}>
          + Create Group
        </button>
        <button className="btn-secondary" onClick={() => navigate('/join-group')}>
          Join Group
        </button>
      </div>
    </div>
  )
}
