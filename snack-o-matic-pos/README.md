
# 🛍️ Snack-O-Matic POS

A modern, high-contrast, mobile-first Point of Sale app for a school snack business. Built with React, Tailwind CSS, and Supabase.

## ✨ Features
- 📱 **Mobile First**: Designed for easy tapping on phones.
- 🌓 **Dark Mode**: High-contrast UI for visibility.
- ☁️ **Cloud Sync**: Powered by Supabase for real-time sales tracking across multiple devices.
- 🔐 **PIN Protected**: Secure management mode for inventory and daily logs.
- 📊 **Real-time Stats**: Track top-selling items and payment splits instantly.

## 🚀 Quick Start (Local Development)

1. **Clone the project** to your computer.
2. **Open the folder** in your terminal.
3. **Run a local server**:
   ```bash
   npx serve .
   ```
4. Open your browser to `http://localhost:3000`.

## 🛠️ Supabase Setup

This app requires a Supabase backend to save sales and manage inventory.

1. Create a free project at [supabase.com](https://supabase.com).
2. Go to the **SQL Editor** and run these commands to create your tables:

```sql
-- Inventory Table
create table inventory (
  id text primary key,
  name text not null,
  price float8 not null,
  color text,
  icon text,
  stock integer default 0,
  options text[] default '{}'
);

-- Sales Table
create table sales (
  id uuid default gen_random_uuid() primary key,
  timestamp timestamp with time zone default now(),
  items jsonb not null,
  total float8 not null,
  method text not null
);
```

3. In the App UI, go to **Management Mode** (PIN: `1234`) -> **Database Icon** and enter your Supabase URL and Anon Key found in your Project Settings.

## 📦 Deployment

### Deploy to Vercel (Recommended)
1. Push this code to a GitHub repository.
2. Link your GitHub to [Vercel](https://vercel.com).
3. Import this project.
4. Your site is live!

### Deploy to GitHub Pages
1. Push this code to GitHub.
2. Go to **Settings > Pages**.
3. Select **Deploy from branch** and choose `main`.
4. Your site will be available at `https://yourusername.github.io/your-repo-name`.

## 🔒 Security Note
The PIN is currently set to `1234` in `App.tsx`. Change the `APP_PIN` constant in the code before sharing the link with anyone!
