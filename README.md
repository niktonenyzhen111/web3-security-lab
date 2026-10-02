# Web3 Security Lab - Live Token Transfer Demo

A practical, real-world demonstration of ERC20 token approval and transfer on Sepolia testnet using MetaMask.

## 🎯 What This Does

This project shows how ERC20 approval works:

1. **Connect your wallet** to Sepolia testnet
2. **Select any ERC20 token** (paste contract address)
3. **Approve the contract** to spend your tokens
4. **Execute transfer** - tokens go to your second wallet address

## ⚠️ Security Education

This demonstrates the classic attack vector:
- User approves contract for token spending
- Contract can then call `transferFrom()` and steal tokens
- Always verify contract code before approving!

## 🚀 Setup

### Prerequisites
- Node.js (v16+)
- MetaMask browser extension
- Sepolia ETH for gas fees
- Testnet tokens (USDC, DAI, etc.) on Sepolia

### Installation

```bash
npm install
```

### Deploy Contract

1. Create `.env` file:
```env
SEPOLIA_RPC_URL=https://sepolia.infura.io/v3/YOUR_INFURA_KEY
PRIVATE_KEY=your_wallet_private_key
ETHERSCAN_API_KEY=your_etherscan_key
```

2. **Important**: Edit `scripts/deploy.js` and set your second wallet address:
```javascript
const RECIPIENT_ADDRESS = "0x742d35Cc6634C0532925a3b844Bc4e7595f42b60"; // ← YOUR SECOND WALLET
```

3. Deploy:
```bash
npm run deploy
```

This will create `frontend/config.json` with contract addresses.

### Run Frontend

```bash
cd frontend
python -m http.server 8000  # or any simple web server
```

Then open: http://localhost:8000

## 📋 How to Use

1. **Connect MetaMask** (make sure you're on Sepolia)
2. **Paste token address** (e.g., USDC on Sepolia)
3. **Click "Load Token Info"** to see your balance
4. **Set approval amount** (defaults to your balance)
5. **Click "Approve for Transfer"**
6. **Click "Execute Transfer"** to send tokens
7. **Check recipient wallet** to see tokens arrive

## 🔗 Useful Links

- **Sepolia Faucets**:
  - https://sepoliafaucet.com/ (ETH)
  - https://faucet.quicknode.com/drip (ETH)
  
- **Testnet Tokens**:
  - USDC: `0x94a9D9AC8a22534E3FaCa9F4e7F2E2cf85d5E4C8`
  - DAI: `0xFF34B3d4Aee8ddCd6F9AFFFB6Fe49bD371b8a357`
  - USDT: `0xaA8E23Fb1079EA71e0a56F48a2aA51851D8433D0`
  - WETH: `0x7b79995e5f793A07Bc00c21412e50Ecae098E7fD`

- **Block Explorer**: https://sepolia.etherscan.io

## 📝 Contract

```solidity
contract TokenSwapper {
    function transferAllTokens(address token, uint256 amount) external {
        IERC20(token).transferFrom(msg.sender, recipient, amount);
    }
}
```

**Key learning**: The contract pulls tokens from your wallet using `transferFrom()`. This only works if you've approved it first!

## ⚡ For Developers

### Compile:
```bash
npm run compile
```

### Verify on Etherscan:
```bash
npm run verify -- --network sepolia [CONTRACT_ADDRESS]
```

## 🔐 Security Notes

✅ **DO:**
- Test on testnet first
- Verify contract addresses before approving
- Use exact amounts, not unlimited approvals
- Check recipient address carefully
- Review transaction before signing

❌ **DON'T:**
- Use this pattern in production without audit
- Approve contracts you don't trust
- Use unlimited approvals (MaxUint256)
- Approve more than you can afford to lose
- Share your private key

## 🎓 Educational Purposes

This project is designed to teach:
- How ERC20 approval works
- Why unlimited approvals are dangerous
- How smart contracts interact with tokens
- Best practices for token transfers

## 📄 License

MIT
