const iterations = 1000000;
const p = Buffer.from(JSON.stringify({ exp: 1718000000, sub: 'user123', scope: 'api', iss: 'auth', aud: 'test', very: 'long', payload: 'to', make: 'it', more: 'realistic', string: 'of characters' })).toString('base64url');

console.time('atob branch');
for(let i=0; i<iterations; i++) {
  const payloadB64 = p.replace(/-/g, '+').replace(/_/g, '/');
  const json = atob(payloadB64);
}
console.timeEnd('atob branch');

console.time('Buffer logic');
for(let i=0; i<iterations; i++) {
  const json = Buffer.from(p, 'base64url').toString('utf8');
}
console.timeEnd('Buffer logic');
