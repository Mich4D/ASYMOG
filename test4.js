import http from 'http';

const data = JSON.stringify({
  idNumber: "123456789"
});

const req = http.request({
  hostname: 'localhost',
  port: 3000,
  path: '/api/verify-identity',
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
