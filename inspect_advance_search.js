const https = require('https');
const cheerio = require('cheerio');
const fs = require('fs');

https.get('https://bidplus.gem.gov.in/advance-search', {
  headers: {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36'
  }
}, (res) => {
  let html = '';
  res.on('data', chunk => html += chunk);
  res.on('end', () => {
    fs.writeFileSync('advance_search.html', html);
    const $ = cheerio.load(html);
    console.log('Saved advance_search.html');
    console.log('Form inputs / selects:');
    $('input, select').each((i, el) => {
      console.log($(el).attr('name') || $(el).attr('id'), '-> value:', $(el).val());
    });

    console.log('\nScripts checking:');
    $('script').each((i, el) => {
      const content = $(el).html() || '';
      if (content.includes('consignee') || content.includes('search') || content.includes('ajax')) {
        console.log(`\n--- Script #${i} ---`);
        const lines = content.split('\n').filter(l => l.includes('consignee') || l.includes('url') || l.includes('ajax') || l.includes('post') || l.includes('state'));
        console.log(lines.slice(0, 15).join('\n'));
      }
    });
  });
});
