const puppeteer = require('puppeteer-core');
const path = require('path');
const fs = require('fs');

async function testToc() {
  let html = fs.readFileSync('calibrated_thesis.html', 'utf8');
  const parts = html.split(/<div class="page-break"><\/div>/);
  
  // Section 4 is TOC
  const tocHtml = parts[4];
  
  // Calibrated CSS with slightly tighter TOC
  const tightTocCss = `
    @page { size: A4; margin: 18mm 16mm 18mm 16mm; }
    body { font-family: 'Times New Roman', serif; font-size: 11pt; }
    h1.chapter-title { font-family: 'Segoe UI', sans-serif; font-size: 16pt; text-align: center; text-transform: uppercase; border-bottom: 2px solid #1E3A8A; padding-bottom: 6px; margin-top: 0.4em; margin-bottom: 0.6em; }
    .toc-table { width: 100%; border-collapse: collapse; }
    .toc-table td { padding: 1.8px 4px; font-size: 8pt; line-height: 1.15; border-bottom: 1px dotted #E2E8F0; }
  `;

  const doc = `<!DOCTYPE html><html><head><style>${tightTocCss}</style></head><body>${tocHtml}</body></html>`;
  fs.writeFileSync('temp_toc.html', doc, 'utf8');

  const browser = await puppeteer.launch({
    executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-gpu']
  });
  const page = await browser.newPage();
  await page.goto('file:///' + path.resolve('temp_toc.html').replace(/\\/g, '/'), { waitUntil: 'networkidle0' });
  
  const pdfBuf = await page.pdf({
    format: 'A4',
    preferCSSPageSize: true,
    margin: { top: '18mm', bottom: '18mm', left: '16mm', right: '16mm' }
  });
  await browser.close();

  const text = pdfBuf.toString('binary');
  const countMatches = [...text.matchAll(/\/Type\s*\/Pages[^>]*?\/Count\s+(\d+)/g)];
  const count = countMatches.length ? parseInt(countMatches[countMatches.length - 1][1]) : 1;
  console.log(`TOC with tight padding takes: ${count} pages`);
  try { fs.unlinkSync('temp_toc.html'); } catch(e) {}
}

testToc().catch(console.error);
