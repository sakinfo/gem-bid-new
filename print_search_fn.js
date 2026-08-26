const fs = require('fs');

const html = fs.readFileSync('advance_search.html', 'utf8');

console.log(html.slice(1346151, 1349500));
