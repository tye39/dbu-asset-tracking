import JsBarcode from "jsbarcode";

function generateBarcodeSvgString(value: string): string {
  // Check if we're in browser with DOM
  if (typeof document !== "undefined") {
    try {
      const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
      JsBarcode(svg, value, {
        format: "CODE128",
        width: 2,
        height: 40,
        displayValue: false,
        margin: 2
      });
      return svg.outerHTML;
    } catch (e) {
      console.warn("JsBarcode failed, fallback to Code39", e);
    }
  }
  return "";
}

console.log("JsBarcode import works:", typeof JsBarcode);
