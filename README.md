# 🚀 Launch Your Decentralized Prediction Market in Minutes

[![Forkast Banner](https://i.imgur.com/xZvOiEU.png)](https://forka.st)

Open-source project to launch and monetize Web3 prediction markets, inspired by Polymarket, but with full transparency and control.

## ✨ Core Benefits

Tired of centralized platforms? Want to build your own business in the DeFi space? This project offers you:

- **⚡ Rapid Launch:** Get your prediction market website running in **minutes**, not months.
- **📈 Ready Events & Liquidity:** We sync popular events from platforms like Polymarket, ensuring you have active markets with initial liquidity for your users.
- **💰 Earn Fees Automatically:** Earn **1% of traded volume** on your fork, directly via smart contracts. Another 1% goes to maintain backend infrastructure, blockchain operations, and continuous development of the base protocol.
- **🛠️ Hassle-Free & Transparent:** Infrastructure is managed for you, while you keep full control over the code and operations. Focus on growing your community and contributing to a decentralized ecosystem.
- **💸 Arbitrage Opportunities:** Your users can profit from price differences between your platform and other prediction markets like Polymarket, creating natural trading volume and liquidity.
- **⚡ Built on Polygon:** Fast transactions with minimal fees, ideal for traders and scaling your market.
- **🗳️ Fair Event Resolution (via UMA/Oracles):** A global voting area ensures fairness and security of results.

## 🛠️ Get Started Now!

Follow these simple steps to launch your own prediction market:

### 1. Fork the Repository

Click the **Fork** button in the top right corner

### 2. Create a New Project on Vercel

1. Go to [Vercel](https://vercel.com) dashboard
2. Select **Add New** → **Project**
3. Connect your **GitHub account**
4. Import and Deploy your **forked repository**

*Note: The initial deployment may fail due to missing environment variables. This is expected.
Complete Step 3 (Supabase) and Step 4 (environment) first, then redeploy from your project dashboard.*

### 3. Create Database (Supabase)

   1. Go to your project dashboard
   2. Navitage to the **Storage** tab
   3. Find **Supabase** in the database list and click **Create**
   4. Keep all default settings and click **Create** in the final step
   5. Once ready, click the **Connect Project** button to link to your project

### 4. Configure Your Environment

   1. **Download** the `.env.example` file from this repository
   2. **Edit** it with your configuration:
      - **Reown AppKit**: Get Project ID at [dashboard.reown.com](https://dashboard.reown.com)
      - **Better Auth**: Generate secret at [better-auth.com](https://www.better-auth.com/docs/installation#set-environment-variables)
      - **CRON_SECRET**: Create a random secret of at least 16 characters
   3. Go to your Vercel project dashboard
   4. Navigate to **Settings** → **Environment Variables**
   5. Click **"Import .env"** button
   6. Select your edited `.env.example` file

### 5. Redeploy your project

*Optionally, add your custom domain in **Settings** → **Domains** on your project dashboard.*

### 6. Sync Your Fork (via GitHub Actions)

In your forked Forkast repository:
1. Go to **Settings** → **Actions** → **General**
2. Select **"Allow all actions and reusable workflows"**
3. Click **Save** - This enables automatic sync with the main repository

**Ready! 🎉** Your prediction market will be online with automatic database setup in a few minutes.

## 🎯 Features
- 📱 Mobile Ready
- 🎨 Modern UI/UX (Polymarket-style)
- ⚡ Live Price Updates
- 💳 Web3 Wallets (MetaMask, Reown AppKit)
- 📊 Advanced Charts & Analytics
- 🔒 Secure Smart Contracts

## 🔧 Tech Stack

- **Frontend:** Next.js 15 (React 19, TS, Tailwind, Zustand, @visx)
- **Backend/DB:** Supabase (Postgres)
- **Auth:** Better Auth + SIWE
- **Blockchain:** Polygon (Ethers.js, viem, wagmi)

## 🔗 Links

<div align="center">

**📚 [Documentation](https://github.com/forkast-prediction-market/forkast-prediction-market/tree/main/docs)** •
**🚀 [Live Demo](https://forka.st)** •
**🗺️ [Roadmap](https://github.com/orgs/forkast-prediction-market/discussions/51)** •
**💬 [Discussions](https://github.com/orgs/forkast-prediction-market/discussions)**

**📱 [Discord](https://discord.gg/placeholder)** •
**✈️ [Telegram](https://t.me/placeholder)** •
**🐛 [Issues](https://github.com/forkast-prediction-market/forkast-prediction-market/issues)** •
**⭐ [Contribute](https://github.com/forkast-prediction-market/forkast-prediction-market/blob/main/CONTRIBUTING.md)**

---
*🚧 This project is under active development.
Developers and contributors are welcome to join and help build Forkast into a fully decentralized ecosystem.*
</div>
