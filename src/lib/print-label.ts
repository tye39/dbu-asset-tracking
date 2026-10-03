import { generateBarcodeSvg } from "./barcode";

export interface PrintAssetData {
  assetCode: string;
  name: string;
  categoryName?: string;
  typeName?: string;
  imageUrl?: string | null;
  qrCodeUrl?: string | null;
}

/**
 * Print compact/narrow barcode sticker for slim objects and small equipment
 * (mouse, keyboard, cables, small tools, narrow equipment).
 * Layout:
 * ┌──────────────────────┐
 * │ DBU   ASSET          │
 * │                      │
 * │ |||||||||||||||||||| │
 * │      DBU-00125       │
 * └──────────────────────┘
 */
export function printBarcodeSticker(asset: PrintAssetData) {
  const barcodeSvg = generateBarcodeSvg(asset.assetCode, { height: 36, width: 1.8 });
  const win = window.open("", "_blank");
  if (!win) return;

  win.document.write(`
    <!DOCTYPE html>
    <html>
      <head>
        <title>DBU Barcode Sticker - ${asset.assetCode}</title>
        <style>
          @page {
            size: auto;
            margin: 0;
          }
          @media print {
            body {
              margin: 0;
              padding: 0;
              background: transparent;
            }
            .sticker-card {
              box-shadow: none !important;
              border: 1px solid #000 !important;
            }
          }
          body {
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, monospace;
            display: flex;
            align-items: center;
            justify-content: center;
            min-height: 100vh;
            background-color: #f1f5f9;
            margin: 0;
            padding: 10px;
          }
          .sticker-card {
            background: #ffffff;
            border: 1.5px solid #0f172a;
            border-radius: 6px;
            width: 210px;
            padding: 8px 12px 6px 12px;
            box-sizing: border-box;
            display: flex;
            flex-direction: column;
            align-items: center;
            text-align: center;
          }
          .sticker-header {
            width: 100%;
            display: flex;
            justify-content: space-between;
            align-items: center;
            font-size: 9px;
            font-weight: 900;
            letter-spacing: 1.2px;
            color: #0b4a6e;
            text-transform: uppercase;
            border-bottom: 1px solid #e2e8f0;
            padding-bottom: 3px;
            margin-bottom: 4px;
          }
          .sticker-header span:last-child {
            color: #b45309;
            font-size: 8px;
            letter-spacing: 0.8px;
          }
          .barcode-container {
            width: 100%;
            height: 38px;
            display: flex;
            align-items: center;
            justify-content: center;
            overflow: hidden;
            margin: 2px 0;
          }
          .barcode-container svg {
            width: 100%;
            height: 38px;
          }
          .sticker-code {
            font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
            font-size: 11px;
            font-weight: 800;
            letter-spacing: 1px;
            color: #0f172a;
            margin: 2px 0 0 0;
          }
        </style>
      </head>
      <body onload="window.print(); window.close();">
        <div class="sticker-card">
          <div class="sticker-header">
            <span>DBU</span>
            <span>ASSET</span>
          </div>
          <div class="barcode-container">
            ${barcodeSvg}
          </div>
          <div class="sticker-code">${asset.assetCode}</div>
        </div>
      </body>
    </html>
  `);
  win.document.close();
}

/**
 * Print standard QR Code Label
 * Layout:
 * ┌──────────────────────┐
 * │         DBU          │
 * │      [ QR CODE ]     │
 * │                      │
 * │ Asset: DBU-00125     │
 * │ Computer             │
 * └──────────────────────┘
 */
export function printQrLabel(asset: PrintAssetData, qrUrl: string) {
  const win = window.open("", "_blank");
  if (!win) return;

  win.document.write(`
    <!DOCTYPE html>
    <html>
      <head>
        <title>DBU QR Label - ${asset.assetCode}</title>
        <style>
          @page {
            size: auto;
            margin: 0;
          }
          @media print {
            body {
              margin: 0;
              padding: 0;
              background: transparent;
            }
            .qr-card {
              box-shadow: none !important;
              border: 1px solid #000 !important;
            }
          }
          body {
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
            display: flex;
            align-items: center;
            justify-content: center;
            min-height: 100vh;
            background-color: #f8fafc;
            margin: 0;
            padding: 15px;
          }
          .qr-card {
            background: #ffffff;
            border: 1.5px solid #0f172a;
            border-radius: 12px;
            width: 220px;
            padding: 16px;
            box-sizing: border-box;
            display: flex;
            flex-direction: column;
            align-items: center;
            text-align: center;
          }
          .qr-header {
            font-size: 11px;
            font-weight: 900;
            letter-spacing: 2px;
            color: #0b4a6e;
            text-transform: uppercase;
            margin: 0 0 2px 0;
          }
          .qr-subtitle {
            font-size: 7px;
            font-weight: 700;
            color: #b45309;
            letter-spacing: 1px;
            text-transform: uppercase;
            margin: 0 0 10px 0;
          }
          .qr-box {
            width: 130px;
            height: 130px;
            display: flex;
            align-items: center;
            justify-content: center;
            margin-bottom: 10px;
          }
          .qr-box img {
            width: 100%;
            height: 100%;
            object-fit: contain;
          }
          .asset-info {
            width: 100%;
            border-top: 1px solid #e2e8f0;
            padding-top: 8px;
            margin-top: 2px;
          }
          .asset-code {
            font-family: ui-monospace, SFMono-Regular, monospace;
            font-size: 11px;
            font-weight: 800;
            color: #0284c7;
            margin: 0 0 3px 0;
          }
          .asset-name {
            font-size: 11px;
            font-weight: 700;
            color: #1e293b;
            margin: 0 0 2px 0;
            white-space: nowrap;
            overflow: hidden;
            text-overflow: ellipsis;
          }
          .asset-type {
            font-size: 8px;
            font-weight: 700;
            color: #64748b;
            text-transform: uppercase;
            margin: 0;
          }
          .qr-footer {
            font-size: 6px;
            font-weight: 700;
            color: #94a3b8;
            letter-spacing: 1px;
            text-transform: uppercase;
            border-top: 1px dashed #e2e8f0;
            padding-top: 6px;
            margin-top: 8px;
            width: 100%;
          }
        </style>
      </head>
      <body onload="window.print(); window.close();">
        <div class="qr-card">
          <div class="qr-header">DBU</div>
          <div class="qr-subtitle">Asset Tracking</div>
          <div class="qr-box">
            <img src="${qrUrl}" alt="Asset QR Code" />
          </div>
          <div class="asset-info">
            <div class="asset-code">Asset: ${asset.assetCode}</div>
            <div class="asset-name">${asset.name}</div>
            <div class="asset-type">${asset.typeName || asset.categoryName || "University Property"}</div>
          </div>
          <div class="qr-footer">Property Administration Directorate</div>
        </div>
      </body>
    </html>
  `);
  win.document.close();
}

/**
 * Print comprehensive asset label with photo, specs, and identification tag.
 */
export function printFullAssetLabel(
  asset: PrintAssetData,
  method: "QR" | "BARCODE" | "NONE",
  qrUrl?: string | null
) {
  if (method === "NONE") {
    alert("This asset has no physical QR/Barcode code required. Building or no-code assets do not generate physical printable labels.");
    return;
  }

  const barcodeSvg = generateBarcodeSvg(asset.assetCode, { height: 38, width: 1.8 });
  const win = window.open("", "_blank");
  if (!win) return;

  const tagHtml = method === "QR" && qrUrl
    ? `
      <div style="width: 110px; height: 110px; margin: 0 auto 10px auto;">
        <img src="${qrUrl}" alt="QR Code" style="width: 100%; height: 100%; object-fit: contain;" />
      </div>
    `
    : `
      <div style="width: 100%; border-top: 1px solid #f1f5f9; padding-top: 10px; margin-top: 4px; display: flex; flex-direction: column; align-items: center;">
        <div style="width: 100%;">${barcodeSvg}</div>
        <div style="font-family: monospace; font-size: 10px; font-weight: 700; color: #64748b; margin-top: 3px;">${asset.assetCode}</div>
      </div>
    `;

  win.document.write(`
    <!DOCTYPE html>
    <html>
      <head>
        <title>DBU Asset Label - ${asset.assetCode}</title>
        <style>
          @page { size: auto; margin: 0; }
          @media print {
            body { margin: 0; padding: 0; }
            .label-card { box-shadow: none !important; }
          }
          body {
            font-family: system-ui, -apple-system, sans-serif;
            display: flex;
            align-items: center;
            justify-content: center;
            min-height: 100vh;
            background-color: #f8fafc;
            margin: 0;
            padding: 20px;
          }
          .label-card {
            background: white;
            border: 1px solid #cbd5e1;
            border-radius: 14px;
            padding: 20px;
            width: 260px;
            display: flex;
            flex-direction: column;
            align-items: center;
            text-align: center;
          }
          .header {
            font-size: 10px;
            font-weight: 800;
            color: #0b4a6e;
            letter-spacing: 1.5px;
            text-transform: uppercase;
            margin: 0 0 2px 0;
          }
          .subheader {
            font-size: 7px;
            font-weight: 700;
            color: #b45309;
            letter-spacing: 1px;
            text-transform: uppercase;
            margin: 0 0 10px 0;
          }
          .photo {
            width: 100%;
            height: 120px;
            object-fit: cover;
            border-radius: 8px;
            border: 1px solid #e2e8f0;
            margin-bottom: 10px;
            background-color: #f8fafc;
          }
          .asset-name {
            font-size: 13px;
            font-weight: 800;
            color: #1e293b;
            margin: 0 0 2px 0;
            white-space: nowrap;
            overflow: hidden;
            text-overflow: ellipsis;
            width: 100%;
          }
          .asset-code {
            font-size: 11px;
            font-weight: 750;
            font-family: monospace;
            color: #0284c7;
            margin: 0 0 4px 0;
          }
          .asset-type {
            font-size: 8px;
            font-weight: 800;
            color: #475569;
            background-color: #f1f5f9;
            padding: 2px 6px;
            border-radius: 4px;
            text-transform: uppercase;
            margin-bottom: 10px;
            display: inline-block;
          }
          .footer {
            font-size: 7px;
            font-weight: 700;
            color: #94a3b8;
            letter-spacing: 1px;
            text-transform: uppercase;
            border-top: 1px dashed #e2e8f0;
            padding-top: 8px;
            margin-top: 10px;
            width: 100%;
          }
        </style>
      </head>
      <body onload="window.print(); window.close();">
        <div class="label-card">
          <div class="header">Debre Berhan University</div>
          <div class="subheader">Official Asset Tag</div>
          ${asset.imageUrl ? `<img src="${asset.imageUrl}" alt="Asset Photo" class="photo" />` : ""}
          <div class="asset-name">${asset.name}</div>
          <div class="asset-code">${asset.assetCode}</div>
          <div class="asset-type">${asset.categoryName || ""} ${asset.typeName ? `&rarr; ${asset.typeName}` : ""}</div>
          ${tagHtml}
          <div class="footer">Property Administration Directorate</div>
        </div>
      </body>
    </html>
  `);
  win.document.close();
}
