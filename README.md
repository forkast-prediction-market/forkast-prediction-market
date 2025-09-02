# 🚀 Launch Your Own Decentralized Prediction Market in Minutes

Welcome to the open-source project that revolutionizes how you can launch and monetize your own Web3 prediction market, similar to Polymarket, but with complete control and transparency.

## ✨ Why Fork This Project?

Tired of centralized platforms? Want to build your own business in the DeFi space? This project offers you:

- **⚡ Rapid Launch:** Get your prediction market website running in **minutes**, not months.
- **📈 Ready Events & Liquidity:** We sync popular events from platforms like Polymarket, ensuring you have active markets with initial liquidity for your users.
- **💰 Built-in Revenue Model:** Earn **1% of traded volume** on your fork, directly via smart contracts. Another 1% goes to maintain backend infrastructure, blockchain operations, and continuous development of the base protocol.
- **💸 Arbitrage Opportunities:** Your users can profit from price differences between your platform and other prediction markets like Polymarket, creating natural trading volume and liquidity.
- **🔓 Open Source & Transparent:** Full control over your code and operations. Contribute to a decentralized ecosystem.
- **⚡ Built on Polygon:** Fast transactions with minimal fees, ideal for traders and scaling your market.
- **🗳️ Decentralized Event Resolution:** A global voting area ensures fairness and security of results.

## 💡 How It Works?

Our base protocol provides the essential infrastructure:

1. **🎨 Public Frontend:** You can fork our frontend and customize it for your brand.
2. **🔄 Synchronized Events:** Popular events are sourced from Polymarket and made available across all forks, facilitating the creation of markets with proven demand.
3. **💧 Shared Liquidity:** Liquidity is incentivized and shared, ensuring your users always find counterparts.
4. **🤖 Automated Fee Distribution:** Each transaction generates 2% in fees (1% for you, 1% for maintaining infrastructure and protocol development), distributed automatically via smart contracts.

## 🛠️ Get Started Now!

Follow these simple steps to launch your own prediction market:

### 1. Fork the Repository

Click the "Fork" button in the top right corner

### 2. Configure Your Environment & Services

Create a `.env.local` file with these variables:

```bash
# Site Branding
NEXT_PUBLIC_SITE_NAME=Your Prediction Market
NEXT_PUBLIC_SITE_DESCRIPTION=Your decentralized prediction market platform
NEXT_PUBLIC_SITE_LOGO_SVG=<svg>...</svg>

# Reown/WalletConnect
NEXT_PUBLIC_REOWN_APPKIT_PROJECT_ID=your-reown-project-id

# Random 32 characteres (REQUIRED), you can generate one on "generate secret" button https://www.better-auth.com/docs/installation#set-environment-variables
BETTER_AUTH_SECRET=your-32-character-secret-key

# Vercel Cron Jobs (Type a random password with at least 8 chars) (REQUIRED)
CRON_SECRET=your-cron-secret

# Database
POSTGRES_URL=postgresql://username:password@host:port/database
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# Optional
ACTIVITY_SUBGRAPH_URL=https://your-subgraph-url
PNL_SUBGRAPH_URL=https://your-subgraph-url

# Analytics (Optional)
NEXT_PUBLIC_GOOGLE_ANALYTICS=G-XXXXXXXXXX
```

**Quick Setup:**
1. **Supabase**: Create directly from Vercel Dashboard → Storage → Create Supabase Database
2. **Reown**: Get Project ID at [dashboard.reown.com](https://dashboard.reown.com)
3. **Secret**: Generate 32+ character random string for BETTER_AUTH_SECRET

### 3. Enable GitHub Actions (Required for Forks)

After forking, go to your repository:
1. **Settings** → **Actions** → **General**
2. Select **"Allow all actions and reusable workflows"**
3. **Save** - This enables automatic sync with the main repository

### 4. Deploy to Vercel

- **Connect your repo** to Vercel
- **Create Supabase database** directly from Vercel Dashboard → Storage tab
- **Add remaining environment variables** from your `.env.local` file
- **Point your domain** to Vercel

**Ready!** Your prediction market will be online with automatic database setup.

## 🎯 Features

- **📱 Mobile-Responsive Design:** Works seamlessly on all devices
- **🎨 Modern UI/UX:** Professional interface similar to Polymarket
- **⚡ Real-time Updates:** Live price feeds and market data
- **💳 Wallet Integration:** Support for MetaMask and other Web3 wallets
- **📊 Advanced Charts:** Interactive trading charts and analytics
- **🔒 Secure Trading:** Built on battle-tested smart contracts

## 🔧 Tech Stack

- **Frontend:** Next.js 15, React 19, TypeScript, Tailwind CSS
- **Database:** PostgreSQL with Supabase
- **Authentication:** Better Auth with SIWE
- **Blockchain:** Polygon, Ethers.js, viem, wagmi
- **State Management:** Zustand, React Hooks
- **Charts:** @visx library
- **Web3 Wallet:** Reown AppKit

## 📁 Project Structure

```
src/
├── app/          # Next.js app router (pages & API routes)
├── components/   # Reusable React components
├── hooks/        # Custom React hooks
├── lib/          # Utilities, configs & database queries
├── providers/    # Context providers
├── stores/       # Zustand state management
└── types/        # TypeScript definitions
public/           # Static assets
```

## 🤝 Contributing

This is an open-source project and we rely on the community to grow. Feel free to open issues, send pull requests, or suggest improvements. Together, we can build the future of decentralized prediction markets!

Please see our [Contributing Guidelines](CONTRIBUTING.md) for detailed information on how to contribute to this project.

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🔗 Links

- **Live Demo:** [https://forka.st](https://forka.st)
- **Documentation:** [Check /docs folder]
- **Discord Community:** [Join us]
- **Telegram:** [Connect with us]

---

**Questions?** Open an issue or contact us via our community channels.

**Built with ❤️ for the decentralized future of prediction markets.**
