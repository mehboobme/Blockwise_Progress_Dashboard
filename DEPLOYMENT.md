# Deployment Guide - Villa Project Viewer

## 🚀 Quick Start for Deployment Team

This application combines Autodesk Platform Services (APS) 3D viewer with Excel data integration for villa construction progress tracking.

## 📋 Prerequisites

1. **Node.js** (v14 or higher)
2. **Autodesk Platform Services (APS) Account**
3. **APS Application Credentials** (Client ID & Secret)

## 🔐 Security Setup (CRITICAL - Do This First!)

### Step 1: Get Your Own APS Credentials

⚠️ **DO NOT use the credentials in the provided `.env` file - they are for development only!**

1. Go to [Autodesk Platform Services](https://aps.autodesk.com/)
2. Sign in or create an account
3. Create a new application:
   - **Application Name:** Villa Progress Dashboard (Production)
   - **Application Type:** Web Application
   - **Callback URL:** `https://YOUR-PRODUCTION-DOMAIN.com/callback` (or `http://YOUR-SERVER-IP:8080/callback`)
   - **APIs Enabled:** 
     - Data Management API
     - Model Derivative API
     - Authentication API
4. Copy your **Client ID** and **Client Secret**

### Step 2: Configure Environment Variables

1. Navigate to `server/` folder
2. Open the `.env` file
3. **Replace** the following values:

```env
# PRODUCTION CREDENTIALS (get from APS)
APS_CLIENT_ID=YOUR_NEW_CLIENT_ID_HERE
APS_CLIENT_SECRET=YOUR_NEW_CLIENT_SECRET_HERE

# Server Configuration
PORT=3000
OAUTH_PORT=8080
BASE_URL="https://developer.api.autodesk.com"

# IMPORTANT: Update this to your production domain
CALLBACK_URL=https://YOUR-PRODUCTION-DOMAIN.com/callback

# JWT Configuration - CHANGE THIS SECRET!
JWT_SECRET=YOUR-RANDOM-SECRET-KEY-HERE-MIN-32-CHARS
JWT_EXPIRY=24h
JWT_REFRESH_EXPIRY=7d
```

### Step 3: Generate Strong JWT Secret

Replace `JWT_SECRET` with a random string (minimum 32 characters). You can generate one using:

**On Linux/Mac:**
```bash
openssl rand -base64 32
```

**On Windows PowerShell:**
```powershell
-join ((48..57) + (65..90) + (97..122) | Get-Random -Count 32 | % {[char]$_})
```

**Or use online tool:** https://randomkeygen.com/ (CodeIgniter Encryption Keys)

## 📦 Installation

### 1. Install Dependencies

```bash
cd server
npm install
```

### 2. Update Frontend Configuration

Open `js/config.js` and update the server URL:

```javascript
const CONFIG = {
  SERVER_URL: 'https://YOUR-PRODUCTION-DOMAIN.com', // Change from http://localhost:3000
  // ... rest of config
};
```

## 🌐 Deployment Options

### Option A: Traditional Server (VPS/Dedicated Server)

1. **Upload files** to your server
2. **Install Node.js** on server
3. **Install dependencies:** `cd server && npm install`
4. **Start application:**
   ```bash
   npm start
   # Or use PM2 for production:
   npm install -g pm2
   pm2 start server.js --name villa-dashboard
   pm2 save
   pm2 startup
   ```
5. **Configure reverse proxy** (Nginx/Apache) for HTTPS:
   ```nginx
   server {
       listen 443 ssl;
       server_name YOUR-DOMAIN.com;
       
       ssl_certificate /path/to/cert.pem;
       ssl_certificate_key /path/to/key.pem;
       
       location / {
           proxy_pass http://localhost:3000;
           proxy_http_version 1.1;
           proxy_set_header Upgrade $http_upgrade;
           proxy_set_header Connection 'upgrade';
           proxy_set_header Host $host;
           proxy_cache_bypass $http_upgrade;
       }
   }
   ```

### Option B: Cloud Platform (Vercel + Render)

**Frontend (Vercel):**
1. Create `vercel.json`:
   ```json
   {
     "routes": [
       { "handle": "filesystem" },
       { "src": "/(.*)", "dest": "/$1" }
     ]
   }
   ```
2. Push to GitHub
3. Import to Vercel
4. Deploy

**Backend (Render):**
1. Create `render.yaml`:
   ```yaml
   services:
     - type: web
       name: villa-dashboard-api
       env: node
       buildCommand: cd server && npm install
       startCommand: cd server && npm start
       envVars:
         - key: APS_CLIENT_ID
           sync: false
         - key: APS_CLIENT_SECRET
           sync: false
         - key: JWT_SECRET
           sync: false
         - key: CALLBACK_URL
           sync: false
   ```
2. Push to GitHub
3. Import to Render
4. Add environment variables in Render dashboard
5. Deploy

### Option C: Docker Deployment

1. Create `Dockerfile`:
   ```dockerfile
   FROM node:16
   WORKDIR /app
   COPY package*.json ./
   COPY server/ ./server/
   WORKDIR /app/server
   RUN npm install
   EXPOSE 3000 8080
   CMD ["npm", "start"]
   ```

2. Build and run:
   ```bash
   docker build -t villa-dashboard .
   docker run -p 3000:3000 -p 8080:8080 --env-file server/.env villa-dashboard
   ```

## 🧪 Testing Deployment

1. **Access the application:** `https://YOUR-DOMAIN.com`
2. **Click "Login to Autodesk"** - should redirect to Autodesk OAuth
3. **After login** - should return to dashboard with "Logged in as [email]"
4. **Load a model** - verify 3D viewer loads
5. **Upload Excel** - verify data imports
6. **Apply colors** - verify villas are colored
7. **Check Gantt Chart** - verify schedule displays
8. **Drag Today line** - verify filtering works

## 📊 Excel File Requirements

Users will upload Excel files with these columns:

| Column Name | Description | Example |
|------------|-------------|---------|
| **Block** | Block number | 14 |
| **Plot** | Plot/villa number | 425 |
| **Planned Start** | Start date | 1/1/2025 |
| **Planned Finish** | Finish date | 3/15/2025 |
| **Status** | Construction status | Pre-Cast Completed |
| **PreCaster** | Contractor code | P, Q, S, M |
| **Villa** | Villa type | A, B, C |

**Status Values:**
- Raft Completed
- Pre-Cast in Progress
- Pre-Cast Completed
- MEP & Finishes in Progress
- MEP & Finishes Completed
- Villa Handover

## 🔒 Security Checklist

- [ ] Created new APS application for production
- [ ] Replaced `APS_CLIENT_ID` in `.env`
- [ ] Replaced `APS_CLIENT_SECRET` in `.env`
- [ ] Generated new random `JWT_SECRET`
- [ ] Updated `CALLBACK_URL` to production domain
- [ ] Updated `SERVER_URL` in `js/config.js`
- [ ] Enabled HTTPS/SSL on server
- [ ] Set proper file permissions on `.env` (chmod 600)
- [ ] `.env` file NOT committed to git (check `.gitignore`)
- [ ] Firewall configured (ports 3000, 8080, 443)
- [ ] Regular backups configured

## 🛠 Troubleshooting

### "Permission denied" or 403 errors
- Check APS credentials are correct
- Verify user has access to ACC project
- Ensure callback URL matches exactly

### OAuth redirect fails
- Verify `CALLBACK_URL` in `.env` matches APS app settings
- Check ports 3000 and 8080 are accessible
- Ensure no firewall blocking

### Model won't load
- Verify model URN is base64-encoded derivative URN
- Check user has permission to view model
- Use 3-legged OAuth (not 2-legged) for ACC models

### Excel data not mapping
- Check column names match exactly (case-sensitive)
- Verify model properties contain plot numbers
- Use Property Inspector tool: `property-inspector.html`

## 📞 Support

**Key Files:**
- `START_HERE.md` - Developer documentation
- `TROUBLESHOOTING.md` - Common issues
- `.github/copilot-instructions.md` - Architecture guide

**For deployment issues:**
1. Check browser console (F12) for JavaScript errors
2. Check server logs: `pm2 logs villa-dashboard`
3. Verify environment variables: `printenv | grep APS`

## 🚀 Production Optimization

**Before going live:**
1. **Minify JavaScript** (optional)
2. **Enable gzip compression** in server
3. **Set up monitoring** (PM2, New Relic, etc.)
4. **Configure log rotation**
5. **Set up automated backups**
6. **Performance testing** with expected user load

## 📝 Post-Deployment

**Share with users:**
1. Production URL
2. Login instructions (use Autodesk account)
3. Excel template with required columns
4. Quick start guide

**Monitor:**
- Server CPU/memory usage
- Error logs
- User feedback
- APS API rate limits

---

## ⚠️ IMPORTANT REMINDERS

1. **Never commit `.env` to version control** - It's already in `.gitignore`
2. **Use HTTPS in production** - Required for OAuth security
3. **Different credentials for dev/prod** - Never mix environments
4. **Rotate JWT_SECRET periodically** - Security best practice
5. **Keep APS credentials secret** - Treat like passwords

---

**Last Updated:** November 2025  
**Version:** 1.0  
**Contact:** mehboobme (GitHub)
