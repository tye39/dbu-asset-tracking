import puppeteer from "puppeteer-core";
import path from "path";
import fs from "fs";

async function capture() {
  const screenshotsDir = path.resolve(process.cwd(), "public/screenshots");
  if (!fs.existsSync(screenshotsDir)) {
    fs.mkdirSync(screenshotsDir, { recursive: true });
  }

  const browser = await puppeteer.launch({
    executablePath: "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
    headless: true,
    defaultViewport: { width: 1440, height: 900, deviceScaleFactor: 1.5 },
    args: ["--no-sandbox", "--disable-setuid-sandbox", "--disable-gpu"]
  });

  async function capturePage(email: string | null, targetUrl: string, filename: string, waitMs = 2500) {
    const context = await browser.createBrowserContext();
    const page = await context.newPage();

    if (email) {
      await page.goto("http://localhost:3000/login", { waitUntil: "networkidle0" });
      await page.type("#email", email);
      await page.type("#password", "Password123");
      await page.click("button[type='submit']");
      await new Promise(r => setTimeout(r, 3000));
    }

    await page.goto(targetUrl, { waitUntil: "networkidle0" });
    await new Promise(r => setTimeout(r, waitMs));
    await page.screenshot({ path: path.join(screenshotsDir, filename) });
    console.log(`[OK] Saved ${filename} from ${page.url()}`);
    await context.close();
  }

  console.log("Capturing screenshots with fresh browser contexts...");
  // 1. Login
  await capturePage(null, "http://localhost:3000/login", "fig_5_1_login.png", 1000);

  // 2. Public QR Verification
  await capturePage(null, "http://localhost:3000/asset/verify/5fe2b732-77e6-4187-82af-787c0008e168", "fig_5_11_qr_verification.png", 1500);

  // 3. Admin Dashboard
  await capturePage("admin@dbu.edu.et", "http://localhost:3000/admin/dashboard", "fig_5_2_admin_dashboard.png", 3000);

  // 4. PAO Dashboard
  await capturePage("pao@dbu.edu.et", "http://localhost:3000/pao/dashboard", "fig_5_3_pao_dashboard.png", 3000);

  // 5. Asset Registration
  await capturePage("pao@dbu.edu.et", "http://localhost:3000/pao/assets/new", "fig_5_4_asset_registration.png", 3000);

  // 6. Asset Details
  await capturePage("pao@dbu.edu.et", "http://localhost:3000/assets/2e82c636-d5e4-4e85-80ce-19fba22cb172", "fig_5_5_asset_details.png", 3000);

  // 7. Department Head Dashboard
  await capturePage("head@dbu.edu.et", "http://localhost:3000/head/dashboard", "fig_5_6_head_dashboard.png", 3000);

  // 8. Staff Member Dashboard
  await capturePage("staff@dbu.edu.et", "http://localhost:3000/staff/dashboard", "fig_5_7_staff_dashboard.png", 3000);

  // 9. Maintenance Technician Dashboard
  await capturePage("tech@dbu.edu.et", "http://localhost:3000/tech/dashboard", "fig_5_8_tech_dashboard.png", 3000);

  // 10. Inventory Person Dashboard
  await capturePage("inventory@dbu.edu.et", "http://localhost:3000/inventory", "fig_5_9_inventory_session.png", 3000);

  // 11. Internal Auditor Dashboard
  await capturePage("auditor@dbu.edu.et", "http://localhost:3000/auditor/dashboard", "fig_5_10_auditor_dashboard.png", 3000);

  await browser.close();
  console.log("=== ALL 11 DISTINCT SCREENSHOTS CAPTURED PERFECTLY ===");
}

capture().catch(err => {
  console.error("Capture error:", err);
  process.exit(1);
});
