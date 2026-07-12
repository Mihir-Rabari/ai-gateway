const items = [{value: 10}, {value: 20}, {value: 30}];
console.time('map spread');
for (let i = 0; i < 1000000; i++) {
  Math.max(...items.map(item => item.value), 1);
}
console.timeEnd('map spread');

console.time('reduce');
for (let i = 0; i < 1000000; i++) {
  items.reduce((max, item) => item.value > max ? item.value : max, 1);
}
console.timeEnd('reduce');

console.time('for');
for (let i = 0; i < 1000000; i++) {
  let max = 1;
  for (let j = 0; j < items.length; j++) {
    if (items[j].value > max) max = items[j].value;
  }
}
console.timeEnd('for');
