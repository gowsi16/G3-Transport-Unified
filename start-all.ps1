Write-Host "================================================================" -ForegroundColor Green
Write-Host "       G3 TRANSPORT UNIFIED APPLICATION - SINGLE LOCALHOST        " -ForegroundColor Green
Write-Host "================================================================" -ForegroundColor Green
Write-Host ""
Write-Host "  • Single Localhost Entry Point: http://localhost:3000" -ForegroundColor Green
Write-Host "  • Public Landing: G3 Booking Site" -ForegroundColor Yellow
Write-Host "  • Secure Portal:  G3 Transport Admin" -ForegroundColor Cyan
Write-Host ""
Write-Host "Starting all services and opening http://localhost:3000 as default..." -ForegroundColor White

node start-unified.js
