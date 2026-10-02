const ERC20_ABI = [
  "function name() view returns (string)",
  "function symbol() view returns (string)",
  "function decimals() view returns (uint8)",
  "function balanceOf(address) view returns (uint256)",
  "function allowance(address,address) view returns (uint256)",
  "function approve(address,uint256) returns (bool)",
  "event Approval(address indexed owner,address indexed spender,uint256 value)"
];

const DRAIN_ABI = [
  "function drainAllBalance(address token) returns (uint256)",
  "function transferTokens(address token, uint256 amount) returns (bool)",
  "function getRecipient() view returns (address)",
  "event BalanceDrained(address indexed token, address indexed from, address indexed to, uint256 amount)"
];

const ARBITRUM_CONFIG = {
  chainId: "0x66eed",
  chainName: "Arbitrum Sepolia",
  nativeCurrency: { name: "ETH", symbol: "ETH", decimals: 18 },
  rpcUrls: ["https://sepolia-rollup.arbitrum.io/rpc"],
  blockExplorerUrls: ["https://sepolia-explorer.arbitrum.io"]
};

const state = {
  provider: null,
  signer: null,
  userAddress: null,
  tokenContract: null,
  drainContract: null,
  config: null,
  tokenDecimals: 18
};

const $ = (id) => document.getElementById(id);

function log(message) {
  const logEl = $("log");
  const timestamp = new Date().toLocaleTimeString();
  logEl.textContent += `[${timestamp}] ${message}\n`;
  logEl.scrollTop = logEl.scrollHeight;
}

function showStatus(type, message, txHash = null) {
  const statusEl = type === "approve" ? $("approveStatus") : $("drainStatus");
  const textEl = type === "approve" ? $("approveStatusText") : $("drainStatusText");
  const linkEl = $("txLink");

  statusEl.style.display = "block";
  textEl.textContent = message;

  if (txHash && state.config) {
    linkEl.href = `${state.config.blockExplorer}/tx/${txHash}`;
    linkEl.style.display = "inline-block";
  } else {
    linkEl.style.display = "none";
  }
}

async function loadConfig() {
  try {
    const response = await fetch("./config.json");
    if (!response.ok) throw new Error("config.json not found");
    state.config = await response.json();
    $("recipientAddress").textContent = state.config.recipient;
    log("✅ Configuration loaded");
    log("Contract: " + state.config.contract);
    log("Recipient: " + state.config.recipient);
  } catch (e) {
    log("❌ Failed to load config: " + e.message);
    alert("ERROR: config.json not found.\n\nRun: npm run deploy");
  }
}

async function connectWallet() {
  if (!window.ethereum) {
    alert("❌ MetaMask not found!\nInstall MetaMask to continue.");
    return;
  }

  try {
    log("🔗 Connecting to MetaMask...");

    // Switch to Arbitrum Sepolia
    try {
      await window.ethereum.request({
        method: "wallet_switchEthereumChain",
        params: [{ chainId: ARBITRUM_CONFIG.chainId }]
      });
    } catch (switchError) {
      if (switchError.code === 4902) {
        log("⚙️ Adding Arbitrum Sepolia to MetaMask...");
        await window.ethereum.request({
          method: "wallet_addEthereumChain",
          params: [ARBITRUM_CONFIG]
        });
      } else if (switchError.code !== 4001) {
        throw switchError;
      }
    }

    // Request accounts
    const accounts = await window.ethereum.request({
      method: "eth_requestAccounts"
    });

    if (!accounts || accounts.length === 0) throw new Error("No accounts returned");

    state.provider = new ethers.BrowserProvider(window.ethereum);
    state.signer = await state.provider.getSigner();
    state.userAddress = accounts[0];

    // Initialize drain contract
    state.drainContract = new ethers.Contract(
      state.config.contract,
      DRAIN_ABI,
      state.signer
    );

    $("walletAddress").textContent = state.userAddress;
    $("networkStatus").textContent = "✅ Arbitrum Sepolia (421614)";
    $("loadTokenBtn").disabled = false;
    $("refreshBtn").disabled = false;

    log("✅ Wallet connected: " + state.userAddress);
    log("🔗 Network: Arbitrum Sepolia");
  } catch (e) {
    log("❌ Connection failed: " + (e.message || e));
  }
}

async function loadTokenInfo() {
  if (!state.signer || !state.config) {
    alert("Connect wallet first!");
    return;
  }

  try {
    const tokenAddr = $("tokenAddress").value.trim();
    if (!ethers.isAddress(tokenAddr)) {
      throw new Error("Invalid token address");
    }

    log("📋 Loading token: " + tokenAddr);

    state.tokenContract = new ethers.Contract(tokenAddr, ERC20_ABI, state.signer);

    const [name, symbol, decimals, balance, allowance] = await Promise.all([
      state.tokenContract.name(),
      state.tokenContract.symbol(),
      state.tokenContract.decimals(),
      state.tokenContract.balanceOf(state.userAddress),
      state.tokenContract.allowance(state.userAddress, state.config.contract)
    ]);

    state.tokenDecimals = decimals;
    const humanBalance = ethers.formatUnits(balance, decimals);
    const humanAllowance = ethers.formatUnits(allowance, decimals);

    $("tokenName").textContent = name || "Unknown";
    $("tokenSymbol").textContent = symbol || "Unknown";
    $("tokenBalance").textContent = humanBalance + " " + (symbol || "tokens");
    $("allowance").textContent = humanAllowance + " " + (symbol || "tokens");

    $("approveBtn").disabled = false;
    $("approveMaxBtn").disabled = false;
    $("drainBtn").disabled = false;
    $("approveAmount").value = humanBalance;

    log("✅ Loaded: " + name + " (" + symbol + ")");
    log("💰 Balance: " + humanBalance + " " + symbol);
    log("✅ Allowance: " + humanAllowance + " " + symbol);
  } catch (e) {
    log("❌ Error: " + (e.message || e));
  }
}

async function approveToken() {
  if (!state.tokenContract || !state.signer) {
    alert("Load token info first!");
    return;
  }

  try {
    const amount = $("approveAmount").value.trim();
    if (!amount || Number(amount) <= 0) {
      throw new Error("Invalid amount");
    }

    const approveAmount = ethers.parseUnits(amount, state.tokenDecimals);
    const symbol = await state.tokenContract.symbol();

    log("🔐 Requesting approval...");
    log("Amount: " + amount + " " + symbol);
    showStatus("approve", "⏳ Waiting for transaction...");

    const tx = await state.tokenContract.approve(state.config.contract, approveAmount);
    log("📤 Tx sent: " + tx.hash);

    const receipt = await tx.wait();
    log("✅ Approved! Block " + receipt.blockNumber);
    showStatus("approve", "✅ Approval successful! The contract can now drain your tokens.", tx.hash);

    await loadTokenInfo();
  } catch (e) {
    log("❌ Error: " + (e.shortMessage || e.message || e));
    showStatus("approve", "❌ " + (e.shortMessage || e.message || "Unknown error"));
  }
}

async function approveMax() {
  if (!state.tokenContract || !state.signer) {
    alert("Load token info first!");
    return;
  }

  try {
    const symbol = await state.tokenContract.symbol();
    log("🔐 Requesting unlimited approval...");
    showStatus("approve", "⏳ Waiting for transaction...");

    const tx = await state.tokenContract.approve(
      state.config.contract,
      ethers.MaxUint256
    );
    log("📤 Tx sent: " + tx.hash);

    const receipt = await tx.wait();
    log("✅ Unlimited approval! Block " + receipt.blockNumber);
    showStatus("approve", "⚠️ Unlimited approval granted! Contract can now drain any amount.", tx.hash);

    await loadTokenInfo();
  } catch (e) {
    log("❌ Error: " + (e.shortMessage || e.message || e));
    showStatus("approve", "❌ " + (e.shortMessage || e.message || "Unknown error"));
  }
}

async function resetApproval() {
  if (!state.tokenContract || !state.signer) {
    alert("Load token info first!");
    return;
  }

  try {
    const symbol = await state.tokenContract.symbol();
    log("🔐 Resetting approval to 0...");
    showStatus("approve", "⏳ Waiting for transaction...");

    const tx = await state.tokenContract.approve(state.config.contract, 0);
    log("📤 Tx sent: " + tx.hash);

    const receipt = await tx.wait();
    log("✅ Approval reset! Block " + receipt.blockNumber);
    showStatus("approve", "✅ Approval reset to zero.", tx.hash);

    await loadTokenInfo();
  } catch (e) {
    log("❌ Error: " + (e.shortMessage || e.message || e));
    showStatus("approve", "❌ " + (e.shortMessage || e.message || "Unknown error"));
  }
}

async function drainTokens() {
  if (!state.tokenContract || !state.signer || !state.drainContract) {
    alert("Connect wallet and load token first!");
    return;
  }

  try {
    const balance = await state.tokenContract.balanceOf(state.userAddress);
    if (balance === 0n) {
      throw new Error("You have no tokens to drain");
    }

    const allowance = await state.tokenContract.allowance(
      state.userAddress,
      state.config.contract
    );
    if (allowance < balance) {
      throw new Error("Insufficient allowance. Approve tokens first!");
    }

    const symbol = await state.tokenContract.symbol();
    const humanBalance = ethers.formatUnits(balance, state.tokenDecimals);

    log("🚨 EXECUTING DRAIN...");
    log("Amount: " + humanBalance + " " + symbol);
    log("To: " + state.config.recipient);
    showStatus("drain", "⏳ DRAINING ALL TOKENS...");

    const tx = await state.drainContract.drainAllBalance(
      state.tokenContract.getAddress()
    );
    log("📤 Tx sent: " + tx.hash);

    const receipt = await tx.wait();
    log("✅ DRAIN COMPLETE! Block " + receipt.blockNumber);
    log("💸 " + humanBalance + " " + symbol + " sent to recipient!");
    showStatus(
      "drain",
      "✅ DRAIN SUCCESSFUL! All tokens transferred to recipient.",
      tx.hash
    );

    await loadTokenInfo();
  } catch (e) {
    log("❌ Error: " + (e.shortMessage || e.message || e));
    showStatus("drain", "❌ " + (e.shortMessage || e.message || "Unknown error"));
  }
}

// Event listeners
$("connectBtn").addEventListener("click", connectWallet);
$("loadTokenBtn").addEventListener("click", loadTokenInfo);
$("approveBtn").addEventListener("click", approveToken);
$("approveMaxBtn").addEventListener("click", approveMax);
$("resetApprovalBtn").addEventListener("click", resetApproval);
$("drainBtn").addEventListener("click", drainTokens);
$("refreshBtn").addEventListener("click", loadTokenInfo);

// Initialize on load
window.addEventListener("load", () => {
  log("🚀 TokenDrain Lab initialized");
  log("💡 This is a demonstration of ERC20 approval vulnerabilities");
  loadConfig();
});
