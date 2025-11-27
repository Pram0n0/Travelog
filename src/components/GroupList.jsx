import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  FlatList,
  StyleSheet,
  Alert,
  Platform,
} from 'react-native';
import * as Clipboard from 'expo-clipboard';

function GroupList({ groups, currentUser, navigation, onAddGroup, onJoinGroup, onLeaveGroup }) {
  const [showForm, setShowForm] = useState(false);
  const [showJoinForm, setShowJoinForm] = useState(false);
  const [groupName, setGroupName] = useState('');
  const [joinCode, setJoinCode] = useState('');
  const [joinError, setJoinError] = useState('');

  const checkUserBalances = (group) => {
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
  };

  const handleLeaveGroup = (groupId, groupName) => {
    Alert.alert(
      'Leave Group',
      `Are you sure you want to leave "${groupName}"? This action cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Leave', style: 'destructive', onPress: () => onLeaveGroup(groupId) },
      ]
    );
  };

  const userGroups = groups.filter(group => group.members.includes(currentUser.username));

  const handleSubmit = async () => {
    if (groupName.trim()) {
      await onAddGroup(groupName);
      setGroupName('');
      setShowForm(false);
    }
  };

  const handleJoinSubmit = async () => {
    setJoinError('');
    if (joinCode.trim()) {
      const success = await onJoinGroup(joinCode);
      if (success) {
        setJoinCode('');
        setShowJoinForm(false);
      } else {
        setJoinError('Invalid code or you are already in this group');
      }
    }
  };

  const copyToClipboard = async (code) => {
    await Clipboard.setStringAsync(code);
    Alert.alert('Copied!', 'Group code copied to clipboard');
  };

  const renderGroupCard = ({ item: group }) => {
    const hasBalance = checkUserBalances(group);
    
    return (
      <TouchableOpacity
        style={styles.groupCard}
        onPress={() => navigation.navigate('GroupDetail', { groupId: group._id })}
      >
        <Text style={styles.groupName}>{group.name}</Text>
        <Text style={styles.memberCount}>👥 {group.members.length} members</Text>
        <Text style={styles.expenseCount}>{group.expenses.length} expenses</Text>
        
        <View style={styles.groupCodeSection}>
          <TouchableOpacity
            style={styles.groupCodeButton}
            onPress={() => copyToClipboard(group.code)}
          >
            <Text style={styles.groupCode}>{group.code}</Text>
          </TouchableOpacity>
          
          <TouchableOpacity
            style={[styles.leaveButton, hasBalance && styles.leaveButtonDisabled]}
            onPress={() => handleLeaveGroup(group._id, group.name)}
            disabled={hasBalance}
          >
            <Text style={styles.leaveButtonText}>🚪 Leave</Text>
          </TouchableOpacity>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Your Groups</Text>
        <View style={styles.headerButtons}>
          <TouchableOpacity
            style={styles.headerButton}
            onPress={() => {
              setShowJoinForm(!showJoinForm);
              setShowForm(false);
              setJoinError('');
            }}
          >
            <Text style={styles.headerButtonText}>
              {showJoinForm ? 'Cancel' : '🔗 Join Group'}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.headerButton}
            onPress={() => {
              setShowForm(!showForm);
              setShowJoinForm(false);
            }}
          >
            <Text style={styles.headerButtonText}>
              {showForm ? 'Cancel' : '+ Create Group'}
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {showJoinForm && (
        <View style={styles.formCard}>
          <Text style={styles.formTitle}>Join Existing Group</Text>
          <TextInput
            style={styles.input}
            placeholder="Group code"
            value={joinCode}
            onChangeText={(text) => setJoinCode(text.toUpperCase())}
            autoCapitalize="characters"
          />
          {joinError ? <Text style={styles.errorText}>{joinError}</Text> : null}
          <TouchableOpacity style={styles.submitButton} onPress={handleJoinSubmit}>
            <Text style={styles.submitButtonText}>Join Group</Text>
          </TouchableOpacity>
        </View>
      )}

      {showForm && (
        <View style={styles.formCard}>
          <Text style={styles.formTitle}>Create New Group</Text>
          <TextInput
            style={styles.input}
            placeholder="Group name"
            value={groupName}
            onChangeText={setGroupName}
          />
          <Text style={styles.helperText}>
            You will be added as the first member. Share the group code with others to invite them.
          </Text>
          <TouchableOpacity style={styles.submitButton} onPress={handleSubmit}>
            <Text style={styles.submitButtonText}>Create Group</Text>
          </TouchableOpacity>
        </View>
      )}

      {userGroups.length === 0 ? (
        <View style={styles.emptyState}>
          <Text style={styles.emptyStateText}>📝 No groups yet. Create one or join with a code!</Text>
        </View>
      ) : (
        <FlatList
          data={userGroups}
          renderItem={renderGroupCard}
          keyExtractor={(item) => item._id}
          contentContainerStyle={styles.listContainer}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    padding: 16,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  title: {
    fontSize: 24,
    fontWeight: '600',
    color: '#2c3e50',
    marginBottom: 12,
  },
  headerButtons: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  headerButton: {
    backgroundColor: '#2c3e50',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 6,
    flex: 1,
    minWidth: 120,
    alignItems: 'center',
  },
  headerButtonText: {
    color: '#fff',
    fontWeight: '500',
  },
  formCard: {
    backgroundColor: '#fff',
    margin: 16,
    padding: 20,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  formTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#2c3e50',
    marginBottom: 16,
  },
  input: {
    borderWidth: 2,
    borderColor: '#e5e7eb',
    borderRadius: 8,
    padding: 14,
    fontSize: 16,
    backgroundColor: '#fff',
    marginBottom: 12,
  },
  errorText: {
    color: '#dc2626',
    fontSize: 14,
    marginBottom: 12,
  },
  helperText: {
    color: '#7f8c8d',
    fontSize: 13,
    marginBottom: 12,
    padding: 12,
    backgroundColor: '#ecf0f1',
    borderRadius: 6,
  },
  submitButton: {
    backgroundColor: '#2c3e50',
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: 'center',
  },
  submitButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  listContainer: {
    padding: 16,
  },
  groupCard: {
    backgroundColor: '#fafafa',
    padding: 20,
    borderRadius: 8,
    marginBottom: 16,
    borderWidth: 2,
    borderColor: '#e5e7eb',
  },
  groupName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2c3e50',
    marginBottom: 12,
  },
  memberCount: {
    color: '#7f8c8d',
    fontSize: 13,
    marginBottom: 4,
  },
  expenseCount: {
    color: '#7f8c8d',
    fontSize: 13,
    marginBottom: 16,
  },
  groupCodeSection: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
  },
  groupCodeButton: {
    backgroundColor: '#ecf0f1',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  groupCode: {
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
    fontSize: 15,
    fontWeight: '600',
    color: '#2c3e50',
    letterSpacing: 0.5,
  },
  leaveButton: {
    backgroundColor: '#dc2626',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 4,
    borderWidth: 2,
    borderColor: '#e5e7eb',
  },
  leaveButtonDisabled: {
    backgroundColor: '#999',
    opacity: 0.4,
  },
  leaveButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '500',
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 48,
  },
  emptyStateText: {
    color: '#7f8c8d',
    fontSize: 15,
    textAlign: 'center',
  },
});

export default GroupList;
