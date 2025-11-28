# Travelog Deployment Guide

## Quick Deploy: Frontend (Vercel) + Backend (Render)

### Prerequisites
- ✅ Code pushed to GitHub
- ✅ MongoDB Atlas account (free tier)
- ✅ Google OAuth credentials configured

---

## Part 1: Deploy Backend to Render

### 1. Sign Up & Connect GitHub
1. Go to **[render.com](https://render.com)** and sign up
2. Click **"New +"** → **"Web Service"**
3. Connect your GitHub account
4. Select repository: **Travelog**

### 2. Configure Service
```
Name: travelog-backend
Root Directory: server
Environment: Node
Region: Oregon (US West) - or closest to you
Branch: main
Build Command: npm install
Start Command: node server.js
```

### 3. Select Free Plan
- Click **"Free"** ($0/month)
- ⚠️ Note: Free tier spins down after 15 min of inactivity (takes 30s to wake up)

### 4. Add Environment Variables
Click **"Advanced"** → **"Add Environment Variable"**

Add these (get values from your local `server/config/.env` file):

```bash
MONGODB_URI=your_mongodb_atlas_connection_string

SESSION_SECRET=generate_random_string_for_production

GOOGLE_CLIENT_ID=your_google_oauth_client_id

GOOGLE_CLIENT_SECRET=your_google_oauth_client_secret

NODE_ENV=production

CLIENT_URL=https://YOUR-APP-NAME.vercel.app
```

💡 **Tip**: Copy actual values from your local `.env` file, don't use placeholders!

⚠️ **Important**: You'll update `CLIENT_URL` after deploying frontend

### 5. Deploy!
- Click **"Create Web Service"**
- Wait 2-3 minutes for deployment
- Copy your backend URL: `https://travelog-backend-xxxx.onrender.com`

---

## Part 2: Deploy Frontend to Vercel

### 1. Sign Up & Import Project
1. Go to **[vercel.com](https://vercel.com)** and sign up with GitHub
2. Click **"Add New..."** → **"Project"**
3. Select repository: **Travelog**

### 2. Configure Build Settings
Vercel auto-detects Vite settings:
```
Framework Preset: Vite
Build Command: npm run build
Output Directory: dist
Install Command: npm install
Root Directory: ./
```

### 3. Add Environment Variable
Click **"Environment Variables"**

Add one variable:
```
Name: VITE_API_URL
Value: https://travelog-backend-xxxx.onrender.com/api
```

Replace `xxxx` with your Render backend URL!

### 4. Deploy!
- Click **"Deploy"**
- Wait 1-2 minutes
- Copy your frontend URL: `https://travelog-xxxx.vercel.app`

---

## Part 3: Update Backend with Frontend URL

### 1. Update Render Environment Variables
1. Go back to Render dashboard
2. Open your **travelog-backend** service
3. Click **"Environment"** tab
4. Edit `CLIENT_URL` variable:
   ```
   CLIENT_URL=https://travelog-xxxx.vercel.app
   ```
   (Use your actual Vercel URL)
5. Click **"Save Changes"**
6. Service will auto-redeploy (30 seconds)

### 2. Update Google OAuth Redirect URIs
1. Go to **[Google Cloud Console](https://console.cloud.google.com/)**
2. Navigate to **APIs & Services** → **Credentials**
3. Click your OAuth 2.0 Client ID
4. Add to **Authorized redirect URIs**:
   ```
   https://travelog-backend-xxxx.onrender.com/api/auth/google/callback
   ```
5. Click **"Save"**

---

## Part 4: Test Your Deployed App! 🎉

1. Open your Vercel URL: `https://travelog-xxxx.vercel.app`
2. Try logging in
3. Create a group, add expenses
4. Test all features

### Common Issues

**"Failed to fetch" or CORS errors:**
- Check `CLIENT_URL` in Render matches your Vercel URL exactly
- Make sure it includes `https://` and NO trailing slash

**Google OAuth not working:**
- Verify redirect URI in Google Console matches Render URL exactly
- Check `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET` in Render

**Backend sleeping (15-30s delay on first load):**
- Normal on free tier
- Backend wakes up automatically
- Consider upgrading to paid tier ($7/month) for always-on

**Environment variables not working:**
- Make sure all variables are set in Render AND Vercel
- Check for typos (especially URLs)
- Redeploy if you change variables

---

## Your Deployed URLs

After deployment, save these:

- **Frontend**: https://YOUR-APP.vercel.app
- **Backend**: https://YOUR-BACKEND.onrender.com
- **MongoDB**: Already hosted on Atlas ✅

---

## Auto-Deployment

Both platforms have auto-deploy enabled:
- Push to GitHub → Vercel automatically rebuilds frontend
- Push to GitHub → Render automatically rebuilds backend

Just `git push` and your live site updates! 🚀

---

## Cost

- **Vercel**: FREE (unlimited projects)
- **Render**: FREE (with sleep on inactivity)
- **MongoDB Atlas**: FREE (512MB)

**Total**: $0/month 🎉

Want always-on backend? Upgrade Render to $7/month.

---

## Next Steps

1. Custom domain (optional): Add in Vercel settings
2. SSL certificates: Automatic on both platforms ✅
3. Analytics: Enable in Vercel dashboard
4. Monitoring: Check logs in Render dashboard

Enjoy your deployed app! 🎊
