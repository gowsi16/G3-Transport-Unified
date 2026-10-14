Write-Host "================================================================" -ForegroundColor Green
Write-Host "       G3 TRANSPORT UNIFIED APPLICATION - SINGLE LOCALHOST      " -ForegroundColor Green
Write-Host "================================================================" -ForegroundColor Green
Write-Host ""
Write-Host "  Single Localhost Entry Point: http://localhost:3000" -ForegroundColor Cyan
Write-Host "  - Public Landing: G3 Booking Site"
Write-Host "  - Secure Portal:  G3 Transport Admin"
Write-Host ""
Write-Host "Starting unified application..." -ForegroundColor Yellow

node scripts/run-dev.js
