function testArraySpread() {
  const values = Array(100000).fill(1).map(() => Math.random() * 100);

  console.time('Math.max(...values)');
  for (let i = 0; i < 100; i++) {
    const max = Math.max(...values, 1);
  }
  console.timeEnd('Math.max(...values)');

  console.time('values.reduce');
  for (let i = 0; i < 100; i++) {
    const max = values.reduce((m, val) => (val > m ? val : m), 1);
  }
  console.timeEnd('values.reduce');
}
testArraySpread();
