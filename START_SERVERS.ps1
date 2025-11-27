# Travelog Mobile App - Server Startup Script
# Run this script to start both backend and Expo servers

Write-Host "🚀 Starting Travelog Mobile App Servers..." -ForegroundColor Cyan

# Kill any existing node processes
Write-Host "Stopping existing Node processes..." -ForegroundColor Yellow
Get-Process node -ErrorAction SilentlyContinue | Stop-Process -Force
Start-Sleep -Seconds 2

# Start backend server in new window
Write-Host "Starting backend server on port 5000..." -ForegroundColor Green
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd 'C:\Users\g0tr3.DESKTOP-N2RKJU5\OneDrive\Desktop\Travelog\Travelog\server'; node server.js"

Start-Sleep -Seconds 3

# Start Expo server in current window
Write-Host "Starting Expo development server..." -ForegroundColor Green
Write-Host "Scan the QR code with Expo Go app (SDK 54)" -ForegroundColor Cyan
Write-Host ""
cd "C:\Users\g0tr3.DESKTOP-N2RKJU5\OneDrive\Desktop\Travelog\Travelog"
npm start
