const fs = require('fs');

const html = fs.readFileSync('gem_live_sample.html', 'utf8');

const regex = /https:\/\/bidplus\.gem\.gov\.in\/[a-zA-Z0-9_\-\/]+/g;
const matches = [...new Set(html.match(regex) || [])];
console.log('All GeM URLs referenced in page:');
matches.forEach(m => console.log(' -', m));
