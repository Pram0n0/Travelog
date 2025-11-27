import { useState, useEffect } from 'react'
import './ExpenseForm.css'

function ExpenseForm({ members, onSubmit, initialData = null, currentUser }) {
  const [description, setDescription] = useState(initialData?.description || '')
  const [amount, setAmount] = useState(initialData && !initialData.isMultiplePayers ? initialData.amount.toString() : '')
  const [currency, setCurrency] = useState(initialData?.currency || 'USD')
  const [paidBy, setPaidBy] = useState(
    initialData && !initialData.isMultiplePayers 
      ? initialData.paidBy 
      : (currentUser?.username || members[0] || '')
  )
  const [isMultiplePayers, setIsMultiplePayers] = useState(initialData?.isMultiplePayers || false)
  const [payerAmounts, setPayerAmounts] = useState(() => {
    if (initialData?.isMultiplePayers) {
      const amounts = members.reduce((acc, member) => ({ ...acc, [member]: '' }), {})
      initialData.paidBy.forEach(payer => {
        amounts[payer.member] = payer.amount.toString()
      })
      return amounts
    }
    return members.reduce((acc, member) => ({ ...acc, [member]: '' }), {})
  })
  const [showSplitOptions, setShowSplitOptions] = useState(false)
  const [splitType, setSplitType] = useState(initialData?.splitType || 'equally')
  const [splitBetween, setSplitBetween] = useState(() => {
    if (initialData?.splitAmounts) {
      return Object.keys(initialData.splitAmounts)
    }
    return members
  })
  const [unequalAmounts, setUnequalAmounts] = useState(() => {
    if (initialData?.splitType === 'unequally' && initialData?.splitAmounts) {
      const amounts = members.reduce((acc, member) => ({ ...acc, [member]: '' }), {})
      Object.entries(initialData.splitAmounts).forEach(([member, amt]) => {
        amounts[member] = amt.toString()
      })
      return amounts
    }
    return members.reduce((acc, member) => ({ ...acc, [member]: '' }), {})
  })
  const [percentages, setPercentages] = useState(members.reduce((acc, member) => ({ ...acc, [member]: '' }), {}))
  const [adjustments, setAdjustments] = useState(members.reduce((acc, member) => ({ ...acc, [member]: '' }), {}))
  const [shares, setShares] = useState(members.reduce((acc, member) => ({ ...acc, [member]: '' }), {}))

  const calculateSplitAmounts = () => {
    const totalAmount = isMultiplePayers 
      ? Object.values(payerAmounts).filter(v => v).reduce((sum, v) => sum + parseFloat(v || 0), 0)
      : parseFloat(amount || 0)

    let splitData = {}

    switch (splitType) {
      case 'equally':
        const equalShare = totalAmount / splitBetween.length
        splitBetween.forEach(member => {
          splitData[member] = equalShare
        })
        break

      case 'unequally':
        Object.entries(unequalAmounts).forEach(([member, amt]) => {
          if (amt && parseFloat(amt) > 0) {
            splitData[member] = parseFloat(amt)
          }
        })
        break

      case 'percentages':
        Object.entries(percentages).forEach(([member, pct]) => {
          if (pct && parseFloat(pct) > 0) {
            splitData[member] = (parseFloat(pct) / 100) * totalAmount
          }
        })
        break

      case 'adjustment':
        const numPeople = splitBetween.length
        // Calculate total adjustments
        const totalAdjustments = splitBetween.reduce((sum, member) => {
          return sum + parseFloat(adjustments[member] || 0)
        }, 0)
        // Remainder after adjustments, split equally
        const remainder = totalAmount - totalAdjustments
        const equalRemainder = remainder / numPeople
        
        splitBetween.forEach(member => {
          const adjustment = parseFloat(adjustments[member] || 0)
          splitData[member] = equalRemainder + adjustment
        })
        break

      case 'shares':
        const totalShares = Object.entries(shares)
          .filter(([member, _]) => splitBetween.includes(member))
          .reduce((sum, [_, s]) => sum + parseFloat(s || 1), 0)
        const shareValue = totalAmount / totalShares
        splitBetween.forEach(member => {
          const memberShares = parseFloat(shares[member] || 1)
          splitData[member] = shareValue * memberShares
        })
        break

      default:
        break
    }

    return splitData
  }

  const handleSubmit = (e) => {
    e.preventDefault()
    
    const splitAmounts = calculateSplitAmounts()

    if (isMultiplePayers) {
      // Validate multiple payers
      const payers = Object.entries(payerAmounts)
        .filter(([_, amt]) => amt && parseFloat(amt) > 0)
        .map(([member, amt]) => ({ member, amount: parseFloat(amt) }))
      
      if (payers.length === 0 || Object.keys(splitAmounts).length === 0) return
      
      const totalPaid = payers.reduce((sum, p) => sum + p.amount, 0)
      
      onSubmit({
        description,
        amount: totalPaid,
        currency,
        paidBy: payers,
        splitType,
        splitAmounts,
        isMultiplePayers: true
      })
    } else {
      // Single payer
      if (description && amount && paidBy && Object.keys(splitAmounts).length > 0) {
        onSubmit({
          description,
          amount: parseFloat(amount),
          currency,
          paidBy,
          splitType,
          splitAmounts,
          isMultiplePayers: false
        })
      }
    }
    
    // Reset form
    setDescription('')
    setAmount('')
    setCurrency('USD')
    setPaidBy(members[0] || '')
    setIsMultiplePayers(false)
    setShowSplitOptions(false)
    setSplitType('equally')
    setSplitBetween(members)
    setPayerAmounts(members.reduce((acc, member) => ({ ...acc, [member]: '' }), {}))
    setUnequalAmounts(members.reduce((acc, member) => ({ ...acc, [member]: '' }), {}))
    setPercentages(members.reduce((acc, member) => ({ ...acc, [member]: '' }), {}))
    setAdjustments(members.reduce((acc, member) => ({ ...acc, [member]: '' }), {}))
    setShares(members.reduce((acc, member) => ({ ...acc, [member]: '' }), {}))
  }

  const handlePaidByChange = (value) => {
    if (value === 'multiple') {
      setIsMultiplePayers(true)
    } else {
      setIsMultiplePayers(false)
      setPaidBy(value)
    }
  }

  const updatePayerAmount = (member, value) => {
    setPayerAmounts({
      ...payerAmounts,
      [member]: value
    })
  }

  const toggleMember = (member) => {
    if (splitBetween.includes(member)) {
      setSplitBetween(splitBetween.filter(m => m !== member))
    } else {
      setSplitBetween([...splitBetween, member])
    }
  }

  const getTotalPercentage = () => {
    return Object.values(percentages)
      .filter(v => v)
      .reduce((sum, v) => sum + parseFloat(v || 0), 0)
  }

  const getTotalUnequal = () => {
    return Object.values(unequalAmounts)
      .filter(v => v)
      .reduce((sum, v) => sum + parseFloat(v || 0), 0)
  }

  const getTotalShares = () => {
    return Object.entries(shares)
      .filter(([member, _]) => splitBetween.includes(member))
      .reduce((sum, [_, s]) => sum + parseFloat(s || 0), 0)
  }

  const getTotalAdjustments = () => {
    return Object.values(adjustments)
      .filter(v => v)
      .reduce((sum, v) => sum + parseFloat(v || 0), 0)
  }

    return (
    <div className="card expense-form">
      <form onSubmit={handleSubmit}>
        <h3>{initialData ? 'Edit Expense' : 'Add New Expense'}</h3>        <input
          type="text"
          placeholder="Title / Description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          required
        />

        {!isMultiplePayers && (
          <div className="amount-currency-row">
            <select 
              value={currency}
              onChange={(e) => setCurrency(e.target.value)}
              className="currency-select"
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
            <input
              type="number"
              step="0.01"
              placeholder="Amount"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              required
            />
          </div>
        )}

        <label>Paid by:</label>
        <select 
          value={isMultiplePayers ? 'multiple' : paidBy} 
          onChange={(e) => handlePaidByChange(e.target.value)} 
          required
        >
          {members.map(member => (
            <option key={member} value={member}>{member}</option>
          ))}
          <option value="multiple">Multiple people</option>
        </select>

        {isMultiplePayers && (
          <div className="multiple-payers-section">
            <div className="currency-selector-row">
              <label>Currency:</label>
              <select 
                value={currency}
                onChange={(e) => setCurrency(e.target.value)}
                className="currency-select"
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
            <label>Enter amount paid by each person:</label>
            <div className="payer-inputs">
              {members.map(member => (
                <div key={member} className="payer-input-row">
                  <span className="payer-name">{member}</span>
                  <input
                    type="number"
                    step="0.01"
                    placeholder="$0.00"
                    value={payerAmounts[member]}
                    onChange={(e) => updatePayerAmount(member, e.target.value)}
                  />
                </div>
              ))}
            </div>
            <div className="total-paid">
              Total: ${Object.values(payerAmounts)
                .filter(v => v)
                .reduce((sum, v) => sum + parseFloat(v || 0), 0)
                .toFixed(2)}
            </div>
          </div>
        )}

        <div className="split-section">
          <label>Split Type</label>
          <div className="split-type-selector">
            <button 
              type="button"
              className={`split-type-option ${splitType === 'equally' ? 'active' : ''}`}
              onClick={() => setSplitType('equally')}
            >
              Equally
            </button>
            <button 
              type="button"
              className={`split-type-option ${splitType === 'unequally' ? 'active' : ''}`}
              onClick={() => setSplitType('unequally')}
            >
              Unequally
            </button>
            <button 
              type="button"
              className={`split-type-option ${splitType === 'percentages' ? 'active' : ''}`}
              onClick={() => setSplitType('percentages')}
            >
              Percentages
            </button>
            <button 
              type="button"
              className={`split-type-option ${splitType === 'adjustment' ? 'active' : ''}`}
              onClick={() => setSplitType('adjustment')}
            >
              Adjustment
            </button>
            <button 
              type="button"
              className={`split-type-option ${splitType === 'shares' ? 'active' : ''}`}
              onClick={() => setSplitType('shares')}
            >
              Shares
            </button>
          </div>
        </div>

        {splitType === 'equally' && (
          <div className="split-content">
            <label>Select members to split equally</label>
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
          </div>
        )}

        {splitType === 'unequally' && (
          <div className="split-content">
            <label>Enter exact amount each person owes</label>
            <div className="payer-inputs">
              {members.map(member => (
                <div key={member} className="payer-input-row">
                  <span className="payer-name">{member}</span>
                  <input
                    type="number"
                    step="0.01"
                    placeholder="$0.00"
                    value={unequalAmounts[member]}
                    onChange={(e) => setUnequalAmounts({...unequalAmounts, [member]: e.target.value})}
                  />
                </div>
              ))}
            </div>
            <div className="total-paid">
              Total: ${getTotalUnequal().toFixed(2)}
              {isMultiplePayers && (
                <span className={getTotalUnequal().toFixed(2) !== Object.values(payerAmounts).filter(v => v).reduce((sum, v) => sum + parseFloat(v || 0), 0).toFixed(2) ? ' warning' : ' success'}>
                  {getTotalUnequal().toFixed(2) === Object.values(payerAmounts).filter(v => v).reduce((sum, v) => sum + parseFloat(v || 0), 0).toFixed(2) ? ' ✓' : ' ⚠ Must match paid amount'}
                </span>
              )}
              {!isMultiplePayers && amount && (
                <span className={getTotalUnequal().toFixed(2) !== parseFloat(amount || 0).toFixed(2) ? ' warning' : ' success'}>
                  {getTotalUnequal().toFixed(2) === parseFloat(amount || 0).toFixed(2) ? ' ✓' : ' ⚠ Must match expense amount'}
                </span>
              )}
            </div>
          </div>
        )}

        {splitType === 'percentages' && (
          <div className="split-content">
            <label>Enter percentage each person owes (must total 100%)</label>
            <div className="payer-inputs">
              {members.map(member => (
                <div key={member} className="payer-input-row">
                  <span className="payer-name">{member}</span>
                  <input
                    type="number"
                    step="0.01"
                    placeholder="0%"
                    value={percentages[member]}
                    onChange={(e) => setPercentages({...percentages, [member]: e.target.value})}
                  />
                </div>
              ))}
            </div>
            <div className="total-paid">
              Total: {getTotalPercentage().toFixed(2)}%
              <span className={getTotalPercentage().toFixed(2) !== '100.00' ? ' warning' : ' success'}>
                {getTotalPercentage().toFixed(2) === '100.00' ? ' ✓' : ' ⚠ Must equal 100%'}
              </span>
            </div>
          </div>
        )}

        {splitType === 'adjustment' && (
          <div className="split-content">
            <label>Select members and set adjustments (+ or -)</label>
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
            <label style={{marginTop: '1rem'}}>Adjustments (positive = owes more, negative = owes less)</label>
            <div className="payer-inputs">
              {splitBetween.map(member => (
                <div key={member} className="payer-input-row">
                  <span className="payer-name">{member}</span>
                  <input
                    type="number"
                    step="0.01"
                    placeholder="±0.00"
                    value={adjustments[member]}
                    onChange={(e) => setAdjustments({...adjustments, [member]: e.target.value})}
                  />
                </div>
              ))}
            </div>
            <div className="total-paid">
              Total adjustments: ${getTotalAdjustments().toFixed(2)}
              <br />
              <span style={{fontSize: '0.9rem', color: '#6b7280'}}>
                Remainder split equally: ${((isMultiplePayers 
                  ? Object.values(payerAmounts).filter(v => v).reduce((sum, v) => sum + parseFloat(v || 0), 0)
                  : parseFloat(amount || 0)) - getTotalAdjustments()).toFixed(2)}
              </span>
            </div>
          </div>
        )}

        {splitType === 'shares' && (
          <div className="split-content">
            <label>Select members and assign shares</label>
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
            <label style={{marginTop: '1rem'}}>Number of shares per person</label>
            <div className="payer-inputs">
              {splitBetween.map(member => (
                <div key={member} className="payer-input-row">
                  <span className="payer-name">{member}</span>
                  <input
                    type="number"
                    step="1"
                    placeholder="1"
                    value={shares[member]}
                    onChange={(e) => setShares({...shares, [member]: e.target.value})}
                  />
                </div>
              ))}
            </div>
            <div className="total-paid">
              Total shares: {getTotalShares()}
            </div>
          </div>
        )}

        <button type="submit"style={{marginTop: '0.5rem'}}>{initialData ? 'Update Expense' : 'Add Expense'}</button>
      </form>
    </div>
  )
}

export default ExpenseForm
