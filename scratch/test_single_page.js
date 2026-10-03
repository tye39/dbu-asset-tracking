const puppeteer = require('puppeteer-core');
const path = require('path');
const fs = require('fs');
const zlib = require('zlib');

async function checkPage(pageNum) {
  const browser = await puppeteer.launch({
    executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-gpu']
  });
  const page = await browser.newPage();
  const fileUrl = 'file:///' + path.resolve('calibrated_thesis.html').replace(/\\/g, '/');
  await page.goto(fileUrl, { waitUntil: 'networkidle0' });
  await page.evaluateHandle('document.fonts.ready');

  const pdfBuf = await page.pdf({
    pageRanges: `${pageNum}`,
    format: 'A4',
    printBackground: true,
    preferCSSPageSize: true,
    margin: { top: '0mm', right: '0mm', bottom: '0mm', left: '0mm' }
  });
  await browser.close();

  // Search uncompressed streams
  const content = pdfBuf.toString('binary');
  const streamRegex = /<<([^\>]*?)>>\s*stream\r?\n([\s\S]*?)\r?\nendstream/g;
  let match;
  let allText = '';
  while ((match = streamRegex.exec(content)) !== null) {
    if (match[1].includes('/FlateDecode')) {
      try {
        const decomp = zlib.inflateSync(Buffer.from(match[2], 'binary')).toString('latin1');
        allText += ' ' + decomp;
      } catch(e) {}
    }
  }
  return allText;
}

async function main() {
  const p9 = await checkPage(9);
  console.log('Page 9 stream length:', p9.length);
  // Check if Latin1 characters contain "Chapter" or similar
  const readable = p9.replace(/[^\x20-\x7E]/g, ' ').replace(/\s+/g, ' ');
  console.log('Page 9 readable snippet:', readable.slice(0, 300));
}

main().catch(console.error);
