const puppeteer = require('puppeteer-core');
const path = require('path');
const fs = require('fs');

async function compileFinalPdf() {
  const htmlPath = path.resolve('thesis_document.html');
  const pdfPath = path.resolve('DBU_Asset_Tracking_System_Thesis.pdf');

  console.log('Loading thesis document from:', htmlPath);

  const browser = await puppeteer.launch({
    executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    headless: true,
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-gpu',
      '--allow-file-access-from-files'
    ]
  });

  const page = await browser.newPage();
  const fileUrl = 'file:///' + htmlPath.replace(/\\/g, '/');

  await page.goto(fileUrl, { waitUntil: 'networkidle0', timeout: 90000 });

  // Ensure fonts and all images are fully loaded
  await page.evaluateHandle('document.fonts.ready');
  const imgStatus = await page.evaluate(async () => {
    const images = Array.from(document.querySelectorAll('img'));
    let loaded = 0;
    let failed = 0;
    await Promise.all(images.map(img => {
      if (img.complete && img.naturalHeight !== 0) {
        loaded++;
        return Promise.resolve();
      }
      return new Promise(resolve => {
        img.addEventListener('load', () => { loaded++; resolve(); });
        img.addEventListener('error', () => { failed++; resolve(); });
      });
    }));
    return { total: images.length, loaded, failed };
  });

  console.log(`Image loading status: ${imgStatus.loaded}/${imgStatus.total} loaded, ${imgStatus.failed} failed.`);

  console.log('Generating final publication PDF...');
  await page.pdf({
    path: pdfPath,
    format: 'A4',
    printBackground: true,
    preferCSSPageSize: true,
    displayHeaderFooter: true,
    headerTemplate: '<div></div>',
    footerTemplate: `
      <div style="font-size: 8pt; font-family: 'Segoe UI', Arial, sans-serif; color: #64748B; width: 100%; display: flex; justify-content: space-between; padding: 0 16mm; box-sizing: border-box;">
        <span>Debre Berhan University &bull; DBU Asset Tracking System Thesis</span>
        <span>Page <span class="pageNumber"></span> of <span class="totalPages"></span></span>
      </div>
    `,
    margin: {
      top: '18mm',
      bottom: '18mm',
      left: '16mm',
      right: '16mm'
    }
  });

  await browser.close();

  const stats = fs.statSync(pdfPath);
  console.log(`PDF successfully generated at: ${pdfPath}`);
  console.log(`File size: ${(stats.size / (1024 * 1024)).toFixed(2)} MB (${stats.size} bytes)`);

  const pdfBuf = fs.readFileSync(pdfPath);
  const text = pdfBuf.toString('binary');
  const countMatches = [...text.matchAll(/\/Type\s*\/Pages[^>]*?\/Count\s+(\d+)/g)];
  const pageCount = countMatches.length ? parseInt(countMatches[countMatches.length - 1][1]) : 0;
  console.log(`FINAL VERIFIED TOTAL PAGE COUNT: ${pageCount} PAGES`);

  if (pageCount <= 50 && pageCount >= 40) {
    console.log('SUCCESS: Page count strictly conforms to 50 PAGES MAXIMUM (Target: 40-50 pages).');
  } else {
    console.warn(`WARNING: Page count ${pageCount} outside target range (40-50 pages).`);
  }
}

compileFinalPdf().catch(err => {
  console.error('Compilation failed:', err);
  process.exit(1);
});
