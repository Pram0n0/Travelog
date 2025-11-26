import './BalanceCalculator.css'

function BalanceCalculator({ expenses, members }) {
  // Calculate who owes whom
  const calculateBalances = () => {
    const balances = {}
    
    // Initialize balances
    members.forEach(member => {
      balances[member] = 0
    })

    // Calculate net balances
    expenses.forEach(expense => {
      const sharePerPerson = expense.amount / expense.splitBetween.length
      
      // Person who paid gets credit
      balances[expense.paidBy] += expense.amount
      
      // People who split the expense get debited
      expense.splitBetween.forEach(person => {
        balances[person] -= sharePerPerson
      })
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

  const balances = calculateBalances()
  const settlements = simplifyDebts(balances)

  return (
    <div className="balance-section">
      <div className="card">
        <h3>💰 Balances</h3>
        <div className="balances-grid">
          {members.map(member => (
            <div key={member} className={`balance-item ${balances[member] > 0.01 ? 'positive' : balances[member] < -0.01 ? 'negative' : 'neutral'}`}>
              <span className="member-name">{member}</span>
              <span className="balance-amount">
                {balances[member] > 0.01 ? '+' : ''}${balances[member].toFixed(2)}
              </span>
            </div>
          ))}
        </div>
      </div>

      {settlements.length > 0 && (
        <div className="card">
          <h3>🔄 Settle Up</h3>
          <div className="settlements-list">
            {settlements.map((settlement, index) => (
              <div key={index} className="settlement-item">
                <span className="settlement-text">
                  <strong>{settlement.from}</strong> owes <strong>{settlement.to}</strong>
                </span>
                <span className="settlement-amount">${settlement.amount.toFixed(2)}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {settlements.length === 0 && expenses.length > 0 && (
        <div className="card">
          <p className="all-settled">✅ All settled up! Everyone is even.</p>
        </div>
      )}
    </div>
  )
}

export default BalanceCalculator
