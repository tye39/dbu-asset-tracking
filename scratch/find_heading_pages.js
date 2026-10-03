const puppeteer = require('puppeteer-core');
const path = require('path');
const fs = require('fs');

async function main() {
  const browser = await puppeteer.launch({
    executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const page = await browser.newPage();
  
  // We can inject a hidden marker on each element that records its page or position
  // Even better, let's use Chrome DevTools Protocol (CDP)!
  // CDP has Page.getLayoutMetrics and DOM.getBoxModel!
  // But during print emulation:
  await page.emulateMediaType('print');
  
  let html = fs.readFileSync('thesis_document.html', 'utf8');
  const tempHtmlPath = path.resolve('temp_calib.html');
  fs.writeFileSync(tempHtmlPath, html, 'utf8');

  await page.goto('file:///' + tempHtmlPath.replace(/\\/g, '/'), { waitUntil: 'networkidle0' });

  // Evaluate positions in print mode
  const data = await page.evaluate(() => {
    const headings = Array.from(document.querySelectorAll('h1, h2, .figure-container, .table-caption'));
    return headings.map(h => {
      const rect = h.getBoundingClientRect();
      return {
        tag: h.tagName,
        text: (h.innerText || '').slice(0, 50).trim(),
        top: rect.top + window.scrollY,
        height: rect.height
      };
    });
  });

  console.log('Total items found:', data.length);
  // Print top items
  data.filter(d => d.tag === 'H1' || d.tag === 'H2').forEach(d => {
    console.log(`${d.tag} [top: ${Math.round(d.top)}] ${d.text}`);
  });

  await browser.close();
  try { fs.unlinkSync(tempHtmlPath); } catch(e) {}
}

main().catch(console.error);
