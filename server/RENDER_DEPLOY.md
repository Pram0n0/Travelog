# Render Backend Deployment

This backend is configured for deployment on Render.

## Environment Variables Required

Set these in Render Dashboard:

```
MONGODB_URI=your_mongodb_connection_string
SESSION_SECRET=your_session_secret_key
CLIENT_URL=https://your-vercel-app.vercel.app
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret
NODE_ENV=production
```

## Build Settings

- **Build Command**: `npm install`
- **Start Command**: `node server.js`
- **Root Directory**: `server`
