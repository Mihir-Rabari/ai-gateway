const items = Array.from({ length: 1000000 }, (_, i) => ({ value: i }));
console.time('Math.max with spread and map');
try {
  Math.max(...items.map((i) => i.value), 1);
} catch (e) {
  console.log('Error:', e.message);
}
console.timeEnd('Math.max with spread and map');

console.time('reduce');
items.reduce((max, i) => Math.max(max, i.value), 1);
console.timeEnd('reduce');
