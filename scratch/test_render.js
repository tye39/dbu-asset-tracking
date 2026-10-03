const puppeteer = require('puppeteer-core');
const path = require('path');
const fs = require('fs');

async function testRender(customCss = '') {
  let html = fs.readFileSync('thesis_document.html', 'utf8');
  if (customCss) {
    html = html.replace('</head>', `<style>${customCss}</style></head>`);
  }
  const testHtmlPath = path.resolve('scratch/test_doc.html');
  const testPdfPath = path.resolve('scratch/test_doc.pdf');
  fs.writeFileSync(testHtmlPath, html, 'utf8');

  const browser = await puppeteer.launch({
    executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-gpu', '--allow-file-access-from-files']
  });

  const page = await browser.newPage();
  const fileUrl = 'file:///' + testHtmlPath.replace(/\\/g, '/');
  await page.goto(fileUrl, { waitUntil: 'networkidle0', timeout: 60000 });
  await page.evaluateHandle('document.fonts.ready');
  await page.evaluate(async () => {
    const images = Array.from(document.querySelectorAll('img'));
    await Promise.all(images.map(img => {
      if (img.complete) return Promise.resolve();
      return new Promise(resolve => {
        img.addEventListener('load', resolve);
        img.addEventListener('error', resolve);
      });
    }));
  });

  await page.pdf({
    path: testPdfPath,
    format: 'A4',
    printBackground: true,
    preferCSSPageSize: true,
    displayHeaderFooter: false,
    margin: { top: '0mm', right: '0mm', bottom: '0mm', left: '0mm' }
  });

  await browser.close();

  const pdfBuf = fs.readFileSync(testPdfPath);
  const text = pdfBuf.toString('binary');
  const countMatches = [...text.matchAll(/\/Type\s*\/Pages[^>]*?\/Count\s+(\d+)/g)];
  const pageCount = countMatches.length ? parseInt(countMatches[countMatches.length - 1][1]) : 0;
  console.log(`Rendered PDF with page count: ${pageCount}`);
  return pageCount;
}

// Let's test with default
testRender().catch(console.error);
