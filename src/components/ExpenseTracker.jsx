import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Alert,
} from 'react-native';
import * as Clipboard from 'expo-clipboard';
import * as Sharing from 'expo-sharing';
import ExpenseForm from './ExpenseForm';
import BalanceCalculator from './BalanceCalculator';

function ExpenseTracker({ group, currentUser, navigation, onAddExpense, onDeleteExpense, onEditExpense, onLeaveGroup }) {
  const [showForm, setShowForm] = useState(false);
  const [expandedExpense, setExpandedExpense] = useState(null);
  const [editingExpense, setEditingExpense] = useState(null);
  const [showTotals, setShowTotals] = useState(false);
  const [showSettleUp, setShowSettleUp] = useState(false);

  const userHasOutstandingBalances = useMemo(() => {
    const currencies = [...new Set(group.expenses.map(e => e.currency || 'USD'))];
    
    for (const currency of currencies) {
      const currencyExpenses = group.expenses.filter(e => (e.currency || 'USD') === currency);
      let balance = 0;

      currencyExpenses.forEach(expense => {
        if (expense.isMultiplePayers) {
          const userPayment = expense.paidBy.find(p => p.member === currentUser.username);
          if (userPayment) {
            balance += userPayment.amount;
          }
        } else if (expense.paidBy === currentUser.username) {
          balance += expense.amount;
        }

        if (expense.splitAmounts && expense.splitAmounts[currentUser.username]) {
          balance -= expense.splitAmounts[currentUser.username];
        } else if (expense.splitBetween && expense.splitBetween.includes(currentUser.username)) {
          balance -= expense.amount / expense.splitBetween.length;
        } else if (!expense.splitBetween) {
          balance -= expense.amount / group.members.length;
        }
      });

      if (Math.abs(balance) > 0.01) {
        return true;
      }
    }

    return false;
  }, [group.expenses, group.members, currentUser.username]);

  const handleShareGroup = async () => {
    const shareText = `Join my expense group "${group.name}" with code: ${group.code}`;
    await Clipboard.setStringAsync(shareText);
    Alert.alert('Copied!', 'Share message copied to clipboard');
  };

  const handleLeaveGroup = () => {
    if (userHasOutstandingBalances) {
      Alert.alert(
        'Cannot Leave',
        'You cannot leave the group while you have outstanding balances. Please settle all debts first.'
      );
      return;
    }

    Alert.alert(
      'Leave Group',
      `Are you sure you want to leave "${group.name}"? This action cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Leave', style: 'destructive', onPress: onLeaveGroup },
      ]
    );
  };

  const handleAddExpense = (expense) => {
    onAddExpense(expense);
    setShowForm(false);
  };

  const handleDeleteExpense = (expenseId) => {
    Alert.alert(
      'Delete Expense',
      'Are you sure you want to delete this expense?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => {
            onDeleteExpense(expenseId);
            setExpandedExpense(null);
          },
        },
      ]
    );
  };

  const formatCurrency = (amount, currency = 'USD') => {
    const symbols = {
      USD: '$', EUR: '€', GBP: '£', JPY: '¥', AUD: 'A$',
      CAD: 'C$', CHF: 'Fr', CNY: '¥', INR: '₹', KRW: '₩'
    };
    return `${symbols[currency] || currency} ${amount.toFixed(2)}`;
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.headerRow}>
          <TouchableOpacity style={styles.shareButton} onPress={handleShareGroup}>
            <Text style={styles.shareButtonText}>🔗 Share</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.leaveButton, userHasOutstandingBalances && styles.leaveButtonDisabled]}
            onPress={handleLeaveGroup}
            disabled={userHasOutstandingBalances}
          >
            <Text style={styles.leaveButtonText}>🚪 Leave</Text>
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.actionButtons}>
        <TouchableOpacity
          style={[styles.actionButton, showSettleUp && styles.actionButtonActive]}
          onPress={() => setShowSettleUp(!showSettleUp)}
        >
          <Text style={styles.actionButtonText}>💸 Settle Up</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.actionButton, showTotals && styles.actionButtonActive]}
          onPress={() => setShowTotals(!showTotals)}
        >
          <Text style={styles.actionButtonText}>📊 Totals</Text>
        </TouchableOpacity>
      </View>

      {showSettleUp && (
        <View style={styles.calculatorContainer}>
          <BalanceCalculator group={group} currentUser={currentUser} mode="settle" />
        </View>
      )}

      {showTotals && (
        <View style={styles.calculatorContainer}>
          <BalanceCalculator group={group} currentUser={currentUser} mode="totals" />
        </View>
      )}

      <View style={styles.expensesHeader}>
        <Text style={styles.expensesTitle}>Expenses ({group.expenses.length})</Text>
        <TouchableOpacity
          style={styles.addButton}
          onPress={() => setShowForm(!showForm)}
        >
          <Text style={styles.addButtonText}>{showForm ? 'Cancel' : '+ Add Expense'}</Text>
        </TouchableOpacity>
      </View>

      {showForm && (
        <View style={styles.formContainer}>
          <ExpenseForm
            members={group.members}
            currentUser={currentUser}
            onSubmit={handleAddExpense}
            onCancel={() => setShowForm(false)}
          />
        </View>
      )}

      <ScrollView style={styles.expensesList}>
        {group.expenses.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyStateText}>No expenses yet. Add one to get started!</Text>
          </View>
        ) : (
          group.expenses.map((expense) => (
            <TouchableOpacity
              key={expense.id}
              style={styles.expenseCard}
              onPress={() => setExpandedExpense(expandedExpense === expense.id ? null : expense.id)}
            >
              <View style={styles.expenseHeader}>
                <Text style={styles.expenseDescription}>{expense.description}</Text>
                <Text style={styles.expenseAmount}>
                  {formatCurrency(expense.amount, expense.currency)}
                </Text>
              </View>
              <Text style={styles.expenseDetails}>
                Paid by {expense.paidBy} on {new Date(expense.date).toLocaleDateString()}
              </Text>

              {expandedExpense === expense.id && (
                <View style={styles.expandedDetails}>
                  <Text style={styles.detailsText}>
                    Split between: {expense.splitBetween?.join(', ') || 'All members'}
                  </Text>
                  <View style={styles.expenseActions}>
                    <TouchableOpacity
                      style={styles.deleteButton}
                      onPress={() => handleDeleteExpense(expense.id)}
                    >
                      <Text style={styles.deleteButtonText}>Delete</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              )}
            </TouchableOpacity>
          ))
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    backgroundColor: '#fff',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 12,
  },
  shareButton: {
    backgroundColor: 'transparent',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: '#2c3e50',
  },
  shareButtonText: {
    color: '#2c3e50',
    fontWeight: '500',
  },
  leaveButton: {
    backgroundColor: '#dc2626',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: '#e5e7eb',
  },
  leaveButtonDisabled: {
    backgroundColor: '#999',
    opacity: 0.4,
  },
  leaveButtonText: {
    color: '#fff',
    fontWeight: '500',
  },
  actionButtons: {
    flexDirection: 'row',
    padding: 16,
    gap: 12,
  },
  actionButton: {
    flex: 1,
    backgroundColor: '#fff',
    paddingVertical: 12,
    borderRadius: 6,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  actionButtonActive: {
    backgroundColor: '#2c3e50',
    borderColor: '#2c3e50',
  },
  actionButtonText: {
    fontSize: 14,
    fontWeight: '500',
  },
  calculatorContainer: {
    backgroundColor: '#fff',
    marginHorizontal: 16,
    marginBottom: 16,
    padding: 16,
    borderRadius: 8,
  },
  expensesHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    marginBottom: 12,
  },
  expensesTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#2c3e50',
  },
  addButton: {
    backgroundColor: '#2c3e50',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 6,
  },
  addButtonText: {
    color: '#fff',
    fontWeight: '500',
  },
  formContainer: {
    backgroundColor: '#fff',
    marginHorizontal: 16,
    marginBottom: 16,
    padding: 16,
    borderRadius: 8,
  },
  expensesList: {
    flex: 1,
    paddingHorizontal: 16,
  },
  expenseCard: {
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 8,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  expenseHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  expenseDescription: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2c3e50',
    flex: 1,
  },
  expenseAmount: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#2c3e50',
  },
  expenseDetails: {
    fontSize: 13,
    color: '#7f8c8d',
  },
  expandedDetails: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
  },
  detailsText: {
    fontSize: 13,
    color: '#7f8c8d',
    marginBottom: 12,
  },
  expenseActions: {
    flexDirection: 'row',
    gap: 8,
  },
  deleteButton: {
    backgroundColor: '#dc2626',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: '#e5e7eb',
  },
  deleteButtonText: {
    color: '#fff',
    fontWeight: '500',
  },
  emptyState: {
    padding: 48,
    alignItems: 'center',
  },
  emptyStateText: {
    color: '#7f8c8d',
    fontSize: 15,
    textAlign: 'center',
  },
});

export default ExpenseTracker;
