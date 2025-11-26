import { useState } from 'react'
import './GroupList.css'

function GroupList({ groups, onSelectGroup, onAddGroup, onJoinGroup }) {
  const [showForm, setShowForm] = useState(false)
  const [showJoinForm, setShowJoinForm] = useState(false)
  const [groupName, setGroupName] = useState('')
  const [memberInput, setMemberInput] = useState('')
  const [joinCode, setJoinCode] = useState('')
  const [joinName, setJoinName] = useState('')
  const [joinError, setJoinError] = useState('')

  const handleSubmit = (e) => {
    e.preventDefault()
    if (groupName.trim() && memberInput.trim()) {
      const members = memberInput.split(',').map(m => m.trim()).filter(m => m)
      onAddGroup(groupName, members)
      setGroupName('')
      setMemberInput('')
      setShowForm(false)
    }
  }

  const handleJoinSubmit = (e) => {
    e.preventDefault()
    setJoinError('')
    if (joinCode.trim() && joinName.trim()) {
      const success = onJoinGroup(joinCode, joinName)
      if (success) {
        setJoinCode('')
        setJoinName('')
        setShowJoinForm(false)
      } else {
        setJoinError('Invalid code or you are already in this group')
      }
    }
  }

  const copyToClipboard = (code) => {
    navigator.clipboard.writeText(code)
  }

  return (
    <div className="group-list">
      <div className="group-header">
        <h2>Your Groups</h2>
        <div className="header-buttons">
          <button onClick={() => { setShowJoinForm(!showJoinForm); setShowForm(false); setJoinError(''); }}>
            {showJoinForm ? 'Cancel' : '🔗 Join Group'}
          </button>
          <button onClick={() => { setShowForm(!showForm); setShowJoinForm(false); }}>
            {showForm ? 'Cancel' : '+ Create Group'}
          </button>
        </div>
      </div>

      {showJoinForm && (
        <div className="card">
          <form onSubmit={handleJoinSubmit}>
            <h3>Join Existing Group</h3>
            <input
              type="text"
              placeholder="Group code (e.g., 'ABC123')"
              value={joinCode}
              onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
              required
            />
            <input
              type="text"
              placeholder="Your name"
              value={joinName}
              onChange={(e) => setJoinName(e.target.value)}
              required
            />
            {joinError && <p className="error-message">{joinError}</p>}
            <button type="submit">Join Group</button>
          </form>
        </div>
      )}

      {showForm && (
        <div className="card">
          <form onSubmit={handleSubmit}>
            <h3>Create New Group</h3>
            <input
              type="text"
              placeholder="Group name (e.g., 'Paris Trip', 'Apartment')"
              value={groupName}
              onChange={(e) => setGroupName(e.target.value)}
              required
            />
            <input
              type="text"
              placeholder="Members (comma-separated, e.g., 'John, Sarah, Mike')"
              value={memberInput}
              onChange={(e) => setMemberInput(e.target.value)}
              required
            />
            <button type="submit">Create Group</button>
          </form>
        </div>
      )}

      <div className="groups-grid">
        {groups.length === 0 ? (
          <div className="empty-state">
            <p>📝 No groups yet. Create one to get started!</p>
          </div>
        ) : (
          groups.map(group => (
            <div key={group.id} className="card group-card">
              <div onClick={() => onSelectGroup(group)} style={{ cursor: 'pointer' }}>
                <h3>{group.name}</h3>
                <p className="expense-count">{group.expenses.length} expenses</p>
              </div>
              <div className="group-code-section">
                <span className="group-code">{group.code}</span>
                <button 
                  className="copy-btn"
                  onClick={(e) => {
                    e.stopPropagation()
                    copyToClipboard(group.code)
                  }}
                >
                  📋 Copy Code
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  )
}

export default GroupList
