# Travelog Mobile App - Quick Reference

## 🚀 Starting the App

### Option 1: Use the Startup Script (Easiest)
```powershell
.\START_SERVERS.ps1
```

### Option 2: Manual Start
1. **Backend Server:**
   ```powershell
   cd server
   node server.js
   ```
   Should show: "🚀 Server running on port 5000"

2. **Expo Dev Server:**
   ```powershell
   npm start
   ```
   Should show QR code at: `exp://192.168.1.4:8081`

## 📱 Testing on Your Phone

1. **Install Expo Go** from Play Store/App Store
2. **Ensure SDK 54** - Already configured ✅
3. **Same WiFi** - Phone and computer must be on same network
4. **Scan QR code** from the Expo terminal

## 🔑 Important Configuration

### API URL (src/api/index.js)
- Current: `http://192.168.1.4:5000/api`
- Change `192.168.1.4` to your computer's IP if it changes
- Find your IP: `ipconfig` (look for IPv4 Address)

### Required Packages (Already Installed)
- ✅ Expo SDK 54
- ✅ babel-preset-expo
- ✅ promise (for React Native polyfills)

## 🌿 Git Branches

- `main` - Original web app (React + Vite)
- `mobile-app` - React Native version (CURRENT)

To switch back to web version:
```bash
git checkout main
npm install
npm run dev
```

## 🐛 Common Issues & Fixes

### "Something went wrong" error in Expo Go
1. **Clear Metro bundler cache:**
   ```powershell
   npx expo start --clear
   ```

2. **Check both servers are running:**
   ```powershell
   Get-Process node
   ```
   Should see 2 Node processes (backend + Expo)

3. **Verify network connection:**
   - Phone and computer on same WiFi
   - Try accessing `http://192.168.1.4:5000` from phone browser
   - If it doesn't load, IP may have changed

4. **Reload in Expo Go:**
   - Shake phone → Tap "Reload"
   - Or close and re-scan QR code

5. **Check for errors in terminal:**
   - Look at the Expo server terminal for red error messages
   - Check backend terminal for connection issues

### "Cannot find module promise/setimmediate/es6-extensions"
```powershell
npm install promise
```

### "Cannot find module babel-preset-expo"
```powershell
npm install babel-preset-expo
```

### Backend port 5000 already in use
```powershell
Get-Process node | Stop-Process -Force
```

### Wrong Expo SDK version
Already upgraded to SDK 54 - matches your Expo Go app ✅

## 📦 Project Structure

```
Travelog/
├── server/              # Express backend (port 5000)
│   ├── server.js       # Main server file
│   └── config/.env     # Environment variables
├── src/
│   ├── App.jsx         # Navigation container
│   ├── api/index.js    # API client (IMPORTANT: has device IP)
│   └── components/     # React Native components
│       ├── Auth.jsx
│       ├── GroupList.jsx
│       ├── ExpenseTracker.jsx
│       ├── ExpenseForm.jsx
│       ├── BalanceCalculator.jsx
│       └── ProfileSettings.jsx
├── App.js              # Root export
├── index.js            # Entry point with ErrorBoundary
└── app.json            # Expo configuration
```

## ✨ Features Implemented

- ✅ Full React Native conversion
- ✅ Authentication (login/signup)
- ✅ Group management
- ✅ Expense tracking
- ✅ Currency filtering
- ✅ Export to CSV (clipboard)
- ✅ Currency conversion
- ✅ Edit expenses
- ✅ Balance calculations
- ✅ Session-based auth
- ✅ Error boundaries

## 📝 Next Steps (Optional)

1. **Test all features** on your phone
2. **Add app icon** - Currently using default Expo icon
3. **Google OAuth** - Not yet configured for mobile
4. **Build APK/IPA** - For distribution (requires `eas build`)
5. **Consider JWT auth** - Better for mobile than sessions

## 🆘 If You Come Back Later

1. Make sure you're on `mobile-app` branch:
   ```bash
   git branch
   ```

2. Run the startup script:
   ```powershell
   .\START_SERVERS.ps1
   ```

3. Check your computer's IP hasn't changed (update src/api/index.js if needed)

4. Scan QR code with Expo Go (SDK 54)
