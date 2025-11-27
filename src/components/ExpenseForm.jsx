import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
} from 'react-native';

const CURRENCIES = [
  { code: 'USD', symbol: '$' },
  { code: 'EUR', symbol: '€' },
  { code: 'GBP', symbol: '£' },
  { code: 'JPY', symbol: '¥' },
  { code: 'AUD', symbol: 'A$' },
  { code: 'CAD', symbol: 'C$' },
  { code: 'CHF', symbol: 'Fr' },
  { code: 'CNY', symbol: '¥' },
  { code: 'INR', symbol: '₹' },
  { code: 'KRW', symbol: '₩' },
];

function ExpenseForm({ members, currentUser, onSubmit, onCancel }) {
  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState('');
  const [currency, setCurrency] = useState('USD');
  const [paidBy, setPaidBy] = useState(currentUser.username);
  const [splitBetween, setSplitBetween] = useState(members);

  const handleSubmit = () => {
    if (!description || !amount) {
      alert('Please fill in all fields');
      return;
    }

    const expense = {
      description,
      amount: parseFloat(amount),
      currency,
      paidBy,
      splitBetween,
      date: new Date().toISOString(),
    };

    onSubmit(expense);
  };

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.label}>Description</Text>
      <TextInput
        style={styles.input}
        placeholder="What was the expense for?"
        value={description}
        onChangeText={setDescription}
      />

      <Text style={styles.label}>Amount</Text>
      <TextInput
        style={styles.input}
        placeholder="0.00"
        value={amount}
        onChangeText={setAmount}
        keyboardType="decimal-pad"
      />

      <Text style={styles.label}>Currency</Text>
      <View style={styles.currencyContainer}>
        {CURRENCIES.map((curr) => (
          <TouchableOpacity
            key={curr.code}
            style={[styles.currencyButton, currency === curr.code && styles.currencyButtonActive]}
            onPress={() => setCurrency(curr.code)}
          >
            <Text style={[styles.currencyText, currency === curr.code && styles.currencyTextActive]}>
              {curr.code}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <Text style={styles.label}>Paid By</Text>
      <View style={styles.memberContainer}>
        {members.map((member) => (
          <TouchableOpacity
            key={member}
            style={[styles.memberButton, paidBy === member && styles.memberButtonActive]}
            onPress={() => setPaidBy(member)}
          >
            <Text style={[styles.memberText, paidBy === member && styles.memberTextActive]}>
              {member}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <View style={styles.actions}>
        <TouchableOpacity style={styles.cancelButton} onPress={onCancel}>
          <Text style={styles.cancelButtonText}>Cancel</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.submitButton} onPress={handleSubmit}>
          <Text style={styles.submitButtonText}>Add Expense</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 16,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#2c3e50',
    marginBottom: 8,
    marginTop: 16,
  },
  input: {
    borderWidth: 2,
    borderColor: '#e5e7eb',
    borderRadius: 8,
    padding: 14,
    fontSize: 16,
    backgroundColor: '#fff',
  },
  currencyContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  currencyButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    backgroundColor: '#fff',
  },
  currencyButtonActive: {
    backgroundColor: '#2c3e50',
    borderColor: '#2c3e50',
  },
  currencyText: {
    color: '#2c3e50',
    fontWeight: '500',
  },
  currencyTextActive: {
    color: '#fff',
  },
  memberContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  memberButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    backgroundColor: '#fff',
  },
  memberButtonActive: {
    backgroundColor: '#2c3e50',
    borderColor: '#2c3e50',
  },
  memberText: {
    color: '#2c3e50',
    fontWeight: '500',
  },
  memberTextActive: {
    color: '#fff',
  },
  actions: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 24,
    marginBottom: 16,
  },
  cancelButton: {
    flex: 1,
    backgroundColor: '#e5e7eb',
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: 'center',
  },
  cancelButtonText: {
    color: '#2c3e50',
    fontSize: 16,
    fontWeight: '600',
  },
  submitButton: {
    flex: 1,
    backgroundColor: '#2c3e50',
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: 'center',
  },
  submitButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});

export default ExpenseForm;
