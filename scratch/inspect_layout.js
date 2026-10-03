const puppeteer = require('puppeteer-core');
const path = require('path');

async function main() {
  const browser = await puppeteer.launch({
    executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  const page = await browser.newPage();
  const fileUrl = 'file:///' + path.resolve('thesis_document.html').replace(/\\/g, '/');
  await page.goto(fileUrl, { waitUntil: 'networkidle0' });

  const headings = await page.evaluate(() => {
    const hs = Array.from(document.querySelectorAll('h1, h2, .figure-container'));
    return hs.map(h => ({
      tag: h.tagName,
      class: h.className,
      text: (h.innerText || '').slice(0, 60),
      top: h.offsetTop,
      height: h.offsetHeight
    }));
  });

  console.log(`Found ${headings.length} headings/figures.`);
  headings.forEach(h => {
    console.log(`${h.tag} [top: ${Math.round(h.top)}px, ht: ${Math.round(h.height)}px] - ${h.text}`);
  });

  await browser.close();
}

main().catch(console.error);
