const cheerio = require('cheerio');
const fs = require('fs');

const html = fs.readFileSync('gem_live_sample.html', 'utf8');
const $ = cheerio.load(html);

console.log('Page Title:', $('title').text().trim());

const docLinks = $('a[href*="showbidDocument"]');
console.log('Found Bid Document Links:', docLinks.length);

const bids = [];

docLinks.each((i, link) => {
  const href = $(link).attr('href');
  const bidNo = $(link).text().trim();
  
  // Find container
  const container = $(link).closest('.card, .border.block, .col-md-12, div.bid_card');
  const fullText = container.text().replace(/\s+/g, ' ').trim();
  
  // Let's also inspect child elements inside container
  const itemRow = container.find('.items-row, p:contains("Items:"), strong:contains("Items:")').first();
  const quantityRow = container.find('p:contains("Quantity:"), strong:contains("Quantity:")').first();
  const deptRow = container.find('p:contains("Department:"), strong:contains("Department:"), .dept-name').first();
  const startDateRow = container.find('p:contains("Start Date:"), strong:contains("Start Date:")').first();
  const endDateRow = container.find('p:contains("End Date:"), strong:contains("End Date:")').first();

  bids.push({
    bidNo,
    href,
    containerSnippet: fullText.slice(0, 350)
  });
});

console.log(JSON.stringify(bids.slice(0, 5), null, 2));
