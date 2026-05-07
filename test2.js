import http from 'http';

const req = http.request({
  hostname: 'localhost',
  port: 3000,
  path: '/api/settings',
  method: 'GET'
}, res => {
  console.log(`STATUS: ${res.statusCode}`);
});
req.on('error', e => console.error(e));
req.end();
