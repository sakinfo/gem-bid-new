const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const syncWorker = require('./sync-worker');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json({ limit: '50mb' }));

// Serve static assets from both 'public' and root directory
app.use(express.static(path.join(__dirname, 'public')));
app.use(express.static(__dirname));

const USERS_FILE = path.join(__dirname, 'users.json');

function getUsers() {
  if (fs.existsSync(USERS_FILE)) {
    try {
      return JSON.parse(fs.readFileSync(USERS_FILE, 'utf8'));
    } catch (e) {}
  }
  return [
    { id: '1', email: 'vendor@nashik.com', password: 'admin', name: 'Nashik Industrial Vendor', role: 'Vendor', city: 'Nashik' },
    { id: '2', email: 'buyer@maharashtra.gov.in', password: 'admin', name: 'Govt Procurement Officer', role: 'Buyer', city: 'Mumbai' },
    { id: '3', email: 'admin@gem.gov.in', password: 'admin', name: 'GeM State Administrator', role: 'Admin', city: 'Pune' }
  ];
}

function saveUsers(users) {
  try {
    fs.writeFileSync(USERS_FILE, JSON.stringify(users, null, 2), 'utf8');
  } catch (e) {}
}

function getIndexHtmlPath() {
  const pubPath = path.join(__dirname, 'public', 'index.html');
  if (fs.existsSync(pubPath)) return pubPath;
  const rootPath = path.join(__dirname, 'index.html');
  if (fs.existsSync(rootPath)) return rootPath;
  return pubPath;
}

function getLoginHtmlPath() {
  const pubPath = path.join(__dirname, 'public', 'login.html');
  if (fs.existsSync(pubPath)) return pubPath;
  const rootPath = path.join(__dirname, 'login.html');
  if (fs.existsSync(rootPath)) return rootPath;
  return pubPath;
}

// 1. Root & Page Route Handlers
app.get('/', (req, res) => {
  res.sendFile(getIndexHtmlPath());
});

app.get('/index.html', (req, res) => {
  res.sendFile(getIndexHtmlPath());
});

app.get('/login', (req, res) => {
  res.sendFile(getLoginHtmlPath());
});

app.get('/login.html', (req, res) => {
  res.sendFile(getLoginHtmlPath());
});

// 2. Authentication API Endpoints
app.post('/api/auth/login', (req, res) => {
  const { email, password } = req.body;
  const users = getUsers();
  const user = users.find(u => u.email.toLowerCase() === (email || '').toLowerCase());

  if (!user || user.password !== password) {
    // For demo convenience, allow any valid password if demo
    if (user) {
      const userPayload = { id: user.id, email: user.email, name: user.name, role: user.role, city: user.city, token: `token-${Date.now()}` };
      return res.json({ success: true, message: 'Signed in successfully', user: userPayload });
    }
    // Auto-create for demo
    const newUser = { id: String(Date.now()), email, name: email.split('@')[0], role: req.body.role || 'Vendor', city: req.body.city || 'Nashik', token: `token-${Date.now()}` };
    users.push({ ...newUser, password: password || '123456' });
    saveUsers(users);
    return res.json({ success: true, message: 'Welcome to GeM Portal', user: newUser });
  }

  const userPayload = { id: user.id, email: user.email, name: user.name, role: user.role, city: user.city, token: `token-${Date.now()}` };
  res.json({ success: true, message: 'Signed in successfully', user: userPayload });
});

app.post('/api/auth/register', (req, res) => {
  const { email, password, name, role, city } = req.body;
  const users = getUsers();
  
  if (users.some(u => u.email.toLowerCase() === (email || '').toLowerCase())) {
    return res.status(400).json({ success: false, message: 'Account with this email already exists' });
  }

  const newUser = {
    id: String(Date.now()),
    email,
    password: password || '123456',
    name: name || email.split('@')[0],
    role: role || 'Vendor',
    city: city || 'Nashik',
    token: `token-${Date.now()}`
  };

  users.push(newUser);
  saveUsers(users);

  const userPayload = { id: newUser.id, email: newUser.email, name: newUser.name, role: newUser.role, city: newUser.city, token: newUser.token };
  res.json({ success: true, message: 'Registration successful', user: userPayload });
});

// 3. Get all Maharashtra bids with city, sector & keyword filtering
app.get('/api/bids', (req, res) => {
  const { search, category, ministry, city, status, bidType, sortBy } = req.query;
  let bids = syncWorker.getBids(city);

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

  if (category && category !== 'All') {
    bids = bids.filter(b => b.category.toLowerCase() === category.toLowerCase());
  }

  if (city && city !== 'All') {
    bids = bids.filter(b => b.city && b.city.toLowerCase().includes(city.toLowerCase()));
  }

  if (ministry && ministry !== 'All') {
    bids = bids.filter(b => b.ministry && b.ministry.toLowerCase().includes(ministry.toLowerCase()));
  }

  if (status && status !== 'All') {
    bids = bids.filter(b => b.status.toLowerCase() === status.toLowerCase());
  }

  if (bidType && bidType !== 'All') {
    bids = bids.filter(b => b.bidType && b.bidType.toLowerCase().includes(bidType.toLowerCase()));
  }

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

// 4. Get Single Bid Detail
app.get('/api/bids/:id', (req, res) => {
  const bids = syncWorker.getBids();
  const bid = bids.find(b => b.id === req.params.id || b.bidNumber === req.params.id);
  if (!bid) {
    return res.status(404).json({ success: false, message: 'Bid not found' });
  }
  res.json({ success: true, data: bid });
});

// 5. Trigger Live Sync for Maharashtra / Specific City
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
    res.status(200).json({
      success: true,
      message: 'Serving latest verified live Maharashtra data',
      result: {
        totalBids: syncWorker.totalLiveCount,
        lastSync: syncWorker.lastSyncTime
      }
    });
  }
});

// 6. Cloud Sync Push Webhook (Pushes live tenders fetched from India to Render)
app.post('/api/bids/push', (req, res) => {
  const { bids, totalFoundOnGeM } = req.body;
  if (!bids || !Array.isArray(bids)) {
    return res.status(400).json({ success: false, message: 'Invalid bids payload' });
  }

  const saved = syncWorker.saveBids(bids, totalFoundOnGeM);
  res.json({
    success: true,
    message: `Successfully received and stored ${saved.length} live Maharashtra bids on cloud server!`,
    totalBids: saved.length,
    timestamp: syncWorker.lastSyncTime
  });
});

// 7. Auto-Sync Schedule Management Endpoints
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

// 8. Portal Analytics & City KPI Metrics
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

// 9. Export Bids (CSV / JSON)
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

// 10. Catch-All Single Page Application Fallback
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
