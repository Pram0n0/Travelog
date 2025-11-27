import { useState, useEffect } from 'react'
import { Routes, Route, useNavigate, useParams } from 'react-router-dom'
import './App.css'
import Auth from './components/Auth'
import GroupList from './components/GroupList'
import ExpenseTracker from './components/ExpenseTracker'
import ProfileSettings from './components/ProfileSettings'
import { authAPI, groupsAPI } from './api/index.js'

function App() {
  const [currentUser, setCurrentUser] = useState(null)
  const [groups, setGroups] = useState([])
  const [loading, setLoading] = useState(true)
  const [showProfileSettings, setShowProfileSettings] = useState(false)
  const [pendingRedirect, setPendingRedirect] = useState(null)
  const [groupsLoaded, setGroupsLoaded] = useState(false)
  const navigate = useNavigate()

  // Check authentication status on mount
  useEffect(() => {
    checkAuthStatus()
  }, [])

  // Check for Google OAuth callback
  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    if (params.get('auth') === 'success') {
      window.history.replaceState({}, document.title, window.location.pathname)
      checkAuthStatus()
    }
  }, [])

  // Fetch groups when user logs in
  useEffect(() => {
    if (currentUser) {
      fetchGroups()
    } else {
      setGroups([])
      setGroupsLoaded(false)
    }
  }, [currentUser])

  // Handle pending join after groups are loaded
  useEffect(() => {
    if (currentUser && groupsLoaded) {
      const pendingJoinCode = localStorage.getItem('pendingJoinCode')
      
      if (pendingJoinCode) {
        localStorage.removeItem('pendingJoinCode')
        
        // Check if user is already in the group
        const existingGroup = groups.find(g => g.code.toUpperCase() === pendingJoinCode)
        if (existingGroup) {
          const groupSlug = `${existingGroup.name.toLowerCase().replace(/\s+/g, '-')}-${existingGroup.code.toLowerCase()}`
          navigate(`/group/${groupSlug}`)
        } else {
          // Prompt user to join
          if (confirm('Would you like to join the group you were invited to?')) {
            joinGroup(pendingJoinCode)
          } else {
            navigate('/')
          }
        }
      }
    }
  }, [currentUser, groupsLoaded, groups, navigate])

  const checkAuthStatus = async () => {
    try {
      const response = await authAPI.checkStatus()
      if (response.authenticated) {
        setCurrentUser(response.user)
      }
    } catch (err) {
      console.error('Auth check failed:', err)
    } finally {
      setLoading(false)
    }
  }

  const fetchGroups = async () => {
    try {
      const fetchedGroups = await groupsAPI.getAll()
      setGroups(fetchedGroups)
      setGroupsLoaded(true)
    } catch (err) {
      console.error('Failed to fetch groups:', err)
      setGroupsLoaded(true) // Set to true even on error to allow redirect
    }
  }

  const handleLogin = (user) => {
    setCurrentUser(user)
    // pendingRedirect will be handled by useEffect
  }

  const handleLogout = async () => {
    try {
      await authAPI.logout()
      setCurrentUser(null)
      setGroups([])
      navigate('/')
    } catch (err) {
      console.error('Logout failed:', err)
    }
  }

  const handleProfileUpdate = async (displayName, avatar) => {
    try {
      const response = await authAPI.updateProfile(displayName, avatar)
      setCurrentUser(response.user)
    } catch (err) {
      console.error('Profile update failed:', err)
      throw err
    }
  }

  const addGroup = async (groupName) => {
    try {
      const newGroup = await groupsAPI.create(groupName)
      setGroups([...groups, newGroup])
      // Navigate to the new group's page
      const groupSlug = `${newGroup.name.toLowerCase().replace(/\s+/g, '-')}-${newGroup.code.toLowerCase()}`
      navigate(`/group/${groupSlug}`)
    } catch (err) {
      console.error('Failed to create group:', err)
      alert(err.message || 'Failed to create group')
    }
  }

  const joinGroup = async (groupCode) => {
    try {
      const updatedGroup = await groupsAPI.join(groupCode)
      // Check if group already exists in state
      const existingIndex = groups.findIndex(g => g._id === updatedGroup._id)
      if (existingIndex >= 0) {
        setGroups(groups.map(g => g._id === updatedGroup._id ? updatedGroup : g))
      } else {
        setGroups([...groups, updatedGroup])
      }
      // Navigate to the group's page
      const groupSlug = `${updatedGroup.name.toLowerCase().replace(/\s+/g, '-')}-${updatedGroup.code.toLowerCase()}`
      navigate(`/group/${groupSlug}`)
      return true
    } catch (err) {
      console.error('Failed to join group:', err)
      alert(err.message || 'Failed to join group')
      return false
    }
  }

  const addExpense = async (groupId, expense) => {
    try {
      const updatedGroup = await groupsAPI.addExpense(groupId, expense)
      setGroups(prevGroups => prevGroups.map(g => g._id === updatedGroup._id ? updatedGroup : g))
    } catch (err) {
      console.error('Failed to add expense:', err)
      alert(err.message || 'Failed to add expense')
    }
  }

  const deleteExpense = async (groupId, expenseId) => {
    try {
      const updatedGroup = await groupsAPI.deleteExpense(groupId, expenseId)
      setGroups(prevGroups => prevGroups.map(g => g._id === updatedGroup._id ? updatedGroup : g))
    } catch (err) {
      console.error('Failed to delete expense:', err)
      alert(err.message || 'Failed to delete expense')
    }
  }

  const editExpense = async (groupId, expenseId, updatedExpense) => {
    try {
      const updatedGroup = await groupsAPI.editExpense(groupId, expenseId, updatedExpense)
      setGroups(prevGroups => prevGroups.map(g => g._id === updatedGroup._id ? updatedGroup : g))
    } catch (err) {
      console.error('Failed to edit expense:', err)
      alert(err.message || 'Failed to edit expense')
    }
  }

  const leaveGroup = async (groupId) => {
    try {
      const result = await groupsAPI.leaveGroup(groupId)
      // Remove the group from the local state or update it
      setGroups(prevGroups => prevGroups.filter(g => g._id !== groupId))
      navigate('/')
    } catch (err) {
      console.error('Failed to leave group:', err)
      alert(err.message || 'Failed to leave group')
      throw err
    }
  }

  if (loading) {
    return (
      <div className="loading-screen">
        <div className="loader">Loading...</div>
      </div>
    )
  }

  return (
    <div className="App">
      {currentUser && (
        <header>
          <div className="header-content">
            <div>
              <h1 style={{ cursor: 'pointer' }} onClick={() => navigate('/')}>💰 Travelog</h1>
              <p>Track and split shared expenses with ease</p>
            </div>
          <div className="user-info">
            {currentUser.avatar ? (
              <img 
                src={currentUser.avatar} 
                alt="Profile" 
                className="user-avatar"
                onClick={() => setShowProfileSettings(true)}
                onError={(e) => {
                  e.target.style.display = 'none'
                  e.target.nextSibling.style.display = 'flex'
                }}
              />
            ) : null}
            <div 
              className="user-avatar-placeholder"
              onClick={() => setShowProfileSettings(true)}
              style={{ display: currentUser.avatar ? 'none' : 'flex' }}
            >
              👤
            </div>
            <span className="username">{currentUser.displayName || currentUser.username}</span>
            <button className="settings-btn" onClick={() => setShowProfileSettings(true)}>⚙️</button>
            <button className="logout-btn" onClick={handleLogout}>Logout</button>
          </div>
        </div>
      </header>
      )}
      
      {currentUser && showProfileSettings && (
        <ProfileSettings 
          user={currentUser}
          onUpdate={handleProfileUpdate}
          onClose={() => setShowProfileSettings(false)}
        />
      )}

      <div className="container">
        <Routes>
          <Route 
            path="/" 
            element={currentUser ? (
              <GroupList 
                groups={groups}
                currentUser={currentUser}
                onSelectGroup={(group) => {
                  const groupSlug = `${group.name.toLowerCase().replace(/\s+/g, '-')}-${group.code.toLowerCase()}`
                  navigate(`/group/${groupSlug}`)
                }}
                onAddGroup={addGroup}
                onJoinGroup={joinGroup}
                onLeaveGroup={leaveGroup}
              />
            ) : (
              <Auth 
                onLogin={handleLogin}
              />
            )} 
          />
          <Route 
            path="/join/:code" 
            element={currentUser ? (
              <JoinGroupPage 
                groups={groups}
                onJoinGroup={joinGroup}
              />
            ) : (
              <JoinCodeAuthWrapper 
                onLogin={handleLogin}
              />
            )} 
          />
          <Route 
            path="/group/:groupSlug" 
            element={
              <GroupPage 
                groups={groups}
                currentUser={currentUser}
                onAddExpense={addExpense}
                onDeleteExpense={deleteExpense}
                onEditExpense={editExpense}
                onLeaveGroup={leaveGroup}
              />
            } 
          />
        </Routes>
      </div>
    </div>
  )
}

// Wrapper to extract code from URL and pass to AuthWithRedirect
function JoinCodeAuthWrapper({ onLogin }) {
  const { code } = useParams()
  
  // Store join code in localStorage immediately
  useEffect(() => {
    if (code) {
      localStorage.setItem('pendingJoinCode', code.toUpperCase())
    }
  }, [code])
  
  return <Auth onLogin={onLogin} />
}

// Wrapper component to store join code before showing Auth
function AuthWithRedirect({ onLogin, code }) {
  return <Auth onLogin={onLogin} />
}

// Component to handle individual group pages
function GroupPage({ groups, currentUser, onAddExpense, onDeleteExpense, onEditExpense, onLeaveGroup }) {
  const { groupSlug } = useParams()
  const navigate = useNavigate()
  
  // Find the current group
  const group = groups.find(g => {
    const slug = `${g.name.toLowerCase().replace(/\s+/g, '-')}-${g.code.toLowerCase()}`
    return slug === groupSlug
  })

  if (!group) {
    return (
      <div className="card" style={{ textAlign: 'center', padding: '3rem' }}>
        <h2>Group not found</h2>
        <p>This group doesn't exist or you don't have access to it.</p>
        <button onClick={() => navigate('/')} style={{ marginTop: '1rem' }}>
          ← Back to Groups
        </button>
      </div>
    )
  }

  return (
    <ExpenseTracker 
      key={`${group._id}-${group.expenses?.length || 0}`}
      group={group}
      currentUser={currentUser}
      onBack={() => navigate('/')}
      onAddExpense={(expense) => onAddExpense(group._id, expense)}
      onDeleteExpense={(expenseId) => onDeleteExpense(group._id, expenseId)}
      onEditExpense={(expenseId, expense) => onEditExpense(group._id, expenseId, expense)}
      onLeaveGroup={() => onLeaveGroup(group._id)}
    />
  )
}

// Component to handle join group via link
function JoinGroupPage({ groups, onJoinGroup }) {
  const { code } = useParams()
  const navigate = useNavigate()
  const [joining, setJoining] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    const autoJoin = async () => {
      try {
        const success = await onJoinGroup(code.toUpperCase())
        if (success) {
          // Successfully joined - will redirect via onJoinGroup's navigate
          setJoining(false)
        }
      } catch (err) {
        setError('Failed to join group. The group may not exist.')
        setJoining(false)
      }
    }

    // Check if already in the group
    const existingGroup = groups.find(g => g.code.toUpperCase() === code.toUpperCase())
    if (existingGroup) {
      const groupSlug = `${existingGroup.name.toLowerCase().replace(/\s+/g, '-')}-${existingGroup.code.toLowerCase()}`
      navigate(`/group/${groupSlug}`)
    } else {
      autoJoin()
    }
  }, [code, groups, onJoinGroup, navigate])

  if (joining) {
    return (
      <div className="card" style={{ textAlign: 'center', padding: '3rem' }}>
        <h2>Joining group...</h2>
        <p>Please wait while we add you to the group.</p>
      </div>
    )
  }

  if (error) {
    return (
      <div className="card" style={{ textAlign: 'center', padding: '3rem' }}>
        <h2>❌ Unable to Join</h2>
        <p>{error}</p>
        <button onClick={() => navigate('/')} style={{ marginTop: '1rem' }}>
          ← Back to Groups
        </button>
      </div>
    )
  }

  return null
}

export default App
