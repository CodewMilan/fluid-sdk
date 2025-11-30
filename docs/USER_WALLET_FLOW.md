# User Wallet Payment Flow

This document describes the user wallet payment flow implementation for CCTP transfers.

## Overview

The system now supports two payment modes:

1. **Sponsor Wallet Mode** (default): Sponsor wallet provides USDC and pays gas
2. **User Wallet Mode**: User wallet provides USDC, sponsor wallet pays gas

## Implementation Details

### Current Status

✅ **Implemented:**
- CLI arguments `--from` and `--sig` parsing
- User wallet address validation
- Placeholder signature verification
- Logging for user wallet flow
- Source address selection logic

⚠️ **Limitations (Placeholder Implementation):**
- **Signature validation is a placeholder**: Currently accepts `"dummy"` as a valid signature
- **Real Permit2 integration not yet implemented**: The SDK's `circleTransfer.initiateTransfer()` will use the sponsor signer, which means it will try to transfer sponsor's USDC, not user's USDC
- **For production**: You will need to implement Permit2 EIP-712 signature verification and modify the transfer flow to use Permit2 authorization

### Architecture

```
User Wallet Flow:
┌──────────────┐
│  User Wallet │  (Provides USDC)
│  0xUser...   │
└──────┬───────┘
       │
       │ Authorization Signature
       │ (Permit2 - placeholder)
       ▼
┌──────────────────────┐
│  Sponsor Wallet      │  (Pays gas)
│  0xSponsor...        │
└──────┬───────────────┘
       │
       │ Executes CCTP Transfer
       ▼
┌──────────────────────┐
│  Circle CCTP         │
│  TokenMessenger      │
└──────────────────────┘
```

## Usage

### Sponsor Wallet Mode (Default)

```bash
npx tsx src/runCctp.ts --amount 1.0
```

or

```bash
npx tsx src/runCctp.ts --amount 0.5 --to 0xc3e2a21da9f68dcd3ad8668c8fb72ede9f46fea67652fbffa9db8f8af0c612cf
```

### User Wallet Mode

```bash
npx tsx src/runCctp.ts --amount 5.0 --from 0xUserAddress --sig dummy --to 0xc3e2a21da9f68dcd3ad8668c8fb72ede9f46fea67652fbffa9db8f8af0c612cf
```

**Arguments:**
- `--amount <amount>`: Amount of USDC to transfer (required)
- `--from <address>`: User's Base wallet address (required for user wallet mode)
- `--sig <signature>`: Authorization signature (use `dummy` for testing, required if `--from` is provided)
- `--to <address>`: Aptos recipient address (optional)

## Example Commands

### Test User Wallet Flow

```bash
# Transfer 1.0 USDC from user wallet
npx tsx src/runCctp.ts --amount 1.0 --from 0x1234567890123456789012345678901234567890 --sig dummy

# Transfer 5.0 USDC from user wallet to specific Aptos address
npx tsx src/runCctp.ts --amount 5.0 --from 0x1234567890123456789012345678901234567890 --sig dummy --to 0xc3e2a21da9f68dcd3ad8668c8fb72ede9f46fea67652fbffa9db8f8af0c612cf
```

## Validation

The system validates:
- ✅ Base wallet address format (42 characters: 0x + 40 hex chars)
- ✅ Aptos address format (64 hex characters)
- ✅ Signature presence when `--from` is provided
- ✅ Placeholder signature acceptance (`"dummy"`)

## Logging

When using user wallet mode, you'll see:

```
👤 User Wallet (Source): 0x1234567890123456789012345678901234567890
🧾 Authorization: Placeholder signature accepted
🏦 Sponsor Wallet is paying all gas
```

## Permit2 Implementation Status

✅ **Completed:**
- EIP-712 signature generation (`src/permit2.ts`)
- Signature verification in `verifyUserAuthorization()` 
- Testing helper script (`src/generatePermit2.ts`)

⚠️ **Pending:**
- Transfer execution integration: The SDK's `circleTransfer.initiateTransfer()` needs to support Permit2 authorization. This requires SDK modifications or direct contract calls.

See [PERMIT2_IMPLEMENTATION.md](./PERMIT2_IMPLEMENTATION.md) for full details.

## Files Modified

- `src/cctpTransfer.ts`: Added user wallet support, authorization validation
- `src/runCctp.ts`: Added CLI argument parsing for `--from` and `--sig`
- `src/types.ts`: (No changes needed - types are in cctpTransfer.ts)

## Important Notes

⚠️ **This is a testing/simulation implementation.**
- The placeholder signature (`"dummy"`) is accepted but does not provide real security
- The SDK will still attempt to use sponsor's USDC for transfers
- For production use, you must implement real Permit2 EIP-712 signature verification
- The transfer execution flow may need modification to properly support Permit2 authorization

