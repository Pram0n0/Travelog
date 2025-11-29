import { useState, useMemo } from 'react'
import './ExpenseTracker.css'
import ExpenseForm from './ExpenseForm'
import BalanceCalculator from './BalanceCalculator'
import { groupsAPI } from '../api'

function ExpenseTracker({ group, currentUser, onBack, onAddExpense, onDeleteExpense, onEditExpense, onLeaveGroup, onGroupUpdate }) {
  const [showForm, setShowForm] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [expandedExpense, setExpandedExpense] = useState(null)
  const [editingExpense, setEditingExpense] = useState(null)
  const [showTotals, setShowTotals] = useState(false)
  const [showSettleUp, setShowSettleUp] = useState(false)
  const [expenseFilterCurrency, setExpenseFilterCurrency] = useState('all')
  const [showConvertDialog, setShowConvertDialog] = useState(false)
  const [targetCurrency, setTargetCurrency] = useState('USD')
  const [isConverting, setIsConverting] = useState(false)
  const [showBundlePrompt, setShowBundlePrompt] = useState(false)
  const [relatedExpenses, setRelatedExpenses] = useState([])
  const [newExpenseData, setNewExpenseData] = useState(null)
  const [isBundling, setIsBundling] = useState(false)
  const [isProcessingPayment, setIsProcessingPayment] = useState(false)

  // Check if current user has any outstanding balances (owes OR is owed)
  const userHasOutstandingBalances = useMemo(() => {
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
          // Split among all members
          balance -= expense.amount / group.members.length
        }
      })

      // If balance is non-zero (owes money OR is owed money), has outstanding balances
      if (Math.abs(balance) > 0.01) {
        return true
      }
    }

    return false
  }, [group.expenses, group.members, currentUser.username])

  const handleShareGroup = () => {
    const shareUrl = `${window.location.origin}/join/${group.code}`
    navigator.clipboard.writeText(shareUrl).then(() => {
      alert(`Share link copied to clipboard!\n\nAnyone with this link can join the group:\n${shareUrl}`)
    }).catch(() => {
      // Fallback if clipboard API fails
      prompt('Copy this link to share:', shareUrl)
    })
  }

  const handleAddExpense = (expense) => {
    // Check for recent similar expenses (within 30 minutes, same currency)
    const now = new Date()
    const thirtyMinutesAgo = new Date(now.getTime() - 30 * 60 * 1000)
    
    const recentSimilarExpenses = group.expenses.filter(e => {
      const expenseDate = new Date(e.date)
      return (
        expenseDate >= thirtyMinutesAgo &&
        e.currency === expense.currency &&
        e.id !== expense.id
      )
    })

    // If found related expenses, show bundle prompt
    if (recentSimilarExpenses.length > 0) {
      setRelatedExpenses(recentSimilarExpenses)
      setNewExpenseData(expense)
      setShowBundlePrompt(true)
    } else {
      // No related expenses, add normally
      onAddExpense(expense)
      setShowForm(false)
    }
  }

  const handleBundleDecision = async (shouldBundle) => {
    setIsBundling(true)
    
    if (shouldBundle && relatedExpenses.length > 0) {
      // Bundle: combine amounts and merge descriptions
      const totalAmount = relatedExpenses.reduce((sum, e) => sum + e.amount, 0) + newExpenseData.amount
      const descriptions = [...relatedExpenses.map(e => e.description), newExpenseData.description]
      const bundledDescription = `Bundled: ${descriptions.join(' + ')}`

      // STEP 1: Convert all expenses to absolute values (unequally)
      // This handles mixed split types and different participants
      const allExpenses = [...relatedExpenses, newExpenseData]
      const absoluteSplits = {}
      
      allExpenses.forEach(expense => {
        if (expense.splitAmounts) {
          // Add each person's share to the running total
          Object.entries(expense.splitAmounts).forEach(([member, amount]) => {
            if (!absoluteSplits[member]) {
              absoluteSplits[member] = 0
            }
            absoluteSplits[member] += amount
          })
        }
      })

      // STEP 2: Check if we can convert back to "equally"
      // Only if all participants have the exact same amount
      const participants = Object.keys(absoluteSplits)
      const amounts = Object.values(absoluteSplits)
      const allEqual = amounts.length > 0 && amounts.every(amt => Math.abs(amt - amounts[0]) < 0.01)
      
      let bundledSplitType = 'unequally'
      let bundledSplitAmounts = absoluteSplits
      
      if (allEqual && participants.length > 0) {
        // All participants owe the same amount - convert to "equally"
        bundledSplitType = 'equally'
        const equalShare = totalAmount / participants.length
        bundledSplitAmounts = {}
        participants.forEach(member => {
          bundledSplitAmounts[member] = equalShare
        })
      }

      try {
        // Delete the old expenses first (wait for all deletions to complete)
        await Promise.all(relatedExpenses.map(e => {
          if (e.id) {
            return onDeleteExpense(e.id)
          }
          return Promise.resolve()
        }))

        // Then add the bundled expense with proper split amounts
        await onAddExpense({
          ...newExpenseData,
          description: bundledDescription,
          amount: totalAmount,
          splitType: bundledSplitType,
          splitAmounts: bundledSplitAmounts,
          splitBetween: participants // Update the participant list
        })
      } catch (error) {
        console.error('Error bundling expenses:', error)
        setError(error.message || 'Failed to bundle expenses. Please try again.')
        // If bundling fails, just add the new expense normally
        await onAddExpense(newExpenseData)
      }
    } else {
      // Don't bundle, add as separate expense
      await onAddExpense(newExpenseData)
    }
    
    // Reset state
    setIsBundling(false)
    setShowBundlePrompt(false)
    setRelatedExpenses([])
    setNewExpenseData(null)
    setShowForm(false)
  }

  const handlePaymentAction = async (action, data) => {
    if (isProcessingPayment) return
    
    setIsProcessingPayment(true)
    
    try {
      if (action === 'create') {
        // Create a new payment
        const updatedGroup = await groupsAPI.createPayment(group._id, {
          to: data.to,
          amount: data.amount,
          currency: data.currency
        })
        if (onGroupUpdate) {
          onGroupUpdate(updatedGroup)
        }
      } else if (action === 'confirm' || action === 'reject') {
        // Confirm or reject a payment
        const updatedGroup = await groupsAPI.confirmPayment(group._id, data, action)
        if (onGroupUpdate) {
          onGroupUpdate(updatedGroup)
        }
      }
    } catch (error) {
      console.error('Error processing payment:', error)
      setError(error.message || `Failed to ${action} payment. Please try again.`)
    } finally {
      setIsProcessingPayment(false)
    }
  }

  const handleEditExpense = (expense) => {
    onEditExpense(editingExpense.id, expense)
    setEditingExpense(null)
    setExpandedExpense(null)
  }

  const handleDeleteExpense = (expenseId) => {
    onDeleteExpense(expenseId)
    setExpandedExpense(null)
  }

  const toggleExpense = (expenseId) => {
    if (expandedExpense === expenseId) {
      setExpandedExpense(null)
    } else {
      setExpandedExpense(expenseId)
      setEditingExpense(null)
    }
  }

  const handleLeaveGroup = () => {
    if (userHasOutstandingBalances) {
      alert('You cannot leave the group while you have outstanding balances. Please settle all debts first.')
      return
    }

    if (confirm(`Are you sure you want to leave "${group.name}"? This action cannot be undone.`)) {
      onLeaveGroup()
    }
  }

  const calculateTotals = useMemo(() => {
    // Group expenses by currency
    const totalsPerCurrency = {}
    
    if (!group.expenses || group.expenses.length === 0 || !group.members) {
      return { 'USD': { totalSpend: 0, memberShares: {} } }
    }
    
    group.expenses
      .filter(expense => !expense.isSettlement && expense.type !== 'settlement')
      .forEach(expense => {
        const currency = expense.currency || 'USD'
        if (!totalsPerCurrency[currency]) {
          totalsPerCurrency[currency] = {
            totalSpend: 0,
            memberShares: {}
          }
          if (Array.isArray(group.members)) {
            group.members.forEach(member => {
              totalsPerCurrency[currency].memberShares[member] = 0
            })
          }
        }
        totalsPerCurrency[currency].totalSpend += expense.amount
        if (expense.splitAmounts) {
          Object.entries(expense.splitAmounts).forEach(([member, amount]) => {
            if (!totalsPerCurrency[currency].memberShares[member]) {
              totalsPerCurrency[currency].memberShares[member] = 0
            }
            totalsPerCurrency[currency].memberShares[member] += amount
          })
        } else if (expense.splitBetween) {
          const sharePerPerson = expense.amount / expense.splitBetween.length
          expense.splitBetween.forEach(member => {
            if (!totalsPerCurrency[currency].memberShares[member]) {
              totalsPerCurrency[currency].memberShares[member] = 0
            }
            totalsPerCurrency[currency].memberShares[member] += sharePerPerson
          })
        }
      })

    return totalsPerCurrency
  }, [group.expenses, group.members])

  const exportToCSV = () => {
    let csv = 'Date,Description,Amount,Currency,Paid By,Split Type,Split Details\n'
    
    group.expenses.forEach(expense => {
      const date = new Date(expense.date).toLocaleDateString()
      const description = `"${expense.description}"`
      const amount = expense.amount.toFixed(2)
      const currency = expense.currency || 'USD'
      
      let paidBy = ''
      if (expense.isMultiplePayers) {
        paidBy = `"${expense.paidBy.map(p => `${p.member}: ${currency} ${p.amount.toFixed(2)}`).join('; ')}"`
      } else {
        paidBy = expense.paidBy
      }
      
      const splitType = expense.splitType || 'equally'
      
      let splitDetails = ''
      if (expense.splitAmounts) {
        splitDetails = `"${Object.entries(expense.splitAmounts).map(([member, amt]) => `${member}: ${currency} ${amt.toFixed(2)}`).join('; ')}"`
      } else {
        splitDetails = `"${expense.splitBetween?.join(', ') || 'All members'}"`
      }
      
      csv += `${date},${description},${amount},${currency},${paidBy},${splitType},${splitDetails}\n`
    })
    
    // Create download link
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${group.name}_expenses_${new Date().toISOString().split('T')[0]}.csv`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    window.URL.revokeObjectURL(url)
  }

  const convertAllExpenses = async () => {
    setIsConverting(true)
    try {
      // Get all unique currencies in current expenses
      const currencies = [...new Set(group.expenses.map(e => e.currency || 'USD'))]
      
      // If all expenses are already in target currency, no need to convert
      if (currencies.length === 1 && currencies[0] === targetCurrency) {
        setError('All expenses are already in ' + targetCurrency)
        setShowConvertDialog(false)
        setIsConverting(false)
        return
      }

      // Fetch exchange rates from exchangerate-api (free API)
      const response = await fetch(`https://api.exchangerate-api.com/v4/latest/${targetCurrency}`)
      const data = await response.json()
      
      if (!data.rates) {
        setError('Failed to fetch exchange rates')
        throw new Error('Failed to fetch exchange rates')
      }

      // Convert each expense
      const conversionPromises = group.expenses.map(async (expense) => {
        const fromCurrency = expense.currency || 'USD'
        
        // Skip if already in target currency
        if (fromCurrency === targetCurrency) {
          return
        }

        // Calculate conversion: amount in fromCurrency -> targetCurrency
        // Since we have rates from targetCurrency perspective, we need to invert
        const rate = 1 / data.rates[fromCurrency]
        
        const convertedExpense = {
          ...expense,
          amount: expense.amount * rate,
          currency: targetCurrency
        }

        // If multiple payers, convert their amounts too
        if (expense.isMultiplePayers && expense.paidBy) {
          convertedExpense.paidBy = expense.paidBy.map(payer => ({
            ...payer,
            amount: payer.amount * rate
          }))
        }

        // If custom split amounts, convert them too
        if (expense.splitAmounts) {
          const convertedSplitAmounts = {}
          Object.entries(expense.splitAmounts).forEach(([member, amount]) => {
            convertedSplitAmounts[member] = amount * rate
          })
          convertedExpense.splitAmounts = convertedSplitAmounts
        }

        // Update the expense
        await onEditExpense(expense.id, convertedExpense)
      })

      await Promise.all(conversionPromises)
      
      setShowConvertDialog(false)
      setSuccess(`Successfully converted all expenses to ${targetCurrency}`)
      setError('')
    } catch (error) {
      console.error('Conversion error:', error)
      setError(error.message || 'Failed to convert currencies. Please try again.')
    } finally {
      setIsConverting(false)
    }
  }

  const currentUsername = currentUser.username

  return (
    <div className="expense-tracker">
      {success && (
        <div className="success-alert" style={{background:'#e5ffe5',color:'#008000',padding:'1em',marginBottom:'1em',borderRadius:'6px'}}>
          <strong>Success:</strong> {success}
          <button style={{float:'right',background:'none',border:'none',color:'#008000',fontWeight:'bold',cursor:'pointer'}} onClick={()=>setSuccess('')}>✕</button>
        </div>
      )}
      {error && (
        <div className="error-alert" style={{background:'#ffe5e5',color:'#b00020',padding:'1em',marginBottom:'1em',borderRadius:'6px'}}>
          <strong>Error:</strong> {error}
          <button style={{float:'right',background:'none',border:'none',color:'#b00020',fontWeight:'bold',cursor:'pointer'}} onClick={()=>setError('')}>✕</button>
        </div>
      )}
      <div className="back-button-row">
        <button className="secondary" onClick={onBack}>← Back to Groups</button>
        <div className="right-buttons">
          <button className="share-group-btn" onClick={handleShareGroup}>
            🔗 Share Group
          </button>
          <button 
            className="leave-group-btn" 
            onClick={handleLeaveGroup}
            disabled={userHasOutstandingBalances}
            title={userHasOutstandingBalances ? "You cannot leave while you have outstanding balances" : "Leave this group"}
          >
            🚪 Leave Group
          </button>
        </div>
      </div>
      <div className="tracker-header">
        <h2>{group.name}</h2>
      </div>

      <div className="info-buttons">
        <button 
          className={`info-btn ${showSettleUp ? 'active' : ''}`}
          onClick={() => setShowSettleUp(!showSettleUp)}
        >
          💸 Settle Up
        </button>
        <button 
          className={`info-btn ${showTotals ? 'active' : ''}`}
          onClick={() => setShowTotals(!showTotals)}
        >
          📊 Totals
        </button>
        <button 
          className="info-btn"
          onClick={exportToCSV}
        >
          📥 Export CSV
        </button>
        <button 
          className="info-btn"
          onClick={() => setShowConvertDialog(true)}
        >
          💱 Convert Currency
        </button>
      </div>

      {showConvertDialog && (
        <div className="modal-overlay" onClick={() => setShowConvertDialog(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h3>💱 Convert All Expenses</h3>
            <p>Convert all expenses to a single currency using current exchange rates.</p>
            <p className="currency-info">
              Current currencies: {[...new Set(group.expenses.map(e => e.currency || 'USD'))].join(', ')}
            </p>
            
            <div className="convert-currency-selector">
              <label>Target Currency:</label>
              <select 
                value={targetCurrency} 
                onChange={(e) => setTargetCurrency(e.target.value)}
              >
                <option value="USD">USD $</option>
                <option value="EUR">EUR €</option>
                <option value="GBP">GBP £</option>
                <option value="JPY">JPY ¥</option>
                <option value="AUD">AUD A$</option>
                <option value="CAD">CAD C$</option>
                <option value="CHF">CHF Fr</option>
                <option value="CNY">CNY ¥</option>
                <option value="INR">INR ₹</option>
                <option value="KRW">KRW ₩</option>
                <option value="SGD">SGD S$</option>
                <option value="HKD">HKD HK$</option>
                <option value="NZD">NZD NZ$</option>
                <option value="SEK">SEK kr</option>
                <option value="NOK">NOK kr</option>
                <option value="DKK">DKK kr</option>
                <option value="MXN">MXN $</option>
                <option value="BRL">BRL R$</option>
                <option value="RUB">RUB ₽</option>
                <option value="ZAR">ZAR R</option>
              </select>
            </div>

            <div className="modal-actions">
              <button 
                className="secondary" 
                onClick={() => setShowConvertDialog(false)}
                disabled={isConverting}
              >
                Cancel
              </button>
              <button 
                onClick={convertAllExpenses}
                disabled={isConverting}
              >
                {isConverting ? 'Converting...' : 'Convert All'}
              </button>
            </div>
          </div>
        </div>
      )}

      {showBundlePrompt && (
        <div className="modal-overlay" onClick={() => setShowBundlePrompt(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h3>📦 Bundle Related Expenses?</h3>
            <p style={{ marginBottom: '1rem', color: 'var(--text-secondary)' }}>
              Found {relatedExpenses.length} recent expense{relatedExpenses.length > 1 ? 's' : ''} in the same currency within the last 30 minutes.
            </p>
            
            <div style={{ 
              background: '#f8f9fa', 
              padding: '1rem', 
              borderRadius: '6px', 
              marginBottom: '1rem',
              maxHeight: '200px',
              overflowY: 'auto'
            }}>
              <strong>Related expenses:</strong>
              <ul style={{ margin: '0.5rem 0 0 0', paddingLeft: '1.5rem' }}>
                {relatedExpenses.map(exp => (
                  <li key={exp.id} style={{ marginBottom: '0.25rem' }}>
                    {exp.description} - {exp.currency} {exp.amount.toFixed(2)}
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginLeft: '0.5rem' }}>
                      ({new Date(exp.date).toLocaleTimeString()})
                    </span>
                  </li>
                ))}
                <li style={{ fontWeight: 'bold', marginTop: '0.5rem' }}>
                  {newExpenseData?.description} - {newExpenseData?.currency} {newExpenseData?.amount.toFixed(2)} (new)
                </li>
              </ul>
              <div style={{ 
                marginTop: '0.75rem', 
                paddingTop: '0.75rem', 
                borderTop: '1px solid #dee2e6',
                fontWeight: 'bold'
              }}>
                Total if bundled: {newExpenseData?.currency} {(
                  relatedExpenses.reduce((sum, e) => sum + e.amount, 0) + (newExpenseData?.amount || 0)
                ).toFixed(2)}
              </div>
            </div>

            <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', marginBottom: '1.5rem' }}>
              💡 Bundling is useful for multiple purchases from the same location (markets, tours, airport).
            </p>

            <div className="modal-actions">
              <button 
                className="secondary" 
                onClick={() => handleBundleDecision(false)}
                disabled={isBundling}
              >
                Keep Separate
              </button>
              <button 
                onClick={() => handleBundleDecision(true)}
                style={{ background: '#28a745' }}
                disabled={isBundling}
              >
                {isBundling ? '⏳ Bundling...' : '📦 Bundle Together'}
              </button>
            </div>
          </div>
        </div>
      )}

      {showSettleUp && (
        <BalanceCalculator 
          expenses={group.expenses}
          members={group.members}
          currentUser={currentUser}
          showSettlements={true}
          groupId={group._id}
          onPaymentAction={handlePaymentAction}
          pendingPayments={group.payments || []}
          paymentRequests={group.paymentRequests || []}
        />
      )}

      {showTotals && (
        <div className="card totals-section">
          <h3>📊 Group Totals</h3>
          {Object.entries(calculateTotals).map(([currency, data]) => {
            const userShare = data.memberShares[currentUsername] || 0
            return (
              <div key={currency} className="currency-totals">
                <h4 className="currency-heading">{currency}</h4>
                <div className="totals-grid">
                  <div className="total-item highlight">
                    <span className="total-label">Total Group Spend</span>
                    <span className="total-amount">{currency} {data.totalSpend.toFixed(2)}</span>
                  </div>
                  <div className="total-item your-share">
                    <span className="total-label">Your Total Share</span>
                    <span className="total-amount">{currency} {userShare.toFixed(2)}</span>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}

      <BalanceCalculator 
        expenses={group.expenses}
        members={group.members}
        currentUser={currentUser}
        showSettlements={false}
        groupId={group._id}
        onPaymentAction={handlePaymentAction}
        pendingPayments={group.payments || []}
        paymentRequests={group.paymentRequests || []}
      />

      <div className="add-expense-section">
        <button onClick={() => setShowForm(!showForm)} className="add-expense-btn">
          {showForm ? '✕ Cancel' : '+ Add New Expense'}
        </button>
      </div>

      {showForm && (
        <ExpenseForm 
          members={group.members}
          currentUser={currentUser}
          onSubmit={handleAddExpense}
        />
      )}

      <div className="expenses-section card">
        <div className="expenses-header">
          <h3>All Expenses</h3>
          {(() => {
            const currencies = [...new Set(group.expenses.map(e => e.currency || 'USD'))].sort()
            return currencies.length > 1 && (
              <select 
                value={expenseFilterCurrency}
                onChange={(e) => setExpenseFilterCurrency(e.target.value)}
                className="currency-filter"
              >
                <option value="all">All Currencies</option>
                {currencies.map(curr => (
                  <option key={curr} value={curr}>{curr}</option>
                ))}
              </select>
            )
          })()}
        </div>
        {group.expenses.length === 0 ? (
          <p className="empty-message">No expenses yet. Add one to get started!</p>
        ) : (
          <div className="expenses-list">
            {group.expenses
              .filter(expense => expenseFilterCurrency === 'all' || (expense.currency || 'USD') === expenseFilterCurrency)
              .map(expense => {
              const splitInfo = expense.splitAmounts 
                ? Object.entries(expense.splitAmounts).map(([member, amt]) => `${member}: $${amt.toFixed(2)}`).join(', ')
                : `Split equally: ${expense.splitBetween?.join(', ') || 'All members'}`
              
              const expenseDate = expense.date ? new Date(expense.date) : new Date()
              const month = expenseDate.toLocaleString('default', { month: 'short' }).toUpperCase()
              const day = expenseDate.getDate()
              const isExpanded = expandedExpense === expense.id
              const isEditing = editingExpense?.id === expense.id
              
              // Calculate user's involvement
              let userInvolvement = { type: 'not-involved', amount: 0 }
              if (expense.splitAmounts && expense.splitAmounts[currentUsername]) {
                userInvolvement = { type: 'borrowed', amount: expense.splitAmounts[currentUsername] }
              }
              if (expense.isMultiplePayers) {
                const userPayment = expense.paidBy.find(p => p.member === currentUsername)
                if (userPayment) {
                  const borrowed = expense.splitAmounts?.[currentUsername] || 0
                  const net = userPayment.amount - borrowed
                  if (net > 0) {
                    userInvolvement = { type: 'lent', amount: net }
                  } else if (net < 0) {
                    userInvolvement = { type: 'borrowed', amount: Math.abs(net) }
                  } else {
                    userInvolvement = { type: 'even', amount: 0 }
                  }
                }
              } else if (expense.paidBy === currentUsername) {
                const borrowed = expense.splitAmounts?.[currentUsername] || 0
                const net = expense.amount - borrowed
                if (net > 0) {
                  userInvolvement = { type: 'lent', amount: net }
                } else if (net < 0) {
                  userInvolvement = { type: 'borrowed', amount: Math.abs(net) }
                } else {
                  userInvolvement = { type: 'even', amount: 0 }
                }
              }
              
              return (
                <div key={expense.id} className={`expense-item ${isExpanded ? 'expanded' : ''}`}>
                  <div 
                    className="expense-summary"
                    onClick={() => !isEditing && toggleExpense(expense.id)}
                  >
                    <div className="expense-date">
                      <div className="month">{month}</div>
                      <div className="day">{day}</div>
                    </div>
                    <div className="expense-details">
                      <h4>{expense.description}</h4>
                      <p className="expense-info">
                        {expense.isMultiplePayers ? (
                          <>Paid by <strong>multiple people</strong> • {expense.currency || 'USD'} {expense.amount.toFixed(2)}</>
                        ) : (
                          <>Paid by <strong>{expense.paidBy === currentUsername ? 'You' : expense.paidBy}</strong> • {expense.currency || 'USD'} {expense.amount.toFixed(2)}</>
                        )}
                      </p>
                      {!isExpanded && (
                        <p className="expense-split">
                          {expense.splitType && expense.splitType !== 'equally' && (
                            <span className="split-type-badge">
                              {expense.splitType === 'unequally' ? 'Unequal split' :
                               expense.splitType === 'percentages' ? 'Percentage split' :
                               expense.splitType === 'adjustment' ? 'Adjusted split' :
                               expense.splitType === 'shares' ? 'Share-based split' : ''}
                            </span>
                          )}
                          {splitInfo.length > 50 ? splitInfo.substring(0, 50) + '...' : splitInfo}
                        </p>
                      )}
                    </div>
                    <div className="expense-involvement">
                      {userInvolvement.type === 'lent' && (
                        <div className="involvement-badge lent">
                          You lent ${userInvolvement.amount.toFixed(2)}
                        </div>
                      )}
                      {userInvolvement.type === 'borrowed' && (
                        <div className="involvement-badge borrowed">
                          You borrowed ${userInvolvement.amount.toFixed(2)}
                        </div>
                      )}
                      {userInvolvement.type === 'not-involved' && (
                        <div className="involvement-badge not-involved">
                          Not involved
                        </div>
                      )}
                      {userInvolvement.type === 'even' && (
                        <div className="involvement-badge even">
                          Even
                        </div>
                      )}
                    </div>
                    <div className="expand-icon">
                      {isExpanded ? '▼' : '▶'}
                    </div>
                  </div>

                  {isExpanded && !isEditing && (
                    <div className="expense-expanded">
                      <div className="expanded-section">
                        <h5>💰 Payment Details</h5>
                        {expense.isMultiplePayers ? (
                          <div className="detail-list">
                            {expense.paidBy.map(payer => (
                              <div key={payer.member} className="detail-item">
                                <strong>{payer.member}</strong> paid ${payer.amount.toFixed(2)}
                              </div>
                            ))}
                          </div>
                        ) : (
                          <div className="detail-item">
                            <strong>{expense.paidBy}</strong> paid ${expense.amount.toFixed(2)}
                          </div>
                        )}
                      </div>

                      <div className="expanded-section">
                        <h5>📊 Split Details</h5>
                        {expense.splitType && expense.splitType !== 'equally' && (
                          <p className="split-type-info">
                            <span className="split-type-badge">
                              {expense.splitType === 'unequally' ? 'Unequal split' :
                               expense.splitType === 'percentages' ? 'Percentage split' :
                               expense.splitType === 'adjustment' ? 'Adjusted split' :
                               expense.splitType === 'shares' ? 'Share-based split' : ''}
                            </span>
                          </p>
                        )}
                        <div className="detail-list">
                          {expense.splitAmounts && Object.entries(expense.splitAmounts).map(([member, amt]) => (
                            <div key={member} className="detail-item">
                              <strong>{member}</strong> owes ${amt.toFixed(2)}
                            </div>
                          ))}
                        </div>
                      </div>

                      <div className="expanded-section">
                        <h5>📅 History</h5>
                        <div className="detail-item">
                          Created on {new Date(expense.date).toLocaleDateString()} at {new Date(expense.date).toLocaleTimeString()}
                          {expense.createdBy && (
                            <> by <strong>{expense.createdBy === currentUsername ? 'You' : expense.createdBy}</strong></>
                          )}
                        </div>
                        {expense.modifiedDate && (
                          <div className="detail-item">
                            Last modified on {new Date(expense.modifiedDate).toLocaleDateString()} at {new Date(expense.modifiedDate).toLocaleTimeString()}
                            {expense.modifiedBy && (
                              <> by <strong>{expense.modifiedBy === currentUsername ? 'You' : expense.modifiedBy}</strong></>
                            )}
                          </div>
                        )}
                      </div>

                      <div className="expense-actions">
                        <button 
                          className="secondary"
                          onClick={() => {
                            setEditingExpense(expense)
                            setExpandedExpense(null)
                          }}
                        >
                          ✏️ Edit
                        </button>
                        <button 
                          className="danger"
                          onClick={() => handleDeleteExpense(expense.id)}
                        >
                          🗑️ Delete
                        </button>
                      </div>
                    </div>
                  )}

                  {isEditing && (
                    <div className="expense-edit-form">
                      <h4>Edit Expense</h4>
                      <ExpenseForm 
                        members={group.members}
                        currentUser={currentUser}
                        onSubmit={handleEditExpense}
                        initialData={expense}
                      />
                      <button 
                        className="secondary"
                        onClick={() => setEditingExpense(null)}
                        style={{ marginTop: '1rem', width: '100%' }}
                      >
                        Cancel Edit
                      </button>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}

export default ExpenseTracker
