const fs = require('fs');

const html = fs.readFileSync('advance_search.html', 'utf8');

const regex = /function\s+search[a-zA-Z0-9_]*\s*\(/g;
console.log('Search functions found:');
let match;
while ((match = regex.exec(html)) !== null) {
  console.log('Found:', match[0], 'at index', match.index);
  console.log(html.slice(match.index, match.index + 500));
}
