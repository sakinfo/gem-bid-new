const fs = require('fs');

const html = fs.readFileSync('gem_live_sample.html', 'utf8');

const idx = html.indexOf('all-bids-data');
if (idx !== -1) {
  console.log('Snippet around all-bids-data:');
  console.log(html.slice(Math.max(0, idx - 400), idx + 800));
} else {
  console.log('all-bids-data not found directly');
}
