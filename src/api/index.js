const API_URL = (import.meta.env.VITE_API_URL || 'http://localhost:5000/api').replace(/\/$/, '')

// Helper function for API calls
const apiCall = async (endpoint, options = {}) => {
  const config = {
    credentials: 'include', // Important for cookies/sessions
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
    ...options,
  }

  const response = await fetch(`${API_URL}${endpoint}`, config)
  const data = await response.json()

  if (!response.ok) {
    throw new Error(data.error || 'Something went wrong')
  }

  return data
}

// Authentication API
export const authAPI = {
  signup: async (username, email, password) => {
    return apiCall('/auth/signup', {
      method: 'POST',
      body: JSON.stringify({ username, email, password }),
    })
  },

  login: async (email, password) => {
    return apiCall('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    })
  },

  logout: async () => {
    return apiCall('/auth/logout', {
      method: 'POST',
    })
  },

  checkStatus: async () => {
    return apiCall('/auth/status')
  },

  updateProfile: async (displayName, avatar) => {
    return apiCall('/auth/profile', {
      method: 'PUT',
      body: JSON.stringify({ displayName, avatar }),
    })
  },

  googleLogin: () => {
    window.location.href = `${API_URL}/auth/google`
  },
}

// Groups API
export const groupsAPI = {
  getAll: async () => {
    return apiCall('/groups')
  },

  create: async (name) => {
    return apiCall('/groups', {
      method: 'POST',
      body: JSON.stringify({ name }),
    })
  },

  join: async (code) => {
    return apiCall('/groups/join', {
      method: 'POST',
      body: JSON.stringify({ code }),
    })
  },

  addExpense: async (groupId, expenseData) => {
    return apiCall(`/groups/${groupId}/expenses`, {
      method: 'POST',
      body: JSON.stringify(expenseData),
    })
  },

  editExpense: async (groupId, expenseId, expenseData) => {
    return apiCall(`/groups/${groupId}/expenses/${expenseId}`, {
      method: 'PUT',
      body: JSON.stringify(expenseData),
    })
  },

  deleteExpense: async (groupId, expenseId) => {
    return apiCall(`/groups/${groupId}/expenses/${expenseId}`, {
      method: 'DELETE',
    })
  },

  leaveGroup: async (groupId) => {
    return apiCall(`/groups/${groupId}/leave`, {
      method: 'POST',
    })
  },

  createPayment: async (groupId, paymentData) => {
    return apiCall(`/groups/${groupId}/payments`, {
      method: 'POST',
      body: JSON.stringify(paymentData),
    })
  },

  confirmPayment: async (groupId, paymentId, action) => {
    return apiCall(`/groups/${groupId}/payments/${paymentId}`, {
      method: 'PUT',
      body: JSON.stringify({ action }),
    })
  },

  sendPaymentReminder: async (groupId, paymentId) => {
    return apiCall(`/groups/${groupId}/payments/${paymentId}/remind`, {
      method: 'POST',
    })
  },

  sendPaymentRequest: async (groupId, requestData) => {
    return apiCall(`/groups/${groupId}/payment-requests`, {
      method: 'POST',
      body: JSON.stringify(requestData),
    })
  },

  dismissPaymentRequest: async (groupId, requestId) => {
    return apiCall(`/groups/${groupId}/payment-requests/${requestId}`, {
      method: 'DELETE',
    })
  },
}
