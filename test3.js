import http from 'http';

const data = JSON.stringify({
  settings: {
    flutterwaveSecretKey: "FLWSECK_TEST-123"
  }
});

const req = http.request({
  hostname: 'localhost',
  port: 3000,
  path: '/api/settings',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Content-Length': Buffer.byteLength(data)
  }
}, res => {
  console.log(`STATUS: ${res.statusCode}`);
  res.on('data', d => process.stdout.write(d));
});
req.on('error', e => console.error(e));
req.write(data);
req.end();
