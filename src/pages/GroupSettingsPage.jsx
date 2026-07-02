import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { doc, getDoc, updateDoc, arrayRemove, arrayUnion, collection, query, where, getDocs } from 'firebase/firestore'
import { db } from '../firebase'
import { useAuth } from '../contexts/AuthContext'
import { useLanguage } from '../contexts/LanguageContext'
import { generateInviteCode } from '../utils/inviteCode'
import Header from '../components/Header'
import './GroupSettingsPage.css'

export default function GroupSettingsPage() {
  const { groupId } = useParams()
  const { user, refreshUser } = useAuth()
  const { t } = useLanguage()
  const navigate = useNavigate()

  const [group, setGroup] = useState(null)
  const [members, setMembers] = useState([])
  const [joinRequests, setJoinRequests] = useState([])
  const [loading, setLoading] = useState(true)

  const [editingName, setEditingName] = useState(false)
  const [editingDesc, setEditingDesc] = useState(false)
  const [nameValue, setNameValue] = useState('')
  const [descValue, setDescValue] = useState('')
  const [saving, setSaving] = useState(false)
  const [copied, setCopied] = useState(false)

  const isManager = group?.managerIds?.includes(user.uid)

  useEffect(() => {
    fetchData()
  }, [groupId])

  async function fetchData() {
    try {
      const groupSnap = await getDoc(doc(db, 'groups', groupId))
      if (!groupSnap.exists()) {
        setLoading(false)
        return
      }
      const groupData = { id: groupSnap.id, ...groupSnap.data() }
      setGroup(groupData)
      setNameValue(groupData.name)
      setDescValue(groupData.description || '')

      if (groupData.memberIds?.length) {
        const memberSnap = await getDocs(
          query(collection(db, 'users'), where('__name__', 'in', groupData.memberIds))
        )
        setMembers(memberSnap.docs.map(d => ({ uid: d.id, ...d.data() })))
      }

      const reqSnap = await getDocs(
        query(
          collection(db, 'groups', groupId, 'joinRequests'),
          where('status', '==', 'pending')
        )
      )
      setJoinRequests(reqSnap.docs.map(d => ({ id: d.id, ...d.data() })))

      setLoading(false)
    } catch (error) {
      console.error('Failed to fetch group settings:', error)
      setLoading(false)
    }
  }

  const handleCopyCode = async () => {
    try {
      await navigator.clipboard.writeText(group.inviteCode)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      const textarea = document.createElement('textarea')
      textarea.value = group.inviteCode
      document.body.appendChild(textarea)
      textarea.select()
      document.execCommand('copy')
      document.body.removeChild(textarea)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  const handleSaveName = async () => {
    if (!nameValue.trim() || saving) return
    setSaving(true)
    try {
      await updateDoc(doc(db, 'groups', groupId), { name: nameValue.trim() })
      setGroup(prev => ({ ...prev, name: nameValue.trim() }))
      setEditingName(false)
    } catch (error) {
      console.error('Failed to update name:', error)
    }
    setSaving(false)
  }

  const handleSaveDesc = async () => {
    if (saving) return
    setSaving(true)
    try {
      await updateDoc(doc(db, 'groups', groupId), { description: descValue.trim() })
      setGroup(prev => ({ ...prev, description: descValue.trim() }))
      setEditingDesc(false)
    } catch (error) {
      console.error('Failed to update description:', error)
    }
    setSaving(false)
  }

  const handleRegenerateCode = async () => {
    if (!window.confirm(t('settings.regenerateConfirm'))) return
    try {
      const newCode = generateInviteCode()
      await updateDoc(doc(db, 'groups', groupId), { inviteCode: newCode })
      setGroup(prev => ({ ...prev, inviteCode: newCode }))
    } catch (error) {
      console.error('Failed to regenerate code:', error)
    }
  }

  const handleApproveRequest = async (request) => {
    try {
      await updateDoc(doc(db, 'groups', groupId, 'joinRequests', request.id), { status: 'approved' })
      await updateDoc(doc(db, 'groups', groupId), { memberIds: arrayUnion(request.userId) })
      await updateDoc(doc(db, 'users', request.userId), { groupIds: arrayUnion(groupId) })
      setJoinRequests(prev => prev.filter(r => r.id !== request.id))
      await fetchData()
    } catch (error) {
      console.error('Failed to approve request:', error)
    }
  }

  const handleRejectRequest = async (request) => {
    try {
      await updateDoc(doc(db, 'groups', groupId, 'joinRequests', request.id), { status: 'rejected' })
      setJoinRequests(prev => prev.filter(r => r.id !== request.id))
    } catch (error) {
      console.error('Failed to reject request:', error)
    }
  }

  const handlePromote = async (memberId) => {
    if (!window.confirm(t('settings.promoteConfirm'))) return
    try {
      await updateDoc(doc(db, 'groups', groupId), { managerIds: arrayUnion(memberId) })
      setGroup(prev => ({ ...prev, managerIds: [...prev.managerIds, memberId] }))
    } catch (error) {
      console.error('Failed to promote member:', error)
    }
  }

  const handleDemote = async (memberId) => {
    if (!window.confirm(t('settings.demoteConfirm'))) return
    try {
      await updateDoc(doc(db, 'groups', groupId), { managerIds: arrayRemove(memberId) })
      setGroup(prev => ({ ...prev, managerIds: prev.managerIds.filter(id => id !== memberId) }))
    } catch (error) {
      console.error('Failed to demote manager:', error)
    }
  }

  const handleRemoveMember = async (memberId) => {
    if (!window.confirm(t('settings.removeConfirm'))) return
    try {
      await updateDoc(doc(db, 'groups', groupId), { memberIds: arrayRemove(memberId), managerIds: arrayRemove(memberId) })
      await updateDoc(doc(db, 'users', memberId), { groupIds: arrayRemove(groupId) })
      setMembers(prev => prev.filter(m => m.uid !== memberId))
      setGroup(prev => ({ ...prev, memberIds: prev.memberIds.filter(id => id !== memberId), managerIds: prev.managerIds.filter(id => id !== memberId) }))
    } catch (error) {
      console.error('Failed to remove member:', error)
    }
  }

  const handleLeaveGroup = async () => {
    const isLastManager = isManager && group.managerIds.length === 1
    const message = isLastManager ? t('settings.leaveLastManager') : t('settings.leaveConfirm')
    if (!window.confirm(message)) return
    try {
      await updateDoc(doc(db, 'groups', groupId), { memberIds: arrayRemove(user.uid), managerIds: arrayRemove(user.uid) })
      await updateDoc(doc(db, 'users', user.uid), { groupIds: arrayRemove(groupId) })
      await refreshUser()
      navigate('/', { replace: true })
    } catch (error) {
      console.error('Failed to leave group:', error)
    }
  }

  if (loading) return <div className="loading">{t('app.loading')}</div>
  if (!group) return <div className="loading">{t('group.notFound')}</div>

  return (
    <div className="settings-page">
      <Header title={t('settings.title')} showBack />
      <div className="settings-content">
        <section className="settings-section">
          <h2 className="settings-section-title">{t('settings.groupInfo')}</h2>
          <div className="settings-field">
            <div className="settings-field-header">
              <span className="settings-field-label">{t('settings.name')}</span>
              {isManager && !editingName && (
                <button className="settings-edit-btn" onClick={() => setEditingName(true)}>{t('settings.edit')}</button>
              )}
            </div>
            {editingName ? (
              <div className="settings-edit-row">
                <input className="form-input" type="text" value={nameValue} onChange={(e) => setNameValue(e.target.value)} autoFocus />
                <button className="btn-save" onClick={handleSaveName} disabled={!nameValue.trim() || saving}>{saving ? '...' : t('settings.save')}</button>
                <button className="btn-cancel" onClick={() => { setEditingName(false); setNameValue(group.name) }}>{t('settings.cancel')}</button>
              </div>
            ) : (
              <p className="settings-field-value">{group.name}</p>
            )}
          </div>
          <div className="settings-field">
            <div className="settings-field-header">
              <span className="settings-field-label">{t('settings.description')}</span>
              {isManager && !editingDesc && (
                <button className="settings-edit-btn" onClick={() => setEditingDesc(true)}>{t('settings.edit')}</button>
              )}
            </div>
            {editingDesc ? (
              <div className="settings-edit-row">
                <textarea className="form-textarea" value={descValue} onChange={(e) => setDescValue(e.target.value)} rows={3} autoFocus />
                <div className="settings-edit-actions">
                  <button className="btn-save" onClick={handleSaveDesc} disabled={saving}>{saving ? '...' : t('settings.save')}</button>
                  <button className="btn-cancel" onClick={() => { setEditingDesc(false); setDescValue(group.description || '') }}>{t('settings.cancel')}</button>
                </div>
              </div>
            ) : (
              <p className="settings-field-value">{group.description || <span className="text-muted">{t('settings.noDescription')}</span>}</p>
            )}
          </div>
        </section>

        <section className="settings-section">
          <h2 className="settings-section-title">{t('settings.inviteCode')}</h2>
          <div className="invite-code-box">
            <span className="invite-code-display">{group.inviteCode}</span>
            <button className="btn-copy" onClick={handleCopyCode}>{copied ? t('settings.copied') : t('settings.copy')}</button>
          </div>
          {isManager && (
            <button className="btn-secondary btn-small" onClick={handleRegenerateCode}>{t('settings.regenerateCode')}</button>
          )}
        </section>

        {isManager && joinRequests.length > 0 && (
          <section className="settings-section">
            <h2 className="settings-section-title">{t('settings.pendingRequests')}<span className="settings-badge">{joinRequests.length}</span></h2>
            <div className="request-list">
              {joinRequests.map(request => (
                <div key={request.id} className="request-card">
                  <div className="request-info"><span className="request-name">{request.displayName}</span></div>
                  <div className="request-actions">
                    <button className="btn-approve" onClick={() => handleApproveRequest(request)}>{t('settings.approve')}</button>
                    <button className="btn-reject" onClick={() => handleRejectRequest(request)}>{t('settings.reject')}</button>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        <section className="settings-section">
          <h2 className="settings-section-title">{t('settings.membersTitle')}<span className="settings-count">{members.length}</span></h2>
          <div className="member-list">
            {members.map(member => {
              const memberIsManager = group.managerIds?.includes(member.uid)
              const isSelf = member.uid === user.uid
              return (
                <div key={member.uid} className="settings-member-card">
                  <div className="settings-member-info">
                    <div className="settings-member-avatar">
                      {member.photoURL ? (
                        <img src={member.photoURL} alt="" referrerPolicy="no-referrer" />
                      ) : (
                        <span>{(member.displayName || '?')[0].toUpperCase()}</span>
                      )}
                    </div>
                    <div className="settings-member-details">
                      <span className="settings-member-name">
                        {member.displayName || t('recipe.anonymous')}
                        {isSelf && <span className="text-muted"> {t('settings.you')}</span>}
                      </span>
                      {memberIsManager && <span className="manager-badge">{t('settings.manager')}</span>}
                    </div>
                  </div>
                  {isManager && !isSelf && (
                    <div className="settings-member-actions">
                      {memberIsManager ? (
                        <button className="btn-action btn-demote" onClick={() => handleDemote(member.uid)}>{t('settings.demote')}</button>
                      ) : (
                        <>
                          <button className="btn-action btn-promote" onClick={() => handlePromote(member.uid)}>{t('settings.promote')}</button>
                          <button className="btn-action btn-remove" onClick={() => handleRemoveMember(member.uid)}>{t('settings.remove')}</button>
                        </>
                      )}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </section>

        <section className="settings-section settings-danger-zone">
          <button className="btn-danger" onClick={handleLeaveGroup}>{t('settings.leaveGroup')}</button>
        </section>
      </div>
    </div>
  )
}
