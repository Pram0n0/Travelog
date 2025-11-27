import React, { useState, useEffect } from 'react';
import { View, Text, ActivityIndicator, StyleSheet, TouchableOpacity } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Auth from './components/Auth';
import GroupList from './components/GroupList';
import ExpenseTracker from './components/ExpenseTracker';
import ProfileSettings from './components/ProfileSettings';
import { authAPI, groupsAPI } from './api/index.js';

const Stack = createStackNavigator();

function App() {
  const [currentUser, setCurrentUser] = useState(null);
  const [groups, setGroups] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showProfileSettings, setShowProfileSettings] = useState(false);

  useEffect(() => {
    checkAuthStatus();
  }, []);

  useEffect(() => {
    if (currentUser) {
      fetchGroups();
    } else {
      setGroups([]);
    }
  }, [currentUser]);

  const checkAuthStatus = async () => {
    try {
      const response = await authAPI.checkStatus();
      if (response.authenticated) {
        setCurrentUser(response.user);
      }
    } catch (err) {
      console.error('Auth check failed:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchGroups = async () => {
    try {
      const fetchedGroups = await groupsAPI.getAll();
      setGroups(fetchedGroups);
    } catch (err) {
      console.error('Failed to fetch groups:', err);
    }
  };

  const handleLogin = (user) => {
    setCurrentUser(user);
  };

  const handleLogout = async () => {
    try {
      await authAPI.logout();
      setCurrentUser(null);
      setGroups([]);
    } catch (err) {
      console.error('Logout failed:', err);
    }
  };

  const handleProfileUpdate = async (displayName, avatar) => {
    try {
      const response = await authAPI.updateProfile(displayName, avatar);
      setCurrentUser(response.user);
    } catch (err) {
      console.error('Profile update failed:', err);
      throw err;
    }
  };

  const addGroup = async (groupName, navigation) => {
    try {
      const newGroup = await groupsAPI.create(groupName);
      setGroups([...groups, newGroup]);
      navigation.navigate('GroupDetail', { groupId: newGroup._id });
    } catch (err) {
      console.error('Failed to create group:', err);
      alert(err.message || 'Failed to create group');
    }
  };

  const joinGroup = async (groupCode, navigation) => {
    try {
      const updatedGroup = await groupsAPI.join(groupCode);
      const existingIndex = groups.findIndex(g => g._id === updatedGroup._id);
      if (existingIndex >= 0) {
        setGroups(groups.map(g => g._id === updatedGroup._id ? updatedGroup : g));
      } else {
        setGroups([...groups, updatedGroup]);
      }
      if (navigation) {
        navigation.navigate('GroupDetail', { groupId: updatedGroup._id });
      }
      return true;
    } catch (err) {
      console.error('Failed to join group:', err);
      alert(err.message || 'Failed to join group');
      return false;
    }
  };

  const addExpense = async (groupId, expense) => {
    try {
      const updatedGroup = await groupsAPI.addExpense(groupId, expense);
      setGroups(prevGroups => prevGroups.map(g => g._id === updatedGroup._id ? updatedGroup : g));
    } catch (err) {
      console.error('Failed to add expense:', err);
      alert(err.message || 'Failed to add expense');
    }
  };

  const deleteExpense = async (groupId, expenseId) => {
    try {
      const updatedGroup = await groupsAPI.deleteExpense(groupId, expenseId);
      setGroups(prevGroups => prevGroups.map(g => g._id === updatedGroup._id ? updatedGroup : g));
    } catch (err) {
      console.error('Failed to delete expense:', err);
      alert(err.message || 'Failed to delete expense');
    }
  };

  const editExpense = async (groupId, expenseId, updatedExpense) => {
    try {
      const updatedGroup = await groupsAPI.editExpense(groupId, expenseId, updatedExpense);
      setGroups(prevGroups => prevGroups.map(g => g._id === updatedGroup._id ? updatedGroup : g));
    } catch (err) {
      console.error('Failed to edit expense:', err);
      alert(err.message || 'Failed to edit expense');
    }
  };

  const leaveGroup = async (groupId, navigation) => {
    try {
      await groupsAPI.leaveGroup(groupId);
      setGroups(prevGroups => prevGroups.filter(g => g._id !== groupId));
      navigation.navigate('GroupList');
    } catch (err) {
      console.error('Failed to leave group:', err);
      alert(err.message || 'Failed to leave group');
      throw err;
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#2c3e50" />
        <Text style={styles.loadingText}>Loading...</Text>
      </View>
    );
  }

  if (!currentUser) {
    return <Auth onLogin={handleLogin} />;
  }

  return (
    <NavigationContainer>
      {showProfileSettings && (
        <ProfileSettings
          user={currentUser}
          onUpdate={handleProfileUpdate}
          onClose={() => setShowProfileSettings(false)}
        />
      )}
      <Stack.Navigator
        screenOptions={{
          headerStyle: {
            backgroundColor: '#2c3e50',
          },
          headerTintColor: '#fff',
          headerTitleStyle: {
            fontWeight: 'bold',
          },
        }}
      >
        <Stack.Screen
          name="GroupList"
          options={{
            title: '💰 Travelog',
            headerRight: () => (
              <View style={{ flexDirection: 'row', marginRight: 10 }}>
                <TouchableOpacity onPress={() => setShowProfileSettings(true)}>
                  <Text style={styles.headerButton}>⚙️</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={handleLogout}>
                  <Text style={styles.headerButton}>Logout</Text>
                </TouchableOpacity>
              </View>
            ),
          }}
        >
          {(props) => (
            <GroupList
              {...props}
              groups={groups}
              currentUser={currentUser}
              onAddGroup={(name) => addGroup(name, props.navigation)}
              onJoinGroup={(code) => joinGroup(code, props.navigation)}
              onLeaveGroup={(id) => leaveGroup(id, props.navigation)}
            />
          )}
        </Stack.Screen>
        <Stack.Screen
          name="GroupDetail"
          options={({ route }) => {
            const group = groups.find(g => g._id === route.params.groupId);
            return {
              title: group ? group.name : 'Group',
            };
          }}
        >
          {(props) => {
            const group = groups.find(g => g._id === props.route.params.groupId);
            if (!group) {
              return (
                <View style={styles.errorContainer}>
                  <Text style={styles.errorText}>Group not found</Text>
                </View>
              );
            }
            return (
              <ExpenseTracker
                {...props}
                group={group}
                currentUser={currentUser}
                onAddExpense={(expense) => addExpense(group._id, expense)}
                onDeleteExpense={(expenseId) => deleteExpense(group._id, expenseId)}
                onEditExpense={(expenseId, expense) => editExpense(group._id, expenseId, expense)}
                onLeaveGroup={() => leaveGroup(group._id, props.navigation)}
              />
            );
          }}
        </Stack.Screen>
      </Stack.Navigator>
    </NavigationContainer>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fff',
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: '#2c3e50',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  errorText: {
    fontSize: 18,
    color: '#2c3e50',
    textAlign: 'center',
  },
  headerButton: {
    color: '#fff',
    fontSize: 16,
    marginLeft: 15,
    padding: 5,
  },
});

export default App;
