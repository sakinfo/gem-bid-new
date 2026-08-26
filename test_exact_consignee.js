const https = require('https');
const cheerio = require('cheerio');

async function testOfficialConsigneeSearch(state = "MAHARASHTRA", city = "NASHIK") {
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
        const csrfToken = $('#chash').val() || $('input[name="csrf_bd_gem_nk"]').val();
        const csrfName = $('#cname').val() || 'csrf_bd_gem_nk';
        resolve({ cookieHeader, csrfToken, csrfName });
      });
    }).on('error', reject);
  });

  const payload = {
    searchType: "con",
    state_name_con: state,
    city_name_con: city,
    page: 1
  };

  const postBody = new URLSearchParams();
  postBody.append('payload', JSON.stringify(payload));
  postBody.append(session.csrfName, session.csrfToken);
  const postData = postBody.toString();

  return new Promise((resolve, reject) => {
    const req = https.request({
      hostname: 'bidplus.gem.gov.in',
      path: '/search-bids',
      method: 'POST',
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
        'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
        'Content-Length': Buffer.byteLength(postData),
        'X-Requested-With': 'XMLHttpRequest',
        'Referer': 'https://bidplus.gem.gov.in/advance-search',
        'Origin': 'https://bidplus.gem.gov.in',
        'Cookie': session.cookieHeader
      }
    }, (res) => {
      let jsonStr = '';
      res.on('data', d => jsonStr += d);
      res.on('end', () => {
        try {
          const data = JSON.parse(jsonStr);
          console.log('Status Code:', res.statusCode);
          console.log('Total Bids Found in GeM (numFound):', data.response?.response?.numFound);
          const docs = data.response?.response?.docs || [];
          console.log(`Docs received: ${docs.length}`);
          docs.forEach((d, idx) => {
            console.log(`\n#${idx + 1}: Bid No: ${d.b_bid_number} | Category: ${d.b_category_name || d.bd_category_name} | Ministry: ${d.ba_official_details_minName}`);
          });
          resolve(data);
        } catch (e) {
          console.error('Error parsing JSON:', e.message, jsonStr.slice(0, 500));
          reject(e);
        }
      });
    });

    req.on('error', reject);
    req.write(postData);
    req.end();
  });
}

testOfficialConsigneeSearch("MAHARASHTRA", "NASHIK").catch(console.error);
