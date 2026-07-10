const iterations = 1000000;
const p = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9"; // not perfectly base64url but just an example

console.time('atob branch');
for(let i=0; i<iterations; i++) {
  const json = typeof atob === 'function' ? atob(p.replace(/-/g, '+').replace(/_/g, '/')) : Buffer.from(p.replace(/-/g, '+').replace(/_/g, '/'), 'base64').toString('utf8');
}
console.timeEnd('atob branch');

console.time('Buffer branch');
for(let i=0; i<iterations; i++) {
  const json = typeof Buffer !== 'undefined' ? Buffer.from(p, 'base64url').toString('utf8') : atob(p.replace(/-/g, '+').replace(/_/g, '/'));
}
console.timeEnd('Buffer branch');
