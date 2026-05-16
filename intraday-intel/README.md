# 📈 Intraday Intelligence — Deployment Guide

AI-powered NSE intraday trading signals. Free public deployment on Vercel.

---

## 🗂 Project Structure

```
intraday-intel/
├── api/
│   └── analyze.js        ← Secure Vercel serverless function (API key lives here)
├── src/
│   ├── main.jsx          ← React entry point
│   └── App.jsx           ← Full frontend app
├── index.html            ← HTML shell
├── package.json
├── vite.config.js
├── vercel.json           ← Vercel routing config
├── .env.example          ← Copy this to .env (never commit .env)
└── .gitignore
```

**Why this is safe:** Your Anthropic API key lives only in `api/analyze.js`
as a server-side environment variable. Users calling your app never see it.

---

## 🚀 Deploy in 5 Steps (Free, ~10 minutes)

### Step 1 — Get your Anthropic API key
1. Go to https://console.anthropic.com/settings/keys
2. Click **Create Key**, name it "intraday-intel"
3. Copy the key (starts with `sk-ant-...`) — save it somewhere safe

### Step 2 — Push code to GitHub
1. Go to https://github.com and create a free account (if you don't have one)
2. Click **New repository** → name it `intraday-intel` → **Create repository**
3. On your computer, open a terminal in this folder and run:

```bash
git init
git add .
git commit -m "Initial commit"
git branch -M main
git remote add origin https://github.com/YOUR_USERNAME/intraday-intel.git
git push -u origin main
```

> Replace `YOUR_USERNAME` with your actual GitHub username.

### Step 3 — Deploy to Vercel
1. Go to https://vercel.com and sign up **free** with your GitHub account
2. Click **Add New Project**
3. Find and select your `intraday-intel` repository → click **Import**
4. Vercel auto-detects Vite/React — **don't change any settings**
5. Click **Deploy** — wait ~60 seconds

### Step 4 — Add your API key to Vercel
⚠️ Do this BEFORE your app goes live. Without it, analysis won't work.

1. In your Vercel dashboard, click your project
2. Go to **Settings → Environment Variables**
3. Click **Add New**:
   - **Name:** `ANTHROPIC_API_KEY`
   - **Value:** paste your `sk-ant-...` key
   - **Environments:** check Production, Preview, Development
4. Click **Save**
5. Go to **Deployments** → click the three dots on your latest deploy → **Redeploy**

### Step 5 — Your app is live! 🎉
Vercel gives you a free URL like:
```
https://intraday-intel.vercel.app
```

Share it with anyone. Works on mobile, tablet, desktop — any device, any browser.

---

## 🔄 How to Update the App Later

Just edit files and push to GitHub:
```bash
git add .
git commit -m "Update something"
git push
```
Vercel auto-deploys every push. Your live URL never changes.

---

## 💻 Run Locally (for development)

```bash
# Install dependencies
npm install

# Create local env file
cp .env.example .env
# Edit .env and paste your real API key

# Start dev server
npm run dev
# Opens at http://localhost:5173
```

---

## 🔧 Customise the App

| What to change | Where |
|---|---|
| Add more stocks to the list | `src/App.jsx` → `const STOCKS = [...]` |
| Change market bias text | `src/App.jsx` → "Cautious Bullish" |
| Change AI prompt / analysis depth | `api/analyze.js` → `const prompt = ...` |
| Add more sectors or tags | `api/analyze.js` prompt |
| Colours and fonts | `src/App.jsx` → `const C = {...}` |

---

## 💰 Cost Breakdown (Free Tier)

| Service | Cost | Limit |
|---|---|---|
| Vercel hosting | **Free** | Unlimited personal projects |
| Vercel serverless calls | **Free** | 100GB bandwidth/month |
| GitHub | **Free** | Unlimited public repos |
| Anthropic API | **Pay per use** | ~$0.003 per stock analysis |

> The only cost is Anthropic API usage: roughly **₹0.25 per stock analyzed**.
> For personal/demo use this is negligible. Add rate limiting if you go public at scale.

---

## 🛡️ Optional: Add Rate Limiting

If you want to prevent abuse on a public app, add this to `api/analyze.js`:

```js
// Simple IP-based rate limiting (add at top of handler)
const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress;
// Use Vercel KV or Upstash Redis for production rate limiting
// See: https://vercel.com/docs/storage/vercel-kv
```

---

## ❓ Troubleshooting

**"Failed to analyze" error**
→ Check that `ANTHROPIC_API_KEY` is set in Vercel environment variables and you redeployed after adding it.

**"Module not found" on deploy**
→ Run `npm install` locally and make sure `node_modules` isn't in your repo (it's in `.gitignore`).

**App loads but shows no stocks / blank**
→ Open browser DevTools → Console tab → look for red errors. Usually a missing env var.

**CORS errors in browser**
→ The `api/analyze.js` already has `Access-Control-Allow-Origin: *` headers. If you see CORS errors, make sure you're calling `/api/analyze` (relative URL), not an absolute URL.

---

## 📱 Mobile PWA (Optional Upgrade)

To make it installable as an app on phones:
1. Add a `public/manifest.json` with app name/icons
2. Add `<link rel="manifest" href="/manifest.json">` to `index.html`
3. Users can then "Add to Home Screen" on iOS/Android

---

*Built with React + Vite + Vercel Serverless + Anthropic Claude API*
