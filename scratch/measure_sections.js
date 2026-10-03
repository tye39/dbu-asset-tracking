const puppeteer = require('puppeteer-core');
const path = require('path');
const fs = require('fs');

async function main() {
  const html = fs.readFileSync('thesis_document.html', 'utf8');

  // Calibrated CSS
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

  // Split document by class="page-break"
  // Keep title page as first chunk
  const parts = html.split(/<div class="page-break"><\/div>/);
  console.log(`Document has ${parts.length} distinct major sections.`);

  const browser = await puppeteer.launch({
    executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-gpu', '--allow-file-access-from-files']
  });

  const page = await browser.newPage();
  let cumulativePage = 1;
  const sectionReport = [];

  for (let i = 0; i < parts.length; i++) {
    const partHtml = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <style>${css}</style>
      </head>
      <body>
        ${parts[i]}
      </body>
      </html>
    `;
    const tempPath = path.resolve(`temp_section_${i}.html`);
    const tempPdf = path.resolve(`temp_section_${i}.pdf`);
    fs.writeFileSync(tempPath, partHtml, 'utf8');

    await page.goto('file:///' + tempPath.replace(/\\/g, '/'), { waitUntil: 'networkidle0' });
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
      path: tempPdf,
      format: 'A4',
      printBackground: true,
      preferCSSPageSize: true,
      margin: { top: '0mm', right: '0mm', bottom: '0mm', left: '0mm' }
    });

    const pdfBuf = fs.readFileSync(tempPdf);
    const text = pdfBuf.toString('binary');
    const countMatches = [...text.matchAll(/\/Type\s*\/Pages[^>]*?\/Count\s+(\d+)/g)];
    const count = countMatches.length ? parseInt(countMatches[countMatches.length - 1][1]) : 1;

    // Extract title of section
    const titleMatch = parts[i].match(/<h1[^>]*>([\s\S]*?)<\/h1>/);
    const title = titleMatch ? titleMatch[1].replace(/<[^>]+>/g, '').trim() : (i === 0 ? 'Title Page' : `Section ${i}`);

    sectionReport.push({
      index: i,
      title,
      startPage: cumulativePage,
      pageCount: count,
      endPage: cumulativePage + count - 1
    });

    cumulativePage += count;

    try { fs.unlinkSync(tempPath); } catch(e) {}
    try { fs.unlinkSync(tempPdf); } catch(e) {}
  }

  await browser.close();

  console.log('\n=== SECTION PAGE MAPPING ===');
  sectionReport.forEach(s => {
    console.log(`[Pages ${s.startPage} - ${s.endPage}] (${s.pageCount} pg) : ${s.title}`);
  });
  console.log(`\nTotal Calculated Pages: ${cumulativePage - 1}`);
}

main().catch(console.error);
