import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Alert,
  Modal,
} from 'react-native';
import * as Clipboard from 'expo-clipboard';
import ExpenseForm from './ExpenseForm';
import BalanceCalculator from './BalanceCalculator';

function ExpenseTracker({ group, currentUser, navigation, onAddExpense, onDeleteExpense, onEditExpense, onLeaveGroup }) {
  const [showForm, setShowForm] = useState(false);
  const [expandedExpense, setExpandedExpense] = useState(null);
  const [editingExpense, setEditingExpense] = useState(null);
  const [showTotals, setShowTotals] = useState(false);
  const [showSettleUp, setShowSettleUp] = useState(false);
  const [expenseFilterCurrency, setExpenseFilterCurrency] = useState('all');
  const [showConvertDialog, setShowConvertDialog] = useState(false);
  const [targetCurrency, setTargetCurrency] = useState('USD');
  const [isConverting, setIsConverting] = useState(false);

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

  const handleEditExpense = (expense) => {
    onEditExpense(editingExpense.id, expense);
    setEditingExpense(null);
    setExpandedExpense(null);
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

  const calculateTotals = useMemo(() => {
    const totalsPerCurrency = {};
    
    if (!group.expenses || group.expenses.length === 0 || !group.members) {
      return { 'USD': { totalSpend: 0, memberShares: {} } };
    }
    
    group.expenses.forEach(expense => {
      const currency = expense.currency || 'USD';
      if (!totalsPerCurrency[currency]) {
        totalsPerCurrency[currency] = {
          totalSpend: 0,
          memberShares: {}
        };
        if (Array.isArray(group.members)) {
          group.members.forEach(member => {
            totalsPerCurrency[currency].memberShares[member] = 0;
          });
        }
      }
      
      totalsPerCurrency[currency].totalSpend += expense.amount;
      
      if (expense.splitAmounts) {
        Object.entries(expense.splitAmounts).forEach(([member, amount]) => {
          if (!totalsPerCurrency[currency].memberShares[member]) {
            totalsPerCurrency[currency].memberShares[member] = 0;
          }
          totalsPerCurrency[currency].memberShares[member] += amount;
        });
      } else if (expense.splitBetween) {
        const sharePerPerson = expense.amount / expense.splitBetween.length;
        expense.splitBetween.forEach(member => {
          if (!totalsPerCurrency[currency].memberShares[member]) {
            totalsPerCurrency[currency].memberShares[member] = 0;
          }
          totalsPerCurrency[currency].memberShares[member] += sharePerPerson;
        });
      }
    });

    return totalsPerCurrency;
  }, [group.expenses, group.members]);

  const exportToCSV = () => {
    let csv = 'Date,Description,Amount,Currency,Paid By,Split Type,Split Details\n';
    
    group.expenses.forEach(expense => {
      const date = new Date(expense.date).toLocaleDateString();
      const description = `"${expense.description}"`;
      const amount = expense.amount.toFixed(2);
      const currency = expense.currency || 'USD';
      
      let paidBy = '';
      if (expense.isMultiplePayers) {
        paidBy = `"${expense.paidBy.map(p => `${p.member}: ${currency} ${p.amount.toFixed(2)}`).join('; ')}"`;
      } else {
        paidBy = expense.paidBy;
      }
      
      const splitType = expense.splitType || 'equally';
      
      let splitDetails = '';
      if (expense.splitAmounts) {
        splitDetails = `"${Object.entries(expense.splitAmounts).map(([member, amt]) => `${member}: ${currency} ${amt.toFixed(2)}`).join('; ')}"`;
      } else {
        splitDetails = `"${expense.splitBetween?.join(', ') || 'All members'}"`;
      }
      
      csv += `${date},${description},${amount},${currency},${paidBy},${splitType},${splitDetails}\n`;
    });
    
    // Copy CSV to clipboard for mobile
    Clipboard.setStringAsync(csv);
    Alert.alert('CSV Exported', 'Expense data copied to clipboard. You can paste it into a spreadsheet app.');
  };

  const convertAllExpenses = async () => {
    setIsConverting(true);
    try {
      const currencies = [...new Set(group.expenses.map(e => e.currency || 'USD'))];
      
      if (currencies.length === 1 && currencies[0] === targetCurrency) {
        Alert.alert('No Conversion Needed', 'All expenses are already in ' + targetCurrency);
        setShowConvertDialog(false);
        setIsConverting(false);
        return;
      }

      const response = await fetch(`https://api.exchangerate-api.com/v4/latest/${targetCurrency}`);
      const data = await response.json();
      
      if (!data.rates) {
        throw new Error('Failed to fetch exchange rates');
      }

      const conversionPromises = group.expenses.map(async (expense) => {
        const fromCurrency = expense.currency || 'USD';
        
        if (fromCurrency === targetCurrency) {
          return;
        }

        const rate = 1 / data.rates[fromCurrency];
        
        const convertedExpense = {
          ...expense,
          amount: expense.amount * rate,
          currency: targetCurrency
        };

        if (expense.isMultiplePayers && expense.paidBy) {
          convertedExpense.paidBy = expense.paidBy.map(payer => ({
            ...payer,
            amount: payer.amount * rate
          }));
        }

        if (expense.splitAmounts) {
          const convertedSplitAmounts = {};
          Object.entries(expense.splitAmounts).forEach(([member, amount]) => {
            convertedSplitAmounts[member] = amount * rate;
          });
          convertedExpense.splitAmounts = convertedSplitAmounts;
        }

        await onEditExpense(expense.id, convertedExpense);
      });

      await Promise.all(conversionPromises);
      
      setShowConvertDialog(false);
      Alert.alert('Success', `Successfully converted all expenses to ${targetCurrency}`);
    } catch (error) {
      console.error('Conversion error:', error);
      Alert.alert('Error', 'Failed to convert currencies. Please try again.');
    } finally {
      setIsConverting(false);
    }
  };

  const filteredExpenses = useMemo(() => {
    if (expenseFilterCurrency === 'all') {
      return group.expenses;
    }
    return group.expenses.filter(e => (e.currency || 'USD') === expenseFilterCurrency);
  }, [group.expenses, expenseFilterCurrency]);

  const availableCurrencies = useMemo(() => {
    const currencies = new Set(group.expenses.map(e => e.currency || 'USD'));
    return ['all', ...Array.from(currencies)];
  }, [group.expenses]);

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

      <ScrollView style={styles.scrollContainer} contentContainerStyle={styles.scrollContent}>
        <View style={styles.actionButtons}>
          <TouchableOpacity
            style={[styles.actionButton, showSettleUp && styles.actionButtonActive]}
            onPress={() => setShowSettleUp(!showSettleUp)}
          >
            <Text style={[styles.actionButtonText, showSettleUp && styles.actionButtonTextActive]}>💸 Settle Up</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.actionButton, showTotals && styles.actionButtonActive]}
            onPress={() => setShowTotals(!showTotals)}
          >
            <Text style={[styles.actionButtonText, showTotals && styles.actionButtonTextActive]}>📊 Totals</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.actionButton}
            onPress={exportToCSV}
          >
            <Text style={styles.actionButtonText}>📥 Export</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => setShowConvertDialog(true)}
          >
            <Text style={styles.actionButtonText}>💱 Convert</Text>
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
          <Text style={styles.expensesTitle}>Expenses ({filteredExpenses.length})</Text>
          <TouchableOpacity
            style={styles.addButton}
            onPress={() => setShowForm(!showForm)}
          >
            <Text style={styles.addButtonText}>{showForm ? 'Cancel' : '+ Add Expense'}</Text>
          </TouchableOpacity>
        </View>

        {availableCurrencies.length > 2 && (
          <View style={styles.filterRow}>
            <Text style={styles.filterLabel}>Filter:</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterScroll}>
              {availableCurrencies.map(currency => (
                <TouchableOpacity
                  key={currency}
                  style={[
                    styles.filterButton,
                    expenseFilterCurrency === currency && styles.filterButtonActive
                  ]}
                  onPress={() => setExpenseFilterCurrency(currency)}
                >
                  <Text style={[
                    styles.filterButtonText,
                    expenseFilterCurrency === currency && styles.filterButtonTextActive
                  ]}>
                    {currency === 'all' ? 'All' : currency}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        )}

        {showForm && !editingExpense && (
          <View style={styles.formContainer}>
            <ExpenseForm
              members={group.members}
              currentUser={currentUser}
              onSubmit={handleAddExpense}
              onCancel={() => setShowForm(false)}
            />
          </View>
        )}

        {editingExpense && (
          <View style={styles.formContainer}>
            <ExpenseForm
              members={group.members}
              currentUser={currentUser}
              onSubmit={handleEditExpense}
              onCancel={() => {
                setEditingExpense(null);
                setExpandedExpense(null);
              }}
              initialExpense={editingExpense}
            />
          </View>
        )}

        <View style={styles.expensesList}>
          {filteredExpenses.length === 0 ? (
            <View style={styles.emptyState}>
              <Text style={styles.emptyStateText}>
                {expenseFilterCurrency === 'all' 
                  ? 'No expenses yet. Add one to get started!'
                  : `No expenses in ${expenseFilterCurrency}`}
              </Text>
            </View>
          ) : (
            filteredExpenses.map((expense) => (
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
                {expense.isMultiplePayers 
                  ? `Paid by ${expense.paidBy.length} people` 
                  : `Paid by ${expense.paidBy}`} on {new Date(expense.date).toLocaleDateString()}
              </Text>

              {expandedExpense === expense.id && (
                <View style={styles.expandedDetails}>
                  {expense.isMultiplePayers && (
                    <View style={styles.multiplePayersSection}>
                      <Text style={styles.multiplePayersTitle}>Paid by:</Text>
                      {expense.paidBy.map((payer, idx) => (
                        <Text key={idx} style={styles.payerItem}>
                          • {payer.member}: {formatCurrency(payer.amount, expense.currency)}
                        </Text>
                      ))}
                    </View>
                  )}
                  <Text style={styles.detailsText}>
                    Split type: {expense.splitType || 'equally'}
                  </Text>
                  <Text style={styles.detailsText}>
                    Split between: {expense.splitBetween?.join(', ') || 'All members'}
                  </Text>
                    {expense.splitAmounts && (
                      <View style={styles.splitAmountsContainer}>
                        <Text style={styles.splitAmountsTitle}>Custom split:</Text>
                        {Object.entries(expense.splitAmounts).map(([member, amount]) => (
                          <Text key={member} style={styles.splitAmountItem}>
                            • {member}: {formatCurrency(amount, expense.currency)}
                          </Text>
                        ))}
                      </View>
                    )}
                    <View style={styles.expenseActions}>
                      <TouchableOpacity
                        style={styles.editButton}
                        onPress={() => {
                          setEditingExpense(expense);
                          setShowForm(false);
                        }}
                      >
                        <Text style={styles.editButtonText}>Edit</Text>
                      </TouchableOpacity>
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
        </View>
      </ScrollView>

      <Modal
        visible={showConvertDialog}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowConvertDialog(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Convert All Expenses</Text>
            <Text style={styles.modalText}>
              This will convert all expenses to a single currency using current exchange rates.
            </Text>
            <Text style={styles.modalLabel}>Target Currency:</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.currencyPicker}>
              {['USD', 'EUR', 'GBP', 'JPY', 'AUD', 'CAD', 'CHF', 'CNY', 'INR', 'KRW'].map(currency => (
                <TouchableOpacity
                  key={currency}
                  style={[
                    styles.currencyButton,
                    targetCurrency === currency && styles.currencyButtonActive
                  ]}
                  onPress={() => setTargetCurrency(currency)}
                >
                  <Text style={[
                    styles.currencyButtonText,
                    targetCurrency === currency && styles.currencyButtonTextActive
                  ]}>
                    {currency}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
            <View style={styles.modalActions}>
              <TouchableOpacity
                style={styles.modalCancelButton}
                onPress={() => setShowConvertDialog(false)}
              >
                <Text style={styles.modalCancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalConvertButton, isConverting && styles.modalConvertButtonDisabled]}
                onPress={convertAllExpenses}
                disabled={isConverting}
              >
                <Text style={styles.modalConvertButtonText}>
                  {isConverting ? 'Converting...' : 'Convert'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  scrollContainer: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 20,
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
    flexWrap: 'wrap',
    padding: 12,
    gap: 8,
  },
  actionButton: {
    flex: 1,
    minWidth: 80,
    backgroundColor: '#fff',
    paddingVertical: 10,
    paddingHorizontal: 8,
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
    fontSize: 13,
    fontWeight: '500',
    color: '#2c3e50',
    textAlign: 'center',
  },
  actionButtonTextActive: {
    color: '#fff',
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
  editButton: {
    backgroundColor: '#2c3e50',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: '#e5e7eb',
    flex: 1,
  },
  editButtonText: {
    color: '#fff',
    fontWeight: '500',
    textAlign: 'center',
  },
  deleteButton: {
    backgroundColor: '#dc2626',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: '#e5e7eb',
    flex: 1,
  },
  deleteButtonText: {
    color: '#fff',
    fontWeight: '500',
    textAlign: 'center',
  },
  filterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    marginBottom: 12,
  },
  filterLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: '#2c3e50',
    marginRight: 8,
  },
  filterScroll: {
    flex: 1,
  },
  filterButton: {
    backgroundColor: '#fff',
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 16,
    marginRight: 8,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  filterButtonActive: {
    backgroundColor: '#2c3e50',
    borderColor: '#2c3e50',
  },
  filterButtonText: {
    fontSize: 13,
    color: '#2c3e50',
  },
  filterButtonTextActive: {
    color: '#fff',
  },
  splitAmountsContainer: {
    marginTop: 8,
    marginBottom: 12,
  },
  splitAmountsTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: '#2c3e50',
    marginBottom: 4,
  },
  splitAmountItem: {
    fontSize: 13,
    color: '#7f8c8d',
    marginLeft: 8,
  },
  multiplePayersSection: {
    marginBottom: 12,
    padding: 8,
    backgroundColor: '#f9fafb',
    borderRadius: 6,
  },
  multiplePayersTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: '#2c3e50',
    marginBottom: 4,
  },
  payerItem: {
    fontSize: 13,
    color: '#7f8c8d',
    marginLeft: 8,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 24,
    width: '85%',
    maxWidth: 400,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#2c3e50',
    marginBottom: 12,
  },
  modalText: {
    fontSize: 14,
    color: '#7f8c8d',
    marginBottom: 16,
    lineHeight: 20,
  },
  modalLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: '#2c3e50',
    marginBottom: 8,
  },
  currencyPicker: {
    marginBottom: 20,
  },
  currencyButton: {
    backgroundColor: '#fff',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 6,
    marginRight: 8,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  currencyButtonActive: {
    backgroundColor: '#2c3e50',
    borderColor: '#2c3e50',
  },
  currencyButtonText: {
    fontSize: 14,
    color: '#2c3e50',
  },
  currencyButtonTextActive: {
    color: '#fff',
  },
  modalActions: {
    flexDirection: 'row',
    gap: 12,
  },
  modalCancelButton: {
    flex: 1,
    backgroundColor: '#fff',
    paddingVertical: 12,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  modalCancelButtonText: {
    color: '#2c3e50',
    fontWeight: '500',
    textAlign: 'center',
  },
  modalConvertButton: {
    flex: 1,
    backgroundColor: '#2c3e50',
    paddingVertical: 12,
    borderRadius: 6,
  },
  modalConvertButtonDisabled: {
    opacity: 0.5,
  },
  modalConvertButtonText: {
    color: '#fff',
    fontWeight: '500',
    textAlign: 'center',
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
