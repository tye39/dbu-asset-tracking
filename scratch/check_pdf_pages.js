const fs = require('fs');

const buf = fs.readFileSync('DBU_Asset_Tracking_System_Thesis.pdf');
const text = buf.toString('binary');

// Find /Type /Pages /Count N
const countMatches = [...text.matchAll(/\/Type\s*\/Pages[^>]*?\/Count\s+(\d+)/g)];
console.log('Pages count matches:', countMatches.map(m => m[1]));

// Also find /Type /Page (excluding /Pages)
const singlePages = text.match(/\/Type\s*\/Page\b/g);
console.log('Single /Type /Page count:', singlePages ? singlePages.length : 0);
