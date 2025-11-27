import { useState, useMemo, useEffect } from 'react'
import './BalanceCalculator.css'

function BalanceCalculator({ expenses, members, currentUser, showSettlements = false }) {
  // Get all unique currencies used in expenses
  const currencies = useMemo(() => {
    if (!expenses || expenses.length === 0) return ['USD']
    const currencySet = new Set(expenses.map(e => e.currency || 'USD'))
    return Array.from(currencySet).sort()
  }, [expenses])

  const [selectedCurrency, setSelectedCurrency] = useState('all')

  // Update selected currency if it's no longer in the list
  useEffect(() => {
    if (selectedCurrency !== 'all' && !currencies.includes(selectedCurrency)) {
      setSelectedCurrency('all')
    }
  }, [currencies, selectedCurrency])

  // Filter expenses by selected currency
  const filteredExpenses = useMemo(() => {
    if (!expenses || expenses.length === 0) return []
    if (selectedCurrency === 'all') return expenses
    return expenses.filter(e => (e.currency || 'USD') === selectedCurrency)
  }, [expenses, selectedCurrency])

  // Calculate balances for all currencies or specific currency
  const calculateAllBalances = () => {
    if (!expenses || !members) return {}
    
    const balancesByCurrency = {}
    
    currencies.forEach(currency => {
      const currencyExpenses = expenses.filter(e => (e.currency || 'USD') === currency)
      const balances = {}
      
      // Initialize balances
      members.forEach(member => {
        balances[member] = 0
      })

      // Calculate net balances
      currencyExpenses.forEach(expense => {
        if (expense.isMultiplePayers) {
          expense.paidBy.forEach(payer => {
            balances[payer.member] += payer.amount
          })
        } else {
          balances[expense.paidBy] += expense.amount
        }
        
        if (expense.splitAmounts) {
          Object.entries(expense.splitAmounts).forEach(([person, amount]) => {
            balances[person] -= amount
          })
        } else {
          const sharePerPerson = expense.amount / (expense.splitBetween?.length || members.length)
          const splitMembers = expense.splitBetween || members
          splitMembers.forEach(person => {
            balances[person] -= sharePerPerson
          })
        }
      })

      balancesByCurrency[currency] = balances
    })

    return balancesByCurrency
  }

  // Calculate who owes whom
  const calculateBalances = () => {
    const balances = {}
    
    // Initialize balances
    members.forEach(member => {
      balances[member] = 0
    })

    // Calculate net balances
    filteredExpenses.forEach(expense => {
      if (expense.isMultiplePayers) {
        // Multiple payers
        expense.paidBy.forEach(payer => {
          balances[payer.member] += payer.amount
        })
      } else {
        // Single payer
        balances[expense.paidBy] += expense.amount
      }
      
      // People who split the expense get debited based on splitAmounts
      if (expense.splitAmounts) {
        Object.entries(expense.splitAmounts).forEach(([person, amount]) => {
          balances[person] -= amount
        })
      } else {
        // Fallback for old expenses without splitAmounts
        const sharePerPerson = expense.amount / (expense.splitBetween?.length || members.length)
        const splitMembers = expense.splitBetween || members
        splitMembers.forEach(person => {
          balances[person] -= sharePerPerson
        })
      }
    })

    return balances
  }

  const simplifyDebts = (balances) => {
    const creditors = []
    const debtors = []
    
    Object.entries(balances).forEach(([person, balance]) => {
      if (balance > 0.01) {
        creditors.push({ person, amount: balance })
      } else if (balance < -0.01) {
        debtors.push({ person, amount: -balance })
      }
    })

    const settlements = []
    let i = 0, j = 0

    while (i < creditors.length && j < debtors.length) {
      const creditor = creditors[i]
      const debtor = debtors[j]
      const amount = Math.min(creditor.amount, debtor.amount)

      settlements.push({
        from: debtor.person,
        to: creditor.person,
        amount: amount
      })

      creditor.amount -= amount
      debtor.amount -= amount

      if (creditor.amount < 0.01) i++
      if (debtor.amount < 0.01) j++
    }

    return settlements
  }

  // Calculate individual balances between each pair of people
  const calculateAllIndividualBalances = (currentUsername) => {
    if (!expenses || !members) return {}
    
    const balancesByCurrency = {}
    
    currencies.forEach(currency => {
      const currencyExpenses = expenses.filter(e => (e.currency || 'USD') === currency)
      const pairBalances = {}
      
      // Initialize pair balances for current user with all other members
      members.forEach(member => {
        if (member !== currentUsername) {
          pairBalances[member] = 0
        }
      })

      // Go through each expense and track direct transactions
      currencyExpenses.forEach(expense => {
        let payers = []
        
        if (expense.isMultiplePayers) {
          payers = expense.paidBy.map(p => ({ member: p.member, amount: p.amount }))
        } else {
          payers = [{ member: expense.paidBy, amount: expense.amount }]
        }

        const splitAmounts = expense.splitAmounts || {}
        
        payers.forEach(payer => {
          const payerMember = payer.member

          Object.entries(splitAmounts).forEach(([splitMember, owedAmount]) => {
            if (payerMember === splitMember) return

            if (payerMember === currentUsername && splitMember !== currentUsername) {
              pairBalances[splitMember] = (pairBalances[splitMember] || 0) + owedAmount
            } else if (splitMember === currentUsername && payerMember !== currentUsername) {
              pairBalances[payerMember] = (pairBalances[payerMember] || 0) - owedAmount
            }
          })
        })
      })

      balancesByCurrency[currency] = pairBalances
    })

    return balancesByCurrency
  }

  const currentUsername = currentUser.username
  const allBalances = calculateAllBalances()
  const allIndividualBalances = calculateAllIndividualBalances(currentUsername)

  if (showSettlements) {
    // Third-person settlement view with debt simplification
    return (
      <div className="balance-section">
        <div className="card">
          <div className="balance-header">
            <h3>💸 Settlement Plan</h3>
            {currencies.length > 1 && (
              <select 
                value={selectedCurrency}
                onChange={(e) => setSelectedCurrency(e.target.value)}
                className="currency-filter"
              >
                <option value="all">All Currencies</option>
                {currencies.map(curr => (
                  <option key={curr} value={curr}>{curr}</option>
                ))}
              </select>
            )}
          </div>
          <p className="settlement-description">
            Simplified payment plan to settle all debts with minimum transactions
          </p>
          
          {selectedCurrency === 'all' ? (
            // Show settlements for all currencies
            <>
              {currencies.map(currency => {
                const balances = allBalances[currency] || {}
                const settlements = simplifyDebts(balances)
                
                if (settlements.length === 0) return null
                
                return (
                  <div key={currency} className="currency-settlements">
                    <div className="currency-label">{currency}</div>
                    <div className="settlements-list">
                      {settlements.map((settlement, index) => (
                        <div key={index} className="settlement-item">
                          <span className="settlement-text">
                            <strong>{settlement.from}</strong> pays <strong>{settlement.to}</strong>
                          </span>
                          <span className="settlement-amount">{currency} {settlement.amount.toFixed(2)}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )
              })}
              {currencies.every(currency => simplifyDebts(allBalances[currency] || {}).length === 0) && (
                <p className="all-settled">✅ All settled up! No payments needed.</p>
              )}
            </>
          ) : (
            // Show settlements for selected currency
            <>
              {(() => {
                const balances = allBalances[selectedCurrency] || {}
                const settlements = simplifyDebts(balances)
                
                return settlements.length > 0 ? (
                  <div className="settlements-list">
                    {settlements.map((settlement, index) => (
                      <div key={index} className="settlement-item">
                        <span className="settlement-text">
                          <strong>{settlement.from}</strong> pays <strong>{settlement.to}</strong>
                        </span>
                        <span className="settlement-amount">{selectedCurrency} {settlement.amount.toFixed(2)}</span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="all-settled">✅ All settled up! No payments needed.</p>
                )
              })()}
            </>
          )}
        </div>
      </div>
    )
  }

  // First-person balance view with individual breakdowns
  return (
    <div className="balance-section">
      <div className="card">
        <div className="balance-header">
          <h3>💰 Your Balance</h3>
          {currencies.length > 1 && (
            <select 
              value={selectedCurrency}
              onChange={(e) => setSelectedCurrency(e.target.value)}
              className="currency-filter"
            >
              <option value="all">All Currencies</option>
              {currencies.map(curr => (
                <option key={curr} value={curr}>{curr}</option>
              ))}
            </select>
          )}
        </div>

        {selectedCurrency === 'all' ? (
          // Show all currencies
          <>
            {currencies.map(currency => {
              const userBalance = allBalances[currency]?.[currentUsername] || 0
              if (Math.abs(userBalance) < 0.01) return null
              
              return (
                <div key={currency} className="balances-grid" style={{ marginBottom: '0.75rem' }}>
                  <div className={`balance-item ${userBalance > 0.01 ? 'positive' : userBalance < -0.01 ? 'negative' : 'neutral'}`}>
                    <span className="member-name">Overall</span>
                    <span className="balance-amount">
                      {userBalance > 0.01 && `You are owed ${currency} ${userBalance.toFixed(2)}`}
                      {userBalance < -0.01 && `You owe ${currency} ${Math.abs(userBalance).toFixed(2)}`}
                    </span>
                  </div>
                </div>
              )
            })}

            {/* Individual balances for all currencies */}
            {currencies.some(currency => {
              const individualBalances = allIndividualBalances[currency]
              return Object.values(individualBalances).some(bal => Math.abs(bal) > 0.01)
            }) && (
              <div className="individual-balances">
                <h4>Individual Balances</h4>
                {currencies.map(currency => {
                  const individualBalances = allIndividualBalances[currency]
                  const userOwes = {}
                  const userOwedBy = {}
                  
                  Object.entries(individualBalances).forEach(([member, balance]) => {
                    if (balance > 0.01) {
                      userOwedBy[member] = balance
                    } else if (balance < -0.01) {
                      userOwes[member] = Math.abs(balance)
                    }
                  })

                  if (Object.keys(userOwes).length === 0 && Object.keys(userOwedBy).length === 0) {
                    return null
                  }

                  return (
                    <div key={currency} className="currency-group">
                      <div className="currency-label">{currency}</div>
                      {Object.entries(userOwes).map(([member, amount]) => (
                        <div key={member} className="balance-detail negative">
                          <span>You owe <strong>{member}</strong></span>
                          <span className="amount">{currency} {amount.toFixed(2)}</span>
                        </div>
                      ))}
                      {Object.entries(userOwedBy).map(([member, amount]) => (
                        <div key={member} className="balance-detail positive">
                          <span><strong>{member}</strong> owes you</span>
                          <span className="amount">{currency} {amount.toFixed(2)}</span>
                        </div>
                      ))}
                    </div>
                  )
                })}
              </div>
            )}
          </>
        ) : (
          // Show single currency
          <>
            <div className="balances-grid">
              <div className={`balance-item ${(allBalances[selectedCurrency]?.[currentUsername] || 0) > 0.01 ? 'positive' : (allBalances[selectedCurrency]?.[currentUsername] || 0) < -0.01 ? 'negative' : 'neutral'}`}>
                <span className="member-name">Overall</span>
                <span className="balance-amount">
                  {(allBalances[selectedCurrency]?.[currentUsername] || 0) > 0.01 && `You are owed ${selectedCurrency} ${(allBalances[selectedCurrency]?.[currentUsername] || 0).toFixed(2)}`}
                  {(allBalances[selectedCurrency]?.[currentUsername] || 0) < -0.01 && `You owe ${selectedCurrency} ${Math.abs(allBalances[selectedCurrency]?.[currentUsername] || 0).toFixed(2)}`}
                  {Math.abs(allBalances[selectedCurrency]?.[currentUsername] || 0) < 0.01 && 'All settled up'}
                </span>
              </div>
            </div>

            {(() => {
              const individualBalances = allIndividualBalances[selectedCurrency] || {}
              const userOwes = {}
              const userOwedBy = {}
              
              Object.entries(individualBalances).forEach(([member, balance]) => {
                if (balance > 0.01) {
                  userOwedBy[member] = balance
                } else if (balance < -0.01) {
                  userOwes[member] = Math.abs(balance)
                }
              })

              return (Object.keys(userOwes).length > 0 || Object.keys(userOwedBy).length > 0) && (
                <div className="individual-balances">
                  <h4>Individual Balances</h4>
                  {Object.entries(userOwes).map(([member, amount]) => (
                    <div key={member} className="balance-detail negative">
                      <span>You owe <strong>{member}</strong></span>
                      <span className="amount">{selectedCurrency} {amount.toFixed(2)}</span>
                    </div>
                  ))}
                  {Object.entries(userOwedBy).map(([member, amount]) => (
                    <div key={member} className="balance-detail positive">
                      <span><strong>{member}</strong> owes you</span>
                      <span className="amount">{selectedCurrency} {amount.toFixed(2)}</span>
                    </div>
                  ))}
                </div>
              )
            })()}
          </>
        )}
      </div>
    </div>
  )
}

export default BalanceCalculator
