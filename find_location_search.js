const fs = require('fs');

const html = fs.readFileSync('advance_search.html', 'utf8');

const idx = html.indexOf('location-search');
if (idx !== -1) {
  console.log('Location search occurrences:');
  let pos = 0;
  while ((pos = html.indexOf('location-search', pos)) !== -1) {
    console.log('\n--- Match at index', pos, '---');
    console.log(html.slice(pos - 100, pos + 400));
    pos += 'location-search'.length;
  }
}

// Let's also check for search button click handlers
console.log('\n--- Button click handlers in scripts ---');
const btnIdx = html.indexOf('search_by');
if (btnIdx !== -1) {
  console.log(html.slice(btnIdx - 100, btnIdx + 500));
}
