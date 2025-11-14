# Deploy to Sepolia Testnet

This guide explains how to deploy the ScoreNFT contract to Sepolia testnet using custom RPC URL and mnemonic phrase.

## Prerequisites

1. Node.js >= 20
2. A Sepolia RPC URL (custom or Infura/Alchemy)
3. A wallet mnemonic phrase with Sepolia ETH for gas fees

## Quick Start

### Method 1: Using PowerShell Script (Recommended)

1. Set environment variables in PowerShell:

```powershell
# Set your custom Sepolia RPC URL
$env:SEPOLIA_RPC_URL = "https://your-custom-rpc-url.com"

# Set your mnemonic phrase
$env:MNEMONIC = "your twelve word mnemonic phrase here"

# Optional: Set Etherscan API key for contract verification
$env:ETHERSCAN_API_KEY = "your-etherscan-api-key"
```

2. Run the deployment script:

```powershell
cd backend
.\scripts\deploy-sepolia.ps1
```

### Method 2: Manual Deployment

1. Set environment variables:

```powershell
$env:SEPOLIA_RPC_URL = "https://your-custom-rpc-url.com"
$env:MNEMONIC = "your twelve word mnemonic phrase here"
```

2. Compile contracts:

```powershell
npm run compile
```

3. Deploy to Sepolia:

```powershell
npm run deploy:sepolia
```

## Generate Frontend ABI

After deployment, generate the frontend ABI files:

```powershell
cd ../frontend
npm run genabi
```

The script will automatically:
- Detect all available deployments (localhost, sepolia, etc.)
- Skip networks without deployments
- Generate ABI file with contract interface
- Generate addresses file with chainId 11155111 (Sepolia) mapping

## Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `SEPOLIA_RPC_URL` | No | Custom Sepolia RPC URL. If not set, uses Infura URL (requires INFURA_API_KEY) |
| `MNEMONIC` | Yes | Wallet mnemonic phrase for deployment |
| `ETHERSCAN_API_KEY` | No | Etherscan API key for contract verification |

## Notes

- Make sure your wallet has enough Sepolia ETH for gas fees
- The deployment script will automatically use the environment variables set in your PowerShell session
- The frontend ABI generation script will automatically include Sepolia deployment (chainId: 11155111) if it exists
- If a deployment doesn't exist for a network, it will be skipped automatically

