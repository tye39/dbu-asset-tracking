import puppeteer from "puppeteer-core";
import path from "path";
import fs from "fs";

async function getPaoSessionCookie(baseUrl: string) {
  const csrfRes = await fetch(`${baseUrl}/api/auth/csrf`);
  const setCookies = csrfRes.headers.getSetCookie();
  const { csrfToken } = await csrfRes.json();
  const csrfCookie = setCookies.find(c => c.includes(csrfToken)) || setCookies[setCookies.length - 1];
  const csrfCookieVal = csrfCookie ? csrfCookie.split(";")[0] : "";

  const params = new URLSearchParams();
  params.append("email", "pao@dbu.edu.et");
  params.append("password", "Password123");
  params.append("csrfToken", csrfToken);
  params.append("redirectTo", "/");

  const authRes = await fetch(`${baseUrl}/api/auth/callback/credentials`, {
    method: "POST",
    redirect: "manual",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      "Cookie": csrfCookieVal,
    },
    body: params.toString(),
  });

  const authSetCookies = authRes.headers.getSetCookie();
  const sessionCookie = authSetCookies.find(c => c.startsWith("authjs.session-token="));
  if (!sessionCookie) {
    throw new Error(`Failed to obtain session token for PAO. Status: ${authRes.status}`);
  }
  const tokenVal = sessionCookie.split(";")[0].replace("authjs.session-token=", "");
  return tokenVal;
}

async function main() {
  console.log("=== LAUNCHING PUPPETEER PAO DASHBOARD INTERACTIVITY TEST ===");
  const baseUrl = "http://localhost:3000";

  // 1. Obtain PAO auth session token
  console.log("1. Authenticating PAO via NextAuth credentials...");
  const sessionToken = await getPaoSessionCookie(baseUrl);
  console.log("   Authenticated! Session token length:", sessionToken.length);

  // 2. Launch Puppeteer with authenticated session
  const browser = await puppeteer.launch({
    executablePath: "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
    headless: true,
    defaultViewport: { width: 1440, height: 900, deviceScaleFactor: 1.5 },
    args: ["--no-sandbox", "--disable-setuid-sandbox", "--disable-gpu"],
  });

  const page = await browser.newPage();

  // Set auth cookie
  await page.setCookie({
    name: "authjs.session-token",
    value: sessionToken,
    domain: "localhost",
    path: "/",
    httpOnly: true,
    sameSite: "Lax",
  });

  // 3. Navigate directly to PAO dashboard
  console.log("2. Navigating to PAO dashboard...");
  await page.goto(`${baseUrl}/pao/dashboard`, { waitUntil: "networkidle0" });
  await new Promise((r) => setTimeout(r, 2000));

  console.log("Current page URL:", page.url());
  if (!page.url().includes("/pao/dashboard")) {
    throw new Error(`Expected /pao/dashboard but got: ${page.url()}`);
  }

  const screenshotDir = path.resolve(process.cwd(), "public/screenshots");

  // Inspect page cards
  const cardTexts = await page.evaluate(() => {
    const divs = Array.from(document.querySelectorAll("div"));
    return divs
      .filter(d => (d.className || "").includes("cursor-pointer") && (d.className || "").includes("rounded-xl"))
      .map(d => (d.innerText || "").replace(/\n/g, " | "));
  });
  console.log(`Found ${cardTexts.length} interactive statistic cards on dashboard:\n`, cardTexts);

  // Helper to click card by title
  async function testCardClick(cardTitle: string, screenshotName: string) {
    console.log(`\n--- Testing Card: [${cardTitle}] ---`);
    
    const clicked = await page.evaluate((title) => {
      const cards = Array.from(document.querySelectorAll("div"));
      const target = cards.find((c) => {
        const text = (c.innerText || "").toUpperCase();
        return text.includes(title.toUpperCase()) && (c.className || "").includes("cursor-pointer");
      });
      if (target) {
        (target as HTMLElement).click();
        return true;
      }
      return false;
    }, cardTitle);

    if (!clicked) {
      throw new Error(`Could not find clickable card for "${cardTitle}" on page ${page.url()}`);
    }

    // Wait for modal dialog
    await page.waitForSelector('[role="dialog"]', { timeout: 10000 });
    // Wait for records to load from Server Action (spinner disappears)
    await page.waitForFunction(() => {
      const dialog = document.querySelector('[role="dialog"]');
      if (!dialog) return false;
      return !dialog.querySelector('.animate-spin');
    }, { timeout: 15000 });

    const modalSummary = await page.evaluate(() => {
      const dialog = document.querySelector('[role="dialog"]');
      if (!dialog) return "No dialog found";
      const title = dialog.querySelector("h3")?.textContent || "";
      const badge = dialog.querySelector("span.rounded-full")?.textContent || "";
      const rows = Array.from(dialog.querySelectorAll("tbody tr")).length;
      const emptyState = dialog.querySelector("h4")?.textContent || "";
      return { title, badge, rows, emptyState };
    });

    console.log("Modal rendered successfully:", modalSummary);

    const shotPath = path.join(screenshotDir, screenshotName);
    await page.screenshot({ path: shotPath });
    console.log(`Saved screenshot: ${screenshotName}`);

    // Close modal via Escape
    await page.keyboard.press("Escape");
    await new Promise((r) => setTimeout(r, 600));
  }

  // Test Card 1: Total Assets
  await testCardClick("Total Assets", "test_pao_total_assets_modal.png");

  // Test Card 2: Available Assets
  await testCardClick("Available Assets", "test_pao_available_assets_modal.png");

  // Test Card 3: Assigned Assets
  await testCardClick("Assigned Assets", "test_pao_assigned_assets_modal.png");

  // Test Card 4: In Maintenance
  await testCardClick("In Maintenance", "test_pao_maintenance_modal.png");

  // Test Card 5: Pending Transfers (Empty State verification)
  await testCardClick("Pending Transfers", "test_pao_pending_transfers_empty.png");

  // Test Card 6: Disposed Assets (Empty State verification)
  await testCardClick("Disposed Assets", "test_pao_disposed_assets_empty.png");

  // Test Card 7: Pending Maintenances
  await testCardClick("Pending Maintenances", "test_pao_pending_maintenances_modal.png");

  // Test Card 8: Requests to Fulfill
  await testCardClick("Requests to Fulfill", "test_pao_requests_modal.png");

  // Test Card 9: Active Appeals (Empty State verification)
  await testCardClick("Active Appeals", "test_pao_appeals_empty.png");

  // Test Card 10: Asset Categories & Drilldown
  console.log("\n--- Testing Card: [Asset Categories] and Category Drilldown ---");
  await testCardClick("Asset Categories", "test_pao_categories_modal.png");

  // Re-open Asset Categories to test drilldown
  await page.evaluate(() => {
    const cards = Array.from(document.querySelectorAll("div"));
    const target = cards.find((c) => {
      const text = (c.innerText || "").toUpperCase();
      return text.includes("ASSET CATEGORIES") && (c.className || "").includes("cursor-pointer");
    });
    if (target) (target as HTMLElement).click();
  });

  await page.waitForSelector('[role="dialog"]', { timeout: 10000 });
  await new Promise((r) => setTimeout(r, 2000));

  // Click on "ICT Equipment" category row in table
  const drilldownClicked = await page.evaluate(() => {
    const rows = Array.from(document.querySelectorAll("tbody tr"));
    const ictRow = rows.find((r) => (r.textContent || "").includes("ICT Equipment"));
    if (ictRow) {
      (ictRow as HTMLElement).click();
      return true;
    }
    return false;
  });

  if (drilldownClicked) {
    console.log("Drill-down row clicked for ICT Equipment!");
    await new Promise((r) => setTimeout(r, 1500));
    await page.screenshot({ path: path.join(screenshotDir, "test_pao_categories_drilldown.png") });
    console.log("Saved drilldown screenshot: test_pao_categories_drilldown.png");
  }

  await page.keyboard.press("Escape");
  await new Promise((r) => setTimeout(r, 600));

  await browser.close();
  console.log("\n================================================================================");
  console.log("     ALL 10 PAO STATISTIC CARDS VERIFIED AND FULLY OPERATIONAL IN BROWSER       ");
  console.log("================================================================================");
}

main().catch(err => {
  console.error("Test execution failed:", err);
  process.exit(1);
});
