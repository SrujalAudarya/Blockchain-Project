# Blockchain Land Registry Platform

A decentralized Land Registry and Property Verification application built with **Next.js 13**, **TypeScript**, **Tailwind CSS**, **Ethers.js**, **Leaflet Maps**, and **Supabase**.

---

## 🚀 Features

- **Decentralized Registry Architecture**: Tracks land parcel ownership history, IPFS document hashes, and status.
- **Interactive Land Map**: Real-time Leaflet GIS mapping with coordinate pins for every registered property.
- **Role-Based Workflows**:
  - **Govt. Registrar**: Register new land parcels, verify documents, and issue registrations.
  - **Citizens / Buyers / Sellers**: View owned properties, put lands up for sale, and initiate ownership transfers.
- **Dual Wallet Support**:
  - **Demo Wallets**: Instant 1-click login as Govt. Registrar, Alice, or Bob without needing any wallet extensions.
  - **MetaMask**: Connect your actual Web3 Ethereum/Polygon wallet.
- **Zero-Setup Local Demo Fallback**: Works immediately out-of-the-box using browser storage even if a remote database is inactive or unconfigured.

---

## 🛠️ Quick Start (Running Locally)

### 1. Clone the repository
```bash
git clone <your-repository-url>
cd "Blockchain Project"
```

### 2. Install dependencies
```bash
npm install
```

### 3. Run the development server
```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

> [!NOTE]
> The application will run smoothly in **Local Demo Mode** by default. Seed parcels will load, and any new land registrations or transfers will be saved locally in your browser.

---

## 🗄️ Connecting Your Own Supabase Database (Optional)

If you want persistent cloud storage and real-time multi-user synchronization:

### 1. Create a free Supabase project
1. Go to [supabase.com](https://supabase.com) and create an account or sign in.
2. Click **New Project** and choose a name and password.

### 2. Run Database Migrations
1. In your Supabase project dashboard, navigate to the **SQL Editor** tab on the left sidebar.
2. Open each SQL migration file from this repo in order:
   - `supabase/migrations/20260908075559_create_land_registry_tables.sql`
   - `supabase/migrations/20260909074603_add_coordinates_to_land_registry.sql`
   - `supabase/migrations/20260909074734_enable_land_registry_realtime.sql`
3. Paste the contents into the SQL Editor and click **Run**.

### 3. Configure Environment Variables
1. Copy the example environment file:
   ```bash
   cp .env.example .env
   ```
2. In Supabase, go to **Project Settings** → **API**.
3. Copy your **Project URL** and **anon public key** into `.env`:
   ```env
   NEXT_PUBLIC_SUPABASE_URL=https://your-project-id.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your-actual-anon-key
   ```
4. Restart your development server (`npm run dev`). The app will automatically connect to your live database!

---

## 📁 Project Structure

```
├── app/                  # Next.js App Router (layout, page, global styling)
├── components/           # UI and View components
│   ├── ui/               # Radix UI and Tailwind design components
│   ├── views/            # Dashboard, Admin, Portfolio, and Verify views
│   └── land-map.tsx      # Interactive Leaflet map component
├── contracts/            # Smart contracts and ABI definitions
├── lib/                  # Application state and utilities
│   ├── land-store.ts     # Hybrid Supabase + LocalStorage store
│   ├── wallet-context.ts # Web3 and demo wallet provider
│   └── supabase.ts       # Supabase client initializer
├── supabase/             # Database migrations
└── public/               # Static assets
```

---

## 🛡️ License
MIT
