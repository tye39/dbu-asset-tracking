import puppeteer from "puppeteer-core";

async function test() {
  const browser = await puppeteer.launch({
    executablePath: "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
    headless: true,
    defaultViewport: { width: 1440, height: 900 },
    args: ["--no-sandbox", "--disable-setuid-sandbox", "--disable-gpu"]
  });

  const page = await browser.newPage();
  await page.goto("http://localhost:3000/login", { waitUntil: "networkidle0" });

  await page.type("#email", "admin@dbu.edu.et");
  await page.type("#password", "Password123");
  await page.click("button[type='submit']");
  await new Promise(r => setTimeout(r, 2500));

  await page.goto("http://localhost:3000/admin/dashboard", { waitUntil: "networkidle0" });
  console.log("URL after goto:", page.url());
  const title = await page.title();
  console.log("Page title:", title);
  const text = await page.evaluate(() => document.body.innerText.slice(0, 200));
  console.log("Body snippet:", text);

  await browser.close();
}

test();
