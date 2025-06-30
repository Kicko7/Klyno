# Klyno Optimized Build Script
# This script runs the build with optimized memory settings

Write-Host "🚀 Starting Klyno optimized build..." -ForegroundColor Green

# Set Node.js memory limit to 8GB
$env:NODE_OPTIONS = "--max-old-space-size=8192"

# Optional: Enable bundle analyzer
if ($args -contains "--analyze") {
    $env:ANALYZE = "true"
    Write-Host "📊 Bundle analyzer enabled" -ForegroundColor Yellow
}

# Run the build
Write-Host "⏳ Building with 8GB memory limit..." -ForegroundColor Cyan
npm run build

# Check if build was successful
if ($LASTEXITCODE -eq 0) {
    Write-Host "✅ Build completed successfully!" -ForegroundColor Green
    Write-Host "📁 Output: .next/" -ForegroundColor Gray
} else {
    Write-Host "❌ Build failed with exit code: $LASTEXITCODE" -ForegroundColor Red
    Write-Host "💡 Try increasing memory limit or check for errors above" -ForegroundColor Yellow
}

# Clean up environment variable
Remove-Item Env:NODE_OPTIONS -ErrorAction SilentlyContinue 