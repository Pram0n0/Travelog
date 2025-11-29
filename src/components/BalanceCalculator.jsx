/**
 * BalanceCalculator Component (Refactored)
 * 
 * Displays member balances, payment options, and settlement recommendations.
 * Handles payment requests, reminders, and pending payment responses.
 */

import { useState, useMemo } from 'react'
import PaymentModal from './PaymentModal'
import { groupsAPI } from '../api'
import './BalanceCalculator.css'

// Utility imports
import {
  calculateBalances,
  calculateAllBalances,
  calculateSettlements,
  calculateUserBalances
} from '../utils/balanceCalculations'
import {
  canSendPaymentRequest,
  getTimeUntilNextPaymentRequest,
  filterPaymentRequestsForUser
} from '../utils/reminderUtils'
import { formatCurrency } from '../utils/formatters'

// Hook imports
import {
  useCurrencies,
  useCurrencySelection,
  useFilteredExpenses,
  usePaymentReminders
} from '../hooks/useBalanceHooks'

function BalanceCalculator({ 
  expenses, 
  members, 
  currentUser, 
  showSettlements = false, 
  groupId, 
  onPaymentAction, 
  pendingPayments = [], 
  paymentRequests = [] 
}) {
  // State
  const [showPaymentModal, setShowPaymentModal] = useState(false)
  const [paymentData, setPaymentData] = useState(null)
  
  // Extract data
  const currentUsername = currentUser.username
  
  // Custom hooks
  const currencies = useCurrencies(expenses)
  const { selectedCurrency, setSelectedCurrency } = useCurrencySelection(currencies)
  const filteredExpenses = useFilteredExpenses(expenses, selectedCurrency)
  const { 
    sendingReminder, 
    setSendingReminder,
    requestsForMe,
    paymentsToRespond
  } = usePaymentReminders(pendingPayments, paymentRequests, currentUsername)
  
  // Calculate balances
  const allBalances = useMemo(() => 
    calculateAllBalances(expenses, members, currencies),
    [expenses, members, currencies]
  )
  
  const currentBalances = useMemo(() => 
    calculateBalances(filteredExpenses, members),
    [filteredExpenses, members]
  )
  
  // Filter pending payments for current user
  const userPendingPayments = useMemo(() => {
    if (!pendingPayments || !currentUsername) return []
    return pendingPayments.filter(p => 
      p.status === 'pending' && (p.from === currentUsername || p.to === currentUsername)
    )
  }, [pendingPayments, currentUsername])

  // === Event Handlers ===
  
  const handlePayClick = (member, amount, currency) => {
    console.log('Pay button clicked:', { member, amount, currency });
    setPaymentData({ to: member, amount, currency });
    setShowPaymentModal(true);
  }

  const handlePaymentConfirm = async (amount) => {
    console.log('Payment modal confirmed:', { paymentData, amount });
    if (!paymentData || !onPaymentAction) return;
    await onPaymentAction('create', {
      to: paymentData.to,
      amount,
      currency: paymentData.currency
    });
    setShowPaymentModal(false);
    setPaymentData(null);
  }

  const handlePaymentResponse = async (paymentId, action) => {
    if (!onPaymentAction) return
    
    try {
      await onPaymentAction(action, paymentId)
      
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

  // === Render Functions ===

  const renderCurrencyFilter = () => {
    if (currencies.length <= 1) return null
    
    return (
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
    )
  }

  const renderPaymentRequestBanner = () => {
    const totalPendingPayments = paymentsToRespond.length
    const totalPaymentRequests = requestsForMe.length
    const totalCount = totalPendingPayments + totalPaymentRequests

    if (totalCount === 0) return null

    return (
      <div className="payment-reminder-banner modern-banner">
        <span className="banner-icon">🔔</span>
        <div className="banner-content">
          <strong className="banner-title">Payment Notifications</strong>
          <div className="banner-details">
            {totalPendingPayments > 0 && (
              <span className="pending-highlight">{totalPendingPayments} pending payment{totalPendingPayments > 1 ? 's' : ''} to review</span>
            )}
            {totalPendingPayments > 0 && totalPaymentRequests > 0 && <span className="dot-separator">•</span>}
            {totalPaymentRequests > 0 && (
              <span className="request-highlight">{totalPaymentRequests} payment request{totalPaymentRequests > 1 ? 's' : ''}</span>
            )}
          </div>
        </div>
      </div>
    )
  }

  const renderPaymentRequestsSection = () => {
    if (requestsForMe.length === 0) return null

    return (
      <div className="payment-requests-section modern-section">
        <h4 className="section-title">🔔 Payment Requests</h4>
        {requestsForMe.map((request) => (
          <div key={request.id} className="payment-request-item modern-item">
            <div className="request-header">
              <div className="avatar-circle">{request.from[0].toUpperCase()}</div>
              <div className="request-info">
                <span className="request-from"><strong>{request.from}</strong> is requesting payment</span>
                <span className="request-amount modern-amount">{formatCurrency(request.amount, request.currency)}</span>
              </div>
            </div>
            <div className="request-actions modern-actions">
              <button 
                className="btn-pay modern-btn-pay"
                onClick={() => handlePayClick(request.from, request.amount, request.currency)}
              >
                💰 Pay Now
              </button>
              <button 
                className="btn-reject-payment modern-btn-reject"
                onClick={() => handleDismissRequest(request.id)}
              >
                ✕ Dismiss
              </button>
            </div>
          </div>
        ))}
      </div>
    )
  }

  const renderPendingPayments = () => {
    const paymentsToConfirm = userPendingPayments.filter(p => p.to === currentUsername)
    
    if (paymentsToConfirm.length === 0) return null

    return (
      <div className="pending-payments-section modern-section">
        <h4 className="section-title">⏳ Pending Payments (Awaiting Your Confirmation)</h4>
        {paymentsToConfirm.map((payment) => (
          <div key={payment.id} className="pending-payment-item modern-item">
            <div className="pending-header">
              <div className="avatar-circle">{payment.from[0].toUpperCase()}</div>
              <div className="pending-info">
                <span className="pending-from"><strong>{payment.from}</strong> has sent you</span>
                <span className="pending-amount modern-amount">{formatCurrency(payment.amount, payment.currency)}</span>
              </div>
            </div>
            <div className="payment-actions modern-actions">
              <button 
                className="btn-confirm-payment modern-btn-confirm"
                onClick={() => handlePaymentResponse(payment.id, 'confirm')}
              >
                ✓ Confirm
              </button>
              <button 
                className="btn-reject-payment modern-btn-reject"
                onClick={() => handlePaymentResponse(payment.id, 'reject')}
              >
                ✗ Reject
              </button>
            </div>
          </div>
        ))}
      </div>
    )
  }

  const renderBalanceView = () => {
    if (selectedCurrency === 'all') {
      return renderAllCurrenciesView()
    } else {
      return renderSingleCurrencyView()
    }
  }

  const renderAllCurrenciesView = () => {
    return (
      <>
        <div className="balances-grid">
          {currencies.map(currency => {
            const currencyBalances = allBalances[currency] || {}
            const userBalance = currencyBalances[currentUsername] || 0
            const balanceClass = userBalance > 0.01 ? 'positive' : userBalance < -0.01 ? 'negative' : 'neutral'
            
            return (
              <div key={currency} className={`balance-item ${balanceClass}`}>
                <span className="member-name">{currency}</span>
                <span className="balance-amount">
                  {formatCurrency(Math.abs(userBalance), currency)}
                </span>
              </div>
            )
          })}
        </div>

        <div className="balances-breakdown">
          {currencies.map(currency => {
            const currencyBalances = allBalances[currency] || {}
            const { userOwes, userOwedBy } = calculateUserBalances(currencyBalances, currentUsername)
            
            if (Object.keys(userOwes).length === 0 && Object.keys(userOwedBy).length === 0) {
              return null
            }

            return (
              <div key={currency} className="currency-breakdown">
                <h4>{currency}</h4>
                <div className="balance-details">
                  {Object.entries(userOwes).map(([member, amount]) => {
                    const pendingPayment = pendingPayments.find(p => 
                      p.from === currentUsername && p.to === member && p.status === 'pending' && p.currency === currency
                    )

                    return (
                      <div key={member} className="balance-detail negative">
                        <div style={{ flex: 1 }}>
                          <span>You owe <strong>{member}</strong></span>
                          {pendingPayment && (
                            <div className="pending-indicator">⏳ Payment sent (pending confirmation)</div>
                          )}
                        </div>
                        <div className="balance-actions">
                          <span className="amount">{formatCurrency(amount, currency)}</span>
                          {!pendingPayment && (
                            <button 
                              className="btn-pay"
                              onClick={() => handlePayClick(member, amount, currency)}
                            >
                              Pay
                            </button>
                          )}
                        </div>
                      </div>
                    )
                  })}

                  {Object.entries(userOwedBy).map(([member, amount]) => {
                    const pendingPayment = pendingPayments.find(p => 
                      p.from === member && p.to === currentUsername && p.status === 'pending'
                    )
                    
                    const canRequestPayment = !pendingPayment && canSendPaymentRequest(member, currency, paymentRequests)
                    const minutesRemaining = getTimeUntilNextPaymentRequest(member, currency, paymentRequests)

                    return (
                      <div key={member} className="balance-detail positive">
                        <div style={{ flex: 1 }}>
                          <span><strong>{member}</strong> owes you</span>
                          {pendingPayment && (
                            <div className="pending-indicator">⏳ Payment pending</div>
                          )}
                        </div>
                        <div className="balance-actions">
                          <span className="amount">{formatCurrency(amount, currency)}</span>
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
              </div>
            )
          })}
        </div>
      </>
    )
  }

  const renderSingleCurrencyView = () => {
    const { userOwes, userOwedBy } = calculateUserBalances(currentBalances, currentUsername)
    const userBalance = currentBalances[currentUsername] || 0
    const balanceClass = userBalance > 0.01 ? 'positive' : userBalance < -0.01 ? 'negative' : 'neutral'

    return (
      <>
        <div className="balances-grid">
          <div className={`balance-item ${balanceClass}`}>
            <span className="member-name">Overall</span>
            <span className="balance-amount">
              {formatCurrency(Math.abs(userBalance), selectedCurrency)}
            </span>
          </div>
        </div>

        <div className="balance-details">
          {Object.entries(userOwes).map(([member, amount]) => {
            const pendingPayment = pendingPayments.find(p => 
              p.from === currentUsername && p.to === member && p.status === 'pending' && p.currency === selectedCurrency
            )

            return (
              <div key={member} className="balance-detail negative">
                <div style={{ flex: 1 }}>
                  <span>You owe <strong>{member}</strong></span>
                  {pendingPayment && (
                    <div className="pending-indicator">⏳ Payment sent (pending confirmation)</div>
                  )}
                </div>
                <div className="balance-actions">
                  <span className="amount">{formatCurrency(amount, selectedCurrency)}</span>
                  {!pendingPayment && (
                    <button 
                      className="btn-pay"
                      onClick={() => handlePayClick(member, amount, selectedCurrency)}
                    >
                      Pay
                    </button>
                  )}
                </div>
              </div>
            )
          })}

          {Object.entries(userOwedBy).map(([member, amount]) => {
            const pendingPayment = pendingPayments.find(p => 
              p.from === member && p.to === currentUsername && p.status === 'pending'
            )
            
            const canRequestPayment = !pendingPayment && canSendPaymentRequest(member, selectedCurrency, paymentRequests)
            const minutesRemaining = getTimeUntilNextPaymentRequest(member, selectedCurrency, paymentRequests)

            return (
              <div key={member} className="balance-detail positive">
                <div style={{ flex: 1 }}>
                  <span><strong>{member}</strong> owes you</span>
                  {pendingPayment && (
                    <div className="pending-indicator">⏳ Payment pending</div>
                  )}
                </div>
                <div className="balance-actions">
                  <span className="amount">{formatCurrency(amount, selectedCurrency)}</span>
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
                      onClick={() => handleRequestPayment(member, amount, selectedCurrency)}
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
      </>
    )
  }

  const renderSettlementsView = () => {
    return (
      <div className="balance-section">
        <div className="card">
          <div className="balance-header">
            <h3>💸 Settlement Plan</h3>
            {renderCurrencyFilter()}
          </div>
          <p className="settlement-description">
            This shows the minimum number of transactions needed to settle all debts in the group.
          </p>

          {selectedCurrency === 'all' ? (
            currencies.map(currency => {
              const currencyBalances = allBalances[currency] || {}
              const settlements = calculateSettlements(currencyBalances)
              
              if (settlements.length === 0) {
                return (
                  <div key={currency} className="settlement-group">
                    <h4>{currency}</h4>
                    <p className="no-settlements">✓ All settled up!</p>
                  </div>
                )
              }

              return (
                <div key={currency} className="settlement-group">
                  <h4>{currency}</h4>
                  <div className="settlements-list">
                    {settlements.map((settlement, idx) => (
                      <div key={idx} className="settlement-item">
                        <span className="settlement-from">{settlement.from}</span>
                        <span className="settlement-arrow">→</span>
                        <span className="settlement-to">{settlement.to}</span>
                        <span className="settlement-amount">
                          {formatCurrency(settlement.amount, currency)}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )
            })
          ) : (
            (() => {
              const settlements = calculateSettlements(currentBalances)
              
              if (settlements.length === 0) {
                return <p className="no-settlements">✓ All settled up!</p>
              }

              return (
                <div className="settlements-list">
                  {settlements.map((settlement, idx) => (
                    <div key={idx} className="settlement-item">
                      <span className="settlement-from">{settlement.from}</span>
                      <span className="settlement-arrow">→</span>
                      <span className="settlement-to">{settlement.to}</span>
                      <span className="settlement-amount">
                        {formatCurrency(settlement.amount, selectedCurrency)}
                      </span>
                    </div>
                  ))}
                </div>
              )
            })()
          )}
        </div>
      </div>
    )
  }

  // === Main Render ===

  if (showSettlements) {
    return renderSettlementsView()
  }

  return (
    <div className="balance-section">
      <div className="card">
        <div className="balance-header">
          <h3>Your Balance</h3>
          {renderCurrencyFilter()}
        </div>

        {renderPaymentRequestBanner()}
        {renderPaymentRequestsSection()}
        {renderPendingPayments()}
        {renderBalanceView()}
      </div>

      {showPaymentModal && (
        <PaymentModal
          isOpen={showPaymentModal}
          onClose={() => {
            setShowPaymentModal(false);
            setPaymentData(null);
          }}
          onConfirm={handlePaymentConfirm}
          maxAmount={paymentData?.amount || 0}
          currency={paymentData?.currency || 'USD'}
          recipientName={paymentData?.to || ''}
        />
      )}
    </div>
  )
}

export default BalanceCalculator
