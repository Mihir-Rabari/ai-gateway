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
}
console.timeEnd('current logic');

console.time('optimized logic (Buffer first)');
for(let i=0; i<iterations; i++) {
  let json;
  if (typeof Buffer !== 'undefined') {
    json = Buffer.from(p, 'base64url').toString('utf8');
  } else if (typeof atob === 'function') {
    json = atob(p.replace(/-/g, '+').replace(/_/g, '/'));
  }
}
console.timeEnd('optimized logic (Buffer first)');
