# 🏛️ GeM BidPulse - Live Bid Ingestion & Analytics Portal

A full-stack, enterprise-grade portal to ingest, track, search, filter, and analyze live Government e-Marketplace (GeM) tenders.

---

## 🌟 Key Features

1. **Live GeM Tender Ingestion Pipeline**:
   - Background synchronization worker (`sync-worker.js`) that tracks tenders across all major ministries.
   - Live synchronization action (`POST /api/bids/sync`) with instant toast updates and status telemetry.
2. **Instant Search & Multi-Criteria Filtering**:
   - Real-time search across Bid Numbers (`GEM/2026/B/...`), keywords, item specs, departments, and consignee states.
   - Filter by Sector/Category (IT & AI, Medical, Defence, Solar, Aerospace, Railways, etc.).
   - Filter by Value Thresholds (Under ₹50L, ₹50L - ₹5Cr, ₹5Cr - ₹15Cr, Above ₹15Cr).
   - Filter by Urgent Closings (bids ending in <24 hours).
3. **Real-Time Ticker & Countdown Timers**:
   - Live JavaScript countdown ticker ticking down to the exact second for each tender.
   - Visual urgent badges and notifications for contracts nearing the submission deadline.
4. **Bid Details & Specifications Modal**:
   - Full technical scope of work, EMD guarantee details, Make in India Class-I compliance, minimum turnover, and direct links to official GeM PDF documents.
5. **My Tracked Bids (Bookmarking)**:
   - Star any tender to save it in your private watchlist (persisted locally in `localStorage`).
6. **Ministry Analytics & Charts**:
   - Visual breakdown of procurement volume by sector and top participating ministries.
7. **Data Export**:
   - One-click export of filtered tenders to CSV or JSON formats.
8. **Dual View & Theme Switcher**:
   - Switch between rich Responsive Card Grid View and dense Data Table View.
   - Full support for Dark & Light themes.

---

## 🚀 Getting Started

### 1. Installation
```bash
cd C:\Users\usar\.gemini\antigravity-ide\scratch\gem-bids-portal
npm install
```

### 2. Start the Server
```bash
node server.js
```

### 3. Open in Browser
Visit **[http://localhost:3000](http://localhost:3000)** in your browser.

---

## 📡 REST API Endpoints

| Endpoint | Method | Description |
| :--- | :--- | :--- |
| `/api/bids` | `GET` | Fetch all bids with query parameters (`search`, `category`, `ministry`, `minValue`, `maxValue`, `sortBy`). |
| `/api/bids/:id` | `GET` | Fetch complete technical specifications for a single bid ID. |
| `/api/bids/sync` | `POST` | Trigger an on-demand synchronization cycle with the live GeM feed. |
| `/api/stats` | `GET` | Get aggregated KPI metrics, sector breakdown, and top ministries. |
| `/api/export?format=csv` | `GET` | Download all indexed tenders as a formatted CSV spreadsheet. |
| `/api/export?format=json` | `GET` | Download all indexed tenders as a structured JSON file. |

---

## 📁 Project Structure

```
gem-bids-portal/
├── server.js            # Express API server & static file host
├── sync-worker.js       # GeM background synchronization & ingestion engine
├── bids_data.json       # Local database store for synced tenders
├── package.json         # Project metadata and dependencies
└── public/
    ├── index.html       # Modern GovTech responsive UI layout
    ├── styles.css       # Vanilla CSS design system (Dark/Light glassmorphism)
    └── app.js           # Client-side reactivity, tickers, search, and state manager
```
