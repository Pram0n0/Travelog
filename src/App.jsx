import { useState } from 'react'
import './App.css'
import GroupList from './components/GroupList'
import ExpenseTracker from './components/ExpenseTracker'

function App() {
  const [groups, setGroups] = useState([])
  const [selectedGroup, setSelectedGroup] = useState(null)

  const generateGroupCode = () => {
    return Math.random().toString(36).substring(2, 8).toUpperCase()
  }

  const addGroup = (groupName, members) => {
    const newGroup = {
      id: Date.now(),
      name: groupName,
      code: generateGroupCode(),
      members: members,
      expenses: []
    }
    setGroups([...groups, newGroup])
  }

  const joinGroup = (groupCode, memberName) => {
    const group = groups.find(g => g.code === groupCode.toUpperCase())
    if (group && !group.members.includes(memberName)) {
      setGroups(groups.map(g => 
        g.id === group.id 
          ? { ...g, members: [...g.members, memberName] }
          : g
      ))
      return true
    }
    return false
  }

  const addExpense = (expense) => {
    const updatedGroups = groups.map(group => 
      group.id === selectedGroup.id 
        ? { ...group, expenses: [...group.expenses, { ...expense, id: Date.now() }] }
        : group
    )
    setGroups(updatedGroups)
    setSelectedGroup(updatedGroups.find(g => g.id === selectedGroup.id))
  }

  const deleteExpense = (expenseId) => {
    const updatedGroups = groups.map(group => 
      group.id === selectedGroup.id 
        ? { ...group, expenses: group.expenses.filter(e => e.id !== expenseId) }
        : group
    )
    setGroups(updatedGroups)
    setSelectedGroup(updatedGroups.find(g => g.id === selectedGroup.id))
  }

  return (
    <div className="App">
      <header>
        <h1>💰 Travelog</h1>
        <p>Track and split shared expenses with ease</p>
      </header>
      
      <div className="container">
        {!selectedGroup ? (
          <GroupList 
            groups={groups} 
            onSelectGroup={setSelectedGroup}
            onAddGroup={addGroup}
            onJoinGroup={joinGroup}
          />
        ) : (
          <ExpenseTracker 
            group={selectedGroup}
            onBack={() => setSelectedGroup(null)}
            onAddExpense={addExpense}
            onDeleteExpense={deleteExpense}
          />
        )}
      </div>
    </div>
  )
}

export default App
