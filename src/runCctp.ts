/**
 * CLI Runner for CCTP Transfer
 * 
 * Usage:
 *   npx tsx src/runCctp.ts --amount 1.0 --to <aptos-address>
 *   npx tsx src/runCctp.ts --amount 0.5
 */

import { transferUsdcViaCctp } from "./cctpTransfer";

// Parse command line arguments
function parseArgs() {
  const args = process.argv.slice(2);
  let amount: string | undefined;
  let to: string | undefined;

  for (let i = 0; i < args.length; i++) {
    if (args[i] === "--amount" && i + 1 < args.length) {
      amount = args[i + 1];
      i++;
    } else if (args[i] === "--to" && i + 1 < args.length) {
      to = args[i + 1];
      i++;
    } else if (args[i] === "--help" || args[i] === "-h") {
      console.log(`
Usage:
  npx tsx src/runCctp.ts --amount <amount> [--to <aptos-address>]

Arguments:
  --amount <amount>        Amount of USDC to transfer (e.g., "1.0")
  --to <aptos-address>     Optional: Aptos recipient address (hex format)
                          If not provided, uses sponsor wallet address

Examples:
  npx tsx src/runCctp.ts --amount 1.0
  npx tsx src/runCctp.ts --amount 0.5 --to 0xc3e2a21da9f68dcd3ad8668c8fb72ede9f46fea67652fbffa9db8f8af0c612cf
      `);
      process.exit(0);
    }
  }

  return { amount, to };
}

async function main() {
  console.log("🚀 Starting CCTP Transfer (Base Sepolia → Aptos)");
  console.log("────────────────────────────────────────────────────────────");

  const { amount, to } = parseArgs();

  if (!amount) {
    console.error("❌ Error: --amount is required");
    console.log("Usage: npx tsx src/runCctp.ts --amount <amount> [--to <aptos-address>]");
    process.exit(1);
  }

  // Validate amount
  const amountNum = parseFloat(amount);
  if (isNaN(amountNum) || amountNum <= 0) {
    console.error(`❌ Error: Invalid amount "${amount}". Must be a positive number.`);
    process.exit(1);
  }

  // Validate Aptos address format if provided
  if (to) {
    // Aptos addresses are 32 bytes (64 hex chars), with or without 0x prefix
    const cleanAddr = to.startsWith("0x") ? to.slice(2) : to;
    if (!/^[0-9a-fA-F]{64}$/.test(cleanAddr)) {
      console.error(`❌ Error: Invalid Aptos address format "${to}"`);
      console.log("Aptos addresses should be 64 hex characters (32 bytes)");
      process.exit(1);
    }
  }

  console.log(`💰 Amount: ${amount} USDC`);
  if (to) {
    console.log(`📬 Recipient: ${to}`);
  } else {
    console.log(`📬 Recipient: (using sponsor wallet)`);
  }
  console.log("────────────────────────────────────────────────────────────\n");

  // Execute transfer
  const result = await transferUsdcViaCctp({
    amount,
    destAddress: to,
  });

  // Print results
  console.log("\n────────────────────────────────────────────────────────────");
  if (result.success) {
    console.log("✅ Transfer completed successfully!");
    console.log(`\n📋 Transfer Details:`);
    console.log(`   Source TX: ${result.sourceTx}`);
    if (result.attestationId) {
      console.log(`   Attestation ID: ${result.attestationId}`);
    }
    console.log(`   Destination TX: ${result.destinationTx}`);
    console.log(`\n💸 USDC has been delivered to Aptos!`);
  } else {
    console.error(`❌ Transfer failed: ${result.error}`);
    process.exit(1);
  }
}

main().catch((error) => {
  console.error("❌ Fatal error:", error);
  process.exit(1);
});

