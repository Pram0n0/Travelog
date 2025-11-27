import { useState, useMemo } from 'react'
import './GroupList.css'

function GroupList({ groups, currentUser, onSelectGroup, onAddGroup, onJoinGroup, onLeaveGroup }) {
  const [showForm, setShowForm] = useState(false)
  const [showJoinForm, setShowJoinForm] = useState(false)
  const [groupName, setGroupName] = useState('')
  const [joinCode, setJoinCode] = useState('')
  const [joinError, setJoinError] = useState('')

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
    if (groupName.trim()) {
      await onAddGroup(groupName)
      setGroupName('')
      setShowForm(false)
    }
  }

  const handleJoinSubmit = async (e) => {
    e.preventDefault()
    setJoinError('')
    if (joinCode.trim()) {
      const success = await onJoinGroup(joinCode)
      if (success) {
        setJoinCode('')
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
              placeholder="Group code"
              value={joinCode}
              onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
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
              placeholder="Group name"
              value={groupName}
              onChange={(e) => setGroupName(e.target.value)}
              required
            />
            <p className="helper-text">You will be added as the first member. Share the group code with others to invite them.</p>
            <button type="submit">Create Group</button>
          </form>
        </div>
      )}

      <div className="groups-grid">
        {userGroups.length === 0 ? (
          <div className="empty-state">
            <p>📝 No groups yet. Create one or join with a code!</p>
          </div>
        ) : (
          userGroups.map(group => (
            <div key={group.id} className="card group-card">
              <div onClick={() => onSelectGroup(group)} style={{ cursor: 'pointer' }}>
                <h3>{group.name}</h3>
                <p className="member-count">👥 {group.members.length} members</p>
                <p className="expense-count">{group.expenses.length} expenses</p>
              </div>
              <div className="group-code-section">
                <span 
                  className="group-code clickable"
                  onClick={(e) => {
                    e.stopPropagation()
                    copyToClipboard(group.code)
                  }}
                  title="Click to copy code"
                >
                  {group.code}
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
