const puppeteer = require('puppeteer-core');
const path = require('path');
const fs = require('fs');

async function main() {
  const htmlPath = path.resolve('thesis_document.html');
  const pdfPath = path.resolve('DBU_Asset_Tracking_System_Thesis.pdf');

  console.log('Loading HTML:', htmlPath);
  const browser = await puppeteer.launch({
    executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-gpu', '--allow-file-access-from-files']
  });

  const page = await browser.newPage();
  
  // Set viewport
  await page.setViewport({ width: 1200, height: 1600 });

  // Navigate to file URL
  const fileUrl = 'file:///' + htmlPath.replace(/\\/g, '/');
  console.log('Navigating to:', fileUrl);
  await page.goto(fileUrl, { waitUntil: 'networkidle0', timeout: 60000 });

  // Wait for fonts and all images to load
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

  console.log('Rendering PDF...');
  await page.pdf({
    path: pdfPath,
    format: 'A4',
    printBackground: true,
    preferCSSPageSize: true,
    displayHeaderFooter: false,
    margin: {
      top: '0mm',
      right: '0mm',
      bottom: '0mm',
      left: '0mm'
    }
  });

  await browser.close();
  console.log('PDF saved to:', pdfPath);

  // Check file size and page count
  const stats = fs.statSync(pdfPath);
  console.log('PDF size in bytes:', stats.size);

  const pdfBuf = fs.readFileSync(pdfPath);
  // Count pages by searching for /Type /Page
  const content = pdfBuf.toString('binary');
  const pageMatches = content.match(/\/Type\s*\/Page\b/g);
  console.log('Page count (regex /Type /Page):', pageMatches ? pageMatches.length : 'unknown');
}

main().catch(err => {
  console.error('Error generating PDF:', err);
  process.exit(1);
});
