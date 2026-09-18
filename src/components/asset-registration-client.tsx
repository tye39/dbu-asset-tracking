"use client";

import React, { useState, useEffect, useTransition } from "react";
import QRCode from "qrcode";
import { registerAssetAction } from "@/app/actions/asset";
import {
  QrCode,
  Printer,
  ChevronLeft,
  ChevronRight,
  Check,
  Loader2,
  AlertTriangle,
  Info,
  Building,
  Zap,
  Tv,
  Armchair,
  Laptop,
  Beaker,
  Plus,
  Car,
  MoreHorizontal,
  Upload,
  Download,
  Image as ImageIcon
} from "lucide-react";
import { FundingSource } from "@prisma/client";

interface FormFieldItem {
  id: string;
  name: string;
  label: string;
  fieldType: string;
  placeholder?: string | null;
  description?: string | null;
  defaultValue?: string | null;
  options?: string | null;
  isRequired: boolean;
  validationMin?: number | null;
  validationMax?: number | null;
  validationMinLength?: number | null;
  validationMaxLength?: number | null;
}

interface CategoryItem {
  id: string;
  name: string;
  code: string;
  description?: string | null;
  isActive: boolean;
  assetTypes?: {
    id: string;
    name: string;
    categoryId: string;
    isActive: boolean;
  }[];
}



interface AssetRegistrationClientProps {
  categories: CategoryItem[];
  departments: { id: string; name: string; code: string }[];
}

const getCategoryIconAndColor = (code: string) => {
  const upper = code.toUpperCase();
  if (upper.includes("BUILD") || upper.includes("BLDG")) {
    return {
      Icon: Building,
      bgClass: "bg-blue-50 border-blue-100 text-blue-600"
    };
  }
  if (upper.includes("EL_EQ") || upper.includes("EL-EQ") || upper.includes("ELECTRICAL")) {
    return {
      Icon: Zap,
      bgClass: "bg-amber-50 border-amber-100 text-amber-500"
    };
  }
  if (upper === "ELEC" || upper.includes("ELECTRONICS")) {
    return {
      Icon: Tv,
      bgClass: "bg-purple-50 border-purple-100 text-purple-600"
    };
  }
  if (upper.includes("FURN") || upper.includes("FURNITURE")) {
    return {
      Icon: Armchair,
      bgClass: "bg-teal-50 border-teal-100 text-teal-600"
    };
  }
  if (upper.includes("ICT")) {
    return {
      Icon: Laptop,
      bgClass: "bg-sky-50 border-sky-100 text-sky-600"
    };
  }
  if (upper.includes("LAB") || upper.includes("LABORATORY")) {
    return {
      Icon: Beaker,
      bgClass: "bg-emerald-50 border-emerald-100 text-emerald-600"
    };
  }
  if (upper.includes("MED") || upper.includes("MEDICAL")) {
    return {
      Icon: Plus,
      bgClass: "bg-rose-50 border-rose-100 text-rose-600"
    };
  }
  if (upper.includes("VEH") || upper.includes("VEHICLE")) {
    return {
      Icon: Car,
      bgClass: "bg-blue-50 border-blue-100 text-blue-600"
    };
  }
  return {
    Icon: MoreHorizontal,
    bgClass: "bg-slate-50 border-slate-100 text-slate-500"
  };
};

export function generateBarcodeSvg(value: string) {
  const chars: Record<string, string> = {
    '0': 'N N W W N N N W N',
    '1': 'W N N W N N N N W',
    '2': 'N N W W N N N N W',
    '3': 'W N W W N N N N N',
    '4': 'N N N W W N N N W',
    '5': 'W N N W W N N N N',
    '6': 'N N W W W N N N N',
    '7': 'N N N W N N W N W',
    '8': 'W N N W N N W N N',
    '9': 'N N W W N N W N N',
    'A': 'W N N N N W N N W',
    'B': 'N N W N N W N N W',
    'C': 'W N W N N W N N N',
    'D': 'N N N N W W N N W',
    'E': 'W N N N W W N N N',
    'F': 'N N W N W W N N N',
    'G': 'N N N N N W W N W',
    'H': 'W N N N N W W N N',
    'I': 'N N W N N W W N N',
    'J': 'N N N N W W W N N',
    'K': 'W N N N N N N W W',
    'L': 'N N W N N N N W W',
    'M': 'W N W N N N N W N',
    'N': 'N N N N W N N W W',
    'O': 'W N N N W N N W N',
    'P': 'N N W N W N N W N',
    'Q': 'N N N N N N W W W',
    'R': 'W N N N N N W W N',
    'S': 'N N W N N N W W N',
    'T': 'N N N N W N W W N',
    'U': 'W W N N N N N N W',
    'V': 'N W W N N N N N W',
    'W': 'W W W N N N N N N',
    'X': 'N W N N W N N N W',
    'Y': 'W W N N W N N N N',
    'Z': 'N W W N W N N N N',
    '-': 'N W N N N N W N W',
    '.': 'W W N N N N W N N',
    ' ': 'N W W N N N W N N',
    '*': 'N W N N W N W N N',
    '$': 'N W N W N W N N N',
    '/': 'N W N W N N N W N',
    '+': 'N W N N N W N W N',
    '%': 'N N N W N W N W N'
  };

  const raw = value ? value.toUpperCase() : "TEMP";
  let clean = "";
  for (let i = 0; i < raw.length; i++) {
    if (chars[raw[i]]) clean += raw[i];
  }
  const formatted = `*${clean}*`;

  let result = "";
  for (let i = 0; i < formatted.length; i++) {
    const pattern = chars[formatted[i]];
    if (!pattern) continue;
    const parts = pattern.split(" ");
    for (let j = 0; j < parts.length; j++) {
      const isBar = j % 2 === 0;
      const isWide = parts[j] === "W";
      const width = isWide ? 3 : 1;
      result += isBar ? `B${width}` : `W${width}`;
    }
    result += "W1";
  }

  let currentX = 0;
  const rects: string[] = [];
  const height = 40;

  for (let i = 0; i < result.length; i += 2) {
    const type = result[i];
    const width = parseInt(result[i + 1]);
    if (type === "B") {
      rects.push(`<rect x="${currentX}" y="0" width="${width}" height="${height}" fill="black" />`);
    }
    currentX += width;
  }

  return `<svg width="100%" height="45" viewBox="0 0 ${currentX} ${height}" preserveAspectRatio="none">${rects.join("")}</svg>`;
}

export function AssetRegistrationClient({
  categories,
  departments
}: AssetRegistrationClientProps) {
  const [isPending, startTransition] = useTransition();

  // Step wizard: 1 = Category, 2 = Form, 3 = Review, 4 = Success
  const [step, setStep] = useState(1);
  const [categoryId, setCategoryId] = useState("");
  const [assetTypeId, setAssetTypeId] = useState("");
  const [error, setError] = useState<string | null>(null);

  // Dynamic configuration loaded from API
  const [configuredFields, setConfiguredFields] = useState<FormFieldItem[]>([]);
  const [availableSuppliers, setAvailableSuppliers] = useState<{ id: string; name: string }[]>([]);
  const [loadingConfig, setLoadingConfig] = useState(false);

  // Built-in inputs state
  const [name, setName] = useState("");
  const [assetCode, setAssetCode] = useState("");
  const [serialNumber, setSerialNumber] = useState("");
  const [description, setDescription] = useState("");
  const [departmentId, setDepartmentId] = useState("");
  const [building, setBuilding] = useState("");
  const [roomNumber, setRoomNumber] = useState("");
  const [purchaseDate, setPurchaseDate] = useState("");
  const [purchaseCost, setPurchaseCost] = useState("");
  const [supplierId, setSupplierId] = useState("");
  const [fundingSource, setFundingSource] = useState<FundingSource>(FundingSource.GOVERNMENT_BUDGET);
  const [usefulLife, setUsefulLife] = useState("5");
  const [salvageValue, setSalvageValue] = useState("");
  const [warrantyStartDate, setWarrantyStartDate] = useState("");
  const [warrantyEndDate, setWarrantyEndDate] = useState("");
  const [expiryDate, setExpiryDate] = useState("");
  
  // Custom Dynamic field inputs values state (maps RegistrationField.id -> value string)
  const [dynamicValues, setDynamicValues] = useState<Record<string, string>>({});

  // Helper common fields
  const [quantity, setQuantity] = useState("1");
  const [condition, setCondition] = useState("GOOD");
  const [assignedToId, setAssignedToId] = useState("");
  const [imageUrls, setImageUrls] = useState<string[]>(["", "", ""]);
  const imageUrl = imageUrls[0] || "";
  const [attachmentUrl, setAttachmentUrl] = useState("");
  const [remarks, setRemarks] = useState("");

  const [qrCodeUrl, setQrCodeUrl] = useState("");
  const [liveQrUrl, setLiveQrUrl] = useState("");

  const [departmentStaff, setDepartmentStaff] = useState<{ id: string; name: string; email: string }[]>([]);
  const [loadingStaff, setLoadingStaff] = useState(false);
  const [staffError, setStaffError] = useState<string | null>(null);

  // Clear validation error immediately when user types/changes any form state
  useEffect(() => {
    setError(null);
  }, [
    name,
    serialNumber,
    purchaseCost,
    purchaseDate,
    usefulLife,
    salvageValue,
    fundingSource,
    warrantyStartDate,
    warrantyEndDate,
    expiryDate,
    dynamicValues,
    categoryId,
    assetTypeId,
    departmentId,
    building,
    roomNumber,
    quantity,
    condition,
    assignedToId,
    imageUrls,
    attachmentUrl,
    remarks
  ]);

  // Dynamic Custodian Staff Filtering by Selected Responsible Unit / Department
  useEffect(() => {
    // Clears previous selected custodian staff instantly when department changes
    setAssignedToId("");
    setStaffError(null);

    if (!departmentId) {
      setDepartmentStaff([]);
      return;
    }

    const fetchStaff = async () => {
      setLoadingStaff(true);
      try {
        const res = await fetch(`/api/staff?departmentId=${departmentId}`);
        if (!res.ok) throw new Error("Failed to load staff for this department.");
        const data = await res.json();
        setDepartmentStaff(data.staff || []);
      } catch (err: unknown) {
        const errorMsg = err instanceof Error ? err.message : "Unable to load staff for this department. Please try again.";
        setStaffError(errorMsg);
        setDepartmentStaff([]);
      } finally {
        setLoadingStaff(false);
      }
    };

    fetchStaff();
  }, [departmentId]);

  useEffect(() => {
    if (assetCode) {
      QRCode.toDataURL(assetCode, { width: 200, margin: 1 })
        .then(setLiveQrUrl)
        .catch((err) => console.error("Error generating live QR preview", err));
    } else {
      setLiveQrUrl("");
    }
  }, [assetCode]);

  const activeCategories = categories.filter((c) => c.isActive);
  const selectedCategory = categories.find((c) => c.id === categoryId);
  const selectedAssetType = selectedCategory?.assetTypes?.find((t) => t.id === assetTypeId);

  // Fetch form configuration for selected Asset Type (Section 10)
  useEffect(() => {
    if (!assetTypeId) {
      setConfiguredFields([]);
      setAvailableSuppliers([]);
      return;
    }

    const fetchConfig = async () => {
      setLoadingConfig(true);
      setError(null);
      try {
        const res = await fetch(`/api/asset-type-config?assetTypeId=${assetTypeId}`);
        if (!res.ok) throw new Error("Failed to load type specifications.");
        const data = await res.json();
        
        setConfiguredFields(data.fields || []);
        setAvailableSuppliers(data.suppliers || []);

        // Load default values into states
        const defaults: Record<string, string> = {};
        data.fields.forEach((f: FormFieldItem) => {
          const isBuiltIn = ["name", "serialNumber", "purchaseCost", "purchaseDate", "usefulLife", "salvageValue", "fundingSource", "warrantyStartDate", "warrantyEndDate", "expiryDate"].includes(f.name);
          if (!isBuiltIn) {
            defaults[f.id] = f.defaultValue || "";
          } else {
            // Preset built-in fields if they have defaults
            if (f.name === "name") setName(f.defaultValue || "");
            if (f.name === "usefulLife") setUsefulLife(f.defaultValue || "5");
            if (f.name === "fundingSource") setFundingSource((f.defaultValue as FundingSource) || FundingSource.GOVERNMENT_BUDGET);
          }
        });
        setDynamicValues(defaults);
      } catch (err: unknown) {
        const errorMsg = err instanceof Error ? err.message : "Failed to load config.";
        setError(errorMsg);
      } finally {
        setLoadingConfig(false);
      }
    };

    fetchConfig();
  }, [assetTypeId]);

  // Auto-generate Asset Code prefix on Category select
  useEffect(() => {
    if (selectedCategory) {
      const prefix = `DBU-${selectedCategory.code.toUpperCase()}-`;
      const randomPart = Math.floor(100000 + Math.random() * 900000);
      setAssetCode(`${prefix}${randomPart}`);
    } else {
      setAssetCode("");
    }
  }, [selectedCategory]);

  const handleChooseCategory = (id: string) => {
    setCategoryId(id);
    setAssetTypeId("");
    setError(null);
    setStep(2);
  };

  const handleSlotImageChange = (index: number, e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const allowedTypes = ["image/jpeg", "image/png", "image/webp", "image/jpg"];
    if (!allowedTypes.includes(file.type)) {
      alert("Invalid file format. Please upload JPG, JPEG, PNG, or WebP.");
      return;
    }

    if (file.size > 2 * 1024 * 1024) {
      alert("File size exceeds 2MB limit. Please upload a smaller image.");
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === "string") {
        setImageUrls(prev => {
          const next = [...prev];
          next[index] = reader.result as string;
          return next;
        });
      }
    };
    reader.readAsDataURL(file);
  };

  const handleRemoveImageSlot = (index: number) => {
    setImageUrls(prev => {
      const next = [...prev];
      next[index] = "";
      return next;
    });
  };

  const getCustomVal = (id: string) => dynamicValues[id] || "";
  const setCustomVal = (id: string, val: string) => {
    setDynamicValues((prev) => ({ ...prev, [id]: val }));
  };

  // Client side validations on active fields
  const handleProceedToReview = () => {
    setError(null);

    // Validate Category & Asset Type first
    if (!categoryId || !assetTypeId) {
      setError("Please select Category and Asset Type.");
      return;
    }

    if (!departmentId) {
      setError("Please select a responsible unit / department.");
      return;
    }

    // Validate that at least one photo (primary) is uploaded
    const activePhotos = imageUrls.filter(Boolean);
    if (activePhotos.length === 0 || !imageUrls[0]) {
      setError("Please upload at least one asset photo.");
      return;
    }

    // Loop active configs to check requirements and range/length constraints
    for (const cfg of configuredFields) {
      const isBuiltIn = ["name", "serialNumber", "purchaseCost", "purchaseDate", "usefulLife", "salvageValue", "fundingSource", "warrantyStartDate", "warrantyEndDate", "expiryDate"].includes(cfg.name);
      let val = "";
      
      if (isBuiltIn) {
        if (cfg.name === "name") val = name;
        else if (cfg.name === "serialNumber") val = serialNumber;
        else if (cfg.name === "purchaseCost") val = purchaseCost;
        else if (cfg.name === "purchaseDate") val = purchaseDate;
        else if (cfg.name === "usefulLife") val = usefulLife;
        else if (cfg.name === "salvageValue") val = salvageValue;
        else if (cfg.name === "fundingSource") val = fundingSource;
        else if (cfg.name === "warrantyStartDate") val = warrantyStartDate;
        else if (cfg.name === "warrantyEndDate") val = warrantyEndDate;
        else if (cfg.name === "expiryDate") val = expiryDate;
      } else {
        val = dynamicValues[cfg.id] || "";
      }

      // Check required
      if (cfg.isRequired && (!val || val.trim() === "")) {
        return setError(`${cfg.label} is required.`);
      }

      // Range check (numbers)
      if (val && (["NUMBER", "DECIMAL"].includes(cfg.fieldType) || ["purchaseCost", "salvageValue", "usefulLife"].includes(cfg.name))) {
        const numVal = Number(val);
        if (!isNaN(numVal)) {
          if (cfg.validationMin !== null && cfg.validationMin !== undefined && numVal < cfg.validationMin) {
            return setError(`${cfg.label} must be at least ${cfg.validationMin}.`);
          }
          if (cfg.validationMax !== null && cfg.validationMax !== undefined && numVal > cfg.validationMax) {
            return setError(`${cfg.label} cannot exceed ${cfg.validationMax}.`);
          }
        }
      }

      // Length check (strings)
      if (val && (["TEXT", "TEXTAREA", "EMAIL", "URL"].includes(cfg.fieldType) || ["name", "serialNumber"].includes(cfg.name))) {
        if (cfg.validationMinLength !== null && cfg.validationMinLength !== undefined && val.length < cfg.validationMinLength) {
          return setError(`${cfg.label} must be at least ${cfg.validationMinLength} characters long.`);
        }
        if (cfg.validationMaxLength !== null && cfg.validationMaxLength !== undefined && val.length > cfg.validationMaxLength) {
          return setError(`${cfg.label} cannot exceed ${cfg.validationMaxLength} characters long.`);
        }
      }
    }

    // Number value logic validations
    if (purchaseCost && Number(purchaseCost) <= 0) {
      setError("Purchase Cost must be greater than zero.");
      return;
    }
    if (salvageValue && purchaseCost && Number(salvageValue) > Number(purchaseCost)) {
      setError("Salvage Value cannot exceed Purchase Cost.");
      return;
    }
    if (usefulLife && Number(usefulLife) <= 0) {
      setError("Useful Life must be greater than zero.");
      return;
    }

    setStep(3);
  };

  const handleSaveAsset = () => {
    setError(null);
    startTransition(async () => {
      // Build custom specs dictionary (only for enabled fields)
      const dynamicFieldsMap: Record<string, string> = {};
      configuredFields.forEach((cfg) => {
        const isBuiltIn = ["name", "serialNumber", "purchaseCost", "purchaseDate", "usefulLife", "salvageValue", "fundingSource", "warrantyStartDate", "warrantyEndDate", "expiryDate"].includes(cfg.name);
        if (!isBuiltIn) {
          dynamicFieldsMap[cfg.id] = dynamicValues[cfg.id] || "";
        }
      });

      // Submit asset payload
      const res = await registerAssetAction(null, {
        name,
        assetCode,
        serialNumber,
        description,
        categoryId,
        assetTypeId,
        departmentId,
        building,
        roomNumber,
        purchaseDate: purchaseDate ? new Date(purchaseDate) : undefined,
        purchaseCost: purchaseCost ? Number(purchaseCost) : undefined,
        usefulLife: usefulLife ? Number(usefulLife) : undefined,
        salvageValue: salvageValue ? Number(salvageValue) : undefined,
        fundingSource,
        warrantyStartDate: warrantyStartDate ? new Date(warrantyStartDate) : undefined,
        warrantyEndDate: warrantyEndDate ? new Date(warrantyEndDate) : undefined,
        supplierId: supplierId || undefined,
        quantity: Number(quantity),
        condition,
        imageUrl: imageUrls[0] || "",
        imageUrls: imageUrls.filter(Boolean),
        attachmentUrl,
        remarks,
        assignedToId: assignedToId || undefined,
        dynamicValues: dynamicFieldsMap
      });

      if (res.error) {
        setError(res.error);
        setStep(2);
      } else {
        // Generate QR code for review label pointing to public verification page
        const codeString =
          res.asset?.qrCode?.qrCodeString ||
          (res.asset?.publicId
            ? `${window.location.origin}/asset/verify/${res.asset.publicId}`
            : res.asset?.assetCode || assetCode);
        try {
          const qr = await QRCode.toDataURL(codeString, { width: 200, margin: 1 });
          setQrCodeUrl(qr);
        } catch (qrErr) {
          console.error("QR Code generation error", qrErr);
        }
        setStep(4);
      }
    });
  };

  const handlePrintLabel = () => {
    const printContent = document.getElementById("asset-print-label")?.innerHTML;
    if (!printContent) return;
    const win = window.open("", "_blank");
    if (win) {
      win.document.write(`
        <html>
          <head>
            <title>DBU Asset Tag Label</title>
            <style>
              @media print {
                body { margin: 0; padding: 0; }
                .no-print { display: none; }
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
                border: 1px solid #e2e8f0;
                border-radius: 16px;
                padding: 24px;
                width: 280px;
                box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.05);
                display: flex;
                flex-direction: column;
                align-items: center;
                text-align: center;
              }
              .header {
                font-size: 9px;
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
                margin: 0 0 12px 0;
              }
              .image-slot {
                width: 100%;
                height: 130px;
                object-fit: cover;
                border-radius: 10px;
                border: 1px solid #f1f5f9;
                margin-bottom: 12px;
                background-color: #f8fafc;
              }
              .asset-name {
                font-size: 14px;
                font-weight: 800;
                color: #1e293b;
                margin: 0 0 2px 0;
                white-space: nowrap;
                overflow: hidden;
                text-overflow: ellipsis;
                width: 100%;
              }
              .asset-code {
                font-size: 12px;
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
                padding: 3px 8px;
                border-radius: 6px;
                text-transform: uppercase;
                margin-bottom: 12px;
                display: inline-block;
              }
              .qr-image {
                width: 110px;
                height: 110px;
                object-fit: contain;
                margin-bottom: 12px;
              }
              .barcode-slot {
                width: 100%;
                border-top: 1px solid #f1f5f9;
                padding-top: 12px;
                margin-top: 4px;
                display: flex;
                flex-direction: column;
                align-items: center;
              }
              .barcode-slot svg {
                width: 100%;
                height: 40px;
              }
              .barcode-text {
                font-size: 9px;
                font-family: monospace;
                font-weight: 700;
                color: #64748b;
                margin-top: 4px;
                margin-bottom: 0;
              }
              .footer {
                font-size: 7px;
                font-weight: 700;
                color: #94a3b8;
                letter-spacing: 1px;
                text-transform: uppercase;
                border-top: 1px dashed #e2e8f0;
                padding-top: 10px;
                margin-top: 12px;
                width: 100%;
              }
            </style>
          </head>
          <body onload="window.print(); window.close();">
            <div class="label-card">
              ${printContent}
            </div>
          </body>
        </html>
      `);
      win.document.close();
    }
  };

  return (
    <div className="space-y-6 select-none">
      {/* Wizard Header Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between border-b border-blue-100 pb-4 bg-blue-950/5 -mx-3 -mt-3 sm:-mx-6 sm:-mt-6 p-4 sm:p-6 gap-3">
        <div>
          <h2 className="text-lg sm:text-xl font-bold text-blue-900">Register New Asset</h2>
          <p className="text-[11px] sm:text-xs text-blue-600 font-semibold mt-0.5">
            Dynamic Asset Registration and QR Code Tag Generation Wizard
          </p>
        </div>
        <div className="flex items-center space-x-1 sm:space-x-2 text-[10px] sm:text-xs font-bold overflow-x-auto max-w-full pb-1 shrink-0">
          <span className={`px-2 sm:px-2.5 py-1 rounded-full whitespace-nowrap ${step === 1 ? "bg-[#0b4a6e] text-white" : "bg-slate-200 text-slate-600"}`}>1. Category</span>
          <ChevronRight size={12} className="text-slate-300 shrink-0" />
          <span className={`px-2 sm:px-2.5 py-1 rounded-full whitespace-nowrap ${step === 2 ? "bg-[#0b4a6e] text-white" : "bg-slate-200 text-slate-600"}`}>2. Setup Details</span>
          <ChevronRight size={12} className="text-slate-300 shrink-0" />
          <span className={`px-2 sm:px-2.5 py-1 rounded-full whitespace-nowrap ${step === 3 ? "bg-[#0b4a6e] text-white" : "bg-slate-200 text-slate-600"}`}>3. Review</span>
          <ChevronRight size={12} className="text-slate-300 shrink-0" />
          <span className={`px-2 sm:px-2.5 py-1 rounded-full whitespace-nowrap ${step === 4 ? "bg-emerald-600 text-white" : "bg-slate-200 text-slate-600"}`}>4. Completed</span>
        </div>
      </div>

      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-2xl text-xs font-semibold text-red-700 flex items-center gap-2 max-w-2xl mx-auto shadow-sm">
          <AlertTriangle size={14} />
          <span>{error}</span>
        </div>
      )}

      {/* STEP 1: CHOOSE CATEGORY */}
      {step === 1 && (
        <div className="space-y-4">
          <div className="text-center max-w-lg mx-auto py-2">
            <h3 className="text-sm font-bold text-slate-700">Choose Classification Category</h3>
            <p className="text-xs text-slate-400 mt-1">
              Select the primary family category of the asset to configure dynamic form specs
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 max-w-4xl mx-auto">
            {activeCategories.map((cat) => {
              const { Icon, bgClass } = getCategoryIconAndColor(cat.code);
              return (
                <button
                  key={cat.id}
                  onClick={() => handleChooseCategory(cat.id)}
                  className="bg-white p-5 rounded-2xl border border-slate-200/80 hover:border-[#0b4a6e] hover:shadow-lg transition-all text-left flex flex-col justify-between h-36"
                >
                  <div className={`w-8 h-8 rounded-full border flex items-center justify-center mb-3 ${bgClass}`}>
                    <Icon size={16} />
                  </div>
                  <div>
                    <h4 className="text-xs font-extrabold text-slate-800">{cat.name}</h4>
                    <p className="text-[10px] text-slate-450 mt-1 line-clamp-2 leading-relaxed">
                      {cat.description || "Dynamic asset category configuration"}
                    </p>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* STEP 2: FILL REGISTRATION FORM */}
      {step === 2 && selectedCategory && (
        <div className="space-y-6">
          <div className="bg-slate-50 border border-slate-200 p-4 rounded-2xl flex flex-wrap gap-4 items-center justify-between">
            <div className="flex items-center space-x-3">
              <span className="text-[10px] font-extrabold text-[#0b4a6e] bg-[#0b4a6e]/10 border border-[#0b4a6e]/20 px-3 py-1 rounded-full uppercase tracking-wider">
                Category: {selectedCategory.name}
              </span>
            </div>

            <div className="flex items-center space-x-2">
              <label className="text-[10px] font-extrabold text-slate-500 uppercase">Asset Type *</label>
              <select
                required
                className="p-1.5 bg-white border border-slate-200 rounded-lg text-xs font-semibold text-slate-700 focus:outline-none"
                value={assetTypeId}
                onChange={(e) => {
                  const val = e.target.value;
                  setAssetTypeId(val);
                  const t = selectedCategory?.assetTypes?.find((x) => x.id === val);
                  setName(t?.name || "");
                }}
              >
                <option value="">-- Choose Type --</option>
                {selectedCategory?.assetTypes
                  ?.filter((t) => t.isActive)
                  .map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.name}
                    </option>
                  ))}
              </select>
            </div>
          </div>

          {loadingConfig ? (
            <div className="p-16 flex items-center justify-center space-x-2">
              <Loader2 className="animate-spin text-[#0b4a6e]" size={20} />
              <span className="text-xs text-slate-500 font-semibold">Loading dynamic layout...</span>
            </div>
          ) : !assetTypeId ? (
            <div className="p-16 border border-dashed border-slate-200 rounded-2xl text-center space-y-2">
              <Info size={24} className="mx-auto text-slate-400" />
              <p className="text-xs text-slate-500 font-semibold">Select an Asset Type to load the registration form</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
              {/* Form Side */}
              <div className="lg:col-span-2 bg-white p-6 rounded-2xl border border-slate-100 shadow-sm space-y-6">
                <div className="border-b border-slate-100 pb-3">
                  <h4 className="text-xs font-extrabold text-[#0b4a6e] uppercase tracking-wider">Dynamic Specs Form</h4>
                </div>

              {/* Dynamic form inputs */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4">
                {/* Generated Asset ID (Auto-Generated, read-only) */}
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Asset ID (Auto)</label>
                  <input
                    type="text"
                    disabled
                    className="w-full p-2 bg-slate-100 border border-slate-200 rounded-lg text-slate-500 font-semibold font-mono"
                    value={assetCode}
                  />
                </div>

                {configuredFields
                  .map((cfg) => {
                    const isRequired = cfg.isRequired;
                    const isBuiltIn = ["name", "serialNumber", "purchaseCost", "purchaseDate", "usefulLife", "salvageValue", "fundingSource", "warrantyStartDate", "warrantyEndDate", "expiryDate"].includes(cfg.name);

                  let val = "";
                  let setVal: (v: string) => void = () => {};

                  if (isBuiltIn) {
                    if (cfg.name === "name") {
                      val = name;
                      setVal = setName;
                    } else if (cfg.name === "serialNumber") {
                      val = serialNumber;
                      setVal = setSerialNumber;
                    } else if (cfg.name === "purchaseCost") {
                      val = purchaseCost;
                      setVal = setPurchaseCost;
                    } else if (cfg.name === "purchaseDate") {
                      val = purchaseDate;
                      setVal = setPurchaseDate;
                    } else if (cfg.name === "usefulLife") {
                      val = usefulLife;
                      setVal = setUsefulLife;
                    } else if (cfg.name === "salvageValue") {
                      val = salvageValue;
                      setVal = setSalvageValue;
                    } else if (cfg.name === "fundingSource") {
                      val = fundingSource;
                      setVal = (v) => setFundingSource(v as FundingSource);
                    } else if (cfg.name === "warrantyStartDate") {
                      val = warrantyStartDate;
                      setVal = setWarrantyStartDate;
                    } else if (cfg.name === "warrantyEndDate") {
                      val = warrantyEndDate;
                      setVal = setWarrantyEndDate;
                    } else if (cfg.name === "expiryDate") {
                      val = expiryDate;
                      setVal = setExpiryDate;
                    }
                  } else {
                    val = getCustomVal(cfg.id);
                    setVal = (v) => setCustomVal(cfg.id, v);
                  }

                  return (
                    <div key={cfg.id} className={cfg.fieldType === "TEXTAREA" ? "col-span-2" : ""}>
                      <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">
                        {cfg.label} {isRequired && <span className="text-red-500">*</span>}
                      </label>

                      {cfg.fieldType === "TEXT" && (
                        <input
                          type="text"
                          required={isRequired}
                          placeholder={cfg.placeholder || `Enter ${cfg.label.toLowerCase()}...`}
                          className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg text-xs"
                          value={val}
                          onChange={(e) => setVal(e.target.value)}
                        />
                      )}

                      {cfg.fieldType === "TEXTAREA" && (
                        <textarea
                          required={isRequired}
                          placeholder={cfg.placeholder || `Details...`}
                          className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg text-xs h-20 resize-none"
                          value={val}
                          onChange={(e) => setVal(e.target.value)}
                        />
                      )}

                      {cfg.fieldType === "NUMBER" && (
                        <input
                          type="number"
                          required={isRequired}
                          placeholder={cfg.placeholder || "0"}
                          className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-mono"
                          value={val}
                          onChange={(e) => setVal(e.target.value)}
                        />
                      )}

                      {cfg.fieldType === "DECIMAL" && (
                        <input
                          type="text"
                          required={isRequired}
                          placeholder={cfg.placeholder || "0.00"}
                          className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-mono"
                          value={val}
                          onChange={(e) => setVal(e.target.value)}
                        />
                      )}

                      {cfg.fieldType === "DATE" && (
                        <input
                          type="date"
                          required={isRequired}
                          className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg text-xs"
                          value={val}
                          onChange={(e) => setVal(e.target.value)}
                        />
                      )}

                      {cfg.fieldType === "BOOLEAN" && (
                        <select
                          required={isRequired}
                          className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg text-xs"
                          value={val}
                          onChange={(e) => setVal(e.target.value)}
                        >
                          <option value="">-- Select --</option>
                          <option value="Yes">Yes</option>
                          <option value="No">No</option>
                        </select>
                      )}

                      {cfg.fieldType === "CHECKBOX" && (
                        <div className="flex items-center space-x-2 p-2 bg-slate-50 border border-slate-200 rounded-lg">
                          <input
                            type="checkbox"
                            checked={val === "Yes" || val === "true"}
                            onChange={(e) => setVal(e.target.checked ? "Yes" : "No")}
                            className="rounded border-slate-350"
                          />
                          <span className="text-xs text-slate-650 font-medium">Yes / Active</span>
                        </div>
                      )}

                      {cfg.fieldType === "RADIO" && (
                        <div className="flex flex-wrap gap-3 p-1">
                          {(cfg.options || "Option A,Option B").split(",").map((o) => (
                            <label key={o} className="flex items-center space-x-1.5 text-xs text-slate-650 cursor-pointer">
                              <input
                                type="radio"
                                name={`radio-${cfg.id}`}
                                checked={val === o}
                                onChange={() => setVal(o)}
                                className="text-[#0b4a6e]"
                              />
                              <span>{o}</span>
                            </label>
                          ))}
                        </div>
                      )}

                      {cfg.fieldType === "DROPDOWN" && (
                        <select
                          required={isRequired}
                          className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-semibold text-slate-600"
                          value={val}
                          onChange={(e) => setVal(e.target.value)}
                        >
                          <option value="">-- Choose Option --</option>
                          {cfg.name === "supplier" ? (
                            // Scoped Supplier selection (Section 8)
                            availableSuppliers.map((sup) => (
                              <option key={sup.id} value={sup.id}>
                                {sup.name}
                              </option>
                            ))
                          ) : (
                            (cfg.options || "").split(",").map((o) => (
                              <option key={o} value={o}>
                                {o}
                              </option>
                            ))
                          )}
                        </select>
                      )}
                    </div>
                  );
                })}

                {/* Scoped Supplier Dropdown (Section 7 & 8) - Show only if not overridden in dynamic form config */}
                {!configuredFields.some((f) => f.name === "supplier") && (
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Supplier Vendor</label>
                    <select
                      className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-semibold text-slate-600"
                      value={supplierId}
                      onChange={(e) => setSupplierId(e.target.value)}
                    >
                      <option value="">-- Scoped Suppliers dropdown --</option>
                      {availableSuppliers.map((s) => (
                        <option key={s.id} value={s.id}>
                          {s.name}
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                {/* Common fields required for physical placement */}
                <div className="col-span-2 border-t border-slate-100 pt-4 mt-2">
                  <h5 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">
                    Placement & Assignment Details
                  </h5>
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Responsible Unit / Dept *</label>
                  <select
                    required
                    className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-semibold text-slate-650"
                    value={departmentId}
                    onChange={(e) => setDepartmentId(e.target.value)}
                  >
                    <option value="">-- Choose Unit --</option>
                    {departments.map((d) => (
                      <option key={d.id} value={d.id}>
                        {d.name} ({d.code})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Custodian Staff Member (Optional)</label>
                  <select
                    disabled={!departmentId || loadingStaff}
                    className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-semibold text-slate-650 disabled:opacity-60"
                    value={assignedToId}
                    onChange={(e) => setAssignedToId(e.target.value)}
                  >
                    {!departmentId ? (
                      <option value="">-- Select Department First --</option>
                    ) : loadingStaff ? (
                      <option value="">Loading staff members...</option>
                    ) : staffError ? (
                      <option value="">{staffError}</option>
                    ) : departmentStaff.length === 0 ? (
                      <option value="">No eligible staff members found for this department.</option>
                    ) : (
                      <>
                        <option value="">-- Choose Staff --</option>
                        {departmentStaff.map((u) => (
                          <option key={u.id} value={u.id}>
                            {u.name} ({u.email})
                          </option>
                        ))}
                      </>
                    )}
                  </select>
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Building / Block</label>
                  <input
                    type="text"
                    placeholder="e.g. Block 03"
                    className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg text-xs"
                    value={building}
                    onChange={(e) => setBuilding(e.target.value)}
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Room Number</label>
                  <input
                    type="text"
                    placeholder="e.g. Room 204"
                    className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg text-xs"
                    value={roomNumber}
                    onChange={(e) => setRoomNumber(e.target.value)}
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Quantity</label>
                  <input
                    type="number"
                    min="1"
                    className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-mono"
                    value={quantity}
                    onChange={(e) => setQuantity(e.target.value)}
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Initial Condition</label>
                  <select
                    className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg text-xs"
                    value={condition}
                    onChange={(e) => setCondition(e.target.value)}
                  >
                    <option value="NEW">New</option>
                    <option value="GOOD">Good / Operable</option>
                    <option value="FAIR">Fair</option>
                  </select>
                </div>

                <div className="col-span-2 space-y-3">
                  <label className="block text-[10px] font-bold text-slate-500 uppercase">Asset Photos</label>
                  
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {[0, 1, 2].map((idx) => {
                      const isRequired = idx === 0;
                      const hasImage = !!imageUrls[idx];
                      const label = isRequired ? "Primary Photo *" : `Additional Photo ${idx + 1}`;
                      
                      return (
                        <div key={idx} className="space-y-1.5">
                          <span className="block text-[9px] font-black text-slate-400 uppercase tracking-wide">
                            {label}
                          </span>
                          
                          {hasImage ? (
                            <div className="relative w-full h-36 bg-slate-50 border border-slate-200 rounded-xl overflow-hidden shadow-sm flex items-center justify-center">
                              {/* eslint-disable-next-line @next/next/no-img-element */}
                              <img src={imageUrls[idx]} alt={label} className="max-w-full max-h-full object-contain" />
                              <button
                                type="button"
                                onClick={() => handleRemoveImageSlot(idx)}
                                className="absolute top-1.5 right-1.5 px-2 py-0.5 bg-red-655 hover:bg-red-750 text-white rounded text-[8px] font-bold shadow-md transition-colors"
                              >
                                Remove
                              </button>
                            </div>
                          ) : (
                            <div className="border border-dashed border-slate-200 hover:border-[#0b4a6e] rounded-xl h-36 bg-slate-50/50 hover:bg-slate-50/80 transition-all text-center flex flex-col items-center justify-center p-3 relative">
                              <input
                                type="file"
                                accept="image/png, image/jpeg, image/jpg, image/webp"
                                onChange={(e) => handleSlotImageChange(idx, e)}
                                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                              />
                              <Upload size={14} className="text-slate-400 mb-1" />
                              <span className="text-[10px] font-bold text-slate-600">
                                {isRequired ? "Upload Primary *" : `Upload Photo ${idx + 1}`}
                              </span>
                              <span className="text-[8px] text-slate-400 mt-0.5">PNG, JPG, WebP (2MB)</span>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Document Attachment URL</label>
                  <input
                    type="text"
                    placeholder="https://..."
                    className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg text-xs"
                    value={attachmentUrl}
                    onChange={(e) => setAttachmentUrl(e.target.value)}
                  />
                </div>

                <div className="col-span-2">
                  <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Remarks</label>
                  <input
                    type="text"
                    placeholder="Administrative remarks..."
                    className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg text-xs"
                    value={remarks}
                    onChange={(e) => setRemarks(e.target.value)}
                  />
                </div>

                <div className="col-span-2">
                  <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">General Description</label>
                  <textarea
                    placeholder="Optional notes or asset descriptions..."
                    className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg text-xs h-16 resize-none"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                  />
                </div>
              </div>

              <div className="flex justify-between items-center pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setStep(1)}
                  className="px-4 py-2 border border-slate-200 text-slate-500 rounded-lg text-xs font-bold flex items-center gap-1 hover:bg-slate-50"
                >
                  <ChevronLeft size={14} /> Back
                </button>
                <button
                  type="button"
                  onClick={handleProceedToReview}
                  className="px-5 py-2.5 bg-[#0b4a6e] hover:bg-sky-850 text-white rounded-lg text-xs font-bold flex items-center gap-1"
                >
                  Proceed to Review <ChevronRight size={14} />
                </button>
              </div>
            </div>

            {/* Sticky Sidebar Live Label Preview (beside the form) */}
              <div className="lg:col-span-1 space-y-4">
                <div className="sticky top-6 bg-white p-5 rounded-2xl border border-slate-100 shadow-md flex flex-col items-center space-y-4">
                  <h4 className="text-[10px] font-extrabold text-slate-450 uppercase tracking-wider mb-2">Live ID Label Preview</h4>
                  
                  {/* Printable Label View */}
                  <div className="w-full border border-slate-200 rounded-xl p-4 bg-white flex flex-col items-center space-y-3 relative shadow-sm">
                    <p className="text-[8px] font-extrabold text-sky-900 tracking-wider">DEBRE BERHAN UNIVERSITY</p>
                    
                    {/* Image display in Label */}
                    <div className="w-full h-32 bg-slate-50 border border-slate-150 rounded-lg overflow-hidden flex items-center justify-center relative">
                      {imageUrl ? (
                        /* eslint-disable-next-line @next/next/no-img-element */
                        <img src={imageUrl} alt="Preview" className="w-full h-full object-cover" />
                      ) : (
                        <div className="text-slate-300 flex flex-col items-center">
                          <ImageIcon size={32} />
                          <span className="text-[9px] mt-1 font-semibold">Asset Photo Placeholder</span>
                        </div>
                      )}
                    </div>
                    
                    {/* Basic details */}
                    <div className="text-center w-full space-y-0.5">
                      <p className="text-xs font-bold text-slate-800 truncate">{name || "Asset Name"}</p>
                      <p className="text-[10px] text-sky-700 font-mono font-bold leading-none">{assetCode || "DBU-CODE"}</p>
                      <p className="text-[8px] text-slate-400 font-bold uppercase tracking-wider mt-1">{selectedCategory.name} &rarr; {selectedAssetType?.name || "Type"}</p>
                    </div>
                    
                    {/* QR Code */}
                    <div className="w-24 h-24 border border-slate-100 bg-white rounded-lg flex items-center justify-center">
                      {liveQrUrl ? (
                        /* eslint-disable-next-line @next/next/no-img-element */
                        <img src={liveQrUrl} alt="QR Code Preview" className="w-full h-full object-contain" />
                      ) : (
                        <QrCode size={32} className="text-slate-200" />
                      )}
                    </div>
                    
                    {/* Barcode */}
                    <div className="w-full flex flex-col items-center space-y-1 pt-1 border-t border-slate-100">
                      <div className="w-full flex justify-center" dangerouslySetInnerHTML={{ __html: generateBarcodeSvg(assetCode) }} />
                      <p className="text-[8px] font-mono font-bold text-slate-500">{assetCode}</p>
                    </div>
                    
                    <p className="text-[6px] text-slate-400 font-bold tracking-widest text-center uppercase border-t border-slate-100/50 pt-1.5 w-full">Property Administration</p>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* STEP 3: REVIEW DETAILS */}
      {step === 3 && selectedCategory && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start animate-in fade-in duration-205">
          {/* Main Review Side */}
          <div className="lg:col-span-2 bg-white p-6 rounded-2xl border border-slate-100 shadow-sm space-y-6">
            <div className="border-b border-slate-100 pb-3 flex justify-between items-center">
              <h4 className="text-sm font-extrabold text-[#0b4a6e] uppercase tracking-wider">
                Review Asset Registration Parameters
              </h4>
              <span className="text-[10px] font-bold text-slate-400 bg-slate-50 border border-slate-150 px-2 py-0.5 rounded">Step 3 of 4</span>
            </div>

            {/* Section 1: Asset Image */}
            <div className="space-y-2">
              <h5 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Asset Photo(s) Preview</h5>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {imageUrls.map((url, idx) => {
                  if (!url) return null;
                  return (
                    <div key={idx} className="space-y-1">
                      <p className="text-[8px] font-bold text-slate-400 uppercase">
                        {idx === 0 ? "Primary Photo *" : `Additional Photo ${idx + 1}`}
                      </p>
                      <div className="w-full h-40 bg-slate-50 border border-slate-200 rounded-xl overflow-hidden flex items-center justify-center relative shadow-sm">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={url} alt={`Asset photo preview ${idx + 1}`} className="max-w-full max-h-full object-contain" />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Section 2: Basic Information */}
            <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 space-y-2.5">
              <h5 className="text-[9px] font-black text-[#0b4a6e] uppercase tracking-widest border-b border-slate-200/50 pb-1.5">
                Basic Information
              </h5>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                <div className="flex justify-between border-b border-slate-200/40 pb-1">
                  <span className="text-slate-400">Asset Number (ID):</span>
                  <span className="font-bold text-sky-750 font-mono">{assetCode}</span>
                </div>
                <div className="flex justify-between border-b border-slate-200/40 pb-1">
                  <span className="text-slate-400">Category:</span>
                  <span className="font-bold text-slate-800">{selectedCategory.name}</span>
                </div>
                <div className="flex justify-between border-b border-slate-200/40 pb-1">
                  <span className="text-slate-400">Asset Type Name:</span>
                  <span className="font-bold text-slate-800">{selectedAssetType?.name || "N/A"}</span>
                </div>
                <div className="flex justify-between border-b border-slate-200/40 pb-1">
                  <span className="text-slate-400">Serial Number:</span>
                  <span className="font-bold text-slate-800">{serialNumber || "N/A"}</span>
                </div>
                <div className="flex justify-between border-b border-slate-200/40 pb-1">
                  <span className="text-slate-400">Responsible Unit:</span>
                  <span className="font-bold text-slate-800">
                    {departments.find((d) => d.id === departmentId)?.name}
                  </span>
                </div>
              </div>
            </div>

            {/* Section 3: Specifications */}
            <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 space-y-2.5">
              <h5 className="text-[9px] font-black text-[#0b4a6e] uppercase tracking-widest border-b border-slate-200/50 pb-1.5">
                Specification Parameters
              </h5>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                {configuredFields.filter(cfg => !["name", "serialNumber", "purchaseCost", "purchaseDate", "usefulLife", "salvageValue", "fundingSource", "warrantyStartDate", "warrantyEndDate", "expiryDate"].includes(cfg.name)).map((cfg) => {
                  const val = getCustomVal(cfg.id);
                  return (
                    <div key={cfg.id} className="flex justify-between border-b border-slate-200/40 pb-1">
                      <span className="text-slate-400">{cfg.label}:</span>
                      <span className="font-bold text-slate-800">{val || "N/A"}</span>
                    </div>
                  );
                })}
                {/* Standard specs */}
                <div className="flex justify-between border-b border-slate-200/40 pb-1">
                  <span className="text-slate-400">Building / Block:</span>
                  <span className="font-bold text-slate-800">{building || "N/A"}</span>
                </div>
                <div className="flex justify-between border-b border-slate-200/40 pb-1">
                  <span className="text-slate-400">Room Number:</span>
                  <span className="font-bold text-slate-800">{roomNumber || "N/A"}</span>
                </div>
                <div className="flex justify-between border-b border-slate-200/40 pb-1">
                  <span className="text-slate-400">Quantity:</span>
                  <span className="font-bold text-slate-800">{quantity}</span>
                </div>
                <div className="flex justify-between border-b border-slate-200/40 pb-1">
                  <span className="text-slate-400">Condition Status:</span>
                  <span className="font-bold text-slate-800 uppercase">{condition}</span>
                </div>
              </div>
            </div>

            {/* Section 4: Financial Information */}
            <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 space-y-2.5">
              <h5 className="text-[9px] font-black text-[#0b4a6e] uppercase tracking-widest border-b border-slate-200/50 pb-1.5">
                Financial Information
              </h5>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                <div className="flex justify-between border-b border-slate-200/40 pb-1">
                  <span className="text-slate-400">Purchase Cost:</span>
                  <span className="font-bold text-slate-800">{purchaseCost || "0"} ETB</span>
                </div>
                <div className="flex justify-between border-b border-slate-200/40 pb-1">
                  <span className="text-slate-400">Purchase Date:</span>
                  <span className="font-bold text-slate-800">{purchaseDate || "N/A"}</span>
                </div>
                <div className="flex justify-between border-b border-slate-200/40 pb-1">
                  <span className="text-slate-400">Funding Source:</span>
                  <span className="font-bold text-slate-800 uppercase">{fundingSource.replace(/_/g, " ")}</span>
                </div>
                <div className="flex justify-between border-b border-slate-200/40 pb-1">
                  <span className="text-slate-400">Supplier:</span>
                  <span className="font-bold text-slate-800">
                    {availableSuppliers.find((s) => s.id === supplierId)?.name || "N/A"}
                  </span>
                </div>
                <div className="flex justify-between border-b border-slate-200/40 pb-1">
                  <span className="text-slate-400">Useful Life:</span>
                  <span className="font-bold text-slate-800">{usefulLife} Years</span>
                </div>
                <div className="flex justify-between border-b border-slate-200/40 pb-1">
                  <span className="text-slate-400">Salvage Value:</span>
                  <span className="font-bold text-slate-800">{salvageValue || "0"} ETB</span>
                </div>
              </div>
            </div>

            {/* Section 5: Warranty */}
            <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 space-y-2.5">
              <h5 className="text-[9px] font-black text-[#0b4a6e] uppercase tracking-widest border-b border-slate-200/50 pb-1.5">
                Warranty Coverage
              </h5>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                <div className="flex justify-between border-b border-slate-200/40 pb-1">
                  <span className="text-slate-400">Warranty Start Date:</span>
                  <span className="font-bold text-slate-800">{warrantyStartDate || "N/A"}</span>
                </div>
                <div className="flex justify-between border-b border-slate-200/40 pb-1">
                  <span className="text-slate-400">Warranty End Date:</span>
                  <span className="font-bold text-slate-800">{warrantyEndDate || "N/A"}</span>
                </div>
              </div>
            </div>

            {/* Section 6: Identification */}
            <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 space-y-2.5">
              <h5 className="text-[9px] font-black text-[#0b4a6e] uppercase tracking-widest border-b border-slate-200/50 pb-1.5">
                Identity Codes
              </h5>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                <div className="flex flex-col items-center p-3 bg-white border border-slate-200 rounded-lg">
                  <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-2">QR Code Preview</span>
                  {liveQrUrl ? (
                    /* eslint-disable-next-line @next/next/no-img-element */
                    <img src={liveQrUrl} alt="QR Code Preview" className="w-24 h-24 object-contain" />
                  ) : (
                    <QrCode size={40} className="text-slate-350 animate-pulse" />
                  )}
                </div>
                <div className="flex flex-col items-center p-3 bg-white border border-slate-200 rounded-lg justify-center">
                  <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-3">Barcode Preview</span>
                  <div className="w-full flex justify-center" dangerouslySetInnerHTML={{ __html: generateBarcodeSvg(assetCode) }} />
                  <span className="text-[10px] font-mono font-bold mt-1 text-slate-500">{assetCode}</span>
                </div>
              </div>
            </div>

            <div className="flex justify-between pt-4 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setStep(2)}
                className="px-4 py-2 border border-slate-200 text-slate-500 rounded-lg text-xs font-bold flex items-center gap-1 hover:bg-slate-50"
              >
                <ChevronLeft size={14} /> Back
              </button>
              <button
                onClick={handleSaveAsset}
                disabled={isPending}
                className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 shadow-md"
              >
                {isPending && <Loader2 size={12} className="animate-spin" />}
                Confirm & Register Asset
              </button>
            </div>
          </div>

          {/* Sticky Sidebar Live Label Preview (beside the form) */}
          <div className="lg:col-span-1 space-y-4">
            <div className="sticky top-6 bg-white p-5 rounded-2xl border border-slate-100 shadow-md flex flex-col items-center space-y-4">
              <h4 className="text-[10px] font-extrabold text-slate-450 uppercase tracking-wider mb-2">Live ID Label Preview</h4>
              
              {/* Printable Label View */}
              <div className="w-full border border-slate-200 rounded-xl p-4 bg-white flex flex-col items-center space-y-3 relative shadow-sm">
                <p className="text-[8px] font-extrabold text-sky-900 tracking-wider">DEBRE BERHAN UNIVERSITY</p>
                
                {/* Image display in Label */}
                <div className="w-full h-32 bg-slate-50 border border-slate-150 rounded-lg overflow-hidden flex items-center justify-center relative">
                  {imageUrl ? (
                    /* eslint-disable-next-line @next/next/no-img-element */
                    <img src={imageUrl} alt="Preview" className="w-full h-full object-cover" />
                  ) : (
                    <div className="text-slate-300 flex flex-col items-center">
                      <ImageIcon size={32} />
                      <span className="text-[9px] mt-1 font-semibold">Asset Photo Placeholder</span>
                    </div>
                  )}
                </div>
                
                {/* Basic details */}
                <div className="text-center w-full space-y-0.5">
                  <p className="text-xs font-bold text-slate-800 truncate">{name || "Asset Name"}</p>
                  <p className="text-[10px] text-sky-700 font-mono font-bold leading-none">{assetCode || "DBU-CODE"}</p>
                  <p className="text-[8px] text-slate-400 font-bold uppercase tracking-wider mt-1">{selectedCategory.name} &rarr; {selectedAssetType?.name || "Type"}</p>
                </div>
                
                {/* QR Code */}
                <div className="w-24 h-24 border border-slate-100 bg-white rounded-lg flex items-center justify-center">
                  {liveQrUrl ? (
                    /* eslint-disable-next-line @next/next/no-img-element */
                    <img src={liveQrUrl} alt="QR Code Preview" className="w-full h-full object-contain" />
                  ) : (
                    <QrCode size={32} className="text-slate-200" />
                  )}
                </div>
                
                {/* Barcode */}
                <div className="w-full flex flex-col items-center space-y-1 pt-1 border-t border-slate-100">
                  <div className="w-full flex justify-center" dangerouslySetInnerHTML={{ __html: generateBarcodeSvg(assetCode) }} />
                  <p className="text-[8px] font-mono font-bold text-slate-500">{assetCode}</p>
                </div>
                
                <p className="text-[6px] text-slate-400 font-bold tracking-widest text-center uppercase border-t border-slate-100/50 pt-1.5 w-full">Property Administration</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* STEP 4: SUCCESS & PRINT LABEL */}
      {step === 4 && selectedCategory && selectedAssetType && (
        <div className="bg-white p-8 rounded-2xl border border-slate-100 shadow-sm max-w-xl mx-auto flex flex-col items-center justify-center space-y-6 text-center">
          <div className="w-12 h-12 bg-emerald-100 rounded-full flex items-center justify-center text-emerald-700">
            <Check size={24} />
          </div>

          <div>
            <h3 className="text-base font-bold text-slate-800">Asset Registered Successfully!</h3>
            <p className="text-xs text-slate-500 mt-1">
              Properties synchronized with the configured form layout schema.
            </p>
          </div>

          {/* Print preview tag layout */}
          <div id="asset-print-label" className="p-4 bg-white border border-slate-200 rounded-xl flex flex-col items-center space-y-3 w-64 shadow-sm">
            <div className="text-center">
              <h5 className="text-[10px] font-extrabold text-[#0b4a6e] uppercase tracking-wider leading-none m-0">Debre Berhan University</h5>
              <p className="text-[6px] text-amber-700 font-bold uppercase tracking-widest mt-1 mb-0">DBU ASSET LABEL</p>
            </div>

            {/* Image display in Label */}
            <div className="w-full h-32 bg-slate-50 border border-slate-150 rounded-lg overflow-hidden flex items-center justify-center relative">
              {imageUrl ? (
                /* eslint-disable-next-line @next/next/no-img-element */
                <img src={imageUrl} alt="Asset Photo" className="w-full h-full object-cover" />
              ) : (
                <div className="text-slate-350 flex flex-col items-center">
                  <ImageIcon size={32} />
                  <span className="text-[9px] mt-1 font-semibold">No Photo Uploaded</span>
                </div>
              )}
            </div>

            {/* Basic details */}
            <div className="text-center w-full space-y-0.5">
              <p className="text-xs font-bold text-slate-800 truncate m-0">{name || "Asset Name"}</p>
              <p className="text-[10px] text-sky-750 font-mono font-bold leading-none my-1">{assetCode || "DBU-CODE"}</p>
              <span className="inline-block bg-slate-100 text-slate-650 text-[7px] font-extrabold px-1.5 py-0.5 rounded uppercase mt-0.5">
                {selectedCategory.name} &rarr; {selectedAssetType.name}
              </span>
            </div>

            {/* QR Code */}
            <div className="w-24 h-24 border border-slate-150 bg-white rounded-lg flex items-center justify-center">
              {qrCodeUrl ? (
                /* eslint-disable-next-line @next/next/no-img-element */
                <img src={qrCodeUrl} alt="Asset Tag QR Code" className="w-full h-full object-contain" />
              ) : (
                <div className="text-slate-350">
                  <QrCode size={36} />
                </div>
              )}
            </div>

            {/* Barcode */}
            <div className="w-full flex flex-col items-center space-y-1 pt-1 border-t border-slate-100">
              <div className="w-full flex justify-center" dangerouslySetInnerHTML={{ __html: generateBarcodeSvg(assetCode) }} />
              <p className="text-[8px] font-mono font-bold text-slate-500 m-0">{assetCode}</p>
            </div>

            <p className="text-[6px] text-slate-400 font-bold tracking-widest text-center uppercase border-t border-slate-100/50 pt-1.5 w-full m-0">Property Administration</p>
          </div>

          <div className="w-full flex flex-col sm:flex-row gap-2">
            <button
              onClick={handlePrintLabel}
              className="flex-1 py-2.5 bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-650 rounded-xl text-xs font-bold flex items-center justify-center space-x-1.5 transition-all"
            >
              <Printer size={12} />
              <span>Print Label</span>
            </button>
            {qrCodeUrl && (
              <a
                href={qrCodeUrl}
                download={`label-${assetCode}.png`}
                className="flex-1 py-2.5 bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-650 rounded-xl text-xs font-bold flex items-center justify-center space-x-1.5 transition-all"
              >
                <Download size={12} />
                <span>Download Label</span>
              </a>
            )}
            <button
              onClick={() => {
                setCategoryId("");
                setStep(1);
              }}
              className="flex-1 py-2.5 bg-sky-700 hover:bg-sky-850 text-white rounded-xl text-xs font-bold transition-all"
            >
              Register Another
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
