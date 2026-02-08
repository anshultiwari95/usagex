# UsageX ⚡

**UsageX** is a Web3 billing and payments infrastructure that enables **usage-based pricing** for decentralized applications. Instead of charging users per transaction or via fixed subscriptions, UsageX allows apps to charge users based on **actual usage** (e.g. API calls, time spent, features used) with instant UX and trustless settlement.

The project is inspired by Web2 metered billing systems (like Stripe usage-based billing) but redesigned for Web3 constraints such as gas costs, on-chain friction, and poor user experience.

---

## 🧠 Problem

Most Web3 applications rely on:
- One-time payments
- Per-transaction fees
- Fixed subscriptions

These models are poorly suited for:
- Pay-per-use APIs
- Creator tools
- AI agents
- Developer platforms
- Time-based or action-based services

Charging on-chain for every user action is slow, expensive, and leads to bad UX.

---

## 💡 Solution

UsageX introduces **programmable usage credits** with a hybrid architecture:

- **Off-chain usage tracking** for instant, gasless UX  
- **On-chain settlement** for security, refunds, and trust  
- **USDC-based billing** for stable pricing  

Users prepay USDC to open a session, consume credits as they use the app, and settle once at the end. Unused funds are automatically refunded.

---

## 🏗️ Architecture Overview

### 1. User Flow
1. User deposits USDC and opens a usage session
2. Usage credits are consumed during app interaction
3. Final usage is settled on-chain
4. App receives payment, user gets refund (if any)

### 2. Key Components
- **UsageXSettlement.sol**
  - Holds user deposits
  - Enforces credit limits
  - Handles settlement & refunds
- **Session-based logic**
  - Tracks usage without on-chain calls per action
- **USDC**
  - Stable, predictable billing currency

---

## 🔧 Tech Stack

- **Solidity (0.8.x)** – Smart contracts
- **Hardhat v2** – Local development & testing
- **USDC (ERC20)** – Payment & settlement token
- **ENS** – Settlement contract and wallet display (resolve ENS names, show ENS for connected address)
- **Yellow Network (planned)** – Off-chain sessions & instant usage accounting
- **EVM chains** – Base / Ethereum-compatible networks

---

## 🚀 Why UsageX is Different

- ❌ No per-action gas fees  
- ⚡ Instant, Web2-like UX  
- 🔒 Trustless settlement & refunds  
- 🧩 Flexible pricing models (per-use, per-minute, capped usage)  
- 🧑‍💻 Built as a **developer tool**, not a single app  

---

## 🧪 Current Status

- [x] Hardhat project setup  
- [x] UsageX settlement smart contract  
- [x] Local compilation successful  
- [x] Full test suite (deposit, settle, refunds, replay, admin)  
- [x] Ignition deploy (MockERC20 + UsageXSettlement)  
- [x] Network config (localhost, Sepolia, Base Sepolia)  
- [ ] Testnet deployment (run `npm run deploy -- --network sepolia`)  
- [ ] Yellow Network integration  
- [x] ENS support (settlement by ENS name, show ENS for wallet)
- [x] Frontend dashboard (connect, deposit, balance, settle)  

---

## 📦 Development

```bash
npm install
npm run compile
npm run test
npm run deploy   # local (ephemeral); use --network sepolia for testnet
```

For testnet: set `PRIVATE_KEY` (and optionally `SEPOLIA_RPC_URL` / `BASE_SEPOLIA_RPC_URL`) in `.env`.

### Frontend

```bash
cd frontend
npm install
cp .env.example .env   # then set VITE_SETTLEMENT_ADDRESS to your deployed contract
npm run dev            # http://localhost:5173
```

After `npm run deploy` from the repo root, copy the printed `UsageXSettlement` address into `frontend/.env` as `VITE_SETTLEMENT_ADDRESS` (or use an ENS name, e.g. `usagex.eth`). Use Hardhat (chain 31337) or your wallet’s network; set `VITE_CHAIN_ID=31337` for local. ENS resolution works on mainnet and public testnets; the connected wallet’s ENS name is shown when available.

**Background:** The homepage uses `frontend/public/bg1.jpg` as a moving (Ken Burns) background. If missing, the fallback is a dark background.

---

## 🛣️ Roadmap

- Deploy UsageXSettlement to testnet
- Add Yellow SDK for off-chain session handling
- Build minimal frontend for session creation & settlement
- Add example integration (API / creator tool demo)

---

## 🏆 Hackathon Context

This project is built for **ETHGlobal HackMoney 2026**, targeting:
- **Yellow Network prize** (off-chain payments & sessions)
- **Developer tooling / payments infrastructure**

---

## 📜 License

MIT
