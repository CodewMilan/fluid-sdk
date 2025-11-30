/**
 * CLI Runner for CCTP Transfer
 * 
 * Usage:
 *   npx tsx src/runCctp.ts --amount 1.0 --to <aptos-address>
 *   npx tsx src/runCctp.ts --amount 0.5
 */

import { transferUsdcViaCctp, CctpTransferRequest } from "./cctpTransfer";
import { Permit2Permit } from "./permit2";

// Parse command line arguments
function parseArgs() {
  const args = process.argv.slice(2);
  let amount: string | undefined;
  let to: string | undefined;
  let from: string | undefined;
  let sig: string | undefined;
  let permitDataJson: string | undefined;

  for (let i = 0; i < args.length; i++) {
    if (args[i] === "--amount" && i + 1 < args.length) {
      amount = args[i + 1];
      i++;
    } else if (args[i] === "--to" && i + 1 < args.length) {
      to = args[i + 1];
      i++;
    } else if (args[i] === "--from" && i + 1 < args.length) {
      from = args[i + 1];
      i++;
    } else if (args[i] === "--sig" && i + 1 < args.length) {
      sig = args[i + 1];
      i++;
    } else if (args[i] === "--permit-data" && i + 1 < args.length) {
      permitDataJson = args[i + 1];
      i++;
    } else if (args[i] === "--help" || args[i] === "-h") {
      console.log(`
Usage:
  npx tsx src/runCctp.ts --amount <amount> [options]

Arguments:
  --amount <amount>        Amount of USDC to transfer (e.g., "1.0")
  --to <aptos-address>     Optional: Aptos recipient address (hex format)
                          If not provided, uses sponsor wallet address
  --from <address>         Optional: User's Base wallet address (source of USDC)
                          If not provided, uses sponsor wallet as source
  --sig <signature>        Optional: User authorization signature
                          Use "dummy" for testing (placeholder)
                          Required if --from is provided
  --permit-data <json>     Optional: Permit2 permit data as JSON string
                          Required for real Permit2 signature verification
                          Can be generated using: npx tsx src/generatePermit2.ts

Examples:
  # Sponsor wallet transfer (default)
  npx tsx src/runCctp.ts --amount 1.0
  
  # User wallet transfer (sponsor pays gas)
  npx tsx src/runCctp.ts --amount 5.0 --from 0xUserAddress --sig dummy --to 0xc3e2a21da9f68dcd3ad8668c8fb72ede9f46fea67652fbffa9db8f8af0c612cf
  
  # Sponsor wallet transfer with custom recipient
  npx tsx src/runCctp.ts --amount 0.5 --to 0xc3e2a21da9f68dcd3ad8668c8fb72ede9f46fea67652fbffa9db8f8af0c612cf
      `);
      process.exit(0);
    }
  }

  let permitData: Permit2Permit | undefined;
  if (permitDataJson) {
    try {
      permitData = JSON.parse(permitDataJson) as Permit2Permit;
      // Convert string values to BigInt for permit data
      if (permitData.value && typeof permitData.value === 'string') {
        permitData.value = BigInt(permitData.value);
      }
      if (permitData.nonce && typeof permitData.nonce === 'string') {
        permitData.nonce = BigInt(permitData.nonce);
      }
      if (permitData.deadline && typeof permitData.deadline === 'string') {
        permitData.deadline = BigInt(permitData.deadline);
      }
    } catch (e) {
      console.error(`❌ Error: Invalid JSON for --permit-data: ${e}`);
      process.exit(1);
    }
  }

  return { amount, to, from, sig, permitData };
}

async function main() {
  console.log("🚀 Starting CCTP Transfer (Base Sepolia → Aptos)");
  console.log("────────────────────────────────────────────────────────────");

  const { amount, to, from, sig, permitData } = parseArgs();

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

  // Validate Base wallet address format if provided
  if (from) {
    const cleanFrom = from.startsWith("0x") ? from : `0x${from}`;
    if (!/^0x[0-9a-fA-F]{40}$/i.test(cleanFrom)) {
      console.error(`❌ Error: Invalid Base wallet address format "${from}"`);
      console.log("Ethereum addresses should be 42 characters (0x + 40 hex chars)");
      process.exit(1);
    }
  }

  // Validate that if --from is provided, --sig is also provided
  if (from && !sig) {
    console.error(`❌ Error: --sig is required when --from is provided`);
    console.log("Use --sig dummy for testing (placeholder signature)");
    process.exit(1);
  }

  console.log(`💰 Amount: ${amount} USDC`);
  if (from) {
    console.log(`👤 Source: User wallet (${from})`);
    console.log(`🧾 Authorization: ${sig === "dummy" ? "Placeholder signature" : "Custom signature"}`);
  } else {
    console.log(`💼 Source: Sponsor wallet`);
  }
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
    fromAddress: from,
    signature: sig,
    permitData: permitData,
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

