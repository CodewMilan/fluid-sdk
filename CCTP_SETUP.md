# CCTP Transfer Setup Guide

This project has been migrated to use Circle CCTP (Cross-Chain Transfer Protocol) via Wormhole SDK, which is the method used by Portal Bridge and is the only method that works for Base Sepolia → Aptos transfers.

## ✅ What Changed

### Files Removed
- ❌ `src/wormholeBase.ts` - Old TokenBridge implementation
- ❌ `src/wormholeVaa.ts` - Old VAA fetching logic
- ❌ `src/aptosIntegration.ts` - Old Aptos integration
- ❌ `src/transferWormholeOnly.ts` - Old transfer orchestrator

### Files Added
- ✅ `src/cctpTransfer.ts` - New CCTP transfer implementation
- ✅ `src/runCctp.ts` - New CLI runner for CCTP transfers
- ✅ `src/config.ts` - Updated (simplified for CCTP)

### Files Updated
- ✅ `src/config.ts` - Removed TokenBridge-specific config, kept CCTP essentials
- ✅ `src/helper.ts` - Already compatible (no changes needed)

## 📋 MANUAL STEPS REQUIRED

### 1. Environment Variables

Update your `.env` or `.env.local` file with the following **required** variables:

```env
# Base Sepolia Testnet
BASE_RPC_URL=https://sepolia.base.org
BASE_SPONSOR_PRIVATE_KEY=0x...your_private_key_here...

# Aptos Testnet
APTOS_RPC_URL=https://fullnode.testnet.aptoslabs.com/v1
APTOS_SPONSOR_PRIVATE_KEY=ed25519-priv-0x...your_private_key_here...

# Network Type
NETWORK_TYPE=Testnet
```

### 2. Optional CCTP Contract Addresses

The SDK provides default CCTP contract addresses, but you can override them if needed:

```env
# Optional - only if you need to override SDK defaults
BASE_USDC_ADDRESS=0x...
BASE_TOKEN_MESSENGER_ADDRESS=0x...
BASE_MESSAGE_TRANSMITTER_ADDRESS=0x...
```

**Note:** For testnet, the SDK automatically uses the correct CCTP contract addresses, so these are usually not needed.

### 3. Wallet Requirements

#### Base Sepolia Wallet:
- **ETH** for gas fees (for initiating the transfer)
- **USDC** testnet tokens to transfer

Get testnet tokens:
- ETH: https://www.coinbase.com/faucets/base-ethereum-sepolia-faucet
- USDC: Bridge from Circle's testnet or obtain from testnet faucets

#### Aptos Wallet:
- **APT** for gas fees (for completing the transfer)

### 4. Run a Transfer

```bash
# Transfer 1.0 USDC to sponsor wallet (default recipient)
npx tsx src/runCctp.ts --amount 1.0

# Transfer 0.5 USDC to a specific Aptos address
npx tsx src/runCctp.ts --amount 0.5 --to 0xc3e2a21da9f68dcd3ad8668c8fb72ede9f46fea67652fbffa9db8f8af0c612cf
```

## 🔑 Key Differences from TokenBridge

1. **No VAA Required**: CCTP uses Circle attestations, not Wormhole VAAs
2. **Automatic Attestation**: Circle's attestation service automatically signs the message
3. **Faster**: Typically completes in 1-3 minutes (vs 1-2 minutes for VAA)
4. **Works for Base Sepolia → Aptos**: This is the only method that works for this route

## 📊 Transfer Flow

1. **Initiate Transfer** on Base Sepolia
   - Approves and transfers USDC to Circle CCTP contracts
   - Returns transaction hash

2. **Wait for Attestation** (1-3 minutes)
   - Circle's attestation service signs the message
   - The SDK polls Circle's API for the attestation

3. **Complete Transfer** on Aptos
   - Submits the attestation to Aptos CCTP contracts
   - USDC is minted/released on Aptos
   - Returns transaction hash

## 🐛 Troubleshooting

### "Missing required environment variable"
- Make sure all required env variables are set in `.env` or `.env.local`

### "Insufficient USDC balance"
- Ensure your Base Sepolia wallet has enough testnet USDC

### "Insufficient ETH/APT for gas"
- Ensure your wallets have enough native tokens for gas fees

### "Attestation not received after X seconds"
- Circle's attestation service may be slow
- Wait a few minutes and check the Base Sepolia transaction
- Try again if it persists

## 📝 Chain IDs Used

- **Base Sepolia**: Chain ID 30 (Wormhole chain ID, same as Base mainnet)
- **Aptos**: Chain ID 22

## 🎯 Next Steps

1. Set up your `.env` file with the required variables
2. Fund your wallets with testnet tokens
3. Run your first transfer: `npx tsx src/runCctp.ts --amount 0.1`
4. Check your Aptos wallet for the received USDC!

