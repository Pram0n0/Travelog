import { useState, useMemo } from 'react'
import './GroupList.css'

function GroupList({ groups, currentUser, onSelectGroup, onAddGroup, onJoinGroup, onLeaveGroup }) {
  const [showForm, setShowForm] = useState(false)
  const [showJoinForm, setShowJoinForm] = useState(false)
  const [groupName, setGroupName] = useState('')
  const [joinCode, setJoinCode] = useState('')
  const [joinError, setJoinError] = useState('')
  const [isCreating, setIsCreating] = useState(false)
  const [isJoining, setIsJoining] = useState(false)
  const [successMessage, setSuccessMessage] = useState('')
  const [copiedCode, setCopiedCode] = useState('')

  // Check if user has outstanding balances in a group
  const checkUserBalances = (group) => {
    const currencies = [...new Set(group.expenses.map(e => e.currency || 'USD'))]
    
    for (const currency of currencies) {
      const currencyExpenses = group.expenses.filter(e => (e.currency || 'USD') === currency)
      let balance = 0

      currencyExpenses.forEach(expense => {
        // Add what user paid
        if (expense.isMultiplePayers) {
          const userPayment = expense.paidBy.find(p => p.member === currentUser.username)
          if (userPayment) {
            balance += userPayment.amount
          }
        } else if (expense.paidBy === currentUser.username) {
          balance += expense.amount
        }

        // Subtract what user owes
        if (expense.splitAmounts && expense.splitAmounts[currentUser.username]) {
          balance -= expense.splitAmounts[currentUser.username]
        } else if (expense.splitBetween && expense.splitBetween.includes(currentUser.username)) {
          balance -= expense.amount / expense.splitBetween.length
        } else if (!expense.splitBetween) {
          balance -= expense.amount / group.members.length
        }
      })

      if (Math.abs(balance) > 0.01) {
        return true // Has outstanding balances
      }
    }

    return false // No outstanding balances
  }

  const handleLeaveGroup = (groupId, groupName) => {
    if (confirm(`Are you sure you want to leave "${groupName}"? This action cannot be undone.`)) {
      onLeaveGroup(groupId)
    }
  }

  // Filter groups to only show ones the user is a member of
  const userGroups = groups.filter(group => group.members.includes(currentUser.username))

  const handleSubmit = async (e) => {
    e.preventDefault()
    setIsCreating(true)
    setSuccessMessage('')
    
    const trimmedName = groupName.trim()
    if (!trimmedName) {
      setIsCreating(false)
      return
    }

    try {
      await onAddGroup(trimmedName)
      setGroupName('')
      setShowForm(false)
      setSuccessMessage(`Group "${trimmedName}" created successfully!`)
      setTimeout(() => setSuccessMessage(''), 3000)
    } catch (error) {
      console.error('Error creating group:', error)
    } finally {
      setIsCreating(false)
    }
  }

  const handleJoinSubmit = async (e) => {
    e.preventDefault()
    setJoinError('')
    setSuccessMessage('')
    setIsJoining(true)
    
    const trimmedCode = joinCode.trim().toUpperCase()
    if (!trimmedCode) {
      setIsJoining(false)
      return
    }

    try {
      const success = await onJoinGroup(trimmedCode)
      if (success) {
        setJoinCode('')
        setShowJoinForm(false)
        setSuccessMessage('Successfully joined group!')
        setTimeout(() => setSuccessMessage(''), 3000)
      } else {
        setJoinError('Invalid code or you are already in this group')
      }
    } catch (error) {
      setJoinError('Failed to join group. Please try again.')
    } finally {
      setIsJoining(false)
    }
  }

  const copyToClipboard = (code) => {
    navigator.clipboard.writeText(code).then(() => {
      setCopiedCode(code)
      setTimeout(() => setCopiedCode(''), 2000)
    }).catch(() => {
      alert(`Group code: ${code}`)
    })
  }

  return (
    <div className="group-list">
      <div className="group-header">
        <h2>Your Groups</h2>
        <div className="header-buttons">
          <button 
            onClick={() => { setShowJoinForm(!showJoinForm); setShowForm(false); setJoinError(''); setSuccessMessage(''); }}
            disabled={isCreating || isJoining}
          >
            {showJoinForm ? 'Cancel' : '🔗 Join Group'}
          </button>
          <button 
            onClick={() => { setShowForm(!showForm); setShowJoinForm(false); setSuccessMessage(''); }}
            disabled={isCreating || isJoining}
          >
            {showForm ? 'Cancel' : '+ Create Group'}
          </button>
        </div>
      </div>

      {successMessage && (
        <div className="success-message" style={{
          padding: '1rem',
          marginBottom: '1rem',
          background: '#d4edda',
          color: '#155724',
          border: '1px solid #c3e6cb',
          borderRadius: '6px',
          textAlign: 'center'
        }}>
          ✅ {successMessage}
        </div>
      )}

      {showJoinForm && (
        <div className="card">
          <form onSubmit={handleJoinSubmit}>
            <h3>Join Existing Group</h3>
            <input
              type="text"
              placeholder="Enter 6-character group code"
              value={joinCode}
              onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
              maxLength={6}
              required
              disabled={isJoining}
            />
            {joinError && <p className="error-message">{joinError}</p>}
            <button type="submit" disabled={isJoining || !joinCode.trim()}>
              {isJoining ? '⏳ Joining...' : 'Join Group'}
            </button>
          </form>
        </div>
      )}

      {showForm && (
        <div className="card">
          <form onSubmit={handleSubmit}>
            <h3>Create New Group</h3>
            <input
              type="text"
              placeholder="Enter group name"
              value={groupName}
              onChange={(e) => setGroupName(e.target.value)}
              maxLength={50}
              required
              disabled={isCreating}
            />
            <p className="helper-text">You will be added as the first member. Share the group code with others to invite them.</p>
            <button type="submit" disabled={isCreating || !groupName.trim()}>
              {isCreating ? '⏳ Creating...' : 'Create Group'}
            </button>
          </form>
        </div>
      )}

      <div className="groups-grid">
        {userGroups.length === 0 ? (
          <div className="empty-state">
            <p>📝 No groups yet!</p>
            <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', marginTop: '0.5rem' }}>
              Create a new group to start tracking expenses, or join an existing group with a code.
            </p>
          </div>
        ) : (
          userGroups.map(group => (
            <div key={group.id} className="card group-card">
              <div onClick={() => onSelectGroup(group)} style={{ cursor: 'pointer' }}>
                <h3>{group.name}</h3>
                <p className="member-count">👥 {group.members.length} member{group.members.length !== 1 ? 's' : ''}</p>
                <p className="expense-count">{group.expenses.length} expense{group.expenses.length !== 1 ? 's' : ''}</p>
              </div>
              <div className="group-code-section">
                <span 
                  className="group-code clickable"
                  onClick={(e) => {
                    e.stopPropagation()
                    copyToClipboard(group.code)
                  }}
                  title="Click to copy code"
                  style={{
                    position: 'relative',
                    background: copiedCode === group.code ? '#d4edda' : undefined,
                    transition: 'background 0.3s'
                  }}
                >
                  {copiedCode === group.code ? '✓ Copied!' : group.code}
                </span>
                <button
                  className="leave-group-small-btn"
                  onClick={(e) => {
                    e.stopPropagation()
                    handleLeaveGroup(group._id, group.name)
                  }}
                  disabled={checkUserBalances(group)}
                  title={checkUserBalances(group) ? "You cannot leave while you have outstanding balances" : "Leave this group"}
                >
                  🚪 Leave
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
