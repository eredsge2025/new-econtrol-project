
const iconv = require('iconv-lite');
console.log('Type of iconv:', typeof iconv);
console.log('Exports:', Object.keys(iconv));
console.log('Has decode?', typeof iconv.decode === 'function');
