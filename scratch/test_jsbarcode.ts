import JsBarcode from "jsbarcode";

console.log("Testing JsBarcode...");
try {
  // Check what JsBarcode exports and supports
  console.log("JsBarcode type:", typeof JsBarcode);
} catch (e) {
  console.error("Error:", e);
}
