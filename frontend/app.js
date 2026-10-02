const ERC20_ABI = [
  "function name() view returns (string)",
  "function symbol() view returns (string)",
  "function decimals() view returns (uint8)",
  "function balanceOf(address) view returns (uint256)",
  "function allowance(address,address) view returns (uint256)",
  "function approve(address,uint256) returns (bool)",
  "event Approval(address indexed owner,address indexed spender,uint256 value)",
  "event Transfer(address indexed from,address indexed to,uint256 value)"
];

const SWAPPER_ABI = [
  "function recipient() view returns (address)",
  "function transferAllTokens(address token, uint256 amount) returns (bool)",
  "event TokensTransferred(address indexed token, address indexed from, address indexed to, uint256 amount)"
];

const state = {
  provider: null,
  signer: null,
  userAddress: null,
  tokenContract: null,
  swapperContract: null,
  swapperAddress: null,
  recipientAddress: null,
  tokenDecimals: 18,
  config: null
};

const $ = (id) => document.getElementById(id);

function log(message) {
  const logEl = $("log");
  const timestamp = new Date().toLocaleTimeString();
  logEl.textContent += `[${timestamp}] ${message}\n`;
  logEl.scrollTop = logEl.scrollHeight;
}

function showStatus(type, message, txHash = null) {
  const statusEl = type === "approve" ? $("approveStatus") : $("transferStatus");
  const textEl = type === "approve" ? $("approveStatusText") : $("transferStatusText");
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

function hideStatus(type) {
  const statusEl = type === "approve" ? $("approveStatus") : $("transferStatus");
  statusEl.style.display = "none";
}

async function loadConfig() {
  try {
    const response = await fetch("./config.json");
    if (!response.ok) throw new Error("config.json not found");
    state.config = await response.json();
    state.swapperAddress = state.config.swapper;
    state.recipientAddress = state.config.recipient;
    $("recipientAddress").textContent = state.recipientAddress;
    log("✅ Configuration loaded");
    log("📍 Swapper contract: " + state.swapperAddress);
    log("📍 Recipient: " + state.recipientAddress);
  } catch (e) {
    log("❌ Failed to load config: " + e.message);
    alert("Error: config.json not found. Run 'npm run deploy' first!");
  }
}

async function connectWallet() {
  if (!window.ethereum) {
    alert("MetaMask not found! Install MetaMask to continue.");
    return;
  }

  try {
    log("🔗 Connecting to MetaMask...");

    // Request Sepolia network
    try {
      await window.ethereum.request({
        method: "wallet_switchEthereumChain",
        params: [{ chainId: "0xaa36a7" }]
      });
    } catch (switchError) {
      if (switchError.code === 4902) {
        log("⚙️ Adding Sepolia network to MetaMask...");
        await window.ethereum.request({
          method: "wallet_addEthereumChain",
          params: [
            {
              chainId: "0xaa36a7",
              chainName: "Sepolia",
              nativeCurrency: { name: "Ethereum", symbol: "ETH", decimals: 18 },
              rpcUrls: ["https://sepolia.infura.io/v3/..."],
              blockExplorerUrls: ["https://sepolia.etherscan.io"]
            }
          ]
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

    $("walletAddress").textContent = state.userAddress;
    $("networkName").textContent = "Sepolia (11155111)";
    $("loadTokenBtn").disabled = false;
    $("refreshBtn").disabled = false;

    log("✅ Wallet connected: " + state.userAddress);
  } catch (e) {
    log("❌ Connection failed: " + (e.message || e));
  }
}

async function loadTokenInfo() {
  if (!state.signer) {
    alert("Connect wallet first!");
    return;
  }

  try {
    const tokenAddr = $("tokenAddress").value.trim();
    if (!ethers.isAddress(tokenAddr)) {
      throw new Error("Invalid token address");
    }

    log("📍 Loading token info for: " + tokenAddr);

    state.tokenContract = new ethers.Contract(tokenAddr, ERC20_ABI, state.signer);

    const [name, symbol, decimals, balance, allowance] = await Promise.all([
      state.tokenContract.name(),
      state.tokenContract.symbol(),
      state.tokenContract.decimals(),
      state.tokenContract.balanceOf(state.userAddress),
      state.tokenContract.allowance(state.userAddress, state.swapperAddress)
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
    $("approveAmount").value = humanBalance;
    $("transferAmount").value = humanBalance;

    log("✅ Token loaded: " + name + " (" + symbol + ")");
    log("💰 Your balance: " + humanBalance + " " + symbol);
    log("✅ Current allowance: " + humanAllowance + " " + symbol);
  } catch (e) {
    log("❌ Error loading token: " + (e.message || e));
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
      throw new Error("Enter a valid amount");
    }

    const approveAmount = ethers.parseUnits(amount, state.tokenDecimals);
    const symbol = await state.tokenContract.symbol();

    log("🔐 Requesting approval...");
    log("Amount: " + amount + " " + symbol);
    log("Spender: " + state.swapperAddress);
    showStatus("approve", "⏳ Waiting for transaction...");

    const tx = await state.tokenContract.approve(state.swapperAddress, approveAmount);
    log("📤 Approval tx sent: " + tx.hash);

    const receipt = await tx.wait();
    log("✅ Approval confirmed in block " + receipt.blockNumber);
    showStatus("approve", "✅ Approval successful! You can now execute the transfer.", tx.hash);

    await refreshTokenInfo();
  } catch (e) {
    log("❌ Approval error: " + (e.shortMessage || e.message || e));
    showStatus("approve", "❌ " + (e.shortMessage || e.message || "Unknown error"));
  }
}

async function approveMax() {
  if (!state.tokenContract || !state.signer) {
    alert("Load token info first!");
    return;
  }

  try {
    const maxAmount = ethers.MaxUint256;
    const symbol = await state.tokenContract.symbol();

    log("🔐 Requesting unlimited approval...");
    showStatus("approve", "⏳ Waiting for transaction...");

    const tx = await state.tokenContract.approve(state.swapperAddress, maxAmount);
    log("📤 Unlimited approval tx sent: " + tx.hash);

    const receipt = await tx.wait();
    log("✅ Unlimited approval confirmed in block " + receipt.blockNumber);
    showStatus("approve", "✅ Unlimited approval successful!", tx.hash);

    await refreshTokenInfo();
  } catch (e) {
    log("❌ Approve max error: " + (e.shortMessage || e.message || e));
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

    const tx = await state.tokenContract.approve(state.swapperAddress, 0);
    log("📤 Reset tx sent: " + tx.hash);

    const receipt = await tx.wait();
    log("✅ Approval reset to 0 in block " + receipt.blockNumber);
    showStatus("approve", "✅ Approval reset to zero.", tx.hash);

    await refreshTokenInfo();
  } catch (e) {
    log("❌ Reset error: " + (e.shortMessage || e.message || e));
    showStatus("approve", "❌ " + (e.shortMessage || e.message || "Unknown error"));
  }
}

async function executeTransfer() {
  if (!state.tokenContract || !state.signer || !state.swapperContract) {
    alert("Connect wallet and load token first!");
    return;
  }

  try {
    const amount = $("transferAmount").value.trim();
    if (!amount || Number(amount) <= 0) {
      throw new Error("Enter a valid amount");
    }

    const transferAmount = ethers.parseUnits(amount, state.tokenDecimals);
    const symbol = await state.tokenContract.symbol();

    log("🚀 Executing transfer...");
    log("Amount: " + amount + " " + symbol);
    log("From: " + state.userAddress);
    log("To: " + state.recipientAddress);
    showStatus("transfer", "⏳ Waiting for transaction...");

    // Initialize swapper contract if not already done
    if (!state.swapperContract) {
      state.swapperContract = new ethers.Contract(
        state.swapperAddress,
        SWAPPER_ABI,
        state.signer
      );
    }

    const tx = await state.swapperContract.transferAllTokens(
      state.tokenContract.getAddress(),
      transferAmount
    );

    log("📤 Transfer tx sent: " + tx.hash);
    const receipt = await tx.wait();
    log("✅ Transfer confirmed in block " + receipt.blockNumber);
    log("💸 " + amount + " " + symbol + " transferred to " + state.recipientAddress);
    showStatus("transfer", "✅ Transfer successful! Tokens have been sent to the recipient.", tx.hash);

    await refreshTokenInfo();
  } catch (e) {
    log("❌ Transfer error: " + (e.shortMessage || e.message || e));
    showStatus("transfer", "❌ " + (e.shortMessage || e.message || "Unknown error"));
  }
}

async function refreshTokenInfo() {
  if (state.tokenContract && state.userAddress) {
    await loadTokenInfo();
  }
}

// Event listeners
$("connectBtn").addEventListener("click", connectWallet);
$("loadTokenBtn").addEventListener("click", loadTokenInfo);
$("approveBtn").addEventListener("click", approveToken);
$("approveMaxBtn").addEventListener("click", approveMax);
$("resetApprovalBtn").addEventListener("click", resetApproval);
$("transferBtn").addEventListener("click", executeTransfer);
$("refreshBtn").addEventListener("click", refreshTokenInfo);

// Init
window.addEventListener("load", () => {
  log("🚀 Web3 Security Lab initialized");
  loadConfig();
});
