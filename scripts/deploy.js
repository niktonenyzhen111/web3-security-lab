const hre = require("hardhat");
const fs = require("fs");
const path = require("path");

async function main() {
  const [deployer] = await hre.ethers.getSigners();
  console.log("Deploying contracts with account:", deployer.address);

  // ВАЖНО: Установи адрес получателя (second wallet/test address)
  const RECIPIENT_ADDRESS = "0x742d35Cc6634C0532925a3b844Bc4e7595f42b60"; // ← ИЗМЕНИ НА СВОЙ ВТОРОЙ АДРЕС

  console.log("Recipient address:", RECIPIENT_ADDRESS);

  const TokenSwapper = await hre.ethers.getContractFactory("TokenSwapper");
  const swapper = await TokenSwapper.deploy(RECIPIENT_ADDRESS);
  await swapper.waitForDeployment();

  const swapperAddress = await swapper.getAddress();
  console.log("\nTokenSwapper deployed to:", swapperAddress);

  const config = {
    network: "sepolia",
    chainId: 11155111,
    swapper: swapperAddress,
    recipient: RECIPIENT_ADDRESS,
    rpcUrl: "https://sepolia.infura.io/v3/YOUR_INFURA_KEY",
    blockExplorer: "https://sepolia.etherscan.io"
  };

  const configPath = path.join(__dirname, "../frontend/config.json");
  fs.writeFileSync(configPath, JSON.stringify(config, null, 2));

  console.log("\n✅ Deployment completed!");
  console.log("📋 Config saved to:", configPath);
  console.log("\nNext steps:");
  console.log("1. Copy the swapper address to your frontend config");
  console.log("2. Make sure recipient is your second test wallet");
  console.log("3. Open frontend/index.html in your browser");
  console.log("4. Connect your wallet with tokens on Sepolia");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
