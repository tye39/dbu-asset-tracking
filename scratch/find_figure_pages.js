const puppeteer = require('puppeteer-core');
const path = require('path');
const fs = require('fs');

async function main() {
  const browser = await puppeteer.launch({
    executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-gpu']
  });

  const page = await browser.newPage();
  const fileUrl = 'file:///' + path.resolve('calibrated_thesis.html').replace(/\\/g, '/');
  await page.goto(fileUrl, { waitUntil: 'networkidle0' });

  // In Puppeteer, let's inject a marker onto every caption
  const captions = await page.evaluate(() => {
    const list = [];
    const elements = document.querySelectorAll('.figure-caption, .table-caption, h1, h2');
    elements.forEach((el, idx) => {
      const id = 'item-' + idx;
      el.setAttribute('data-idx', id);
      list.push({
        id,
        tag: el.tagName,
        text: el.innerText.trim(),
        offsetTop: el.offsetTop
      });
    });
    return list;
  });

  console.log(`Found ${captions.length} target elements.`);

  // To find the exact page of each item:
  // In Chromium print layout, we can inspect element offsets or print single pages and check text!
  // Even simpler: let's test print pageRanges and see if the item is present!
  // We can do this efficiently for the key figures and tables:
  const keyItems = captions.filter(c => 
    c.text.startsWith('Figure 3.') || 
    c.text.startsWith('Figure 5.') || 
    c.text.startsWith('Table ') ||
    c.tag === 'H1' ||
    (c.tag === 'H2' && (c.text.startsWith('1.') || c.text.startsWith('2.') || c.text.startsWith('3.') || c.text.startsWith('4.') || c.text.startsWith('5.') || c.text.startsWith('6.') || c.text.startsWith('7.') || c.text.startsWith('8.')))
  );

  console.log(`Checking page numbers for ${keyItems.length} key headings/captions...`);

  // We can check each page from 1 to 49
  // By printing each page and searching for the unique text
  for (let p = 1; p <= 49; p++) {
    const pdfBuf = await page.pdf({
      pageRanges: `${p}`,
      format: 'A4',
      printBackground: true,
      preferCSSPageSize: true,
      displayHeaderFooter: true,
      headerTemplate: '<div></div>',
      footerTemplate: `<div style="font-size:8pt;padding:0 16mm;width:100%;display:flex;justify-content:space-between;"><span>DBU</span><span>Page <span class="pageNumber"></span></span></div>`,
      margin: { top: '18mm', bottom: '18mm', left: '16mm', right: '16mm' }
    });

    // Check which items appear on this page by checking if the PDF text contains keywords
    // Wait, since PDF streams are hex/CID encoded, how to check?
    // We can evaluate which items are on page p by calculating their page in DOM:
    // Or we can evaluate in the page context by checking the cumulative offsets!
  }

  await browser.close();
}

main().catch(console.error);
