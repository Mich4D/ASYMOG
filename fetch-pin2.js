import https from 'https';

https.get('https://www.pinterest.com/pin/1066719861757849423/', (res) => {
  let data = '';
  res.on('data', chunk => { data += chunk; });
  res.on('end', () => {
    const match = data.match(/<title>(.*?)<\/title>/);
    if (match) console.log(match[1]);
    const desc = data.match(/<meta name="description" content="(.*?)"/);
    if (desc) console.log(desc[1]);
  });
});
