const https = require('https');
const cheerio = require('cheerio');

const cities = ["Mumbai", "Pune", "Nagpur", "Nashik", "Thane", "Aurangabad", "Navi Mumbai", "Kolhapur", "Solapur"];

async function testCitySearches() {
  const session = await new Promise((resolve, reject) => {
    https.get('https://bidplus.gem.gov.in/all-bids', {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36'
      }
    }, (res) => {
      let html = '';
      const setCookie = res.headers['set-cookie'] || [];
      const cookieHeader = setCookie.map(c => c.split(';')[0]).join('; ');
      res.on('data', chunk => html += chunk);
      res.on('end', () => {
        const $ = cheerio.load(html);
        const csrfToken = $('#chash').val() || $('input[name="csrf_bd_gem_nk"]').val();
        const csrfName = $('#cname').val() || 'csrf_bd_gem_nk';
        resolve({ cookieHeader, csrfToken, csrfName });
      });
    }).on('error', reject);
  });

  for (const city of cities) {
    const postPayload = {
      page: 1,
      param: { searchBid: city },
      filter: { bidStatusType: "ongoing_bids", byType: "all", highValue: "all" }
    };
    const postBody = new URLSearchParams();
    postBody.append('payload', JSON.stringify(postPayload));
    postBody.append(session.csrfName, session.csrfToken);
    const postData = postBody.toString();

    const result = await new Promise((resolve) => {
      const req = https.request({
        hostname: 'bidplus.gem.gov.in',
        path: '/all-bids-data',
        method: 'POST',
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
          'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
          'Content-Length': Buffer.byteLength(postData),
          'X-Requested-With': 'XMLHttpRequest',
          'Referer': 'https://bidplus.gem.gov.in/all-bids',
          'Cookie': session.cookieHeader
        }
      }, (res) => {
        let jsonStr = '';
        res.on('data', d => jsonStr += d);
        res.on('end', () => {
          try {
            resolve(JSON.parse(jsonStr));
          } catch (e) {
            resolve({});
          }
        });
      });
      req.write(postData);
      req.end();
    });

    const count = result.response?.response?.numFound || 0;
    console.log(`City: ${city.padEnd(15)} -> Found ${count} Live Bids on GeM`);
  }
}

testCitySearches().catch(console.error);
