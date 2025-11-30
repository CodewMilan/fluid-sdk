# Permit2 EIP-712 Implementation

This document describes the Permit2 EIP-712 signature generation and verification implementation for user wallet transfers.

## Overview

Permit2 is a universal token approval contract that allows users to sign permissions for others to spend their tokens without requiring a separate on-chain approval transaction. This enables gasless approvals and improves user experience.

## Implementation Status

✅ **Completed:**
- Permit2 EIP-712 typed data structure (`src/permit2.ts`)
- Domain separator generation
- Signature generation helper (`generatePermit2Signature`)
- Signature verification (`verifyPermit2Signature`)
- Integration into `verifyUserAuthorization()` function
- Testing helper script (`src/generatePermit2.ts`)

⚠️ **Pending:**
- Transfer execution integration: The SDK's `circleTransfer.initiateTransfer()` does not currently support Permit2 authorization. This requires either:
  1. SDK modifications to support Permit2
  2. Direct contract interaction with Circle CCTP contracts using Permit2
  3. Wrapper contract that handles Permit2 authorization

## Architecture

```
User Wallet Flow with Permit2:
┌──────────────┐
│  User Wallet │
│  0xUser...   │
└──────┬───────┘
       │
       │ 1. Sign Permit2 EIP-712
       │    (Off-chain)
       ▼
┌──────────────────────┐
│  Permit2 Signature   │
│  + Permit Data       │
└──────┬───────────────┘
       │
       │ 2. Verify Signature
       │    (Backend)
       ▼
┌──────────────────────┐
│  Sponsor Wallet      │
│  0xSponsor...        │
└──────┬───────────────┘
       │
       │ 3. Execute Transfer
       │    with Permit2
       │    (Pending: SDK/Contract)
       ▼
┌──────────────────────┐
│  Circle CCTP         │
│  TokenMessenger      │
└──────────────────────┘
```

## Files

### Core Implementation

- **`src/permit2.ts`**: Permit2 EIP-712 signature generation and verification
  - `getPermit2Domain()`: Gets EIP-712 domain separator
  - `getPermit2Types()`: Gets EIP-712 type definitions
  - `generatePermit2Signature()`: Generates Permit2 signature
  - `verifyPermit2Signature()`: Verifies Permit2 signature
  - `createPermit()`: Helper to create permit data structure

### Integration

- **`src/cctpTransfer.ts`**: Updated `verifyUserAuthorization()` to support Permit2
- **`src/generatePermit2.ts`**: Testing helper script to generate signatures

## Usage

### 1. Generate Permit2 Signature (Testing)

For testing purposes, use the helper script:

```bash
npx tsx src/generatePermit2.ts --from 0xYourPrivateKey --amount 5.0
```

This will output:
- The Permit2 signature (hex string)
- Permit data (JSON)
- Example CLI command to use it

### 2. Use Permit2 Signature in Transfer

```bash
npx tsx src/runCctp.ts --amount 5.0 --from 0xUserAddress --sig "0xSignature..."
```

**Note:** Currently, the signature is verified but the transfer execution still needs Permit2 integration (see Pending section above).

### 3. Frontend Integration (Production)

In production, signature generation should be done on the frontend/client side:

```typescript
import { generatePermit2Signature, createPermit } from './permit2';

// User signs the permit
const permit = createPermit(
  userAddress,
  permit2Address,  // Permit2 contract address
  usdcAddress,     // USDC token address
  amountBigInt,    // Amount in smallest units
  nonce,           // Get from Permit2 contract
  deadline         // Expiration timestamp
);

const signature = await userSigner.signTypedData(
  domain,
  types,
  permitValue
);
```

## Permit2 Structure

### EIP-712 Domain

```typescript
{
  name: "Permit2",
  version: "1",
  chainId: 84532,  // Base Sepolia
  verifyingContract: "0x000000000022D473030F116dDEE9F6B43aC78BA3"  // Permit2 address
}
```

### Permit Details

```typescript
{
  details: {
    token: "0x...",      // USDC token address
    amount: "5000000",   // Amount (uint160)
    expiration: "1234567890",  // Expiration (uint48)
    nonce: "0"           // Nonce (uint48)
  },
  spender: "0x...",      // Spender address
  sigDeadline: "1234567890"  // Signature deadline
}
```

## Signature Verification

The `verifyUserAuthorization()` function now:

1. ✅ Checks for "dummy" placeholder (testing)
2. ✅ Validates permit data structure
3. ✅ Verifies owner matches fromAddress
4. ✅ Verifies amount matches transfer amount
5. ✅ Checks deadline hasn't expired
6. ✅ Verifies EIP-712 signature cryptographically

## Important Notes

### Current Limitations

1. **Transfer Execution**: The Wormhole SDK's `circleTransfer.initiateTransfer()` does not currently support Permit2. To complete the flow, you'll need to:
   - Modify the SDK to support Permit2 authorization, OR
   - Call Circle CCTP contracts directly with Permit2 authorization

2. **Nonce Management**: For production, nonces should be fetched from the Permit2 contract, not hardcoded to 0.

3. **Token Approval**: Users must first approve Permit2 contract to spend their USDC:
   ```solidity
   USDC.approve(permit2Address, amount);
   ```

### Security Considerations

- ⚠️ **Deadline Validation**: Signatures are checked for expiration
- ⚠️ **Signature Verification**: Full EIP-712 cryptographic verification
- ⚠️ **Amount Matching**: Transfer amount must match permit amount
- ⚠️ **Owner Verification**: Signature must be from the token owner

## Next Steps

To complete the Permit2 integration:

1. **SDK Integration**: Modify Wormhole SDK or create wrapper to support Permit2 in transfer execution
2. **Contract Interaction**: Implement direct contract calls to Circle CCTP with Permit2 authorization
3. **Nonce Fetching**: Add nonce retrieval from Permit2 contract
4. **Frontend Integration**: Create frontend components for signature generation

## Testing

### Test with Placeholder

```bash
# Use dummy signature (no real verification)
npx tsx src/runCctp.ts --amount 1.0 --from 0xUserAddress --sig dummy
```

### Test with Real Signature

```bash
# 1. Generate signature
npx tsx src/generatePermit2.ts --from 0xUserPrivateKey --amount 5.0

# 2. Use generated signature
npx tsx src/runCctp.ts --amount 5.0 --from 0xUserAddress --sig "0xGeneratedSignature..."
```

## References

- [Permit2 Integration Guide](https://blog.uniswap.org/permit2-integration-guide)
- [EIP-712 Standard](https://eips.ethereum.org/EIPS/eip-712)
- [Permit2 Contract](https://github.com/Uniswap/permit2)

