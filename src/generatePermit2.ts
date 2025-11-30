/**
 * Permit2 Signature Generation Helper (for testing)
 * 
 * This script generates a Permit2 EIP-712 signature for CCTP transfers.
 * In production, this would be done on the frontend/client side with the user's wallet.
 * 
 * Usage:
 *   npx tsx src/generatePermit2.ts --from <user_private_key> --amount <amount> --token <token_address> --spender <spender_address>
 */

import { ethers } from "ethers";
import { generatePermit2Signature, createPermit, getPermit2Address } from "./permit2";
import { getEvmSigner } from "./helper";
import { config } from "./config";
import dotenv from "dotenv";

dotenv.config({ path: ".env.local" });
dotenv.config();

interface Permit2GenerationArgs {
  fromPrivateKey: string;
  amount: string;
  tokenAddress?: string;
  spenderAddress?: string;
  nonce?: string;
  deadlineHours?: number;
}

async function generateSignature(args: Permit2GenerationArgs) {
  try {
    // Get chain ID
    const provider = new ethers.JsonRpcProvider(config.baseRpcUrl);
    const network = await provider.getNetwork();
    const chainId = Number(network.chainId);
    
    console.log(`\n🔐 Generating Permit2 Signature`);
    console.log(`═══════════════════════════════════════════════\n`);
    console.log(`Chain ID: ${chainId}`);
    
    // Create signer from private key
    const formattedKey = args.fromPrivateKey.startsWith("0x") 
      ? args.fromPrivateKey 
      : `0x${args.fromPrivateKey}`;
    const signer = new ethers.Wallet(formattedKey, provider);
    const userAddress = signer.address;
    
    console.log(`User Address: ${userAddress}`);
    
    // Get token address (default to USDC if not provided)
    // Note: You may need to update this with the actual USDC address on Base Sepolia
    const tokenAddress = args.tokenAddress || "0x036CbD53842c5426634e7929541eC2318f3dCF7e"; // Base Sepolia USDC (verify this)
    
    // Get spender address (Circle TokenMessenger or Permit2 contract)
    // For Permit2, we authorize Permit2 contract, which then authorizes the TokenMessenger
    const spenderAddress = args.spenderAddress || getPermit2Address();
    
    // Parse amount
    const amountBigInt = BigInt(Math.floor(parseFloat(args.amount) * 1_000_000)); // USDC has 6 decimals
    
    // Get nonce (0 for testing, or fetch from Permit2 contract in production)
    const nonce = args.nonce ? BigInt(args.nonce) : 0n;
    
    // Set deadline (default 1 hour from now)
    const deadlineHours = args.deadlineHours || 1;
    
    console.log(`Token Address: ${tokenAddress}`);
    console.log(`Spender Address: ${spenderAddress}`);
    console.log(`Amount: ${args.amount} USDC (${amountBigInt.toString()} smallest units)`);
    console.log(`Nonce: ${nonce.toString()}`);
    console.log(`Deadline: ${deadlineHours} hour(s) from now\n`);
    
    // Create permit
    const permit = createPermit(
      userAddress,
      spenderAddress,
      tokenAddress,
      amountBigInt,
      nonce,
      deadlineHours * 3600
    );
    
    console.log(`Permit Details:`);
    console.log(`  Owner: ${permit.owner}`);
    console.log(`  Spender: ${permit.spender}`);
    console.log(`  Token: ${permit.token}`);
    console.log(`  Value: ${permit.value.toString()}`);
    console.log(`  Nonce: ${permit.nonce.toString()}`);
    console.log(`  Deadline: ${new Date(Number(permit.deadline) * 1000).toISOString()}\n`);
    
    // Generate signature
    console.log(`Signing Permit2 authorization...`);
    const signature = await generatePermit2Signature(signer, permit, chainId);
    
    console.log(`\n✅ Signature Generated Successfully!\n`);
    console.log(`═══════════════════════════════════════════════`);
    console.log(`\n📋 Use this signature in your transfer command:\n`);
    console.log(`Signature: ${signature}\n`);
    console.log(`Permit Data (JSON):`);
    console.log(JSON.stringify({
      owner: permit.owner,
      spender: permit.spender,
      token: permit.token,
      value: permit.value.toString(),
      nonce: permit.nonce.toString(),
      deadline: permit.deadline.toString(),
    }, null, 2));
    console.log(`\n📝 Example CLI command:`);
    console.log(`npx tsx src/runCctp.ts --amount ${args.amount} --from ${userAddress} --sig "${signature}"`);
    console.log(`\nNote: In production, you'll need to pass the permit data separately or encode it.`);
    console.log(`═══════════════════════════════════════════════\n`);
    
  } catch (error: any) {
    console.error(`❌ Error generating Permit2 signature:`, error.message);
    process.exit(1);
  }
}

// Parse command line arguments
function parseArgs(): Permit2GenerationArgs | null {
  const args = process.argv.slice(2);
  let fromPrivateKey: string | undefined;
  let amount: string | undefined;
  let tokenAddress: string | undefined;
  let spenderAddress: string | undefined;
  let nonce: string | undefined;
  let deadlineHours: number | undefined;

  for (let i = 0; i < args.length; i++) {
    if (args[i] === "--from" && i + 1 < args.length) {
      fromPrivateKey = args[i + 1];
      i++;
    } else if (args[i] === "--amount" && i + 1 < args.length) {
      amount = args[i + 1];
      i++;
    } else if (args[i] === "--token" && i + 1 < args.length) {
      tokenAddress = args[i + 1];
      i++;
    } else if (args[i] === "--spender" && i + 1 < args.length) {
      spenderAddress = args[i + 1];
      i++;
    } else if (args[i] === "--nonce" && i + 1 < args.length) {
      nonce = args[i + 1];
      i++;
    } else if (args[i] === "--deadline-hours" && i + 1 < args.length) {
      deadlineHours = parseInt(args[i + 1], 10);
      i++;
    } else if (args[i] === "--help" || args[i] === "-h") {
      console.log(`
Permit2 Signature Generation Helper

Usage:
  npx tsx src/generatePermit2.ts --from <private_key> --amount <amount> [options]

Required:
  --from <private_key>      User's wallet private key (hex format, with or without 0x)
  --amount <amount>         Amount of USDC to authorize (e.g., "1.0")

Optional:
  --token <address>         Token contract address (default: Base Sepolia USDC)
  --spender <address>       Spender contract address (default: Permit2 contract)
  --nonce <number>          Nonce for the permit (default: 0)
  --deadline-hours <hours>  Hours until signature expires (default: 1)

Examples:
  npx tsx src/generatePermit2.ts --from 0x... --amount 5.0
  npx tsx src/generatePermit2.ts --from 0x... --amount 1.0 --deadline-hours 24
      `);
      process.exit(0);
    }
  }

  if (!fromPrivateKey || !amount) {
    console.error("❌ Error: --from and --amount are required");
    console.log("Use --help for usage information");
    return null;
  }

  return {
    fromPrivateKey,
    amount,
    tokenAddress,
    spenderAddress,
    nonce,
    deadlineHours,
  };
}

// Main
async function main() {
  const args = parseArgs();
  if (!args) {
    process.exit(1);
  }

  await generateSignature(args);
}

main().catch(console.error);

