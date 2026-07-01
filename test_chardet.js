const jschardet = require('jschardet');
const iconv = require('iconv-lite');
const fs = require('fs');

// Create a small shift-jis string
const str = '"2000","2026/05/09","摘要","売上"';
const buf = iconv.encode(str, 'Shift_JIS');

const detected = jschardet.detect(buf);
console.log('Detected:', detected);
