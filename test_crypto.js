const { timingSafeEqual } = require('crypto');
const buf1 = Buffer.from('abc');
const buf2 = Buffer.from('abc');
console.log(timingSafeEqual(buf1, buf2));
