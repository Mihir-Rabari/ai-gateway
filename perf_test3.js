const iterations = 1000000;

function makeJwt(payload) {
  const header = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url');
  const body = Buffer.from(JSON.stringify(payload)).toString('base64url');
  return `${header}.${body}.signature`;
}
const token = makeJwt({ exp: 1718000000, sub: 'user123', scope: 'api', iss: 'auth', aud: 'test', very: 'long', payload: 'to', make: 'it', more: 'realistic', string: 'of characters' });
const parts = token.split('.');
const p = parts[1];

console.time('current logic');
for(let i=0; i<iterations; i++) {
  const payloadB64 = p.replace(/-/g, '+').replace(/_/g, '/');
  const json = typeof atob === 'function' ? atob(payloadB64) : Buffer.from(payloadB64, 'base64').toString('utf8');
  JSON.parse(json);
}
console.timeEnd('current logic');

console.time('optimized logic');
for(let i=0; i<iterations; i++) {
  const json = typeof Buffer !== 'undefined'
    ? Buffer.from(p, 'base64url').toString('utf8')
    : typeof atob === 'function'
      ? atob(p.replace(/-/g, '+').replace(/_/g, '/'))
      : Buffer.from(p.replace(/-/g, '+').replace(/_/g, '/'), 'base64').toString('utf8'); // fallback if needed, but not realistic to hit if Buffer isn't defined and atob isn't defined
  JSON.parse(json);
}
console.timeEnd('optimized logic');
