import https from 'https';

https.get('https://www.pinterest.com/pin/1066719861757849423/', (res) => {
  let data = '';
  res.on('data', chunk => { data += chunk; });
  res.on('end', () => {
    const match = data.match(/<meta property="og:image" content="(.*?)"/);
    if (match) console.log(match[1]);
    else console.log('no image found');
  });
});
