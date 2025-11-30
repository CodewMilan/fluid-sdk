# How to Run CCTP Transfer

## Quick Command (PowerShell)

```powershell
cd "c:\Users\MY PC\Documents\github\cctp"
$permitData = '{\"owner\":\"0x1aB36Be80FC1f2e75F183F346947C0894622459a\",\"spender\":\"0x000000000022D473030F116dDEE9F6B43aC78BA3\",\"token\":\"0x036CbD53842c5426634e7929541eC2318f3dCF7e\",\"value\":\"200000\",\"nonce\":\"0\",\"deadline\":\"1764470597\"}'
npx tsx src/runCctp.ts --amount 0.2 --from 0x1aB36Be80FC1f2e75F183F346947C0894622459a --sig "0x309f146f846a4db3e131cbf485ebc274cc7acd213f982826784b7bd7eea6f8b94a93336ca4d4b37ebce52137b8bdbe89c87526f57d3fe27a4e0ecae567c8b90c1b" --permit-data $permitData
```

## Step-by-Step Breakdown

### Step 1: Navigate to Project Directory
```powershell
cd "c:\Users\MY PC\Documents\github\cctp"
```
**Where to put:** Your project root directory path

### Step 2: Set Permit Data Variable
```powershell
$permitData = '{\"owner\":\"...\",\"spender\":\"...\",\"token\":\"...\",\"value\":\"...\",\"nonce\":\"...\",\"deadline\":\"...\"}'
```

**Where to get each value:**

1. **owner** → Your user wallet address (Base Sepolia)
   - Example: `0x1aB36Be80FC1f2e75F183F346947C0894622459a`

2. **spender** → Permit2 contract address (same for all chains)
   - Value: `0x000000000022D473030F116dDEE9F6B43aC78BA3`

3. **token** → USDC contract address on Base Sepolia
   - Value: `0x036CbD53842c5426634e7929541eC2318f3dCF7e`

4. **value** → Amount in smallest units (USDC has 6 decimals)
   - For 0.2 USDC: `200000` (0.2 × 1,000,000)
   - For 1.0 USDC: `1000000`
   - For 5.0 USDC: `5000000`

5. **nonce** → Permit2 nonce (usually `0` for first permit)
   - Value: `0` (or fetch from Permit2 contract)

6. **deadline** → Unix timestamp (seconds) when permit expires
   - Current: `1764470597`
   - To generate new: `Math.floor(Date.now() / 1000) + 3600` (1 hour from now)

### Step 3: Run Transfer Command
```powershell
npx tsx src/runCctp.ts --amount 0.2 --from 0x1aB36Be80FC1f2e75F183F346947C0894622459a --sig "0x309f..." --permit-data $permitData
```

**Parameters:**

- `--amount 0.2` → Amount in USDC (can be any number like 1.0, 5.0, etc.)
- `--from 0x1aB36Be80FC1f2e75F183F346947C0894622459a` → Your user wallet address (same as permit owner)
- `--sig "0x309f..."` → Permit2 signature (generated from signing the permit)
- `--permit-data $permitData` → The permit data variable from Step 2

**Optional parameters:**

- `--to <aptos-address>` → Aptos recipient address (if not provided, uses sponsor wallet)

## Generating New Permit Data and Signature

If you need to generate a NEW permit and signature:

### 1. Generate Permit2 Signature
```powershell
cd "c:\Users\MY PC\Documents\github\cctp"
npx tsx src/generatePermit2.ts --from 4ae0b3e913054b1431eb8d50188a6974649f20ba218c02cc5b705f2d7d398cc8 --amount 0.2
```

**Where to get values:**
- `--from` → Your private key (the one that corresponds to your wallet address)
- `--amount` → Amount of USDC to authorize

**Output:** The script will print:
- Signature (use for `--sig`)
- Permit Data JSON (use for `--permit-data`)

### 2. Copy the Output

From the `generatePermit2.ts` output, copy:
- **Signature:** The long hex string starting with `0x...`
- **Permit Data:** The JSON object with all permit fields

## Complete Example: New Transfer

```powershell
# Step 1: Generate permit and signature
npx tsx src/generatePermit2.ts --from YOUR_PRIVATE_KEY --amount 0.5

# Step 2: Copy the permit data from output
$permitData = '{"owner":"0x...","spender":"0x000000000022D473030F116dDEE9F6B43aC78BA3","token":"0x036CbD53842c5426634e7929541eC2318f3dCF7e","value":"500000","nonce":"0","deadline":"1764470597"}'

# Step 3: Run transfer with new permit data and signature
npx tsx src/runCctp.ts --amount 0.5 --from 0xYOUR_WALLET_ADDRESS --sig "0xNEW_SIGNATURE" --permit-data $permitData
```

## Alternative: Single Line Command

If you prefer a single line (without PowerShell variable):

```powershell
cd "c:\Users\MY PC\Documents\github\cctp"; npx tsx src/runCctp.ts --amount 0.2 --from 0x1aB36Be80FC1f2e75F183F346947C0894622459a --sig "0x309f146f846a4db3e131cbf485ebc274cc7acd213f982826784b7bd7eea6f8b94a93336ca4d4b37ebce52137b8bdbe89c87526f57d3fe27a4e0ecae567c8b90c1b" --permit-data "{\"owner\":\"0x1aB36Be80FC1f2e75F183F346947C0894622459a\",\"spender\":\"0x000000000022D473030F116dDEE9F6B43aC78BA3\",\"token\":\"0x036CbD53842c5426634e7929541eC2318f3dCF7e\",\"value\":\"200000\",\"nonce\":\"0\",\"deadline\":\"1764470597\"}"
```

**Note:** Replace the permit data with a fresh one if the deadline has expired!

## Important Notes

1. **Deadline Expiry:** Permit2 permits expire. If your deadline has passed, generate a new permit.

2. **Nonce:** If you've used a permit, the nonce increments. Fetch the current nonce from the Permit2 contract if needed.

3. **Amount Matching:** The `--amount` must match the permit's `value` (in USDC, not smallest units).

4. **Wallet Address:** `--from` address must match the permit's `owner` address.

5. **USDC Balance:** Ensure your wallet has enough USDC on Base Sepolia.

## Troubleshooting

- **"Permit deadline has expired"** → Generate a new permit with a fresh deadline
- **"Signature verification failed"** → Make sure permit data matches the signature
- **"Insufficient USDC balance"** → Fund your wallet with testnet USDC
- **"Network error"** → Check your RPC URLs in `.env` file

