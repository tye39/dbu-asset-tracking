import JsBarcode from "jsbarcode";
import { MultiFormatReader, BarcodeFormat, DecodeHintType, RGBLuminanceSource, BinaryBitmap, HybridBinarizer } from "@zxing/library";

// JsBarcode can draw on an object or virtual canvas or SVG
// Let's see how JsBarcode creates an SVG
const { DOMImplementation, XMLSerializer } = require("@xmldom/xmldom") || {};

// JsBarcode provides direct access to its barcodes!
// Let's check JsBarcode.getBarcode or JsBarcode("CODE128")
console.log("JsBarcode properties:", Object.keys(JsBarcode));
