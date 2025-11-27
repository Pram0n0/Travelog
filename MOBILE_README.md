# Travelog Mobile - React Native Conversion

## Current Status

The project has been set up for React Native/Expo conversion on the `mobile-app` branch.

### Completed
✅ Updated package.json for Expo/React Native
✅ Created app.json and babel.config.js
✅ Removed web-specific files (vite.config.js, index.html)
✅ Installed React Native dependencies
✅ Converted App.jsx to use React Navigation
✅ Updated API client to work with mobile

### To Complete

The following components need to be converted from React/HTML to React Native:

#### 1. Auth.jsx
- Replace `<div>` with `<View>`
- Replace `<form>` with custom View wrapper
- Replace `<input>` with `<TextInput>`
- Replace `<button>` with `<TouchableOpacity>` and `<Text>`
- Replace CSS with StyleSheet
- Remove Google OAuth (needs expo-auth-session setup)

#### 2. GroupList.jsx  
- Replace grid layout with `<FlatList>`
- Replace `<div>` with `<View>`
- Replace `<button>` with `<TouchableOpacity>`
- Convert CSS to StyleSheet
- Remove clipboard API, use expo-clipboard

#### 3. ExpenseTracker.jsx
- Replace `<div>` with `<ScrollView>` and `<View>`
- Replace `<button>` with `<TouchableOpacity>`
- Convert CSS to StyleSheet
- Update share functionality for mobile

#### 4. ExpenseForm.jsx
- Replace `<form>` with View
- Replace `<input>` and `<select>` with `<TextInput>` and `<Picker>`
- Replace `<button>` with `<TouchableOpacity>`
- Convert CSS to StyleSheet

#### 5. BalanceCalculator.jsx
- Replace HTML elements with React Native components
- Convert CSS to StyleSheet

#### 6. ProfileSettings.jsx
- Replace modal/overlay with React Native Modal
- Convert form elements to React Native components
- Convert CSS to StyleSheet

### Running the App

1. Make sure your backend server is running
2. Update `src/api/index.js` with your backend URL:
   - For iOS simulator: `http://localhost:5000/api`
   - For Android emulator: `http://10.0.2.2:5000/api`
   - For physical device: `http://YOUR_COMPUTER_IP:5000/api`

3. Start the Expo dev server:
   ```bash
   npm start
   ```

4. Run on device:
   - iOS: Press `i` or `npm run ios`
   - Android: Press `a` or `npm run android`
   - Web: Press `w` or `npm run web`

### Backend Changes Needed

The backend currently uses session-based authentication which doesn't work well with mobile.
Consider implementing JWT tokens for mobile authentication:

1. Add JWT generation on login
2. Store JWT in AsyncStorage on mobile
3. Send JWT in Authorization header
4. Update backend to verify JWT for mobile requests

### Additional Mobile Features to Add

- Push notifications for new expenses
- Offline support with local storage
- Biometric authentication
- Camera for receipt scanning
- Better mobile UX (pull-to-refresh, swipe gestures)

## Example Component Conversion

See `Auth.jsx` for an example of converting a web component to React Native.
