const cheerio = require('cheerio');
const fs = require('fs');

const html = fs.readFileSync('advance_search.html', 'utf8');
const $ = cheerio.load(html);

$('form').each((i, el) => {
  console.log(`\n--- FORM #${i} ---`);
  console.log('Action:', $(el).attr('action'));
  console.log('Method:', $(el).attr('method'));
  console.log('ID:', $(el).attr('id'));
  $(el).find('input, select, button').each((j, inp) => {
    console.log('   Input/Select:', $(inp).attr('name') || $(inp).attr('id'), 'type:', $(inp).attr('type'), 'value:', $(inp).val());
  });
});
