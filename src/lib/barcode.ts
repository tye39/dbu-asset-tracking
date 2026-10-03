import JsBarcode from "jsbarcode";

export type IdentificationMethod = "QR" | "BARCODE" | "NONE";

/**
 * Checks whether an asset belongs to the Building category or type.
 * Buildings must not require QR code or barcode, default to NONE,
 * and should never have physical QR/barcode labels generated.
 */
export function isBuildingAsset(
  category?: { code?: string; name?: string } | null,
  assetType?: { name?: string } | null
): boolean {
  if (!category && !assetType) return false;
  const catCode = (category?.code || "").toUpperCase();
  const catName = (category?.name || "").toUpperCase();
  const typeName = (assetType?.name || "").toUpperCase();

  // Building category itself, or asset type explicitly named "Building"
  return (
    catCode === "BUILD" && typeName === "BUILDING" ||
    catCode === "BUILDING" ||
    catName === "BUILDING" ||
    typeName === "BUILDING"
  );
}

// Standard Code 128 Symbol Patterns (Index 0 to 106)
// Each symbol is 11 modules wide (except Stop 106 which is 13 modules)
const CODE128_BARS = [
  "11011001100", "11001101100", "11001100110", "10010011000", "10010001100",
  "10001001100", "10011001000", "10011000100", "10001100100", "11001001000",
  "11001000100", "11000100100", "10110011100", "10011011100", "10011001110",
  "10111001100", "10011101100", "10011100110", "11001110010", "11001011100",
  "11001001110", "11011100100", "11001110100", "11101101110", "11101001100",
  "11100101100", "11100100110", "11101100100", "11100110100", "11100110010",
  "11011011000", "11011000110", "11000110110", "10100011000", "10001011000",
  "10001000110", "10110001000", "10001101000", "10001100010", "11010001000",
  "11000101000", "11000100010", "10110111000", "10110001110", "10001101110",
  "10111011000", "10111000110", "10001110110", "11101110110", "11010001110",
  "11000101110", "11011101000", "11011100010", "11011101110", "11101011000",
  "11101000110", "11100010110", "11101101000", "11101100010", "11100011010",
  "11101111010", "11001000010", "11110001010", "10100110000", "10100001100",
  "10010110000", "10010000110", "10000101100", "10000100110", "10110010000",
  "10110000100", "10011010000", "10011000010", "10000110100", "10000110010",
  "11000010010", "11001010000", "11110111010", "11000010100", "10001111010",
  "10100111100", "10010111100", "10010011110", "10111100100", "10011110100",
  "10011110010", "11110100100", "11110010100", "11110010010", "11011011110",
  "11011110110", "11110110110", "10101111000", "10100011110", "10001011110",
  "10111101000", "10111100010", "11110101000", "11110100010", "10111011110",
  "10111101110", "11101011110", "11110101110", "11010000100", "11010010000",
  "11010011100", "1100011101011"
];

/**
 * Standard Code 128 (Subset B) Pure Vector SVG Generator.
 * Universal: works in Node.js, SSR, and Client without DOM dependencies.
 * Follows ISO/IEC 15417 specification:
 * - Proper quiet zones (10+ modules)
 * - Exact module width ratios
 * - High contrast black (#000000) on white (#ffffff)
 * - preserveAspectRatio="xMidYMid meet" so cameras can read without distortion
 */
export function generateCode128Svg(
  value: string,
  options?: {
    height?: number;
    moduleWidth?: number;
    quietZoneModules?: number;
    displayValue?: boolean;
  }
): string {
  const text = (value || "DBU-ASSET").trim();
  const height = options?.height || 48;
  const moduleWidth = options?.moduleWidth || 2;
  const quietZoneModules = options?.quietZoneModules !== undefined ? options.quietZoneModules : 12;
  const displayValue = options?.displayValue ?? false;

  const START_B = 104;
  const STOP = 106;
  const MODULO = 103;

  let binary = "";
  let checksum = START_B;

  // Start B symbol
  binary += CODE128_BARS[START_B];

  // Data symbols (ASCII 32 to 127)
  for (let i = 0; i < text.length; i++) {
    const ascii = text.charCodeAt(i);
    const code = ascii >= 32 && ascii <= 126 ? ascii - 32 : 31; // fallback to '?' if outside ASCII 32-126
    binary += CODE128_BARS[code];
    checksum += code * (i + 1);
  }

  // Checksum symbol
  binary += CODE128_BARS[checksum % MODULO];

  // Stop symbol (13 modules: 11000111010 + 11 termination bar)
  binary += CODE128_BARS[STOP];

  // Add quiet zones
  const leftQuiet = "0".repeat(quietZoneModules);
  const rightQuiet = "0".repeat(quietZoneModules);
  const fullBinary = leftQuiet + binary + rightQuiet;

  const totalModules = fullBinary.length;
  const totalWidth = totalModules * moduleWidth;

  // Generate crisp rects for contiguous black bars
  const rects: string[] = [];
  let barStart = -1;

  for (let i = 0; i < totalModules; i++) {
    if (fullBinary[i] === "1") {
      if (barStart === -1) barStart = i;
    } else {
      if (barStart !== -1) {
        const x = barStart * moduleWidth;
        const w = (i - barStart) * moduleWidth;
        rects.push(`<rect x="${x}" y="0" width="${w}" height="${height}" fill="#000000" />`);
        barStart = -1;
      }
    }
  }
  if (barStart !== -1) {
    const x = barStart * moduleWidth;
    const w = (totalModules - barStart) * moduleWidth;
    rects.push(`<rect x="${x}" y="0" width="${w}" height="${height}" fill="#000000" />`);
  }

  const textElement = displayValue
    ? `<text x="${totalWidth / 2}" y="${height + 14}" text-anchor="middle" font-family="ui-monospace, monospace" font-size="11" font-weight="bold" fill="#0f172a" letter-spacing="1">${text}</text>`
    : "";

  const totalSvgHeight = displayValue ? height + 18 : height;

  return `<svg width="${totalWidth}" height="${totalSvgHeight}" viewBox="0 0 ${totalWidth} ${totalSvgHeight}" preserveAspectRatio="xMidYMid meet" xmlns="http://www.w3.org/2000/svg" style="background:#ffffff;display:block;margin:0 auto;"><rect width="${totalWidth}" height="${totalSvgHeight}" fill="#ffffff" />${rects.join("")}${textElement}</svg>`;
}

/**
 * Generates camera-readable Code 128 barcode SVG.
 * Replaces older distorted SVG.
 */
export function generateBarcodeSvg(
  value: string,
  options?: { height?: number; width?: number; displayValue?: boolean }
): string {
  return generateCode128Svg(value, {
    height: options?.height || 48,
    moduleWidth: options?.width || 2,
    quietZoneModules: 14,
    displayValue: options?.displayValue ?? false
  });
}
