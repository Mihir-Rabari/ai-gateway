function testArraySpread() {
  const values = Array(150000).fill(1).map(() => Math.random() * 100);

  try {
    const max = Math.max(...values, 1);
  } catch(e) {
    console.error("Math.max(...) threw error: " + e.message);
  }
}
testArraySpread();
