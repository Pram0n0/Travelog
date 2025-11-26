import { useState } from 'react'
import './ExpenseTracker.css'
import ExpenseForm from './ExpenseForm'
import BalanceCalculator from './BalanceCalculator'

function ExpenseTracker({ group, onBack, onAddExpense, onDeleteExpense }) {
  const [showForm, setShowForm] = useState(false)

  const handleAddExpense = (expense) => {
    onAddExpense(expense)
    setShowForm(false)
  }

  return (
    <div className="expense-tracker">
      <div className="tracker-header">
        <button className="secondary" onClick={onBack}>← Back to Groups</button>
        <h2>{group.name}</h2>
        <button onClick={() => setShowForm(!showForm)}>
          {showForm ? 'Cancel' : '+ Add Expense'}
        </button>
      </div>

      {showForm && (
        <ExpenseForm 
          members={group.members}
          onSubmit={handleAddExpense}
        />
      )}

      <BalanceCalculator 
        expenses={group.expenses}
        members={group.members}
      />

      <div className="expenses-section card">
        <h3>All Expenses</h3>
        {group.expenses.length === 0 ? (
          <p className="empty-message">No expenses yet. Add one to get started!</p>
        ) : (
          <div className="expenses-list">
            {group.expenses.map(expense => (
              <div key={expense.id} className="expense-item">
                <div className="expense-details">
                  <h4>{expense.description}</h4>
                  <p className="expense-info">
                    Paid by <strong>{expense.paidBy}</strong> • ${expense.amount.toFixed(2)}
                  </p>
                  <p className="expense-split">
                    Split between: {expense.splitBetween.join(', ')}
                  </p>
                </div>
                <button 
                  className="danger small"
                  onClick={() => onDeleteExpense(expense.id)}
                >
                  Delete
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

export default ExpenseTracker
