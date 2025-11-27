import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

function BalanceCalculator({ group, currentUser, mode }) {
  const calculateBalances = () => {
    const balances = {};
    const currencies = [...new Set(group.expenses.map(e => e.currency || 'USD'))];

    currencies.forEach(currency => {
      balances[currency] = {};
      group.members.forEach(member => {
        balances[currency][member] = 0;
      });

      const currencyExpenses = group.expenses.filter(e => (e.currency || 'USD') === currency);
      
      currencyExpenses.forEach(expense => {
        if (expense.paidBy) {
          balances[currency][expense.paidBy] += expense.amount;
        }

        const splitMembers = expense.splitBetween || group.members;
        const sharePerPerson = expense.amount / splitMembers.length;

        splitMembers.forEach(member => {
          balances[currency][member] -= sharePerPerson;
        });
      });
    });

    return balances;
  };

  const balances = calculateBalances();

  if (mode === 'settle') {
    return (
      <View>
        <Text style={styles.title}>Settlement Suggestions</Text>
        {Object.entries(balances).map(([currency, memberBalances]) => (
          <View key={currency} style={styles.currencySection}>
            <Text style={styles.currencyTitle}>{currency}</Text>
            {Object.entries(memberBalances)
              .filter(([_, balance]) => Math.abs(balance) > 0.01)
              .map(([member, balance]) => (
                <View key={member} style={styles.balanceRow}>
                  <Text style={styles.memberName}>{member}</Text>
                  <Text style={[styles.balance, balance > 0 ? styles.positive : styles.negative]}>
                    {balance > 0 ? '+' : ''}{balance.toFixed(2)} {currency}
                  </Text>
                </View>
              ))}
          </View>
        ))}
      </View>
    );
  }

  // mode === 'totals'
  return (
    <View>
      <Text style={styles.title}>Balance Totals</Text>
      {Object.entries(balances).map(([currency, memberBalances]) => (
        <View key={currency} style={styles.currencySection}>
          <Text style={styles.currencyTitle}>{currency}</Text>
          {Object.entries(memberBalances).map(([member, balance]) => (
            <View key={member} style={styles.balanceRow}>
              <Text style={styles.memberName}>{member}</Text>
              <Text style={[styles.balance, balance > 0 ? styles.positive : styles.negative]}>
                {balance > 0 ? '+' : ''}{balance.toFixed(2)} {currency}
              </Text>
            </View>
          ))}
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  title: {
    fontSize: 18,
    fontWeight: '600',
    color: '#2c3e50',
    marginBottom: 16,
  },
  currencySection: {
    marginBottom: 24,
  },
  currencyTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2c3e50',
    marginBottom: 12,
  },
  balanceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  memberName: {
    fontSize: 14,
    color: '#2c3e50',
  },
  balance: {
    fontSize: 14,
    fontWeight: '600',
  },
  positive: {
    color: '#10b981',
  },
  negative: {
    color: '#dc2626',
  },
});

export default BalanceCalculator;
