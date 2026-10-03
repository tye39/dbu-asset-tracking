const puppeteer = require('puppeteer-core');
const path = require('path');
const fs = require('fs');

async function main() {
  const css = `
    @page {
      size: A4 portrait;
      margin: 18mm 16mm 18mm 16mm;
    }
    body {
      font-family: 'Times New Roman', Times, Georgia, serif;
      font-size: 11pt;
      line-height: 1.38;
      color: #111827;
      background: #FFFFFF;
      margin: 0;
      padding: 0;
      text-align: justify;
    }
    p {
      margin-top: 0.3em;
      margin-bottom: 0.45em;
      text-indent: 1.5em;
    }
    p.no-indent {
      text-indent: 0;
    }
    h1, h2, h3, h4 {
      font-family: 'Segoe UI', Arial, Helvetica, sans-serif;
      color: #0F172A;
      font-weight: 700;
      margin-top: 0.9em;
      margin-bottom: 0.3em;
      page-break-after: avoid;
    }
    h1.chapter-title {
      font-size: 16pt;
      text-align: center;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      margin-top: 0.5em;
      margin-bottom: 0.7em;
      border-bottom: 2px solid #1E3A8A;
      padding-bottom: 6px;
    }
    h2 {
      font-size: 12.5pt;
      border-bottom: 1px solid #E2E8F0;
      padding-bottom: 3px;
    }
    h3 {
      font-size: 11pt;
    }
    h4 {
      font-size: 10.5pt;
      font-style: italic;
    }
    table {
      width: 100%;
      border-collapse: collapse;
      margin: 0.6em 0;
      font-size: 8.5pt;
      font-family: 'Segoe UI', Arial, sans-serif;
      page-break-inside: avoid;
    }
    th, td {
      border: 1px solid #CBD5E1;
      padding: 4px 6px;
      vertical-align: top;
      text-align: left;
    }
    th {
      background-color: #F1F5F9;
      color: #0F172A;
      font-weight: 700;
    }
    tr:nth-child(even) td {
      background-color: #F8FAFC;
    }
    .table-caption, .figure-caption {
      font-family: 'Segoe UI', Arial, sans-serif;
      font-size: 8.5pt;
      font-weight: 700;
      color: #334155;
      text-align: center;
      margin-top: 4px;
      margin-bottom: 8px;
      page-break-before: avoid;
    }
    .figure-container {
      text-align: center;
      margin: 10px 0;
      page-break-inside: avoid;
    }
    .figure-container img, .figure-container svg {
      max-width: 90%;
      max-height: 380px;
      width: auto;
      height: auto;
      border: 1px solid #E2E8F0;
      border-radius: 6px;
    }
    .figure-container.large img, .figure-container.large svg {
      max-width: 95%;
      max-height: 420px;
      width: auto;
      height: auto;
    }
    .figure-container.screenshot {
      margin: 8px 0 4px 0;
      page-break-inside: avoid;
    }
    .figure-container.screenshot img {
      max-width: 82%;
      max-height: 255px;
      width: auto;
      height: auto;
      border: 1px solid #CBD5E1;
    }
    .screenshot-explanation {
      font-family: 'Times New Roman', serif;
      font-size: 9.5pt;
      text-align: justify;
      margin: 4px 4% 12px 4%;
      line-height: 1.32;
    }
    .toc-table td {
      padding: 2.5px 5px;
      font-size: 8.5pt;
      line-height: 1.25;
    }
    .page-break {
      page-break-before: always;
    }
  `;

  // First, apply calibrated CSS to thesis_document.html and save as calibrated_thesis.html
  let rawHtml = fs.readFileSync('thesis_document.html', 'utf8');
  
  // Replace old CSS with calibrated CSS
  const headEnd = rawHtml.indexOf('</head>');
  const styleStart = rawHtml.indexOf('<style>');
  const styleEnd = rawHtml.indexOf('</style>');
  const newHtml = rawHtml.slice(0, styleStart) + `<style>\n${css}\n</style>` + rawHtml.slice(styleEnd + 8);
  fs.writeFileSync('calibrated_thesis.html', newHtml, 'utf8');

  // Let's render calibrated_thesis.html to PDF
  const browser = await puppeteer.launch({
    executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-gpu', '--allow-file-access-from-files']
  });

  const page = await browser.newPage();
  const fileUrl = 'file:///' + path.resolve('calibrated_thesis.html').replace(/\\/g, '/');
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

  // Render complete PDF
  const pdfPath = path.resolve('DBU_Asset_Tracking_System_Thesis.pdf');
  await page.pdf({
    path: pdfPath,
    format: 'A4',
    printBackground: true,
    preferCSSPageSize: true,
    displayHeaderFooter: true,
    headerTemplate: '<div></div>',
    footerTemplate: `
      <div style="font-size: 8pt; font-family: 'Segoe UI', Arial, sans-serif; color: #64748B; width: 100%; display: flex; justify-content: space-between; padding: 0 16mm; box-sizing: border-box;">
        <span>Debre Berhan University &bull; DBU Asset Tracking System</span>
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

  // Check PDF stats
  const pdfBuf = fs.readFileSync(pdfPath);
  const text = pdfBuf.toString('binary');
  const countMatches = [...text.matchAll(/\/Type\s*\/Pages[^>]*?\/Count\s+(\d+)/g)];
  const pageCount = countMatches.length ? parseInt(countMatches[countMatches.length - 1][1]) : 0;
  console.log(`Generated DBU_Asset_Tracking_System_Thesis.pdf with total pages: ${pageCount}`);
}

main().catch(console.error);
