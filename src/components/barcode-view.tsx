"use client";

import React, { useMemo } from "react";
import { generateCode128Svg } from "@/lib/barcode";

interface BarcodeViewProps {
  value: string;
  height?: number;
  width?: number;
  displayValue?: boolean;
  className?: string;
}

/**
 * Camera-Readable Code 128 Barcode Viewer Component.
 * Uses high-contrast, strict ISO Code 128 vector bars with quiet zones.
 * Never distorts aspect ratio or bar ratios.
 */
export function BarcodeView({
  value,
  height = 44,
  width = 2,
  displayValue = false,
  className = "w-full flex justify-center"
}: BarcodeViewProps) {
  const svgHtml = useMemo(() => {
    if (!value) return "";
    return generateCode128Svg(value, {
      height,
      moduleWidth: width,
      quietZoneModules: 14,
      displayValue
    });
  }, [value, height, width, displayValue]);

  if (!value) return null;

  return (
    <div
      className={className}
      dangerouslySetInnerHTML={{ __html: svgHtml }}
    />
  );
}
