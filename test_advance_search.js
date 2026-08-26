const https = require('https');
const cheerio = require('cheerio');

async function testConsigneeLocationSearch(state = "MAHARASHTRA", city = "NASHIK") {
  const session = await new Promise((resolve, reject) => {
    https.get('https://bidplus.gem.gov.in/advance-search', {
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
        const csrfToken = $('#chash').val() || $('input[name="csrf_bd_gem_nk"]').val() || '';
        const csrfName = $('#cname').val() || 'csrf_bd_gem_nk';
        console.log('Advance Search Title:', $('title').text().trim());
        resolve({ cookieHeader, csrfToken, csrfName, html });
      });
    }).on('error', reject);
  });

  // Let's check how advance-search posts payload
  // Possible endpoints: /all-bids-data, /advance-search-data, /consignee-search-data
  const endpoints = ['/advance-search-data', '/all-bids-data'];

  for (const ep of endpoints) {
    const postPayload = {
      page: 1,
      param: {
        search_type: "consignee",
        consignee_state: state,
        consignee_city: city,
        searchBid: ""
      },
      filter: {
        bidStatusType: "ongoing_bids",
        byType: "all",
        highValue: "all"
      }
    };

    const postBody = new URLSearchParams();
    postBody.append('payload', JSON.stringify(postPayload));
    postBody.append(session.csrfName, session.csrfToken);
    const postData = postBody.toString();

    console.log(`\nTesting endpoint: ${ep}`);
    await new Promise((resolve) => {
      const req = https.request({
        hostname: 'bidplus.gem.gov.in',
        path: ep,
        method: 'POST',
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
          'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
          'Content-Length': Buffer.byteLength(postData),
          'X-Requested-With': 'XMLHttpRequest',
          'Referer': 'https://bidplus.gem.gov.in/advance-search',
          'Cookie': session.cookieHeader
        }
      }, (res) => {
        let jsonStr = '';
        res.on('data', d => jsonStr += d);
        res.on('end', () => {
          try {
            const data = JSON.parse(jsonStr);
            console.log(`Result from ${ep}: Status Code ${res.statusCode}, numFound = ${data.response?.response?.numFound}`);
            if (data.response?.response?.docs) {
              console.log('First 3 Bid Numbers:', data.response.response.docs.slice(0, 3).map(d => d.b_bid_number));
            }
          } catch (e) {
            console.log(`Failed to parse JSON from ${ep}. Raw snippet: ${jsonStr.slice(0, 200)}`);
          }
          resolve();
        });
      });
      req.write(postData);
      req.end();
    });
  }
}

testConsigneeLocationSearch().catch(console.error);
