# Travelog - Expense Tracking & Splitting App

A full-stack expense tracking application with Google OAuth authentication, built with React, Node.js, Express, and MongoDB.

## Features

-  **Authentication**: Email/password signup and Google OAuth 2.0
-  **Group Management**: Create groups, invite members with shareable codes
-  **Expense Tracking**: Add, edit, delete expenses with multiple payers
- ? **Smart Splitting**: 5 split types (equally, unequally, percentages, adjustment, shares)
-  **Balance Calculator**: View individual balances and simplified settlement plans
-  **Export**: Download expense history as CSV

## Tech Stack

### Frontend
- React 18.3.1
- Vite 5.4.10
- CSS Modules

### Backend
- Node.js with Express
- Passport.js (Local & Google OAuth strategies)
- MongoDB with Mongoose
- Express Session with MongoDB store

## Prerequisites

- Node.js (v18 or higher)
- MongoDB (local installation or MongoDB Atlas account)
- Google Cloud Console account (for OAuth)

## Installation

### 1. Clone the Repository

```bash
git clone https://github.com/Pram0n0/Travelog.git
cd Travelog
```

### 2. Set Up MongoDB

**Option A: Local MongoDB**
- Install MongoDB Community Edition
- Start MongoDB service: ```mongod```

**Option B: MongoDB Atlas (Cloud)**
- Create free account at https://www.mongodb.com/cloud/atlas
- Create a cluster
- Get your connection string (mongodb+srv://...)

### 3. Configure Google OAuth

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select existing one
3. Enable Google+ API
4. Go to 'Credentials'  'Create Credentials'  'OAuth 2.0 Client ID'
5. Configure OAuth consent screen
6. Add Authorized JavaScript origins:
   - http://localhost:5173 (frontend)
   - http://localhost:5000 (backend)
7. Add Authorized redirect URIs:
   - http://localhost:5000/api/auth/google/callback
8. Copy your Client ID and Client Secret

### 4. Backend Setup

```bash
cd server
npm install
```

Create `.env` file in `server/` directory (see `server/.env.example`)

### 5. Frontend Setup

```bash
npm install
```

The frontend `.env.local` is configured with: `VITE_API_URL=http://localhost:5000/api`

## Running the Application

### Start Backend Server

```bash
cd server
npm run dev
```

### Start Frontend (new terminal)

```bash
npm run dev
```

## Usage

1. **Sign Up/Login**: Create account or use Google Sign-In
2. **Create Group**: Click 'Create Group', enter name, get shareable code
3. **Join Group**: Use 'Join Group' with a friend's code
4. **Add Expenses**: Select payer, split method, assign amounts
5. **View Balances**: See individual balances between members
6. **Settle Up**: Get optimized payment plan with minimum transactions
7. **Export**: Download CSV of all expenses

See complete documentation in server/.env.example for configuration details.
