import { MultiFormatReader, BarcodeFormat, DecodeHintType, RGBLuminanceSource, BinaryBitmap, HybridBinarizer } from "@zxing/library";

// Standard Code 128 Character Set B encoding patterns (widths of 3 bars and 3 spaces = 11 modules each)
// Each pattern is 6 numbers: bar1, space1, bar2, space2, bar3, space3
const CODE128_PATTERNS: number[][] = [
  [2,1,2,2,2,2], [2,2,2,1,2,2], [2,2,2,2,2,1], [1,2,1,2,2,3], [1,2,1,3,2,2], // 0-4
  [1,3,1,2,2,2], [1,2,2,2,1,3], [1,2,2,3,1,2], [1,3,2,2,1,2], [2,2,1,2,1,3], // 5-9
  [2,2,1,3,1,2], [2,3,1,2,1,2], [1,1,2,2,3,2], [1,2,2,1,3,2], [1,2,2,2,3,1], // 10-14
  [1,1,3,2,2,2], [1,2,3,1,2,2], [1,2,3,2,2,1], [2,2,3,2,1,1], [2,2,1,1,3,2], // 15-19
  [2,2,1,2,3,1], [2,1,3,2,1,2], [2,2,3,1,1,2], [3,1,2,1,3,1], [3,1,1,2,2,2], // 20-24
  [3,2,1,1,2,2], [3,2,1,2,2,1], [3,1,2,2,1,2], [3,2,2,1,1,2], [3,2,2,2,1,1], // 25-29
  [2,1,2,1,2,3], [2,1,2,3,2,1], [2,3,2,1,2,1], [1,1,1,3,2,3], [1,3,1,1,2,3], // 30-34
  [1,3,1,3,2,1], [1,1,2,3,1,3], [1,3,2,1,1,3], [1,3,2,3,1,1], [2,1,1,3,1,3], // 35-39
  [2,3,1,1,1,3], [2,3,1,3,1,1], [1,1,2,1,3,3], [1,1,2,3,3,1], [1,3,2,1,3,1], // 40-44
  [1,1,3,1,2,3], [1,1,3,3,2,1], [1,3,3,1,2,1], [3,1,3,1,2,1], [2,1,1,3,3,1], // 45-49
  [2,3,1,1,3,1], [2,1,3,1,1,3], [2,1,3,3,1,1], [2,1,3,1,3,1], [3,1,1,1,2,3], // 50-54
  [3,1,1,3,2,1], [3,3,1,1,2,1], [3,1,2,1,1,3], [3,1,2,3,1,1], [3,3,2,1,1,1], // 55-59
  [3,1,4,1,1,1], [2,2,1,4,1,1], [4,3,1,1,1,1], [1,1,1,2,2,4], [1,1,1,4,2,2], // 60-64
  [1,2,1,1,2,4], [1,2,1,4,2,1], [1,4,1,1,2,2], [1,4,1,2,2,1], [1,1,2,2,1,4], // 65-69
  [1,1,2,4,1,2], [1,2,2,1,1,4], [1,2,2,4,1,1], [1,4,2,1,1,2], [1,4,2,2,1,1], // 70-74
  [2,4,1,2,1,1], [2,2,1,1,1,4], [4,1,3,1,1,1], [2,4,1,1,1,2], [1,3,4,1,1,1], // 75-79
  [1,1,1,2,4,2], [1,2,1,1,4,2], [1,2,1,2,4,1], [1,1,4,2,1,2], [1,2,4,1,1,2], // 80-84
  [1,2,4,2,1,1], [4,1,1,2,1,2], [4,2,1,1,1,2], [4,2,1,2,1,1], [2,1,2,1,4,1], // 85-89
  [2,1,4,1,2,1], [4,1,2,1,2,1], [1,1,1,1,4,3], [1,1,1,3,4,1], [1,3,1,1,4,1], // 90-94
  [1,1,4,1,1,3], [1,1,4,3,1,1], [4,1,1,1,1,3], [4,1,1,3,1,1], [1,1,3,1,4,1], // 95-99
  [1,1,4,1,3,1], [3,1,1,1,4,1], [4,1,1,1,3,1], [2,1,1,4,1,2], [2,1,1,2,1,4], // 100-104 (104 is START B)
  [2,1,1,2,3,2], // 105 (START C)
  [2,3,3,1,1,1,2] // 106 (STOP: 7 elements: 2,3,3,1,1,1,2 = 13 modules)
];

export function generateCode128Svg(text: string, options?: { height?: number; moduleWidth?: number; quietZoneModules?: number }): string {
  const height = options?.height || 50;
  const moduleWidth = options?.moduleWidth || 2;
  const quietZoneModules = options?.quietZoneModules || 12;

  const cleanText = text.trim();
  if (!cleanText) return "";

  // Use Code 128 Set B (ASCII 32 to 127)
  const values: number[] = [104]; // Start B
  let checksum = 104;

  for (let i = 0; i < cleanText.length; i++) {
    const code = cleanText.charCodeAt(i);
    const value = code - 32; // Code 128 B mapping: ASCII 32 -> value 0
    if (value < 0 || value > 95) {
      // Out of standard printable ASCII, use value for '?' (63 - 32 = 31)
      values.push(31);
      checksum += 31 * (i + 1);
    } else {
      values.push(value);
      checksum += value * (i + 1);
    }
  }

  const checkValue = checksum % 103;
  values.push(checkValue);
  values.push(106); // Stop pattern

  // Build binary modules array (true = bar, false = space)
  const modules: boolean[] = [];

  // Left quiet zone
  for (let q = 0; q < quietZoneModules; q++) modules.push(false);

  for (let i = 0; i < values.length; i++) {
    const val = values[i];
    const pattern = CODE128_PATTERNS[val];
    if (!pattern) continue;
    let isBar = true;
    for (const count of pattern) {
      for (let c = 0; c < count; c++) {
        modules.push(isBar);
      }
      isBar = !isBar;
    }
  }

  // Right quiet zone
  for (let q = 0; q < quietZoneModules; q++) modules.push(false);

  // Convert modules to SVG rect elements
  const totalModules = modules.length;
  const totalWidth = totalModules * moduleWidth;

  const rects: string[] = [];
  let barStart = -1;

  for (let i = 0; i < totalModules; i++) {
    if (modules[i]) {
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

  return `<svg width="${totalWidth}" height="${height}" viewBox="0 0 ${totalWidth} ${height}" preserveAspectRatio="xMidYMid meet" xmlns="http://www.w3.org/2000/svg" style="background-color:#ffffff;display:block;margin:0 auto;"><rect width="${totalWidth}" height="${height}" fill="#ffffff" />${rects.join("")}</svg>`;
}

async function test() {
  const code = "DBU-ICT-982405";
  const svg = generateCode128Svg(code, { height: 48, moduleWidth: 2, quietZoneModules: 12 });
  console.log("SVG generated length:", svg.length);
  console.log("First 150 chars:", svg.substring(0, 150));

  // Verify by rendering modules into a monochrome buffer and decoding with ZXing!
  const quietZone = 12;
  const moduleW = 2;
  const height = 50;

  // Simulate rendering the barcode modules into an RGBA image buffer
  // We recreate the modules array for testing:
  const text = code;
  const values: number[] = [104];
  let checksum = 104;
  for (let i = 0; i < text.length; i++) {
    const val = text.charCodeAt(i) - 32;
    values.push(val);
    checksum += val * (i + 1);
  }
  values.push(checksum % 103);
  values.push(106);

  const modules: boolean[] = [];
  for (let q = 0; q < quietZone; q++) modules.push(false);
  for (const val of values) {
    const pattern = CODE128_PATTERNS[val];
    let isBar = true;
    for (const count of pattern) {
      for (let c = 0; c < count; c++) modules.push(isBar);
      isBar = !isBar;
    }
  }
  for (let q = 0; q < quietZone; q++) modules.push(false);

  const width = modules.length * moduleW;
  const rgba = new Uint8ClampedArray(width * height * 4);

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const moduleIdx = Math.floor(x / moduleW);
      const isBlack = modules[moduleIdx];
      const pixelIdx = (y * width + x) * 4;
      const color = isBlack ? 0 : 255;
      rgba[pixelIdx] = color;
      rgba[pixelIdx + 1] = color;
      rgba[pixelIdx + 2] = color;
      rgba[pixelIdx + 3] = 255;
    }
  }

  // Decode with ZXing MultiFormatReader
  const reader = new MultiFormatReader();
  const hints = new Map();
  hints.set(DecodeHintType.POSSIBLE_FORMATS, [BarcodeFormat.CODE_128]);
  hints.set(DecodeHintType.TRY_HARDER, true);
  reader.setHints(hints);

  const lumSource = new RGBLuminanceSource(rgba, width, height);
  const bitmap = new BinaryBitmap(new HybridBinarizer(lumSource));
  const result = reader.decode(bitmap);

  console.log("ZXing Decode Test Result:", result.getText(), "Format:", result.getBarcodeFormat());
  if (result.getText() === code) {
    console.log("✓ PERFECT 100% MATCH: Code 128 barcode successfully decoded by ZXing!");
  } else {
    console.error("FAILED to decode correctly!");
  }
}

test().catch(console.error);
