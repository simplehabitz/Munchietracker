
# 🛍️ Snack-O-Matic POS

## 🚀 How to fix the Vercel 404

Vercel needs to "build" your project because browsers don't understand `.tsx` files. Follow these steps:

1.  **Push these new files** to your GitHub repository.
2.  **Go to Vercel**: 
    - If you already linked the repo, Vercel will see the `package.json` and automatically change the "Framework Preset" to **Vite**.
    - If not, delete the old project on Vercel and "Add New Project" from GitHub.
3.  **Install locally** (Optional - if you want to test on your computer):
    ```bash
    npm install
    npm run dev
    ```

## 🛠️ Database Setup Reminder
Make sure you ran the SQL commands in the Supabase SQL Editor to create the `inventory` and `sales` tables. If you don't, the app will connect but won't be able to save anything!

## 🔐 PIN Code
The default PIN is `1234`. You can change this in `App.tsx`.
