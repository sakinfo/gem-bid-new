const https = require('https');
const cheerio = require('cheerio');

async function getLiveGeMBids() {
  return new Promise((resolve, reject) => {
    // Step 1: GET /all-bids to obtain fresh session cookies and CSRF token
    const initialReq = https.request({
      hostname: 'bidplus.gem.gov.in',
      path: '/all-bids',
      method: 'GET',
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.5'
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

        console.log('Obtained CSRF Token:', csrfToken);
        console.log('Obtained Cookies:', cookieHeader);

        // Step 2: POST /all-bids-data with payload
        const postPayload = {
          page: 1,
          param: { searchBid: "" },
          filter: {
            bidStatusType: "ongoing_bids",
            byType: "all",
            highValue: "all"
          }
        };

        const postBody = new URLSearchParams();
        postBody.append('payload', JSON.stringify(postPayload));
        postBody.append(csrfName, csrfToken);

        const postData = postBody.toString();

        const postReq = https.request({
          hostname: 'bidplus.gem.gov.in',
          path: '/all-bids-data',
          method: 'POST',
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
            'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
            'Content-Length': Buffer.byteLength(postData),
            'X-Requested-With': 'XMLHttpRequest',
            'Referer': 'https://bidplus.gem.gov.in/all-bids',
            'Origin': 'https://bidplus.gem.gov.in',
            'Cookie': cookieHeader,
            'Accept': 'application/json, text/javascript, */*; q=0.01'
          }
        }, (postRes) => {
          let jsonStr = '';
          postRes.on('data', d => jsonStr += d);
          postRes.on('end', () => {
            try {
              const data = JSON.parse(jsonStr);
              resolve({ statusCode: postRes.statusCode, data });
            } catch (err) {
              resolve({ statusCode: postRes.statusCode, raw: jsonStr.slice(0, 1000), error: err.message });
            }
          });
        });

        postReq.on('error', reject);
        postReq.write(postData);
        postReq.end();
      });
    });

    initialReq.on('error', reject);
    initialReq.end();
  });
}

getLiveGeMBids().then(result => {
  console.log('Result Status Code:', result.statusCode);
  if (result.data) {
    console.log('Response Code:', result.data.code);
    console.log('Total live bids found on GeM:', result.data.response?.response?.numFound);
    const docs = result.data.response?.response?.docs || [];
    console.log(`Received ${docs.length} docs:`);
    docs.slice(0, 3).forEach((d, idx) => {
      console.log(`\n--- Live Bid #${idx + 1} ---`);
      console.log('Bid Number (b_bid_number):', d.b_bid_number);
      console.log('Category (b_category_name):', d.b_category_name);
      console.log('Total Quantity (b_total_quantity):', d.b_total_quantity);
      console.log('Bid End Date (final_end_date):', d.final_end_date);
      console.log('Buyer/Dept/Ministry:', d.b_bid_details);
    });
  } else {
    console.log('Raw output:', result.raw);
  }
}).catch(console.error);
