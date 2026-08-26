/**
 * Push Live Maharashtra Tenders from Local (India) to Cloud (Render.com)
 */
const https = require('https');
const http = require('http');
const syncWorker = require('./sync-worker');

const RENDER_CLOUD_URL = 'https://gem-maharashtra-portal.onrender.com/api/bids/push';

async function pushToRender() {
  console.log('🔄 Fetching fresh live Maharashtra & Nashik tenders from GeM (India IP)...');
  await syncWorker.performSync('ALL');

  const bids = syncWorker.getBids();
  console.log(`📦 Preparing to push ${bids.length} live tenders to Render cloud (${RENDER_CLOUD_URL})...`);

  const payload = JSON.stringify({
    state: "MAHARASHTRA",
    totalFoundOnGeM: syncWorker.totalLiveCount,
    bids: bids
  });

  const urlObj = new URL(RENDER_CLOUD_URL);
  const req = https.request({
    hostname: urlObj.hostname,
    port: 443,
    path: urlObj.pathname,
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Content-Length': Buffer.byteLength(payload)
    }
  }, (res) => {
    let respData = '';
    res.on('data', d => respData += d);
    res.on('end', () => {
      console.log(`✅ Render Cloud Response (${res.statusCode}):`, respData);
    });
  });

  req.on('error', (err) => {
    console.error('❌ Push error:', err.message);
  });

  req.write(payload);
  req.end();
}

pushToRender().catch(console.error);
