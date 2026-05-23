import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { collection, addDoc, doc, updateDoc, arrayUnion, serverTimestamp } from 'firebase/firestore'
import { db } from '../firebase'
import { useAuth } from '../contexts/AuthContext'
import { generateInviteCode } from '../utils/inviteCode'
import Header from '../components/Header'
import './CreateGroupPage.css'

export default function CreateGroupPage() {
  const { user, refreshUser } = useAuth()
  const navigate = useNavigate()
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [saving, setSaving] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!name.trim() || saving) return
    setSaving(true)
    try {
      const groupRef = await addDoc(collection(db, 'groups'), {
        name: name.trim(),
        description: description.trim(),
        inviteCode: generateInviteCode(),
        managerIds: [user.uid],
        memberIds: [user.uid],
        createdAt: serverTimestamp(),
      })
      await updateDoc(doc(db, 'users', user.uid), {
        groupIds: arrayUnion(groupRef.id),
      })
      await refreshUser()
      navigate(`/group/${groupRef.id}`, { replace: true })
    } catch (error) {
      console.error('Failed to create group:', error)
      setSaving(false)
    }
  }

  return (
    <div className="create-group-page">
      <Header title="Create Group" showBack />
      <form className="create-group-form" onSubmit={handleSubmit}>
        <label className="form-label">
          Group Name
          <input
            className="form-input"
            type="text"
            placeholder="e.g. Morgenstern Family"
            value={name}
            onChange={(e) => setName(e.target.value)}
            autoFocus
          />
        </label>

        <label className="form-label">
          Description (optional)
          <textarea
            className="form-textarea"
            placeholder="What's this group about?"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={3}
          />
        </label>

        <button className="btn-primary" type="submit" disabled={!name.trim() || saving}>
          {saving ? 'Creating...' : 'Create Group'}
        </button>
      </form>
    </div>
  )
}
