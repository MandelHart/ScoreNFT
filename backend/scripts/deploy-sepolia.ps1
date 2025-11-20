# PowerShell script for deploying to Sepolia testnet
# This script demonstrates how to set environment variables and deploy

# Set your Sepolia RPC URL
# Example: $env:SEPOLIA_RPC_URL = "https://sepolia.infura.io/v3/YOUR_API_KEY"
# Or use your custom RPC: $env:SEPOLIA_RPC_URL = "https://your-custom-rpc-url.com"

# Set your mnemonic phrase
# Example: $env:MNEMONIC = "your twelve word mnemonic phrase here goes in this string"

# Optional: Set Etherscan API key for contract verification
# $env:ETHERSCAN_API_KEY = "your-etherscan-api-key"

Write-Host "=========================================" -ForegroundColor Cyan
Write-Host "Deploying ScoreNFT to Sepolia Testnet" -ForegroundColor Cyan
Write-Host "=========================================" -ForegroundColor Cyan

# Check if required environment variables are set
if (-not $env:SEPOLIA_RPC_URL) {
    Write-Host "Warning: SEPOLIA_RPC_URL not set. Using default Infura URL." -ForegroundColor Yellow
    Write-Host "Set it with: `$env:SEPOLIA_RPC_URL = 'your-rpc-url'" -ForegroundColor Yellow
}

if (-not $env:MNEMONIC) {
    Write-Host "Error: MNEMONIC not set!" -ForegroundColor Red
    Write-Host "Set it with: `$env:MNEMONIC = 'your mnemonic phrase'" -ForegroundColor Red
    exit 1
}

Write-Host ""
Write-Host "Configuration:" -ForegroundColor Green
Write-Host "  RPC URL: $($env:SEPOLIA_RPC_URL ?? 'Using default Infura')" -ForegroundColor Gray
Write-Host "  Mnemonic: $($env:MNEMONIC.Substring(0, [Math]::Min(20, $env:MNEMONIC.Length)))..." -ForegroundColor Gray
Write-Host ""

# Compile contracts first
Write-Host "Compiling contracts..." -ForegroundColor Yellow
npm run compile
if ($LASTEXITCODE -ne 0) {
    Write-Host "Compilation failed!" -ForegroundColor Red
    exit 1
}

# Deploy to Sepolia
Write-Host ""
Write-Host "Deploying to Sepolia testnet..." -ForegroundColor Yellow
npm run deploy:sepolia

if ($LASTEXITCODE -eq 0) {
    Write-Host ""
    Write-Host "=========================================" -ForegroundColor Green
    Write-Host "Deployment successful!" -ForegroundColor Green
    Write-Host "=========================================" -ForegroundColor Green
    Write-Host ""
    Write-Host "Next steps:" -ForegroundColor Cyan
    Write-Host "1. Run 'cd ../frontend && npm run genabi' to generate frontend ABI files" -ForegroundColor Gray
} else {
    Write-Host ""
    Write-Host "=========================================" -ForegroundColor Red
    Write-Host "Deployment failed!" -ForegroundColor Red
    Write-Host "=========================================" -ForegroundColor Red
    exit 1
}

