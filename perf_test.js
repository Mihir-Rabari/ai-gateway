const crypto = require('crypto');
function makeJwt(payload) {
  const header = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url');
  const body = Buffer.from(JSON.stringify(payload)).toString('base64url');
  return `${header}.${body}.signature`;
}

const token = makeJwt({ exp: 1718000000, sub: 'user123', scope: 'api', iss: 'auth', aud: 'test' });
const parts = token.split('.');
const p = parts[1];

const iterations = 1000000;

console.time('atob + replace');
for (let i = 0; i < iterations; i++) {
  const payloadB64 = p.replace(/-/g, '+').replace(/_/g, '/');
  const json = atob(payloadB64);
}
console.timeEnd('atob + replace');

console.time('Buffer.from base64url');
for (let i = 0; i < iterations; i++) {
  const json = Buffer.from(p, 'base64url').toString('utf8');
}
console.timeEnd('Buffer.from base64url');
