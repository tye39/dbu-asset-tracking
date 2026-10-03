const fs = require('fs');
const zlib = require('zlib');

const buf = fs.readFileSync('DBU_Asset_Tracking_System_Thesis.pdf');
const content = buf.toString('binary');

// Find all page objects
// In PDF: obj ... << /Type /Page ... /Contents N 0 R ... >> endobj
const pageRegex = /(\d+)\s+0\s+obj\s*<<\s*\/Type\s*\/Page\b([\s\S]*?)>>\s*endobj/g;
let match;
let pageIndex = 1;
const pages = [];

while ((match = pageRegex.exec(content)) !== null) {
  const objNum = match[1];
  const dict = match[2];
  
  // Find Contents reference: /Contents (\d+) 0 R or /Contents \[ (.*?) \]
  const contentsMatch = dict.match(/\/Contents\s+(\d+)\s+0\s+R/) || dict.match(/\/Contents\s*\[\s*([\d\sR]+)\s*\]/);
  pages.push({
    pageNumber: pageIndex++,
    objNum,
    contentsRef: contentsMatch ? contentsMatch[1] : null
  });
}

console.log(`Found ${pages.length} pages in PDF.`);

// Function to find object stream and decompress
function getStreamText(objNum) {
  const objRegex = new RegExp(`${objNum}\\s+0\\s+obj\\s*<<([\\s\\S]*?)>>\\s*stream\\r?\\n([\\s\\S]*?)\\r?\\nendstream`, 'g');
  const streamMatch = objRegex.exec(content);
  if (!streamMatch) return '';
  const streamDict = streamMatch[1];
  const streamData = Buffer.from(streamMatch[2], 'binary');
  
  try {
    let uncompressed;
    if (streamDict.includes('/FlateDecode')) {
      uncompressed = zlib.inflateSync(streamData);
    } else {
      uncompressed = streamData;
    }
    const textStr = uncompressed.toString('utf8');
    // Extract text in parentheses: \((.*?)\)\s*Tj or \[(.*?)\]\s*TJ
    const tjMatches = [...textStr.matchAll(/\((.*?)\)\s*Tj/g)].map(m => m[1]);
    return tjMatches.join(' ');
  } catch (e) {
    return '';
  }
}

pages.forEach(p => {
  if (p.contentsRef) {
    // If multiple refs e.g. "12 0 R 13 0 R"
    const refs = p.contentsRef.split(/\s+/).filter(x => /^\d+$/.test(x));
    let allText = '';
    refs.forEach(r => {
      allText += ' ' + getStreamText(r);
    });
    // Print first 100 characters of text on this page
    const cleanText = allText.replace(/\\([()\\])/g, '$1').replace(/\s+/g, ' ').trim();
    console.log(`Page ${p.pageNumber}: ${cleanText.slice(0, 90)}...`);
  } else {
    console.log(`Page ${p.pageNumber}: [No contents ref]`);
  }
});
