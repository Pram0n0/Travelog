import { useState } from 'react'
import './ExpenseForm.css'

function ExpenseForm({ members, onSubmit }) {
  const [description, setDescription] = useState('')
  const [amount, setAmount] = useState('')
  const [paidBy, setPaidBy] = useState(members[0] || '')
  const [splitBetween, setSplitBetween] = useState(members)

  const handleSubmit = (e) => {
    e.preventDefault()
    if (description && amount && paidBy && splitBetween.length > 0) {
      onSubmit({
        description,
        amount: parseFloat(amount),
        paidBy,
        splitBetween
      })
      setDescription('')
      setAmount('')
      setPaidBy(members[0] || '')
      setSplitBetween(members)
    }
  }

  const toggleMember = (member) => {
    if (splitBetween.includes(member)) {
      setSplitBetween(splitBetween.filter(m => m !== member))
    } else {
      setSplitBetween([...splitBetween, member])
    }
  }

  return (
    <div className="card expense-form">
      <form onSubmit={handleSubmit}>
        <h3>Add New Expense</h3>
        
        <input
          type="text"
          placeholder="Description (e.g., 'Dinner at restaurant')"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          required
        />

        <input
          type="number"
          step="0.01"
          placeholder="Amount"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          required
        />

        <label>Paid by:</label>
        <select value={paidBy} onChange={(e) => setPaidBy(e.target.value)} required>
          {members.map(member => (
            <option key={member} value={member}>{member}</option>
          ))}
        </select>

        <label>Split between:</label>
        <div className="member-checkboxes">
          {members.map(member => (
            <label key={member} className="checkbox-label">
              <input
                type="checkbox"
                checked={splitBetween.includes(member)}
                onChange={() => toggleMember(member)}
              />
              {member}
            </label>
          ))}
        </div>

        <button type="submit">Add Expense</button>
      </form>
    </div>
  )
}

export default ExpenseForm
