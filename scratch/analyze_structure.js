const fs = require('fs');
const html = fs.readFileSync('thesis_document.html', 'utf8');
const lines = html.split('\n');

console.log('--- EXPLICIT PAGE BREAKS ---');
lines.forEach((l, i) => {
  if (l.includes('class="page-break"') || l.includes('page-break-before')) {
    const context = lines.slice(Math.max(0, i-1), Math.min(lines.length, i+3)).map(x=>x.trim()).join(' -> ');
    console.log(`Line ${i+1}: ${context}`);
  }
});

console.log('\n--- CHAPTER & SECTION HEADINGS ---');
lines.forEach((l, i) => {
  if (l.match(/<h[12][^>]*>/)) {
    console.log(`Line ${i+1}: ${l.trim().replace(/<[^>]+>/g, '')}`);
  }
});
