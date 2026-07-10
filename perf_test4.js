const iterations = 1000000;
function makeJwt(payload) {
  const header = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url');
  const body = Buffer.from(JSON.stringify(payload)).toString('base64url');
  return `${header}.${body}.signature`;
}
const token = makeJwt({ exp: 1718000000, sub: 'user123', scope: 'api', iss: 'auth', aud: 'test', very: 'long', payload: 'to', make: 'it', more: 'realistic', string: 'of characters' });
const parts = token.split('.');
const p = parts[1];

console.time('current logic (Node 20+)');
for(let i=0; i<iterations; i++) {
  // In Node.js 20+, `typeof atob === 'function'` is TRUE, so it takes the atob path!
  const payloadB64 = p.replace(/-/g, '+').replace(/_/g, '/');
  const json = atob(payloadB64);
  JSON.parse(json);
}
console.timeEnd('current logic (Node 20+)');

console.time('Buffer logic (Node native)');
for(let i=0; i<iterations; i++) {
  const json = Buffer.from(p, 'base64url').toString('utf8');
  JSON.parse(json);
}
console.timeEnd('Buffer logic (Node native)');
