const https = require('https');
const cheerio = require('cheerio');

async function testMaharashtraSearch(searchKeyword = "Maharashtra") {
  return new Promise((resolve, reject) => {
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

        const postPayload = {
          page: 1,
          param: { searchBid: searchKeyword },
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
            'Cookie': cookieHeader
          }
        }, (postRes) => {
          let jsonStr = '';
          postRes.on('data', d => jsonStr += d);
          postRes.on('end', () => {
            try {
              const data = JSON.parse(jsonStr);
              resolve(data);
            } catch (err) {
              reject(err);
            }
          });
        });
        postReq.write(postData);
        postReq.end();
      });
    }).on('error', reject);
  });
}

testMaharashtraSearch("Maharashtra").then(res => {
  console.log('Search for Maharashtra - numFound:', res.response?.response?.numFound);
  const docs = res.response?.response?.docs || [];
  console.log(`Returned ${docs.length} docs:`);
  docs.slice(0, 3).forEach((d, idx) => {
    console.log(`\nDoc #${idx + 1}:`);
    console.log('Bid No:', d.b_bid_number);
    console.log('Category:', d.b_category_name || d.bd_category_name);
    console.log('Ministry:', d.ba_official_details_minName);
    console.log('Dept:', d.ba_official_details_deptName);
  });
}).catch(console.error);
