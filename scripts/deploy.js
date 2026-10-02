const hre = require("hardhat");
const fs = require("fs");
const path = require("path");

async function main() {
  const [deployer] = await hre.ethers.getSigners();
  
  console.log("\n" + "=".repeat(60));
  console.log("🚀 TokenDrain Deployment for Arbitrum Sepolia");
  console.log("=".repeat(60));
  console.log("Deployer address:", deployer.address);
  console.log("Network:", hre.network.name);
  console.log("=".repeat(60) + "\n");

  // ⚠️ IMPORTANT: Set your second wallet address here
  const RECIPIENT_ADDRESS = "0x742d35Cc6634C0532925a3b844Bc4e7595f42b60";
  
  console.log("⚠️  RECIPIENT ADDRESS (where tokens will go):");
  console.log("   ", RECIPIENT_ADDRESS);
  console.log("\n📝 Make sure this is YOUR second test wallet!\n");

  // Deploy TokenDrain contract
  const TokenDrain = await hre.ethers.getContractFactory("TokenDrain");
  const tokenDrain = await TokenDrain.deploy(RECIPIENT_ADDRESS);
  await tokenDrain.waitForDeployment();

  const contractAddress = await tokenDrain.getAddress();
  console.log("✅ TokenDrain deployed to:", contractAddress);

  // Create config file for frontend
  const config = {
    network: "arbitrum-sepolia",
    chainId: 421614,
    chainName: "Arbitrum Sepolia",
    contract: contractAddress,
    recipient: RECIPIENT_ADDRESS,
    rpcUrl: "https://sepolia-rollup.arbitrum.io/rpc",
    blockExplorer: "https://sepolia-explorer.arbitrum.io",
    deployedAt: new Date().toISOString(),
    deployer: deployer.address
  };

  const configPath = path.join(__dirname, "../frontend/config.json");
  fs.writeFileSync(configPath, JSON.stringify(config, null, 2));

  console.log("\n" + "=".repeat(60));
  console.log("📋 Configuration Saved");
  console.log("=".repeat(60));
  console.log("Contract Address:", contractAddress);
  console.log("Recipient Address:", RECIPIENT_ADDRESS);
  console.log("Chain ID:", config.chainId);
  console.log("Block Explorer:", config.blockExplorer);
  console.log("\nConfig saved to: frontend/config.json");
  console.log("=".repeat(60) + "\n");

  console.log("🎉 Deployment complete!\n");
  console.log("Next steps:");
  console.log("1. cd frontend");
  console.log("2. python -m http.server 8000");
  console.log("3. Open http://localhost:8000");
  console.log("4. Connect your MetaMask wallet to Arbitrum Sepolia");
  console.log("\n");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  });
