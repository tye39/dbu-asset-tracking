const fs = require('fs');
const zlib = require('zlib');

const buf = fs.readFileSync('DBU_Asset_Tracking_System_Thesis.pdf');
const content = buf.toString('binary');

// Find all streams
const streamRegex = /<<([^\>]*?)>>\s*stream\r?\n([\s\S]*?)\r?\nendstream/g;
let sMatch;
let streamIndex = 0;
while ((sMatch = streamRegex.exec(content)) !== null) {
  streamIndex++;
  const dict = sMatch[1];
  const data = Buffer.from(sMatch[2], 'binary');
  if (dict.includes('/FlateDecode')) {
    try {
      const decomp = zlib.inflateSync(data).toString('utf8');
      if (decomp.includes('Chapter') || decomp.includes('DBU') || decomp.includes('Abstract')) {
        console.log(`Stream ${streamIndex}: contains keywords! Length: ${decomp.length}`);
        // show snippet
        console.log(decomp.slice(0, 300));
        break;
      }
    } catch(e) {}
  }
}
