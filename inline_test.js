const values = Array.from({ length: 1000000 }, (_, i) => i);
console.time('Math.max with spread');
try {
  Math.max(...values, 1);
} catch (e) {
  console.log('Error:', e.message);
}
console.timeEnd('Math.max with spread');

console.time('reduce');
values.reduce((m, v) => (v > m ? v : m), 1);
console.timeEnd('reduce');
