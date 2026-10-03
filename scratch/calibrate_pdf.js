const puppeteer = require('puppeteer-core');
const path = require('path');
const fs = require('fs');

async function testCalibration(cssOverride) {
  let html = fs.readFileSync('thesis_document.html', 'utf8');
  if (cssOverride) {
    // Inject before </head>
    html = html.replace('</head>', `<style id="calibration-style">\n${cssOverride}\n</style></head>`);
  }
  
  // Save to root as temp_calib.html so all image paths (public/...) resolve identically
  const tempHtmlPath = path.resolve('temp_calib.html');
  const tempPdfPath = path.resolve('temp_calib.pdf');
  fs.writeFileSync(tempHtmlPath, html, 'utf8');

  const browser = await puppeteer.launch({
    executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-gpu', '--allow-file-access-from-files']
  });

  const page = await browser.newPage();
  const fileUrl = 'file:///' + tempHtmlPath.replace(/\\/g, '/');
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
    path: tempPdfPath,
    format: 'A4',
    printBackground: true,
    preferCSSPageSize: true,
    displayHeaderFooter: false,
    margin: { top: '0mm', right: '0mm', bottom: '0mm', left: '0mm' }
  });

  await browser.close();

  const pdfBuf = fs.readFileSync(tempPdfPath);
  const text = pdfBuf.toString('binary');
  const countMatches = [...text.matchAll(/\/Type\s*\/Pages[^>]*?\/Count\s+(\d+)/g)];
  const pageCount = countMatches.length ? parseInt(countMatches[countMatches.length - 1][1]) : 0;
  
  // Cleanup temp files
  try { fs.unlinkSync(tempHtmlPath); } catch(e) {}
  try { fs.unlinkSync(tempPdfPath); } catch(e) {}

  console.log(`Page count with this CSS: ${pageCount}`);
  return pageCount;
}

const css = `
  @page {
    size: A4 portrait;
    margin: 18mm 16mm 18mm 16mm;
  }
  body {
    font-size: 11pt;
    line-height: 1.38;
  }
  p {
    margin-top: 0.3em;
    margin-bottom: 0.45em;
  }
  h1, h2, h3, h4 {
    margin-top: 0.9em;
    margin-bottom: 0.3em;
  }
  h1.chapter-title {
    font-size: 16pt;
    margin-top: 0.5em;
    margin-bottom: 0.7em;
  }
  h2 {
    font-size: 12.5pt;
  }
  h3 {
    font-size: 11pt;
  }
  table {
    font-size: 8.5pt;
    margin: 0.6em 0;
  }
  th, td {
    padding: 4px 6px;
  }
  .toc-table td {
    padding: 2.5px 5px;
    font-size: 8.5pt;
    line-height: 1.25;
  }
  .figure-container {
    margin: 10px 0;
  }
  .figure-container img, .figure-container svg {
    max-width: 90%;
    max-height: 380px;
    width: auto;
    height: auto;
  }
  .figure-container.large img, .figure-container.large svg {
    max-width: 95%;
    max-height: 420px;
    width: auto;
    height: auto;
  }
  .figure-container.screenshot {
    margin: 8px 0 4px 0;
  }
  .figure-container.screenshot img {
    max-width: 82%;
    max-height: 255px;
    width: auto;
    height: auto;
  }
  .screenshot-explanation {
    font-size: 9.5pt;
    line-height: 1.32;
    margin: 4px 4% 12px 4%;
  }
  .table-caption, .figure-caption {
    font-size: 8.5pt;
    margin-top: 4px;
    margin-bottom: 8px;
  }
`;

testCalibration(css).catch(console.error);
