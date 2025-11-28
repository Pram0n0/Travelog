# Travelog Mobile App - Server Startup Script
# Run this script to start both backend and Expo servers

Write-Host "`n========================================" -ForegroundColor Cyan
Write-Host "🚀 Travelog Mobile App - Startup Script" -ForegroundColor Cyan
Write-Host "========================================`n" -ForegroundColor Cyan

# Kill any existing node processes
Write-Host "🔄 Stopping existing Node processes..." -ForegroundColor Yellow
$nodeProcesses = Get-Process node -ErrorAction SilentlyContinue
if ($nodeProcesses) {
    $nodeProcesses | Stop-Process -Force
    Write-Host "✅ Stopped $($nodeProcesses.Count) Node process(es)" -ForegroundColor Green
} else {
    Write-Host "✅ No existing Node processes found" -ForegroundColor Green
}
Start-Sleep -Seconds 2

# Check if MongoDB is accessible
Write-Host "`n📊 Checking MongoDB connection..." -ForegroundColor Yellow

# Start backend server in new window
Write-Host "`n🖥️  Starting backend server on port 5000..." -ForegroundColor Green
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd 'C:\Users\g0tr3.DESKTOP-N2RKJU5\OneDrive\Desktop\Travelog\Travelog\server'; node server.js"

Start-Sleep -Seconds 4

# Check if backend started successfully
Write-Host "⏳ Waiting for backend to initialize..." -ForegroundColor Yellow

# Start Expo server in current window
Write-Host "`n📱 Starting Expo development server..." -ForegroundColor Green
Write-Host "`n========================================" -ForegroundColor Cyan
Write-Host "📲 IMPORTANT INSTRUCTIONS:" -ForegroundColor Yellow
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "1. Make sure Expo Go app (SDK 54) is installed on your phone" -ForegroundColor White
Write-Host "2. Connect your phone to the SAME WiFi network as this computer" -ForegroundColor White
Write-Host "3. Scan the QR code below with Expo Go (Android) or Camera (iOS)" -ForegroundColor White
Write-Host "4. Your phone must be able to reach IP: 192.168.1.4" -ForegroundColor White
Write-Host "========================================`n" -ForegroundColor Cyan

cd "C:\Users\g0tr3.DESKTOP-N2RKJU5\OneDrive\Desktop\Travelog\Travelog"
npm start
