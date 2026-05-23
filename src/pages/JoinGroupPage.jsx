import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { collection, query, where, getDocs, addDoc, serverTimestamp } from 'firebase/firestore'
import { db } from '../firebase'
import { useAuth } from '../contexts/AuthContext'
import Header from '../components/Header'
import './JoinGroupPage.css'

export default function JoinGroupPage() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [search, setSearch] = useState('')
  const [results, setResults] = useState([])
  const [searched, setSearched] = useState(false)
  const [selectedGroup, setSelectedGroup] = useState(null)
  const [inviteCode, setInviteCode] = useState('')
  const [status, setStatus] = useState(null)

  const handleSearch = async (e) => {
    e.preventDefault()
    if (!search.trim()) return
    const q = query(collection(db, 'groups'), where('name', '>=', search.trim()), where('name', '<=', search.trim() + '\uf8ff'))
    const snap = await getDocs(q)
    setResults(snap.docs.map(d => ({ id: d.id, ...d.data() })))
    setSearched(true)
    setSelectedGroup(null)
    setInviteCode('')
    setStatus(null)
  }

  const handleJoinRequest = async () => {
    if (!inviteCode.trim() || !selectedGroup || status === 'sending') return

    if (inviteCode.trim().toUpperCase() !== selectedGroup.inviteCode) {
      setStatus('wrong-code')
      return
    }

    if (selectedGroup.memberIds?.includes(user.uid)) {
      setStatus('already-member')
      return
    }

    setStatus('sending')
    try {
      await addDoc(collection(db, 'groups', selectedGroup.id, 'joinRequests'), {
        userId: user.uid,
        displayName: user.displayName || user.email,
        status: 'pending',
        createdAt: serverTimestamp(),
      })
      setStatus('sent')
    } catch (error) {
      console.error('Failed to send join request:', error)
      setStatus('error')
    }
  }

  return (
    <div className="join-group-page">
      <Header title="Join Group" showBack />

      <div className="join-content">
        <form className="search-form" onSubmit={handleSearch}>
          <input
            className="form-input"
            type="text"
            placeholder="Search group by name..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            autoFocus
          />
          <button className="btn-primary" type="submit">Search</button>
        </form>

        {searched && results.length === 0 && (
          <p className="join-empty">No groups found with that name</p>
        )}

        {results.length > 0 && !selectedGroup && (
          <div className="search-results">
            {results.map(group => (
              <button
                key={group.id}
                className="group-card"
                onClick={() => setSelectedGroup(group)}
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
              </button>
            ))}
          </div>
        )}

        {selectedGroup && status !== 'sent' && (
          <div className="invite-code-section">
            <p className="invite-code-label">
              Enter the invite code for <strong>{selectedGroup.name}</strong>
            </p>
            <input
              className="form-input invite-code-input"
              type="text"
              placeholder="e.g. K7MX2P"
              value={inviteCode}
              onChange={(e) => {
                setInviteCode(e.target.value.toUpperCase())
                setStatus(null)
              }}
              maxLength={6}
              autoFocus
            />
            {status === 'wrong-code' && (
              <p className="join-error">Wrong invite code. Try again.</p>
            )}
            {status === 'already-member' && (
              <p className="join-error">You're already a member of this group.</p>
            )}
            {status === 'error' && (
              <p className="join-error">Something went wrong. Please try again.</p>
            )}
            <button
              className="btn-primary"
              onClick={handleJoinRequest}
              disabled={inviteCode.length !== 6 || status === 'sending'}
            >
              {status === 'sending' ? 'Sending...' : 'Request to Join'}
            </button>
          </div>
        )}

        {status === 'sent' && (
          <div className="join-success">
            <div className="join-success-icon">✓</div>
            <p>Request sent!</p>
            <p className="join-success-sub">
              The group manager will review your request. You'll see the group on your home screen once approved.
            </p>
            <button className="btn-secondary" onClick={() => navigate('/')}>
              Back to Home
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
