# XIE Files 🗂️
### Instant Campus File Transfer & Smart Print Hub — Premium Edition

---

## What Is This?

XIE Files is a zero-friction web app for sharing and printing academic files inside college. Students open the URL — no app, no login, no account — drop a file, and it appears **instantly on every open browser** on campus. Perfect for printing without pen drives, plus a live **Notes board** and a **Feedback** channel.

```
Open XIE Files → Drop file → Appears for everyone instantly → Preview / Print / Download
```

---

## Features

**Files**
- ⚡ **Instant sync** — WebSocket broadcasts new files to all browsers in < 500ms
- 📄 **Auto PDF conversion** — DOCX/PPTX/XLSX converted via LibreOffice
- 🖨️ **One-click print** — opens browser print dialog, no pen drive
- 🏷️ **Print Ready badge** — 🟢 PDF Ready · 🟡 Converting · 🔵 Original Only · 🔴 Failed
- 🔍 Search + filter (All / PDF / Docs / Images / Print Ready)
- 🗑️ Students can delete their own uploads (token-based, no login)
- ⏱️ Files auto-delete after 30 days (configurable)

**Notes (new)**
- 📝 Live collaborative notice board — post a note, everyone sees it instantly
- Rich formatting: bold, italic, underline, bullet lists, code blocks
- Paste screenshots / insert images directly into notes
- Colour-coded notes, owner edit & delete

**Feedback (new)**
- 💬 Students submit suggestions, bugs, feature requests
- 🔒 Only the admin can view feedback
- Admin: search, filter, mark resolved, delete, export CSV

**Design**
- Premium modern UI (WhatsApp-green theme, glassmorphism)
- 🌙 Dark / light mode
- Live clock, connection status, online-user count
- Fully responsive · skeleton loaders · toasts · smooth animations
- Left sidebar nav · center workspace · right activity panel

---

## Requirements

- **Node.js 18+**
- **LibreOffice** (for DOCX/PPTX/XLSX → PDF conversion — optional but recommended)
- **200MB+ disk space**

Install LibreOffice (Ubuntu/Debian):
```bash
sudo apt update && sudo apt install -y libreoffice
```

---

## Setup

```bash
# 1. Install backend dependencies
npm install

# 2. Build the React frontend
cd client
npm install
npm run build
cd ..

# 3. Configure
cp .env.example .env
nano .env          # set ADMIN_PASSWORD and SESSION_SECRET

# 4. Run
node server.js
```

### Production (keeps running after logout)
```bash
npm install -g pm2
pm2 start server.js --name xiefiles
pm2 save && pm2 startup
```

---

## Access

- **Student app:** `http://your-ip:3000`
- **Admin panel:** `http://your-ip:3000/admin.html`

---

## Configuration (.env)

```env
PORT=3000
ADMIN_PASSWORD= change_this_now
SESSION_SECRET=  random_long_key
MAX_FILE_SIZE_MB= 100
EXPIRY_DAYS= 30
PERMANENT_DELETE_AFTER_DAYS= 7
```

---

## Project Structure

```
xiefiles/
├── server.js              ← Express + Socket.io + conversion + cron
├── db.js                  ← JSON store (files, notes, feedback) — no native deps
├── package.json
├── .env.example
├── client/                ← React + Vite + Tailwind frontend
│   ├── src/
│   │   ├── components/    ← layout, files, notes, ui
│   │   ├── context/       ← Theme, Socket, Toast, Files
│   │   ├── pages/         ← Home, Notes, Feedback, Recent, About, Help
│   │   └── lib/           ← api, format helpers
│   └── dist/              ← built app (served by Express)
├── public/
│   └── admin.html         ← Admin panel (Files + Feedback tabs)
├── uploads/               ← original files (auto-created)
├── converted/             ← LibreOffice PDF output (auto-created)
└── data/                  ← JSON databases (auto-created)
```

---

## Deploy with Nginx (production)

```nginx
server {
    listen 80;
    server_name xiefiles.yourdomain.com;
    client_max_body_size 110M;

    location / {
        proxy_pass         http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header   Upgrade $http_upgrade;
        proxy_set_header   Connection "upgrade";
        proxy_set_header   Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

---

## Development Mode

Run backend and frontend separately with hot-reload:
```bash
# Terminal 1 — backend
node server.js

# Terminal 2 — frontend dev server (proxies /api and /socket.io to :3000)
cd client && npm run dev
```
Then open the Vite dev URL (usually `http://localhost:5173`).

---

## Tech Stack

| Layer | Technology |
|---|---|
| Backend | Node.js + Express |
| Real-time | Socket.io |
| Frontend | React 18 + Vite + Tailwind CSS |
| Icons | lucide-react |
| Uploads | multer |
| Database | JSON file store (zero native deps) |
| PDF conversion | LibreOffice headless |

---

## FAQ

**Do students need accounts?** No. It's a shared campus tool — open and use.

**Can students see each other's files?** Yes, by design — it's a shared table. Files auto-delete after 30 days; students can delete their own anytime.

**Who sees feedback?** Only the admin, via the Feedback tab in `/admin.html`.

**What if the server restarts?** File/note/feedback data persists in `data/*.json`. Everything reappears on restart.

**Can I change the 30-day expiry?** Yes — in `.env`, or live from the admin panel.

---

## Made with ❤️ for XIE Students
*By Prashik Dongre · Department of Information Technology · Xavier Institute of Engineering*
