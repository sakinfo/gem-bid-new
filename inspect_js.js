const fs = require('fs');

const html = fs.readFileSync('advance_search.html', 'utf8');

const idx = html.indexOf('location-search');
console.log('Script snippet around index 1362926:');
console.log(html.slice(1362000, 1372000));
