# Travelog Setup Guide

## Quick Start

### 1. Install Dependencies

**Backend:**
```bash
cd server
npm install
```

**Frontend:**
```bash
cd ..
npm install
```

### 2. Set Up MongoDB

Choose one option:

**Local MongoDB:**
1. Download: https://www.mongodb.com/try/download/community
2. Install and start MongoDB service
3. Use connection string: `mongodb://localhost:27017/travelog`

**MongoDB Atlas (Cloud - Free):**
1. Sign up: https://www.mongodb.com/cloud/atlas/register
2. Create a free cluster
3. Add your IP to whitelist
4. Create database user
5. Get connection string (replace `<password>`)

### 3. Google OAuth Setup

1. Visit: https://console.cloud.google.com/
2. Create project or select existing
3. APIs & Services → Credentials
4. Create OAuth 2.0 Client ID
5. Add origins:
   - `http://localhost:5173`
   - `http://localhost:5000`
6. Add redirect URI:
   - `http://localhost:5000/api/auth/google/callback`
7. Copy Client ID and Secret

### 4. Configure Environment Variables

**Backend** - Create `server/.env`:
```env
PORT=5000
NODE_ENV=development
MONGODB_URI=your-mongodb-connection-string
SESSION_SECRET=create-a-random-secret-key-here
GOOGLE_CLIENT_ID=your-google-client-id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your-google-client-secret
CLIENT_URL=http://localhost:5173
```

**Frontend** - Already configured in `.env.local`:
```env
VITE_API_URL=http://localhost:5000/api
```

### 5. Run the App

**Terminal 1 - Backend:**
```bash
cd server
npm run dev
```

**Terminal 2 - Frontend:**
```bash
npm run dev
```

Open http://localhost:5173

## Common Issues

### "Cannot connect to MongoDB"
- Local: Ensure MongoDB service is running (`mongod`)
- Atlas: Check IP whitelist and connection string

### "Google OAuth failed"
- Verify Client ID/Secret are correct
- Check redirect URIs match exactly
- Clear cookies and try again

### "CORS error"
- Ensure backend is running on port 5000
- Check `CLIENT_URL` matches frontend URL

## Next Steps

1. Create an account or sign in with Google
2. Create your first group
3. Share the group code with friends
4. Start tracking expenses!

For detailed documentation, see README.md
