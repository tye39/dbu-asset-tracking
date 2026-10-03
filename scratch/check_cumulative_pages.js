const puppeteer = require('puppeteer-core');
const path = require('path');
const fs = require('fs');

async function main() {
  const html = fs.readFileSync('calibrated_thesis.html', 'utf8');
  const parts = html.split(/<div class="page-break"><\/div>/);

  const browser = await puppeteer.launch({
    executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-gpu']
  });
  const page = await browser.newPage();

  // We will build cumulative HTML: section 0, then section 0+1, etc.
  let runningHtml = '';
  const headMatch = html.match(/<head>([\s\S]*?)<\/head>/);
  const headContent = headMatch ? headMatch[1] : '';

  console.log('Measuring cumulative page counts...');
  let prevCount = 0;

  for (let i = 0; i < parts.length; i++) {
    if (i === 0) {
      runningHtml = parts[0];
    } else {
      runningHtml += '<div class="page-break"></div>' + parts[i];
    }

    const doc = `<!DOCTYPE html><html><head>${headContent}</head><body>${runningHtml}</body></html>`;
    const tempPath = path.resolve('temp_cum.html');
    const tempPdf = path.resolve('temp_cum.pdf');
    fs.writeFileSync(tempPath, doc, 'utf8');

    await page.goto('file:///' + tempPath.replace(/\\/g, '/'), { waitUntil: 'networkidle0' });
    await page.evaluateHandle('document.fonts.ready');

    await page.pdf({
      path: tempPdf,
      format: 'A4',
      printBackground: true,
      preferCSSPageSize: true,
      displayHeaderFooter: true,
      headerTemplate: '<div></div>',
      footerTemplate: `<div style="font-size:8pt;padding:0 16mm;width:100%;display:flex;justify-content:space-between;"><span>DBU</span><span>Page <span class="pageNumber"></span></span></div>`,
      margin: { top: '18mm', bottom: '18mm', left: '16mm', right: '16mm' }
    });

    const pdfBuf = fs.readFileSync(tempPdf);
    const text = pdfBuf.toString('binary');
    const countMatches = [...text.matchAll(/\/Type\s*\/Pages[^>]*?\/Count\s+(\d+)/g)];
    const count = countMatches.length ? parseInt(countMatches[countMatches.length - 1][1]) : 1;

    const titleMatch = parts[i].match(/<h1[^>]*>([\s\S]*?)<\/h1>/);
    const title = titleMatch ? titleMatch[1].replace(/<[^>]+>/g, '').trim() : (i === 0 ? 'Title Page' : `Section ${i}`);

    const delta = count - prevCount;
    const startPage = prevCount + 1;
    const endPage = count;
    console.log(`Section ${i} (${title}): Start Page ${startPage}, End Page ${endPage} (Took ${delta} pg, Cumulative: ${count})`);

    prevCount = count;
    try { fs.unlinkSync(tempPath); } catch(e) {}
    try { fs.unlinkSync(tempPdf); } catch(e) {}
  }

  await browser.close();
}

main().catch(console.error);
