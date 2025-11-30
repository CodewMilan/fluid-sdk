# CCTP Wormhole Transfer SDK

A TypeScript SDK for cross-chain USDC transfers from Base to Aptos using Circle CCTP via Wormhole.

## Installation

```bash
npm install @your-org/cctp-wormhole-transfer
```

## Quick Start

### Basic Transfer (Sponsor Wallet)

```typescript
import { transferUsdcViaCctp, createConfig } from '@your-org/cctp-wormhole-transfer';

// Option 1: Use environment variables
const result = await transferUsdcViaCctp({
  amount: "1.0",
  destAddress: "0x...aptos_address...",
});

// Option 2: Provide config programmatically
const result = await transferUsdcViaCctp({
  amount: "1.0",
  destAddress: "0x...aptos_address...",
  config: {
    baseRpcUrl: "https://sepolia.base.org",
    aptosRpcUrl: "https://fullnode.testnet.aptoslabs.com/v1",
    baseSponsorPrivateKey: "0x...",
    aptosSponsorPrivateKey: "0x...",
    networkType: "Testnet",
  },
});

console.log(result);
// {
//   success: true,
//   sourceTx: "0x...",
//   attestationId: "...",
//   destinationTx: "0x...",
// }
```

### User Wallet Transfer with Permit2

```typescript
import {
  transferUsdcViaCctp,
  generatePermit2Signature,
  createPermit,
  BASE_SEPOLIA_USDC,
  PERMIT2_ADDRESS,
  BASE_SEPOLIA_CHAIN_ID,
} from '@your-org/cctp-wormhole-transfer';
import { ethers } from 'ethers';

// 1. User signs Permit2 authorization (frontend/client)
const userWallet = new ethers.Wallet(userPrivateKey, provider);
const amount = BigInt(1_000_000); // 1 USDC (6 decimals)

const permit = createPermit(
  userWallet.address,
  sponsorAddress, // Sponsor wallet address
  BASE_SEPOLIA_USDC,
  amount,
  0n, // nonce
  3600 // deadline: 1 hour from now
);

const signature = await generatePermit2Signature(
  userWallet,
  permit,
  BASE_SEPOLIA_CHAIN_ID
);

// 2. Send to backend/relayer for execution
const result = await transferUsdcViaCctp({
  amount: "1.0",
  fromAddress: userWallet.address,
  signature: signature,
  permitData: permit,
  destAddress: "0x...aptos_address...",
});
```

## API Reference

### `transferUsdcViaCctp(request)`

Executes a cross-chain USDC transfer from Base to Aptos.

**Parameters:**
- `request.amount` (string): Amount in USDC (e.g., "1.0")
- `request.destAddress?` (string): Aptos recipient address (hex format). If not provided, uses sponsor wallet.
- `request.fromAddress?` (string): User's Base wallet address (optional, uses sponsor wallet if not provided)
- `request.signature?` (string): Permit2 authorization signature (required if `fromAddress` is provided)
- `request.permitData?` (Permit2Permit): Permit2 permit data for verification
- `request.config?` (Partial<Config>): Optional configuration override

**Returns:** `Promise<TransferResult>`

```typescript
interface TransferResult {
  success: boolean;
  sourceTx?: string;
  attestationId?: string;
  destinationTx?: string;
  error?: string;
}
```

### `generatePermit2Signature(signer, permit, chainId)`

Generates a Permit2 EIP-712 signature for token authorization.

**Parameters:**
- `signer` (ethers.Signer): User's wallet signer
- `permit` (Permit2Permit): Permit data
- `chainId` (number): Chain ID (e.g., 84532 for Base Sepolia)

**Returns:** `Promise<string>` (hex-encoded signature)

### `verifyPermit2Signature(permit, signature, chainId, expectedOwner)`

Verifies a Permit2 EIP-712 signature.

**Parameters:**
- `permit` (Permit2Permit): Permit data
- `signature` (string): Hex-encoded signature
- `chainId` (number): Chain ID
- `expectedOwner` (string): Expected owner address

**Returns:** `boolean`

### `createPermit(owner, spender, token, value, nonce, deadlineOffsetSeconds)`

Creates a Permit2 permit object with default deadline.

**Parameters:**
- `owner` (string): Token owner address
- `spender` (string): Authorized spender address
- `token` (string): Token contract address
- `value` (bigint): Amount in smallest units
- `nonce` (bigint): Permit nonce
- `deadlineOffsetSeconds` (number): Seconds until expiry (default: 3600)

**Returns:** `Permit2Permit`

### `createConfig(override)`

Creates a configuration object programmatically.

**Parameters:**
- `override` (Partial<Config>): Configuration overrides (falls back to env vars)

**Returns:** `Config`

### Helper Functions

- `getEvmSigner(rpcUrl, privateKey)`: Creates an EVM signer
- `getAptosSigner(rpcUrl, privateKey)`: Creates an Aptos signer
- `toEvmSdkSigner(wallet)`: Wraps ethers.Wallet into SDK signer
- `toAptosSdkSigner(account, client, chainName)`: Wraps Aptos Account into SDK signer

### Constants

- `BASE_SEPOLIA_CHAIN_ID`: Chain ID for Base Sepolia (84532)
- `BASE_SEPOLIA_USDC`: USDC contract address on Base Sepolia
- `PERMIT2_ADDRESS`: Permit2 contract address (same on all EVM chains)

## Configuration

The SDK can be configured in two ways:

### 1. Environment Variables

Set these environment variables (or use `.env` file):

```env
BASE_RPC_URL=https://sepolia.base.org
APTOS_RPC_URL=https://fullnode.testnet.aptoslabs.com/v1
BASE_SPONSOR_PRIVATE_KEY=0x...
APTOS_SPONSOR_PRIVATE_KEY=0x...
NETWORK_TYPE=Testnet
```

### 2. Programmatic Configuration

Pass config directly to `transferUsdcViaCctp`:

```typescript
const result = await transferUsdcViaCctp({
  amount: "1.0",
  config: {
    baseRpcUrl: "...",
    aptosRpcUrl: "...",
    baseSponsorPrivateKey: "...",
    aptosSponsorPrivateKey: "...",
    networkType: "Testnet",
  },
});
```

## Types

```typescript
interface CctpTransferRequest {
  amount: string;
  destAddress?: string;
  fromAddress?: string;
  signature?: string;
  permitData?: Permit2Permit;
  config?: Partial<Config>;
}

interface Permit2Permit {
  owner: string;
  spender: string;
  token: string;
  value: bigint;
  nonce: bigint;
  deadline: bigint;
}

interface Config {
  baseRpcUrl: string;
  aptosRpcUrl: string;
  baseSponsorPrivateKey: string;
  aptosSponsorPrivateKey: string;
  networkType: 'Mainnet' | 'Testnet';
  baseUsdcAddress?: string;
  baseTokenMessengerAddress?: string;
  baseMessageTransmitterAddress?: string;
}
```

## Examples

### Example 1: Simple Transfer

```typescript
import { transferUsdcViaCctp } from '@your-org/cctp-wormhole-transfer';

const result = await transferUsdcViaCctp({
  amount: "5.0",
  destAddress: "0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef",
});

if (result.success) {
  console.log(`Transfer completed!`);
  console.log(`Source TX: ${result.sourceTx}`);
  console.log(`Destination TX: ${result.destinationTx}`);
}
```

### Example 2: User Wallet with Permit2 (Full Flow)

```typescript
import {
  transferUsdcViaCctp,
  generatePermit2Signature,
  createPermit,
  BASE_SEPOLIA_USDC,
  BASE_SEPOLIA_CHAIN_ID,
} from '@your-org/cctp-wormhole-transfer';
import { ethers } from 'ethers';

// Frontend: User signs permit
const provider = new ethers.JsonRpcProvider("https://sepolia.base.org");
const userWallet = new ethers.Wallet(userPrivateKey, provider);
const sponsorAddress = "0x..."; // Your sponsor wallet

const amount = "2.5"; // 2.5 USDC
const amountBigInt = BigInt(Math.floor(parseFloat(amount) * 1_000_000));

const permit = createPermit(
  userWallet.address,
  sponsorAddress,
  BASE_SEPOLIA_USDC,
  amountBigInt,
  0n, // nonce (fetch from Permit2 contract in production)
  7200 // 2 hours deadline
);

const signature = await generatePermit2Signature(
  userWallet,
  permit,
  BASE_SEPOLIA_CHAIN_ID
);

// Backend: Execute transfer
const result = await transferUsdcViaCctp({
  amount: amount,
  fromAddress: userWallet.address,
  signature: signature,
  permitData: permit,
  destAddress: aptosRecipientAddress,
});

console.log(result);
```

### Example 3: Using Custom Configuration

```typescript
import { transferUsdcViaCctp, createConfig } from '@your-org/cctp-wormhole-transfer';

const customConfig = createConfig({
  networkType: "Testnet",
  baseRpcUrl: "https://custom-rpc.base.org",
  // Other config will fall back to env vars
});

const result = await transferUsdcViaCctp({
  amount: "1.0",
  config: customConfig,
});
```

## Error Handling

```typescript
try {
  const result = await transferUsdcViaCctp({
    amount: "1.0",
  });
  
  if (!result.success) {
    console.error(`Transfer failed: ${result.error}`);
  }
} catch (error) {
  console.error(`Fatal error:`, error);
}
```

## CLI Tools

The package includes CLI tools for testing:

```bash
# Generate Permit2 signature
npx generate-permit2 --from <private_key> --amount 1.0

# Run transfer
npx run-cctp --amount 1.0 --to <aptos_address>
```

## License

MIT

