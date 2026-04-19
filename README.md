# Policontrol USA — Manufacturing ERP

Production management for DPD chlorine reagents & microbiology products.

## Quick Start (Local)

```bash
git clone https://github.com/YOUR_ORG/policontrol-usa.git
cd policontrol-usa
npm run setup    # installs + builds React
npm start        # starts server on port 3000
```

Open **http://localhost:3000**
- Admin: `admin` / `admin123`
- Operator: `operator1` / `op123`

## Deploy to Render.com (FREE — recommended)

1. Push to GitHub
2. Go to [render.com](https://render.com) → New → Web Service
3. Connect your GitHub repo
4. Settings:
   - **Build Command:** `npm run setup`
   - **Start Command:** `npm start`
   - **Plan:** Free
5. Click Deploy — get a URL like `policontrol-usa.onrender.com`

## Deploy with Docker

```bash
docker build -t policontrol-usa .
docker run -p 3000:3000 -v policontrol-data:/app/server/data policontrol-usa
```

## Deploy to Railway.app

1. Push to GitHub
2. [railway.app](https://railway.app) → New Project → Deploy from GitHub
3. It auto-detects Node.js and deploys

## Access from Tablets

Once deployed, open the URL on any device (phone, tablet, PC).
Works on Chrome, Safari, Edge. Add to home screen for app-like experience.

## Project Structure

```
server/index.js      → Express API + auth + JSON storage
client/src/App.jsx   → Full React app (~2200 lines)
client/src/api.js    → API client
Dockerfile           → Docker deployment
```

## Default Users

| User | Password | Role |
|------|----------|------|
| admin | admin123 | Admin (full access) |
| operator1 | op123 | Operator |

Edit `server/data/users.json` to add/change users, or delete it to reset.
