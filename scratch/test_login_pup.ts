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
  console.log("Initial URL:", page.url());

  await page.type("#email", "admin@dbu.edu.et");
  await page.type("#password", "Password123");
  console.log("Typed credentials, clicking submit...");

  await Promise.all([
    page.waitForNavigation({ waitUntil: "networkidle0", timeout: 15000 }).catch(e => console.log("Nav wait:", e.message)),
    page.click("button[type='submit']")
  ]);

  console.log("URL after submit:", page.url());
  const cookies = await page.cookies();
  console.log("Cookies after submit:", cookies.map(c => c.name));

  await browser.close();
}

test();
