import { useState, useMemo, useEffect } from 'react'
import PaymentModal from './PaymentModal'
import { groupsAPI } from '../api'
import './BalanceCalculator.css'

function BalanceCalculator({ expenses, members, currentUser, showSettlements = false, groupId, onPaymentAction, pendingPayments = [], paymentRequests = [] }) {
  // Get all unique currencies used in expenses
  const currencies = useMemo(() => {
    if (!expenses || expenses.length === 0) return ['USD']
    const currencySet = new Set(expenses.map(e => e.currency || 'USD'))
    return Array.from(currencySet).sort()
  }, [expenses])

  const [selectedCurrency, setSelectedCurrency] = useState('all')
  const [showPaymentModal, setShowPaymentModal] = useState(false)
  const [paymentData, setPaymentData] = useState(null)
  const [sendingReminder, setSendingReminder] = useState(null)

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

  // Handle opening payment modal
  const handlePayClick = (member, amount, currency) => {
    setPaymentData({
      to: member,
      amount,
      currency
    })
    setShowPaymentModal(true)
  }

  // Handle payment creation
  const handlePaymentConfirm = async (amount) => {
    if (!paymentData || !onPaymentAction) return
    
    await onPaymentAction('create', {
      to: paymentData.to,
      amount,
      currency: paymentData.currency
    })
    
    setShowPaymentModal(false)
    setPaymentData(null)
  }

  // Handle payment confirmation/rejection
  const handlePaymentResponse = async (paymentId, action) => {
    if (!onPaymentAction) return
    
    try {
      await onPaymentAction(action, paymentId)
      
      // Show notification for rejection
      if (action === 'reject') {
        const payment = userPendingPayments.find(p => p.id === paymentId)
        if (payment && payment.to === currentUsername) {
          alert(`Payment from ${payment.from} has been rejected.`)
        }
      }
    } catch (error) {
      console.error('Error processing payment response:', error)
      alert('Failed to process payment. Please try again.')
    }
  }

  const handleSendReminder = async (paymentId) => {
    try {
      setSendingReminder(paymentId)
      await groupsAPI.sendPaymentReminder(groupId, paymentId)
      alert('Reminder sent! ✓')
    } catch (error) {
      alert(error.message || 'Failed to send reminder')
    } finally {
      setSendingReminder(null)
    }
  }

  const handleRequestPayment = async (member, amount, currency) => {
    try {
      setSendingReminder(member)
      await groupsAPI.sendPaymentRequest(groupId, { to: member, amount, currency })
      alert(`Payment request sent to ${member}! ✓`)
    } catch (error) {
      alert(error.message || 'Failed to send request')
    } finally {
      setSendingReminder(null)
    }
  }

  const handleDismissRequest = async (requestId) => {
    try {
      await groupsAPI.dismissPaymentRequest(groupId, requestId)
    } catch (error) {
      console.error('Error dismissing request:', error)
    }
  }

  const canSendReminder = (payment) => {
    if (!payment.lastReminderSent) return true
    const ONE_HOUR = 60 * 60 * 1000
    const timeSinceLastReminder = new Date() - new Date(payment.lastReminderSent)
    return timeSinceLastReminder >= ONE_HOUR
  }

  const canSendRequest = (member, currency) => {
    const request = paymentRequests.find(r => 
      r.from === currentUser.username && r.to === member && r.currency === currency
    )
    if (!request || !request.lastSent) return true
    const ONE_HOUR = 60 * 60 * 1000
    const timeSinceLastSent = new Date() - new Date(request.lastSent)
    return timeSinceLastSent >= ONE_HOUR
  }

  const getTimeUntilNextReminder = (payment) => {
    if (!payment.lastReminderSent) return null
    const ONE_HOUR = 60 * 60 * 1000
    const timeSinceLastReminder = new Date() - new Date(payment.lastReminderSent)
    const timeRemaining = ONE_HOUR - timeSinceLastReminder
    if (timeRemaining <= 0) return null
    const minutesRemaining = Math.ceil(timeRemaining / 60000)
    return minutesRemaining
  }

  const getTimeUntilNextRequest = (member, currency) => {
    const request = paymentRequests.find(r => 
      r.from === currentUser.username && r.to === member && r.currency === currency
    )
    if (!request || !request.lastSent) return null
    const ONE_HOUR = 60 * 60 * 1000
    const timeSinceLastSent = new Date() - new Date(request.lastSent)
    const timeRemaining = ONE_HOUR - timeSinceLastSent
    if (timeRemaining <= 0) return null
    const minutesRemaining = Math.ceil(timeRemaining / 60000)
    return minutesRemaining
  }

  // Filter pending payments for current user
  const userPendingPayments = useMemo(() => {
    if (!pendingPayments || !currentUsername) return []
    return pendingPayments.filter(p => 
      p.status === 'pending' && (p.from === currentUsername || p.to === currentUsername)
    )
  }, [pendingPayments, currentUsername])

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
  const paymentsToRespond = useMemo(() => {
    return userPendingPayments.filter(p => p.to === currentUsername)
  }, [userPendingPayments, currentUsername])

  const requestsForMe = useMemo(() => {
    if (!paymentRequests || !currentUsername) return []
    // Filter out requests that already have pending payments
    return paymentRequests.filter(r => {
      if (r.to !== currentUsername) return false
      // Check if there's already a pending payment for this request
      const hasPendingPayment = pendingPayments.some(p => 
        p.from === r.to && p.to === r.from && p.currency === r.currency && p.status === 'pending'
      )
      return !hasPendingPayment
    })
  }, [paymentRequests, currentUsername, pendingPayments])

  const totalNotifications = paymentsToRespond.length + requestsForMe.length

  return (
    <div className="balance-section">
      {totalNotifications > 0 && (
        <div className="payment-reminder-banner">
          <div className="banner-content">
            <span className="banner-icon">🔔</span>
            <span className="banner-text">
              {paymentsToRespond.length > 0 && (
                <>You have <strong>{paymentsToRespond.length}</strong> pending payment{paymentsToRespond.length > 1 ? 's' : ''} to review</>
              )}
              {paymentsToRespond.length > 0 && requestsForMe.length > 0 && <> • </>}
              {requestsForMe.length > 0 && (
                <><strong>{requestsForMe.length}</strong> payment request{requestsForMe.length > 1 ? 's' : ''} from others</>
              )}
            </span>
          </div>
        </div>
      )}
      
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
                
                {/* Show pending payments */}
                {userPendingPayments.length > 0 && (
                  <div className="pending-payments-section">
                    <h5>⏳ Pending Payments</h5>
                    {userPendingPayments.map(payment => (
                      <div key={payment.id} className="pending-payment-item">
                        {payment.from === currentUsername ? (
                          <div className="payment-sent">
                            <span>Waiting for <strong>{payment.to}</strong> to confirm</span>
                            <span className="payment-amount">{payment.currency} {payment.amount.toFixed(2)}</span>
                          </div>
                        ) : (
                          <div className="payment-received">
                            <div className="payment-info">
                              <span><strong>{payment.from}</strong> wants to pay you</span>
                              <span className="payment-amount">{payment.currency} {payment.amount.toFixed(2)}</span>
                            </div>
                            <div className="payment-actions">
                              <button 
                                className="btn-confirm-payment"
                                onClick={() => handlePaymentResponse(payment.id, 'confirm')}
                              >
                                ✓ Accept
                              </button>
                              <button 
                                className="btn-reject-payment"
                                onClick={() => handlePaymentResponse(payment.id, 'reject')}
                              >
                                ✕ Reject
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}

                {/* Show payment requests */}
                {requestsForMe.length > 0 && (
                  <div className="pending-payments-section">
                    <h5>🔔 Payment Requests</h5>
                    {requestsForMe.map(request => (
                      <div key={request.id} className="pending-payment-item payment-request-item">
                        <div className="payment-received">
                          <div className="payment-info">
                            <span><strong>{request.from}</strong> is requesting payment</span>
                            <span className="payment-amount">{request.currency} {request.amount.toFixed(2)}</span>
                          </div>
                          <div className="payment-actions">
                            <button 
                              className="btn-confirm-payment"
                              onClick={() => handlePayClick(request.from, request.amount, request.currency)}
                              disabled={!onPaymentAction}
                            >
                              💰 Pay Now
                            </button>
                            <button 
                              className="btn-reject-payment"
                              onClick={() => handleDismissRequest(request.id)}
                            >
                              ✕ Dismiss
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

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
                          <div className="balance-actions">
                            <span className="amount">{currency} {amount.toFixed(2)}</span>
                            <button 
                              className="btn-pay"
                              onClick={() => handlePayClick(member, amount, currency)}
                              disabled={!onPaymentAction}
                            >
                              Pay
                            </button>
                          </div>
                        </div>
                      ))}
                      {Object.entries(userOwedBy).map(([member, amount]) => {
                        // Find pending payment from this member
                        const pendingPayment = pendingPayments.find(p => 
                          p.from === member && p.to === currentUsername && p.status === 'pending'
                        )
                        
                        // Only show remind button if there's NO pending payment
                        const canRequestPayment = !pendingPayment && canSendRequest(member, currency)
                        const minutesRemaining = getTimeUntilNextRequest(member, currency)

                        return (
                          <div key={member} className="balance-detail positive">
                            <div style={{ flex: 1 }}>
                              <span><strong>{member}</strong> owes you</span>
                              {pendingPayment && (
                                <div className="pending-indicator">⏳ Payment pending</div>
                              )}
                            </div>
                            <div className="balance-actions">
                              <span className="amount">{currency} {amount.toFixed(2)}</span>
                              {pendingPayment ? (
                                <button 
                                  className="btn-remind"
                                  disabled={true}
                                  style={{ opacity: 0.6, cursor: 'not-allowed' }}
                                >
                                  ⏳ Pending
                                </button>
                              ) : (
                                <button 
                                  className="btn-remind"
                                  onClick={() => handleRequestPayment(member, amount, currency)}
                                  disabled={!canRequestPayment || sendingReminder === member}
                                  title={!canRequestPayment && minutesRemaining ? `Wait ${minutesRemaining} min` : 'Request payment'}
                                >
                                  {sendingReminder === member ? '...' : canRequestPayment ? '🔔 Remind' : `🔔 ${minutesRemaining}m`}
                                </button>
                              )}
                            </div>
                          </div>
                        )
                      })}
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
                  
                  {/* Show pending payments */}
                  {userPendingPayments.filter(p => p.currency === selectedCurrency).length > 0 && (
                    <div className="pending-payments-section">
                      <h5>⏳ Pending Payments</h5>
                      {userPendingPayments.filter(p => p.currency === selectedCurrency).map(payment => (
                        <div key={payment.id} className="pending-payment-item">
                          {payment.from === currentUsername ? (
                            <div className="payment-sent">
                              <span>Waiting for <strong>{payment.to}</strong> to confirm</span>
                              <span className="payment-amount">{payment.currency} {payment.amount.toFixed(2)}</span>
                            </div>
                          ) : (
                            <div className="payment-received">
                              <div className="payment-info">
                                <span><strong>{payment.from}</strong> wants to pay you</span>
                                <span className="payment-amount">{payment.currency} {payment.amount.toFixed(2)}</span>
                              </div>
                              <div className="payment-actions">
                                <button 
                                  className="btn-confirm-payment"
                                  onClick={() => handlePaymentResponse(payment.id, 'confirm')}
                                >
                                  ✓ Accept
                                </button>
                                <button 
                                  className="btn-reject-payment"
                                  onClick={() => handlePaymentResponse(payment.id, 'reject')}
                                >
                                  ✕ Reject
                                </button>
                              </div>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Show payment requests */}
                  {requestsForMe.filter(r => r.currency === selectedCurrency).length > 0 && (
                    <div className="pending-payments-section">
                      <h5>🔔 Payment Requests</h5>
                      {requestsForMe.filter(r => r.currency === selectedCurrency).map(request => (
                        <div key={request.id} className="pending-payment-item payment-request-item">
                          <div className="payment-received">
                            <div className="payment-info">
                              <span><strong>{request.from}</strong> is requesting payment</span>
                              <span className="payment-amount">{request.currency} {request.amount.toFixed(2)}</span>
                            </div>
                            <div className="payment-actions">
                              <button 
                                className="btn-confirm-payment"
                                onClick={() => handlePayClick(request.from, request.amount, request.currency)}
                                disabled={!onPaymentAction}
                              >
                                💰 Pay Now
                              </button>
                              <button 
                                className="btn-reject-payment"
                                onClick={() => handleDismissRequest(request.id)}
                              >
                                ✕ Dismiss
                              </button>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {Object.entries(userOwes).map(([member, amount]) => (
                    <div key={member} className="balance-detail negative">
                      <span>You owe <strong>{member}</strong></span>
                      <div className="balance-actions">
                        <span className="amount">{selectedCurrency} {amount.toFixed(2)}</span>
                        <button 
                          className="btn-pay"
                          onClick={() => handlePayClick(member, amount, selectedCurrency)}
                          disabled={!onPaymentAction}
                        >
                          Pay
                        </button>
                      </div>
                    </div>
                  ))}
                  {Object.entries(userOwedBy).map(([member, amount]) => {
                    // Find pending payment from this member
                    const pendingPayment = pendingPayments.find(p => 
                      p.from === member && p.to === currentUsername && p.status === 'pending' && p.currency === selectedCurrency
                    )
                    // Can remind if: no pending payment (can send request) OR (has pending payment AND cooldown passed)
                    const hasNoPendingPayment = !pendingPayment
                    const canRemindPayment = pendingPayment && canSendReminder(pendingPayment)
                    const canRequestPayment = hasNoPendingPayment && canSendRequest(member, selectedCurrency)
                    const canRemind = canRemindPayment || canRequestPayment
                    
                    const minutesRemaining = pendingPayment 
                      ? getTimeUntilNextReminder(pendingPayment)
                      : getTimeUntilNextRequest(member, selectedCurrency)

                    return (
                      <div key={member} className="balance-detail positive">
                        <div style={{ flex: 1 }}>
                          <span><strong>{member}</strong> owes you</span>
                          {pendingPayment && (
                            <div className="pending-indicator">⏳ Payment pending</div>
                          )}
                        </div>
                        <div className="balance-actions">
                          <span className="amount">{selectedCurrency} {amount.toFixed(2)}</span>
                          <button 
                            className="btn-remind"
                            onClick={() => pendingPayment ? handleSendReminder(pendingPayment.id) : handleRequestPayment(member, amount, selectedCurrency)}
                            disabled={!canRemind || sendingReminder === member}
                            title={!canRemind && minutesRemaining ? `Wait ${minutesRemaining} min` : pendingPayment ? 'Send reminder' : 'Request payment'}
                          >
                            {sendingReminder === member ? '...' : canRemind ? '🔔 Remind' : `🔔 ${minutesRemaining}m`}
                          </button>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )
            })()}
          </>
        )}
      </div>

      {/* Payment Modal */}
      {paymentData && (
        <PaymentModal
          isOpen={showPaymentModal}
          onClose={() => {
            setShowPaymentModal(false)
            setPaymentData(null)
          }}
          onConfirm={handlePaymentConfirm}
          maxAmount={paymentData.amount}
          currency={paymentData.currency}
          recipientName={paymentData.to}
        />
      )}
    </div>
  )
}

export default BalanceCalculator
