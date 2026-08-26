const cheerio = require('cheerio');
const fs = require('fs');

const html = fs.readFileSync('gem_live_sample.html', 'utf8');
const $ = cheerio.load(html);

$('script').each((i, el) => {
  const content = $(el).html() || '';
  if (content.includes('all-bids-data') || content.includes('all-bid-data') || content.includes('loadbids') || content.includes('searchBidRA') || content.includes('bidding/bid/')) {
    console.log(`=== FULL SCRIPT #${i} ===`);
    console.log(content);
  }
});
