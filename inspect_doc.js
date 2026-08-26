const https = require('https');
const cheerio = require('cheerio');

async function inspectFirstDoc() {
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
          param: { searchBid: "" },
          filter: { bidStatusType: "ongoing_bids", byType: "all", highValue: "all" }
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
            const data = JSON.parse(jsonStr);
            console.log('Complete Doc #0 Keys & Values:');
            console.log(JSON.stringify(data.response.response.docs[0], null, 2));
            resolve();
          });
        });
        postReq.write(postData);
        postReq.end();
      });
    }).on('error', reject);
  });
}

inspectFirstDoc();
