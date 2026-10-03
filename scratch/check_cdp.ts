import "dotenv/config";

async function main() {
  console.log("Checking CDP availability...");
  try {
    const res = await fetch("http://localhost:9222/json/version");
    const data = await res.json();
    console.log("Chrome version via CDP:", data);
  } catch (e: any) {
    console.log("Chrome CDP not running yet:", e.message);
  }
}

main();
