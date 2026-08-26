const cheerio = require('cheerio');
const fs = require('fs');

const html = fs.readFileSync('gem_live_sample.html', 'utf8');
const $ = cheerio.load(html);

console.log('--- FORM & CSRF DETAILS ---');
$('input').each((i, el) => {
  console.log('Input name:', $(el).attr('name'), 'value:', $(el).attr('value'), 'id:', $(el).attr('id'));
});

console.log('\n--- SCRIPTS SCAN ---');
$('script').each((i, el) => {
  const content = $(el).html() || '';
  if (content.includes('url') || content.includes('all-bids') || content.includes('data') || content.includes('ajax') || content.includes('post')) {
    console.log(`\n--- Script #${i} ---`);
    const lines = content.split('\n').filter(l => l.includes('http') || l.includes('ajax') || l.includes('url:') || l.includes('post') || l.includes('get') || l.includes('api'));
    console.log(lines.slice(0, 15).join('\n'));
  }
});
