const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const syncWorker = require('./sync-worker');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

// Serve static assets from both 'public' and root directory
app.use(express.static(path.join(__dirname, 'public')));
app.use(express.static(__dirname));

function getIndexHtmlPath() {
  const pubPath = path.join(__dirname, 'public', 'index.html');
  if (fs.existsSync(pubPath)) return pubPath;
  const rootPath = path.join(__dirname, 'index.html');
  if (fs.existsSync(rootPath)) return rootPath;
  return pubPath;
}

// 1. Root & Index Route Handlers (Bulletproof)
app.get('/', (req, res) => {
  res.sendFile(getIndexHtmlPath());
});

app.get('/index.html', (req, res) => {
  res.sendFile(getIndexHtmlPath());
});

// 2. Get all Maharashtra bids with city, sector & keyword filtering
app.get('/api/bids', (req, res) => {
  const { search, category, ministry, city, status, bidType, sortBy } = req.query;
  let bids = syncWorker.getBids(city);

  // Keyword Search
  if (search) {
    const q = search.toLowerCase().trim();
    bids = bids.filter(b => 
      (b.bidNumber && b.bidNumber.toLowerCase().includes(q)) ||
      (b.title && b.title.toLowerCase().includes(q)) ||
      (b.ministry && b.ministry.toLowerCase().includes(q)) ||
      (b.department && b.department.toLowerCase().includes(q)) ||
      (b.category && b.category.toLowerCase().includes(q)) ||
      (b.city && b.city.toLowerCase().includes(q)) ||
      (b.rawCategory && b.rawCategory.toLowerCase().includes(q))
    );
  }

  // Filter Category / Sector
  if (category && category !== 'All') {
    bids = bids.filter(b => b.category.toLowerCase() === category.toLowerCase());
  }

  // Filter City
  if (city && city !== 'All') {
    bids = bids.filter(b => b.city && b.city.toLowerCase().includes(city.toLowerCase()));
  }

  // Filter Ministry
  if (ministry && ministry !== 'All') {
    bids = bids.filter(b => b.ministry && b.ministry.toLowerCase().includes(ministry.toLowerCase()));
  }

  // Filter Status
  if (status && status !== 'All') {
    bids = bids.filter(b => b.status.toLowerCase() === status.toLowerCase());
  }

  // Filter Bid Type
  if (bidType && bidType !== 'All') {
    bids = bids.filter(b => b.bidType && b.bidType.toLowerCase().includes(bidType.toLowerCase()));
  }

  // Sorting
  if (sortBy === 'ending_soon') {
    bids.sort((a, b) => new Date(a.endDate) - new Date(b.endDate));
  } else if (sortBy === 'newest') {
    bids.sort((a, b) => new Date(b.startDate) - new Date(a.startDate));
  } else {
    bids.sort((a, b) => new Date(a.endDate) - new Date(b.endDate));
  }

  res.json({
    success: true,
    state: "MAHARASHTRA",
    total: bids.length,
    lastSync: syncWorker.lastSyncTime,
    data: bids
  });
});

// 3. Get Single Bid Detail
app.get('/api/bids/:id', (req, res) => {
  const bids = syncWorker.getBids();
  const bid = bids.find(b => b.id === req.params.id || b.bidNumber === req.params.id);
  if (!bid) {
    return res.status(404).json({ success: false, message: 'Bid not found' });
  }
  res.json({ success: true, data: bid });
});

// 4. Trigger Live Sync for Maharashtra / Specific City
app.post('/api/bids/sync', async (req, res) => {
  try {
    const city = req.body.city || req.query.city || null;
    const syncResult = await syncWorker.performSync(city);
    res.json({
      success: true,
      message: `Exact Consignee Location live bids successfully synchronized`,
      result: syncResult
    });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Live GeM Sync failed', error: err.message });
  }
});

// 5. Auto-Sync Schedule Management Endpoints
app.get('/api/sync/schedules', (req, res) => {
  res.json({
    success: true,
    schedules: syncWorker.schedules,
    logs: syncWorker.logs.slice(0, 20)
  });
});

app.post('/api/sync/schedules', (req, res) => {
  const { city, intervalMinutes, enabled } = req.body;
  if (!city) {
    return res.status(400).json({ success: false, message: 'City is required' });
  }
  const updated = syncWorker.updateCitySchedule(city, intervalMinutes, enabled !== false);
  res.json({
    success: true,
    message: `Auto-sync schedule for ${city} updated to every ${updated.intervalMinutes} minutes`,
    schedule: updated,
    allSchedules: syncWorker.schedules
  });
});

// 6. Portal Analytics & City KPI Metrics
app.get('/api/stats', (req, res) => {
  const bids = syncWorker.getBids();
  const urgentCount = bids.filter(b => {
    const diff = new Date(b.endDate).getTime() - Date.now();
    return diff > 0 && diff <= 24 * 3600000;
  }).length;
  const highValueCount = bids.filter(b => b.bidType && (b.bidType.includes('RA') || b.bidType.includes('BOQ'))).length;

  const cityMap = {};
  bids.forEach(b => {
    const c = b.city || 'Other Maharashtra';
    cityMap[c] = (cityMap[c] || 0) + 1;
  });

  const categoriesMap = {};
  bids.forEach(b => {
    categoriesMap[b.category] = (categoriesMap[b.category] || 0) + 1;
  });

  const ministryMap = {};
  bids.forEach(b => {
    if (b.ministry) {
      ministryMap[b.ministry] = (ministryMap[b.ministry] || 0) + 1;
    }
  });

  res.json({
    success: true,
    stats: {
      state: "MAHARASHTRA",
      totalBids: bids.length,
      totalFoundOnGeM: 4634,
      urgentClosingCount: urgentCount,
      highValueCount: highValueCount,
      cityCounts: cityMap,
      schedules: syncWorker.schedules,
      topCities: Object.entries(cityMap)
        .map(([name, count]) => ({ name, count }))
        .sort((a, b) => b.count - a.count),
      categories: categoriesMap,
      topMinistries: Object.entries(ministryMap)
        .map(([name, count]) => ({ name, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 6)
    }
  });
});

// 7. Export Bids (CSV / JSON)
app.get('/api/export', (req, res) => {
  const bids = syncWorker.getBids(req.query.city);
  const format = req.query.format || 'json';

  if (format === 'csv') {
    const headers = ["Bid Number", "Item / Title", "City", "State", "Category", "Ministry", "Department", "Quantity", "End Date", "Document URL"];
    const rows = bids.map(b => [
      `"${b.bidNumber}"`,
      `"${(b.title || '').replace(/"/g, '""')}"`,
      `"${b.city}"`,
      `"MAHARASHTRA"`,
      `"${b.category}"`,
      `"${(b.ministry || '').replace(/"/g, '""')}"`,
      `"${(b.department || '').replace(/"/g, '""')}"`,
      `"${b.quantity}"`,
      `"${b.endDate}"`,
      `"${b.documentUrl}"`
    ]);

    const csvContent = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename="GeM_Maharashtra_Bids.csv"');
    return res.send(csvContent);
  }

  res.setHeader('Content-Type', 'application/json');
  res.setHeader('Content-Disposition', 'attachment; filename="GeM_Maharashtra_Bids.json"');
  res.json(bids);
});

// 8. Catch-All Single Page Application Fallback
app.get('*', (req, res) => {
  if (!req.path.startsWith('/api')) {
    res.sendFile(getIndexHtmlPath());
  } else {
    res.status(404).json({ success: false, message: 'API endpoint not found' });
  }
});

app.listen(PORT, () => {
  console.log(`🚀 GeM Maharashtra Bids Portal running at http://localhost:${PORT}`);
});
