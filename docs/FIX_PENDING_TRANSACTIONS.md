# Fix: "replacement fee too low" Error

## What This Error Means

The error **"replacement fee too low"** (or **"replacement transaction underpriced"**) occurs when:
1. There's a pending transaction in the mempool with a higher gas price
2. The SDK tries to send a new transaction with the same nonce but lower gas price
3. The network rejects it because you can't replace a transaction with a lower fee

## What I Fixed

I've updated `src/cctpTransfer.ts` to:
1. **Check for pending transactions** before sending
2. **Wait automatically** for pending transactions to clear (up to 3 minutes)
3. **Show clear error messages** if transactions don't clear

## What To Do If You Still See This Error

### Option 1: Wait for Pending Transactions (Automatic)
The code now automatically waits up to 3 minutes for pending transactions to clear. Just wait and let it run.

### Option 2: Check Base Sepolia Explorer
1. Go to: https://sepolia.basescan.org/
2. Search for your wallet address: `0x1aB36Be80FC1f2e75F183F346947C0894622459a`
3. Check for any pending transactions
4. Wait for them to confirm before retrying

### Option 3: Wait ~15 Minutes
Pending transactions usually expire from the mempool after 15-30 minutes if they don't confirm. Wait and try again.

### Option 4: Cancel Stuck Transactions
If you have MetaMask or another wallet:
1. Go to your wallet
2. Find pending transactions
3. Cancel or speed them up (increase gas price)
4. Then retry the transfer

## Check Current Nonce Status

You can check if there are pending transactions:

```powershell
cd "c:\Users\MY PC\Documents\github\cctp"
node -e "const { ethers } = require('ethers'); require('dotenv').config(); const provider = new ethers.JsonRpcProvider(process.env.BASE_RPC_URL || 'https://sepolia.base.org'); const address = '0x1aB36Be80FC1f2e75F183F346947C0894622459a'; provider.getTransactionCount(address, 'pending').then(n => console.log('Pending nonce:', n)).then(() => provider.getTransactionCount(address, 'latest')).then(n => console.log('Latest confirmed nonce:', n));"
```

If `pending nonce > latest confirmed nonce`, you have pending transactions.

## The Fix Is Already Applied

The code will now:
- ✅ Detect pending transactions automatically
- ✅ Wait for them to clear (up to 3 minutes)
- ✅ Show helpful error messages if they don't clear

Just run your transfer command again - it should handle pending transactions automatically now.

