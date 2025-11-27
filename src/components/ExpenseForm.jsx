import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Alert,
  Modal,
} from 'react-native';

const CURRENCIES = [
  { code: 'USD', symbol: '$', name: 'US Dollar' },
  { code: 'EUR', symbol: '€', name: 'Euro' },
  { code: 'GBP', symbol: '£', name: 'British Pound' },
  { code: 'JPY', symbol: '¥', name: 'Japanese Yen' },
  { code: 'AUD', symbol: 'A$', name: 'Australian Dollar' },
  { code: 'CAD', symbol: 'C$', name: 'Canadian Dollar' },
  { code: 'CHF', symbol: 'Fr', name: 'Swiss Franc' },
  { code: 'CNY', symbol: '¥', name: 'Chinese Yuan' },
  { code: 'INR', symbol: '₹', name: 'Indian Rupee' },
  { code: 'MXN', symbol: '$', name: 'Mexican Peso' },
  { code: 'BRL', symbol: 'R$', name: 'Brazilian Real' },
  { code: 'ZAR', symbol: 'R', name: 'South African Rand' },
  { code: 'KRW', symbol: '₩', name: 'South Korean Won' },
  { code: 'SGD', symbol: 'S$', name: 'Singapore Dollar' },
  { code: 'HKD', symbol: 'HK$', name: 'Hong Kong Dollar' },
  { code: 'NZD', symbol: 'NZ$', name: 'New Zealand Dollar' },
  { code: 'SEK', symbol: 'kr', name: 'Swedish Krona' },
  { code: 'NOK', symbol: 'kr', name: 'Norwegian Krone' },
  { code: 'DKK', symbol: 'kr', name: 'Danish Krone' },
  { code: 'RUB', symbol: '₽', name: 'Russian Ruble' },
  { code: 'TRY', symbol: '₺', name: 'Turkish Lira' },
  { code: 'THB', symbol: '฿', name: 'Thai Baht' },
  { code: 'PLN', symbol: 'zł', name: 'Polish Zloty' },
  { code: 'AED', symbol: 'د.إ', name: 'UAE Dirham' },
  { code: 'SAR', symbol: '﷼', name: 'Saudi Riyal' },
  { code: 'MYR', symbol: 'RM', name: 'Malaysian Ringgit' },
  { code: 'IDR', symbol: 'Rp', name: 'Indonesian Rupiah' },
  { code: 'PHP', symbol: '₱', name: 'Philippine Peso' },
  { code: 'VND', symbol: '₫', name: 'Vietnamese Dong' },
  { code: 'EGP', symbol: '£', name: 'Egyptian Pound' },
  { code: 'ILS', symbol: '₪', name: 'Israeli Shekel' },
  { code: 'CZK', symbol: 'Kč', name: 'Czech Koruna' },
  { code: 'HUF', symbol: 'Ft', name: 'Hungarian Forint' },
  { code: 'ARS', symbol: '$', name: 'Argentine Peso' },
  { code: 'CLP', symbol: '$', name: 'Chilean Peso' },
  { code: 'COP', symbol: '$', name: 'Colombian Peso' }
];

function ExpenseForm({ members, currentUser, onSubmit, onCancel, initialExpense }) {
  const [description, setDescription] = useState(initialExpense?.description || '');
  const [amount, setAmount] = useState(
    initialExpense && !initialExpense.isMultiplePayers 
      ? initialExpense.amount?.toString() 
      : ''
  );
  const [currency, setCurrency] = useState(initialExpense?.currency || 'USD');
  const [paidBy, setPaidBy] = useState(
    initialExpense && !initialExpense.isMultiplePayers
      ? initialExpense.paidBy
      : currentUser.username
  );
  const [isMultiplePayers, setIsMultiplePayers] = useState(initialExpense?.isMultiplePayers || false);
  const [payerAmounts, setPayerAmounts] = useState(() => {
    if (initialExpense?.isMultiplePayers) {
      const amounts = members.reduce((acc, member) => ({ ...acc, [member]: '' }), {});
      initialExpense.paidBy.forEach(payer => {
        amounts[payer.member] = payer.amount.toString();
      });
      return amounts;
    }
    return members.reduce((acc, member) => ({ ...acc, [member]: '' }), {});
  });
  
  const [splitType, setSplitType] = useState(initialExpense?.splitType || 'equally');
  const [splitBetween, setSplitBetween] = useState(() => {
    if (initialExpense?.splitAmounts) {
      return Object.keys(initialExpense.splitAmounts);
    }
    return members;
  });
  const [unequalAmounts, setUnequalAmounts] = useState(() => {
    if (initialExpense?.splitType === 'unequally' && initialExpense?.splitAmounts) {
      const amounts = members.reduce((acc, member) => ({ ...acc, [member]: '' }), {});
      Object.entries(initialExpense.splitAmounts).forEach(([member, amt]) => {
        amounts[member] = amt.toString();
      });
      return amounts;
    }
    return members.reduce((acc, member) => ({ ...acc, [member]: '' }), {});
  });
  const [percentages, setPercentages] = useState(members.reduce((acc, member) => ({ ...acc, [member]: '' }), {}));
  const [adjustments, setAdjustments] = useState(members.reduce((acc, member) => ({ ...acc, [member]: '' }), {}));
  const [shares, setShares] = useState(members.reduce((acc, member) => ({ ...acc, [member]: '' }), {}));
  const [showCurrencyPicker, setShowCurrencyPicker] = useState(false);

  useEffect(() => {
    if (initialExpense) {
      setDescription(initialExpense.description || '');
      setAmount(initialExpense.isMultiplePayers ? '' : initialExpense.amount?.toString() || '');
      setCurrency(initialExpense.currency || 'USD');
      setPaidBy(initialExpense.isMultiplePayers ? currentUser.username : initialExpense.paidBy || currentUser.username);
      setIsMultiplePayers(initialExpense.isMultiplePayers || false);
      setSplitType(initialExpense.splitType || 'equally');
      setSplitBetween(initialExpense.splitAmounts ? Object.keys(initialExpense.splitAmounts) : members);
    }
  }, [initialExpense]);

  const calculateSplitAmounts = () => {
    const totalAmount = isMultiplePayers
      ? Object.values(payerAmounts).filter(v => v).reduce((sum, v) => sum + parseFloat(v || 0), 0)
      : parseFloat(amount || 0);

    let splitData = {};

    switch (splitType) {
      case 'equally':
        const equalShare = totalAmount / splitBetween.length;
        splitBetween.forEach(member => {
          splitData[member] = equalShare;
        });
        break;

      case 'unequally':
        Object.entries(unequalAmounts).forEach(([member, amt]) => {
          if (amt && parseFloat(amt) > 0) {
            splitData[member] = parseFloat(amt);
          }
        });
        break;

      case 'percentages':
        Object.entries(percentages).forEach(([member, pct]) => {
          if (pct && parseFloat(pct) > 0) {
            splitData[member] = (parseFloat(pct) / 100) * totalAmount;
          }
        });
        break;

      case 'adjustment':
        const numPeople = splitBetween.length;
        const totalAdjustments = splitBetween.reduce((sum, member) => {
          return sum + parseFloat(adjustments[member] || 0);
        }, 0);
        const remainder = totalAmount - totalAdjustments;
        const equalRemainder = remainder / numPeople;

        splitBetween.forEach(member => {
          const adjustment = parseFloat(adjustments[member] || 0);
          splitData[member] = equalRemainder + adjustment;
        });
        break;

      case 'shares':
        const totalShares = Object.entries(shares)
          .filter(([member, _]) => splitBetween.includes(member))
          .reduce((sum, [_, s]) => sum + parseFloat(s || 1), 0);
        const shareValue = totalAmount / totalShares;
        splitBetween.forEach(member => {
          const memberShares = parseFloat(shares[member] || 1);
          splitData[member] = shareValue * memberShares;
        });
        break;
    }

    return splitData;
  };

  const handleSubmit = () => {
    const splitAmounts = calculateSplitAmounts();

    if (isMultiplePayers) {
      const payers = Object.entries(payerAmounts)
        .filter(([_, amt]) => amt && parseFloat(amt) > 0)
        .map(([member, amt]) => ({ member, amount: parseFloat(amt) }));

      if (payers.length === 0 || Object.keys(splitAmounts).length === 0) {
        Alert.alert('Error', 'Please add at least one payer and one split amount');
        return;
      }

      const totalPaid = payers.reduce((sum, p) => sum + p.amount, 0);

      onSubmit({
        description,
        amount: totalPaid,
        currency,
        paidBy: payers,
        splitType,
        splitAmounts,
        isMultiplePayers: true,
        date: new Date().toISOString(),
      });
    } else {
      if (!description || !amount || !paidBy || Object.keys(splitAmounts).length === 0) {
        Alert.alert('Error', 'Please fill in all required fields');
        return;
      }

      onSubmit({
        description,
        amount: parseFloat(amount),
        currency,
        paidBy,
        splitType,
        splitAmounts,
        isMultiplePayers: false,
        date: new Date().toISOString(),
      });
    }
  };

  const toggleMember = (member) => {
    if (splitBetween.includes(member)) {
      setSplitBetween(splitBetween.filter(m => m !== member));
    } else {
      setSplitBetween([...splitBetween, member]);
    }
  };

  const getTotalPercentage = () => {
    return Object.values(percentages)
      .filter(v => v)
      .reduce((sum, v) => sum + parseFloat(v || 0), 0);
  };

  const getTotalUnequal = () => {
    return Object.values(unequalAmounts)
      .filter(v => v)
      .reduce((sum, v) => sum + parseFloat(v || 0), 0);
  };

  const getTotalShares = () => {
    return Object.entries(shares)
      .filter(([member, _]) => splitBetween.includes(member))
      .reduce((sum, [_, s]) => sum + parseFloat(s || 0), 0);
  };

  const getTotalAdjustments = () => {
    return Object.values(adjustments)
      .filter(v => v)
      .reduce((sum, v) => sum + parseFloat(v || 0), 0);
  };

  return (
    <ScrollView style={styles.container} nestedScrollEnabled={true}>
      <Text style={styles.label}>Description</Text>
      <TextInput
        style={styles.input}
        placeholder="What was the expense for?"
        value={description}
        onChangeText={setDescription}
      />

      <Text style={styles.label}>Paid By</Text>
      <View style={styles.paidByContainer}>
        <TouchableOpacity
          style={[styles.payerTypeButton, !isMultiplePayers && styles.payerTypeButtonActive]}
          onPress={() => setIsMultiplePayers(false)}
        >
          <Text style={[styles.payerTypeText, !isMultiplePayers && styles.payerTypeTextActive]}>
            Single Payer
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.payerTypeButton, isMultiplePayers && styles.payerTypeButtonActive]}
          onPress={() => setIsMultiplePayers(true)}
        >
          <Text style={[styles.payerTypeText, isMultiplePayers && styles.payerTypeTextActive]}>
            Multiple Payers
          </Text>
        </TouchableOpacity>
      </View>

      {!isMultiplePayers ? (
        <>
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

          <Text style={styles.label}>Amount</Text>
          <View style={styles.amountRow}>
            <TouchableOpacity 
              style={styles.currencySelector}
              onPress={() => setShowCurrencyPicker(true)}
            >
              <Text style={styles.currencySelectorText}>
                {CURRENCIES.find(c => c.code === currency)?.symbol || '$'} {currency}
              </Text>
            </TouchableOpacity>
            <TextInput
              style={styles.amountInput}
              placeholder="0.00"
              value={amount}
              onChangeText={setAmount}
              keyboardType="decimal-pad"
            />
          </View>
        </>
      ) : (
        <>
          <Text style={styles.label}>Currency</Text>
          <TouchableOpacity 
            style={styles.currencySelectorLarge}
            onPress={() => setShowCurrencyPicker(true)}
          >
            <Text style={styles.currencySelectorLargeText}>
              {CURRENCIES.find(c => c.code === currency)?.symbol || '$'} {currency} - {CURRENCIES.find(c => c.code === currency)?.name}
            </Text>
          </TouchableOpacity>

          <Text style={styles.label}>Who paid and how much?</Text>
          {members.map((member) => (
            <View key={member} style={styles.payerRow}>
              <Text style={styles.payerName}>{member}</Text>
              <TextInput
                style={styles.payerInput}
                placeholder="0.00"
                value={payerAmounts[member]}
                onChangeText={(value) => 
                  setPayerAmounts({ ...payerAmounts, [member]: value })
                }
                keyboardType="decimal-pad"
              />
            </View>
          ))}
          <Text style={styles.totalText}>
            Total: {currency} {Object.values(payerAmounts).reduce((sum, v) => sum + parseFloat(v || 0), 0).toFixed(2)}
          </Text>
        </>
      )}

      <Text style={styles.label}>Split Type</Text>
      <View style={styles.splitTypeContainer}>
        {['equally', 'unequally', 'percentages', 'adjustment', 'shares'].map((type) => (
          <TouchableOpacity
            key={type}
            style={[styles.splitTypeButton, splitType === type && styles.splitTypeButtonActive]}
            onPress={() => setSplitType(type)}
          >
            <Text style={[styles.splitTypeText, splitType === type && styles.splitTypeTextActive]}>
              {type.charAt(0).toUpperCase() + type.slice(1)}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <Text style={styles.label}>Split Between</Text>
      <View style={styles.memberContainer}>
        {members.map((member) => (
          <TouchableOpacity
            key={member}
            style={[styles.memberButton, splitBetween.includes(member) && styles.memberButtonActive]}
            onPress={() => toggleMember(member)}
          >
            <Text style={[styles.memberText, splitBetween.includes(member) && styles.memberTextActive]}>
              {member}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {splitType === 'unequally' && (
        <View style={styles.splitDetailsSection}>
          <Text style={styles.sectionTitle}>Enter exact amounts:</Text>
          {splitBetween.map((member) => (
            <View key={member} style={styles.splitRow}>
              <Text style={styles.splitMemberName}>{member}</Text>
              <TextInput
                style={styles.splitInput}
                placeholder="0.00"
                value={unequalAmounts[member]}
                onChangeText={(value) => 
                  setUnequalAmounts({ ...unequalAmounts, [member]: value })
                }
                keyboardType="decimal-pad"
              />
            </View>
          ))}
          <Text style={styles.validationText}>
            Total: {getTotalUnequal().toFixed(2)} / Expected: {(isMultiplePayers 
              ? Object.values(payerAmounts).reduce((sum, v) => sum + parseFloat(v || 0), 0)
              : parseFloat(amount || 0)).toFixed(2)}
          </Text>
        </View>
      )}

      {splitType === 'percentages' && (
        <View style={styles.splitDetailsSection}>
          <Text style={styles.sectionTitle}>Enter percentages:</Text>
          {splitBetween.map((member) => (
            <View key={member} style={styles.splitRow}>
              <Text style={styles.splitMemberName}>{member}</Text>
              <View style={styles.percentageInputContainer}>
                <TextInput
                  style={styles.splitInput}
                  placeholder="0"
                  value={percentages[member]}
                  onChangeText={(value) => 
                    setPercentages({ ...percentages, [member]: value })
                  }
                  keyboardType="decimal-pad"
                />
                <Text style={styles.percentSymbol}>%</Text>
              </View>
            </View>
          ))}
          <Text style={styles.validationText}>
            Total: {getTotalPercentage().toFixed(1)}% / Expected: 100%
          </Text>
        </View>
      )}

      {splitType === 'adjustment' && (
        <View style={styles.splitDetailsSection}>
          <Text style={styles.sectionTitle}>Adjustments (+ or -):</Text>
          <Text style={styles.helperText}>
            Everyone pays equal share + their adjustment
          </Text>
          {splitBetween.map((member) => (
            <View key={member} style={styles.splitRow}>
              <Text style={styles.splitMemberName}>{member}</Text>
              <TextInput
                style={styles.splitInput}
                placeholder="0.00"
                value={adjustments[member]}
                onChangeText={(value) => 
                  setAdjustments({ ...adjustments, [member]: value })
                }
                keyboardType="numeric"
              />
            </View>
          ))}
          <Text style={styles.validationText}>
            Total adjustments: {getTotalAdjustments().toFixed(2)}
          </Text>
        </View>
      )}

      {splitType === 'shares' && (
        <View style={styles.splitDetailsSection}>
          <Text style={styles.sectionTitle}>Number of shares:</Text>
          <Text style={styles.helperText}>
            e.g., 1 share for adults, 0.5 for children
          </Text>
          {splitBetween.map((member) => (
            <View key={member} style={styles.splitRow}>
              <Text style={styles.splitMemberName}>{member}</Text>
              <TextInput
                style={styles.splitInput}
                placeholder="1"
                value={shares[member]}
                onChangeText={(value) => 
                  setShares({ ...shares, [member]: value })
                }
                keyboardType="decimal-pad"
              />
            </View>
          ))}
          <Text style={styles.validationText}>
            Total shares: {getTotalShares().toFixed(1)}
          </Text>
        </View>
      )}

      <View style={styles.actions}>
        <TouchableOpacity style={styles.cancelButton} onPress={onCancel}>
          <Text style={styles.cancelButtonText}>Cancel</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.submitButton} onPress={handleSubmit}>
          <Text style={styles.submitButtonText}>
            {initialExpense ? 'Update Expense' : 'Add Expense'}
          </Text>
        </TouchableOpacity>
      </View>

      <Modal
        visible={showCurrencyPicker}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowCurrencyPicker(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Select Currency</Text>
            <ScrollView style={styles.currencyList}>
              {CURRENCIES.map((curr) => (
                <TouchableOpacity
                  key={curr.code}
                  style={[
                    styles.currencyOption,
                    currency === curr.code && styles.currencyOptionActive
                  ]}
                  onPress={() => {
                    setCurrency(curr.code);
                    setShowCurrencyPicker(false);
                  }}
                >
                  <Text style={[
                    styles.currencyOptionText,
                    currency === curr.code && styles.currencyOptionTextActive
                  ]}>
                    {curr.symbol} {curr.code}
                  </Text>
                  <Text style={styles.currencyOptionName}>{curr.name}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
            <TouchableOpacity 
              style={styles.modalCloseButton}
              onPress={() => setShowCurrencyPicker(false)}
            >
              <Text style={styles.modalCloseButtonText}>Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
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
  paidByContainer: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 8,
  },
  payerTypeButton: {
    flex: 1,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    backgroundColor: '#fff',
    alignItems: 'center',
  },
  payerTypeButtonActive: {
    backgroundColor: '#2c3e50',
    borderColor: '#2c3e50',
  },
  payerTypeText: {
    color: '#2c3e50',
    fontWeight: '500',
    fontSize: 13,
  },
  payerTypeTextActive: {
    color: '#fff',
  },
  amountRow: {
    flexDirection: 'row',
    gap: 8,
    alignItems: 'center',
  },
  currencySelector: {
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: '#e5e7eb',
    backgroundColor: '#fff',
    minWidth: 100,
  },
  currencySelectorText: {
    color: '#2c3e50',
    fontWeight: '600',
    fontSize: 15,
  },
  currencySelectorLarge: {
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: '#e5e7eb',
    backgroundColor: '#fff',
  },
  currencySelectorLargeText: {
    color: '#2c3e50',
    fontWeight: '500',
    fontSize: 15,
  },
  amountInput: {
    flex: 1,
    borderWidth: 2,
    borderColor: '#e5e7eb',
    borderRadius: 8,
    padding: 14,
    fontSize: 16,
    backgroundColor: '#fff',
  },
  payerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  payerName: {
    flex: 1,
    fontSize: 14,
    color: '#2c3e50',
    fontWeight: '500',
  },
  payerInput: {
    width: 100,
    borderWidth: 2,
    borderColor: '#e5e7eb',
    borderRadius: 6,
    padding: 10,
    fontSize: 14,
    backgroundColor: '#fff',
  },
  totalText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#2c3e50',
    marginTop: 8,
    textAlign: 'right',
  },
  splitTypeContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  splitTypeButton: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    backgroundColor: '#fff',
  },
  splitTypeButtonActive: {
    backgroundColor: '#2c3e50',
    borderColor: '#2c3e50',
  },
  splitTypeText: {
    color: '#2c3e50',
    fontWeight: '500',
    fontSize: 12,
  },
  splitTypeTextActive: {
    color: '#fff',
  },
  memberContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  memberButton: {
    paddingHorizontal: 14,
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
    fontSize: 13,
  },
  memberTextActive: {
    color: '#fff',
  },
  splitDetailsSection: {
    marginTop: 16,
    padding: 12,
    backgroundColor: '#f9fafb',
    borderRadius: 8,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#2c3e50',
    marginBottom: 8,
  },
  helperText: {
    fontSize: 12,
    color: '#7f8c8d',
    marginBottom: 12,
  },
  splitRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  splitMemberName: {
    flex: 1,
    fontSize: 14,
    color: '#2c3e50',
  },
  splitInput: {
    width: 100,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 6,
    padding: 8,
    fontSize: 14,
    backgroundColor: '#fff',
  },
  percentageInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  percentSymbol: {
    marginLeft: 4,
    fontSize: 14,
    color: '#2c3e50',
  },
  validationText: {
    fontSize: 13,
    color: '#7f8c8d',
    marginTop: 8,
    fontWeight: '500',
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
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingTop: 20,
    paddingHorizontal: 16,
    maxHeight: '70%',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#2c3e50',
    marginBottom: 16,
    textAlign: 'center',
  },
  currencyList: {
    maxHeight: 400,
  },
  currencyOption: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  currencyOptionActive: {
    backgroundColor: '#f0f9ff',
  },
  currencyOptionText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2c3e50',
    minWidth: 80,
  },
  currencyOptionTextActive: {
    color: '#2563eb',
  },
  currencyOptionName: {
    fontSize: 14,
    color: '#7f8c8d',
    flex: 1,
    textAlign: 'right',
  },
  modalCloseButton: {
    backgroundColor: '#2c3e50',
    paddingVertical: 16,
    borderRadius: 8,
    marginTop: 16,
    marginBottom: 16,
    alignItems: 'center',
  },
  modalCloseButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});

export default ExpenseForm;
