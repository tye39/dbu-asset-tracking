const puppeteer = require('puppeteer-core');
const path = require('path');
const fs = require('fs');

async function testFooter() {
  const browser = await puppeteer.launch({
    executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-gpu']
  });

  const page = await browser.newPage();
  await page.setContent(`
    <html>
      <head>
        <style>
          @page { size: A4; margin: 20mm 15mm 20mm 15mm; }
          body { font-family: sans-serif; }
          .page-break { page-break-before: always; }
        </style>
      </head>
      <body>
        <div>Page 1 Content</div>
        <div class="page-break">Page 2 Content</div>
        <div class="page-break">Page 3 Content</div>
      </body>
    </html>
  `);

  await page.pdf({
    path: 'scratch/test_footer.pdf',
    format: 'A4',
    displayHeaderFooter: true,
    headerTemplate: '<div></div>',
    footerTemplate: `
      <div style="font-size: 8pt; font-family: Arial, sans-serif; color: #475569; width: 100%; display: flex; justify-content: space-between; padding: 0 15mm; box-sizing: border-box;">
        <span>DBU Asset Tracking System</span>
        <span>Page <span class="pageNumber"></span> of <span class="totalPages"></span></span>
      </div>
    `,
    margin: {
      top: '15mm',
      bottom: '15mm',
      left: '15mm',
      right: '15mm'
    }
  });

  await browser.close();
  console.log('Test footer PDF generated successfully!');
}

testFooter().catch(console.error);
