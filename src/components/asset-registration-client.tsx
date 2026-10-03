"use client";

import React, { useState, useEffect, useTransition } from "react";
import QRCode from "qrcode";
import { registerAssetAction } from "@/app/actions/asset";
import {
  QrCode,
  Barcode as BarcodeIcon,
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
import { isBuildingAsset } from "@/lib/barcode";
import { BarcodeView } from "@/components/barcode-view";
import { printBarcodeSticker, printQrLabel, printFullAssetLabel } from "@/lib/print-label";

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
  const [identificationMethod, setIdentificationMethod] = useState<"QR" | "BARCODE" | "NONE">("QR");
  const [includeAssetImage, setIncludeAssetImage] = useState<boolean>(true);

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
    remarks,
    identificationMethod
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
  const isBuilding = isBuildingAsset(selectedCategory, selectedAssetType);

  // Buildings must never have QR or Barcode; default and lock to NONE
  useEffect(() => {
    if (isBuilding) {
      setIdentificationMethod("NONE");
    }
  }, [isBuilding]);

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
        setIncludeAssetImage(data.includeAssetImage ?? true);

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
    const cat = categories.find((c) => c.id === id);
    const catIsBuilding = isBuildingAsset(cat, null);
    setCategoryId(id);
    setAssetTypeId("");
    setIdentificationMethod(catIsBuilding ? "NONE" : "QR");
    setIncludeAssetImage(true);
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

      const finalMethod = isBuilding ? "NONE" : identificationMethod;

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
        dynamicValues: dynamicFieldsMap,
        identificationMethod: finalMethod,
      });

      if (res.error) {
        setError(res.error);
        setStep(2);
      } else {
        if (res.asset?.assetCode) {
          setAssetCode(res.asset.assetCode);
        }
        // Generate QR code only if QR method was chosen
        if (finalMethod === "QR") {
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
        }
        setStep(4);
      }
    });
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
            <div className="space-y-6">
              {/* SECTION 1: ASSET INFORMATION */}
              <div className="bg-white p-6 rounded-2xl border border-slate-200/90 shadow-xs space-y-4">
                <div className="border-b border-slate-100 pb-3">
                  <h4 className="text-xs font-black text-[#0b4a6e] uppercase tracking-wider flex items-center gap-2">
                    <Info size={15} />
                    <span>Asset Information</span>
                  </h4>
                  <p className="text-[11px] text-slate-500 font-medium mt-0.5">
                    Core identity, naming, category classification, and condition of the asset.
                  </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {/* Asset Name */}
                  <div className="md:col-span-2">
                    <label className="block text-[10px] font-bold text-slate-600 uppercase mb-1">
                      Asset Name <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Dell Latitude 5420 Laptop"
                      className="w-full p-2.5 bg-slate-50 border border-slate-250 rounded-xl text-xs font-semibold text-slate-800 focus:bg-white focus:outline-none focus:ring-1 focus:ring-[#0b4a6e]"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                    />
                  </div>

                  {/* Asset Code (Auto-Generated, read-only) */}
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">
                      Asset ID / Code (System Generated)
                    </label>
                    <input
                      type="text"
                      disabled
                      className="w-full p-2.5 bg-slate-100 border border-slate-200 rounded-xl text-slate-500 font-bold font-mono text-xs"
                      value={assetCode}
                    />
                  </div>

                  {/* Category (Display) */}
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">
                      Category
                    </label>
                    <input
                      type="text"
                      disabled
                      className="w-full p-2.5 bg-slate-100 border border-slate-200 rounded-xl text-slate-700 font-semibold text-xs"
                      value={selectedCategory.name}
                    />
                  </div>

                  {/* Asset Type */}
                  <div>
                    <label className="block text-[10px] font-bold text-slate-600 uppercase mb-1">
                      Asset Type <span className="text-red-500">*</span>
                    </label>
                    <select
                      required
                      className="w-full p-2.5 bg-white border border-slate-250 rounded-xl text-xs font-semibold text-slate-800 focus:outline-none focus:ring-1 focus:ring-[#0b4a6e]"
                      value={assetTypeId}
                      onChange={(e) => {
                        const val = e.target.value;
                        setAssetTypeId(val);
                        const t = selectedCategory?.assetTypes?.find((x) => x.id === val);
                        setName(t?.name || "");
                      }}
                    >
                      <option value="">-- Select Type --</option>
                      {selectedCategory?.assetTypes
                        ?.filter((t) => t.isActive)
                        .map((t) => (
                          <option key={t.id} value={t.id}>
                            {t.name}
                          </option>
                        ))}
                    </select>
                  </div>

                  {/* Serial Number */}
                  <div>
                    <label className="block text-[10px] font-bold text-slate-600 uppercase mb-1">
                      Serial Number / Tag
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. SN-8924021A"
                      className="w-full p-2.5 bg-slate-50 border border-slate-250 rounded-xl text-xs font-mono font-semibold text-slate-800 focus:bg-white focus:outline-none focus:ring-1 focus:ring-[#0b4a6e]"
                      value={serialNumber}
                      onChange={(e) => setSerialNumber(e.target.value)}
                    />
                  </div>

                  {/* Condition */}
                  <div>
                    <label className="block text-[10px] font-bold text-slate-600 uppercase mb-1">
                      Physical Condition <span className="text-red-500">*</span>
                    </label>
                    <select
                      className="w-full p-2.5 bg-white border border-slate-250 rounded-xl text-xs font-semibold text-slate-800 focus:outline-none focus:ring-1 focus:ring-[#0b4a6e]"
                      value={condition}
                      onChange={(e) => setCondition(e.target.value)}
                    >
                      <option value="NEW">New / Pristine</option>
                      <option value="GOOD">Good / Operable</option>
                      <option value="FAIR">Fair / Functional</option>
                      <option value="POOR">Poor / Needs Maintenance</option>
                    </select>
                  </div>

                  {/* Description */}
                  <div className="md:col-span-2 lg:col-span-3">
                    <label className="block text-[10px] font-bold text-slate-600 uppercase mb-1">
                      General Description / Remarks
                    </label>
                    <textarea
                      placeholder="Enter optional description, physical markings, or initial notes..."
                      className="w-full p-2.5 bg-slate-50 border border-slate-250 rounded-xl text-xs text-slate-800 h-20 resize-none focus:bg-white focus:outline-none focus:ring-1 focus:ring-[#0b4a6e]"
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                    />
                  </div>
                </div>
              </div>

              {/* SECTION 2: TECHNICAL INFORMATION */}
              <div className="bg-white p-6 rounded-2xl border border-slate-200/90 shadow-xs space-y-4">
                <div className="border-b border-slate-100 pb-3">
                  <h4 className="text-xs font-black text-[#0b4a6e] uppercase tracking-wider flex items-center gap-2">
                    <Zap size={15} />
                    <span>Technical Information</span>
                  </h4>
                  <p className="text-[11px] text-slate-500 font-medium mt-0.5">
                    Specifications configured for <strong className="text-slate-700">{selectedAssetType?.name || selectedCategory.name}</strong>.
                  </p>
                </div>

                {(() => {
                  const standardNames = ["name", "serialNumber", "purchaseCost", "purchaseDate", "usefulLife", "salvageValue", "fundingSource", "warrantyStartDate", "warrantyEndDate", "expiryDate"];
                  const techFields = configuredFields.filter((f) => !standardNames.includes(f.name));

                  if (techFields.length === 0) {
                    return (
                      <div className="p-6 bg-slate-50 rounded-xl border border-slate-200/60 text-center text-slate-400 text-xs font-medium">
                        No additional technical fields configured for {selectedAssetType?.name || "this asset type"}.
                      </div>
                    );
                  }

                  return (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {techFields.map((cfg) => {
                        const val = getCustomVal(cfg.id);
                        const isRequired = cfg.isRequired;

                        return (
                          <div key={cfg.id} className={cfg.fieldType === "TEXTAREA" ? "md:col-span-2 lg:col-span-3" : ""}>
                            <label className="block text-[10px] font-bold text-slate-600 uppercase mb-1">
                              {cfg.label} {isRequired && <span className="text-red-500">*</span>}
                            </label>

                            {cfg.fieldType === "TEXT" && (
                              <input
                                type="text"
                                required={isRequired}
                                placeholder={cfg.placeholder || `Enter ${cfg.label.toLowerCase()}...`}
                                className="w-full p-2.5 bg-slate-50 border border-slate-250 rounded-xl text-xs font-medium text-slate-800 focus:bg-white focus:outline-none focus:ring-1 focus:ring-[#0b4a6e]"
                                value={val}
                                onChange={(e) => setCustomVal(cfg.id, e.target.value)}
                              />
                            )}

                            {cfg.fieldType === "TEXTAREA" && (
                              <textarea
                                required={isRequired}
                                placeholder={cfg.placeholder || "Enter details..."}
                                className="w-full p-2.5 bg-slate-50 border border-slate-250 rounded-xl text-xs font-medium text-slate-800 h-20 resize-none focus:bg-white focus:outline-none focus:ring-1 focus:ring-[#0b4a6e]"
                                value={val}
                                onChange={(e) => setCustomVal(cfg.id, e.target.value)}
                              />
                            )}

                            {cfg.fieldType === "NUMBER" && (
                              <input
                                type="number"
                                required={isRequired}
                                placeholder={cfg.placeholder || "0"}
                                className="w-full p-2.5 bg-slate-50 border border-slate-250 rounded-xl text-xs font-mono font-medium text-slate-800 focus:bg-white focus:outline-none focus:ring-1 focus:ring-[#0b4a6e]"
                                value={val}
                                onChange={(e) => setCustomVal(cfg.id, e.target.value)}
                              />
                            )}

                            {cfg.fieldType === "DECIMAL" && (
                              <input
                                type="text"
                                required={isRequired}
                                placeholder={cfg.placeholder || "0.00"}
                                className="w-full p-2.5 bg-slate-50 border border-slate-250 rounded-xl text-xs font-mono font-medium text-slate-800 focus:bg-white focus:outline-none focus:ring-1 focus:ring-[#0b4a6e]"
                                value={val}
                                onChange={(e) => setCustomVal(cfg.id, e.target.value)}
                              />
                            )}

                            {cfg.fieldType === "DATE" && (
                              <input
                                type="date"
                                required={isRequired}
                                className="w-full p-2.5 bg-slate-50 border border-slate-250 rounded-xl text-xs font-medium text-slate-800 focus:bg-white focus:outline-none focus:ring-1 focus:ring-[#0b4a6e]"
                                value={val}
                                onChange={(e) => setCustomVal(cfg.id, e.target.value)}
                              />
                            )}

                            {cfg.fieldType === "BOOLEAN" && (
                              <select
                                required={isRequired}
                                className="w-full p-2.5 bg-white border border-slate-250 rounded-xl text-xs font-medium text-slate-800 focus:outline-none focus:ring-1 focus:ring-[#0b4a6e]"
                                value={val}
                                onChange={(e) => setCustomVal(cfg.id, e.target.value)}
                              >
                                <option value="">-- Choose Option --</option>
                                <option value="Yes">Yes</option>
                                <option value="No">No</option>
                              </select>
                            )}

                            {cfg.fieldType === "DROPDOWN" && (
                              <select
                                required={isRequired}
                                className="w-full p-2.5 bg-white border border-slate-250 rounded-xl text-xs font-medium text-slate-800 focus:outline-none focus:ring-1 focus:ring-[#0b4a6e]"
                                value={val}
                                onChange={(e) => setCustomVal(cfg.id, e.target.value)}
                              >
                                <option value="">-- Choose Option --</option>
                                {(cfg.options || "").split(",").map((opt) => (
                                  <option key={opt.trim()} value={opt.trim()}>
                                    {opt.trim()}
                                  </option>
                                ))}
                              </select>
                            )}

                            {cfg.fieldType === "RADIO" && (
                              <div className="flex flex-wrap gap-3 pt-1">
                                {(cfg.options || "").split(",").map((opt) => {
                                  const trimmed = opt.trim();
                                  return (
                                    <label key={trimmed} className="flex items-center space-x-1.5 text-xs text-slate-700 cursor-pointer">
                                      <input
                                        type="radio"
                                        name={`radio-${cfg.id}`}
                                        value={trimmed}
                                        checked={val === trimmed}
                                        onChange={() => setCustomVal(cfg.id, trimmed)}
                                        className="text-[#0b4a6e] focus:ring-[#0b4a6e]"
                                      />
                                      <span>{trimmed}</span>
                                    </label>
                                  );
                                })}
                              </div>
                            )}

                            {cfg.description && (
                              <p className="text-[10px] text-slate-400 mt-1">💡 {cfg.description}</p>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  );
                })()}
              </div>

              {/* SECTION 3: LOCATION & ASSIGNMENT */}
              <div className="bg-white p-6 rounded-2xl border border-slate-200/90 shadow-xs space-y-4">
                <div className="border-b border-slate-100 pb-3">
                  <h4 className="text-xs font-black text-[#0b4a6e] uppercase tracking-wider flex items-center gap-2">
                    <Building size={15} />
                    <span>Location & Assignment</span>
                  </h4>
                  <p className="text-[11px] text-slate-500 font-medium mt-0.5">
                    Physical location, campus room allocation, and designated responsible custodian.
                  </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {/* Responsible Unit */}
                  <div>
                    <label className="block text-[10px] font-bold text-slate-600 uppercase mb-1">
                      Responsible Unit / Dept <span className="text-red-500">*</span>
                    </label>
                    <select
                      required
                      className="w-full p-2.5 bg-white border border-slate-250 rounded-xl text-xs font-semibold text-slate-800 focus:outline-none focus:ring-1 focus:ring-[#0b4a6e]"
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

                  {/* Custodian Staff Member */}
                  <div>
                    <label className="block text-[10px] font-bold text-slate-600 uppercase mb-1">
                      Custodian Staff Member (Optional)
                    </label>
                    <select
                      disabled={!departmentId || loadingStaff}
                      className="w-full p-2.5 bg-white border border-slate-250 rounded-xl text-xs font-semibold text-slate-800 focus:outline-none focus:ring-1 focus:ring-[#0b4a6e] disabled:bg-slate-100 disabled:opacity-60"
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
                        <option value="">No eligible staff found for this department</option>
                      ) : (
                        <>
                          <option value="">-- Choose Staff Member --</option>
                          {departmentStaff.map((u) => (
                            <option key={u.id} value={u.id}>
                              {u.name} ({u.email})
                            </option>
                          ))}
                        </>
                      )}
                    </select>
                  </div>

                  {/* Building / Block */}
                  <div>
                    <label className="block text-[10px] font-bold text-slate-600 uppercase mb-1">
                      Building / Block
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. Block 04, ICT Center"
                      className="w-full p-2.5 bg-slate-50 border border-slate-250 rounded-xl text-xs font-medium text-slate-800 focus:bg-white focus:outline-none focus:ring-1 focus:ring-[#0b4a6e]"
                      value={building}
                      onChange={(e) => setBuilding(e.target.value)}
                    />
                  </div>

                  {/* Room / Area */}
                  <div>
                    <label className="block text-[10px] font-bold text-slate-600 uppercase mb-1">
                      Room / Area
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. Room 204, Lab B"
                      className="w-full p-2.5 bg-slate-50 border border-slate-250 rounded-xl text-xs font-medium text-slate-800 focus:bg-white focus:outline-none focus:ring-1 focus:ring-[#0b4a6e]"
                      value={roomNumber}
                      onChange={(e) => setRoomNumber(e.target.value)}
                    />
                  </div>

                  {/* Quantity */}
                  <div>
                    <label className="block text-[10px] font-bold text-slate-600 uppercase mb-1">
                      Quantity <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="number"
                      min="1"
                      required
                      className="w-full p-2.5 bg-slate-50 border border-slate-250 rounded-xl text-xs font-mono font-medium text-slate-800 focus:bg-white focus:outline-none focus:ring-1 focus:ring-[#0b4a6e]"
                      value={quantity}
                      onChange={(e) => setQuantity(e.target.value)}
                    />
                  </div>
                </div>
              </div>

              {/* SECTION 4: FINANCIAL INFORMATION */}
              <div className="bg-white p-6 rounded-2xl border border-slate-200/90 shadow-xs space-y-4">
                <div className="border-b border-slate-100 pb-3">
                  <h4 className="text-xs font-black text-[#0b4a6e] uppercase tracking-wider flex items-center gap-2">
                    <Armchair size={15} />
                    <span>Financial Information</span>
                  </h4>
                  <p className="text-[11px] text-slate-500 font-medium mt-0.5">
                    Acquisition costs, depreciation parameters, supplier source, and warranty terms.
                  </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  {/* Purchase Cost */}
                  <div>
                    <label className="block text-[10px] font-bold text-slate-600 uppercase mb-1">
                      Purchase Cost (ETB)
                    </label>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      placeholder="0.00"
                      className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono font-medium text-slate-800 focus:bg-white focus:outline-none focus:ring-1 focus:ring-[#0b4a6e]"
                      value={purchaseCost}
                      onChange={(e) => setPurchaseCost(e.target.value)}
                    />
                  </div>

                  {/* Purchase Date */}
                  <div>
                    <label className="block text-[10px] font-bold text-slate-600 uppercase mb-1">
                      Purchase Date
                    </label>
                    <input
                      type="date"
                      className="w-full p-2.5 bg-slate-50 border border-slate-250 rounded-xl text-xs font-medium text-slate-800 focus:bg-white focus:outline-none focus:ring-1 focus:ring-[#0b4a6e]"
                      value={purchaseDate}
                      onChange={(e) => setPurchaseDate(e.target.value)}
                    />
                  </div>

                  {/* Useful Life */}
                  <div>
                    <label className="block text-[10px] font-bold text-slate-600 uppercase mb-1">
                      Useful Life (Years)
                    </label>
                    <input
                      type="number"
                      min="1"
                      placeholder="5"
                      className="w-full p-2.5 bg-slate-50 border border-slate-250 rounded-xl text-xs font-mono font-medium text-slate-800 focus:bg-white focus:outline-none focus:ring-1 focus:ring-[#0b4a6e]"
                      value={usefulLife}
                      onChange={(e) => setUsefulLife(e.target.value)}
                    />
                  </div>

                  {/* Salvage Value */}
                  <div>
                    <label className="block text-[10px] font-bold text-slate-600 uppercase mb-1">
                      Salvage Value (ETB)
                    </label>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      placeholder="0.00"
                      className="w-full p-2.5 bg-slate-50 border border-slate-250 rounded-xl text-xs font-mono font-medium text-slate-800 focus:bg-white focus:outline-none focus:ring-1 focus:ring-[#0b4a6e]"
                      value={salvageValue}
                      onChange={(e) => setSalvageValue(e.target.value)}
                    />
                  </div>

                  {/* Funding Source */}
                  <div>
                    <label className="block text-[10px] font-bold text-slate-600 uppercase mb-1">
                      Funding Source
                    </label>
                    <select
                      className="w-full p-2.5 bg-white border border-slate-250 rounded-xl text-xs font-medium text-slate-800 focus:outline-none focus:ring-1 focus:ring-[#0b4a6e]"
                      value={fundingSource}
                      onChange={(e) => setFundingSource(e.target.value as FundingSource)}
                    >
                      <option value={FundingSource.GOVERNMENT_BUDGET}>Government Budget</option>
                      <option value={FundingSource.UNIVERSITY_INTERNAL_BUDGET}>University Internal Budget</option>
                      <option value={FundingSource.RESEARCH_GRANT}>Research Grant</option>
                      <option value={FundingSource.PROJECT_FUND}>Project Fund</option>
                      <option value={FundingSource.DONATION}>Donation</option>
                      <option value={FundingSource.OTHER}>Other</option>
                    </select>
                  </div>

                  {/* Supplier */}
                  <div>
                    <label className="block text-[10px] font-bold text-slate-600 uppercase mb-1">
                      Supplier / Vendor
                    </label>
                    <select
                      className="w-full p-2.5 bg-white border border-slate-250 rounded-xl text-xs font-medium text-slate-800 focus:outline-none focus:ring-1 focus:ring-[#0b4a6e]"
                      value={supplierId}
                      onChange={(e) => setSupplierId(e.target.value)}
                    >
                      <option value="">-- Select Supplier --</option>
                      {availableSuppliers.map((s) => (
                        <option key={s.id} value={s.id}>
                          {s.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Warranty Start Date */}
                  <div>
                    <label className="block text-[10px] font-bold text-slate-600 uppercase mb-1">
                      Warranty Start Date
                    </label>
                    <input
                      type="date"
                      className="w-full p-2.5 bg-slate-50 border border-slate-250 rounded-xl text-xs font-medium text-slate-800 focus:bg-white focus:outline-none focus:ring-1 focus:ring-[#0b4a6e]"
                      value={warrantyStartDate}
                      onChange={(e) => setWarrantyStartDate(e.target.value)}
                    />
                  </div>

                  {/* Warranty End Date */}
                  <div>
                    <label className="block text-[10px] font-bold text-slate-600 uppercase mb-1">
                      Warranty End Date
                    </label>
                    <input
                      type="date"
                      className="w-full p-2.5 bg-slate-50 border border-slate-250 rounded-xl text-xs font-medium text-slate-800 focus:bg-white focus:outline-none focus:ring-1 focus:ring-[#0b4a6e]"
                      value={warrantyEndDate}
                      onChange={(e) => setWarrantyEndDate(e.target.value)}
                    />
                  </div>
                </div>
              </div>

              {/* SECTION 5: ASSET IMAGE (Conditional per PART 4 & 5) */}
              {includeAssetImage && (
                <div className="bg-white p-6 rounded-2xl border border-slate-200/90 shadow-xs space-y-4">
                  <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                    <div>
                      <h4 className="text-xs font-black text-slate-800 uppercase tracking-wider flex items-center gap-2">
                        <ImageIcon size={15} className="text-[#0b4a6e]" />
                        <span>Asset Image</span>
                      </h4>
                      <p className="text-[11px] text-slate-500 font-medium mt-0.5">
                        Upload an image of the asset for physical identification and verification (optional).
                      </p>
                    </div>
                    <span className="text-[10px] font-bold text-slate-400 bg-slate-100 px-2.5 py-0.5 rounded-full">
                      Optional
                    </span>
                  </div>

                  <div className="max-w-md">
                    {imageUrls[0] ? (
                      <div className="space-y-3">
                        <div className="relative w-full h-48 bg-slate-50 border border-slate-250 rounded-xl overflow-hidden flex items-center justify-center p-2">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img src={imageUrls[0]} alt="Asset preview" className="max-h-full max-w-full object-contain" />
                        </div>
                        <div className="flex gap-2">
                          <label className="flex-1 py-2 px-3 bg-slate-100 hover:bg-slate-200 border border-slate-300 text-slate-700 text-xs font-bold rounded-lg text-center cursor-pointer transition-colors">
                            Change Image
                            <input
                              type="file"
                              accept="image/jpeg,image/png,image/webp,image/jpg"
                              className="hidden"
                              onChange={(e) => handleSlotImageChange(0, e)}
                            />
                          </label>
                          <button
                            type="button"
                            onClick={() => handleRemoveImageSlot(0)}
                            className="py-2 px-3 bg-red-50 hover:bg-red-100 border border-red-200 text-red-650 text-xs font-bold rounded-lg transition-colors"
                          >
                            Remove
                          </button>
                        </div>
                      </div>
                    ) : (
                      <label className="border-2 border-dashed border-slate-250 hover:border-[#0b4a6e] rounded-xl p-8 bg-slate-50/60 hover:bg-slate-50/90 transition-all flex flex-col items-center justify-center text-center cursor-pointer block">
                        <input
                          type="file"
                          accept="image/jpeg,image/png,image/webp,image/jpg"
                          className="hidden"
                          onChange={(e) => handleSlotImageChange(0, e)}
                        />
                        <Upload size={24} className="text-[#0b4a6e] mb-2" />
                        <span className="text-xs font-bold text-slate-700">Upload Asset Image</span>
                        <span className="text-[10px] text-slate-400 mt-1">Supports JPG, JPEG, PNG, WEBP (Max 2MB)</span>
                      </label>
                    )}
                  </div>
                </div>
              )}

              {/* SECTION 6: IDENTIFICATION METHOD (PART 7) */}
              <div className="bg-white p-6 rounded-2xl border border-slate-200/90 shadow-xs space-y-4">
                <div className="border-b border-slate-100 pb-3">
                  <h4 className="text-xs font-black text-slate-800 uppercase tracking-wider flex items-center gap-2">
                    <QrCode size={15} />
                    <span>Identification Method</span>
                  </h4>
                  <p className="text-[11px] text-slate-500 font-medium mt-0.5">
                    Select how this asset will be tagged and identified physically.
                  </p>
                </div>

                {isBuilding ? (
                  <div className="p-4 bg-sky-50 border border-sky-200 rounded-xl flex items-start gap-3">
                    <Building className="text-[#0b4a6e] shrink-0 mt-0.5" size={20} />
                    <div className="space-y-1">
                      <p className="text-xs font-bold text-[#0b4a6e]">
                        Building Asset — Identification Method: NONE
                      </p>
                      <p className="text-[11px] text-slate-600 leading-relaxed">
                        A building itself does not require a QR code or barcode. Physical sticker tags are not generated. Buildings are tracked and identified using Building ID, official name, and campus location records.
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    {/* QR Code Option */}
                    <label
                      className={`p-4 rounded-xl border-2 flex flex-col justify-between cursor-pointer transition-all ${
                        identificationMethod === "QR"
                          ? "border-[#0b4a6e] bg-sky-50/40 shadow-xs"
                          : "border-slate-200 bg-white hover:border-slate-300"
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        <input
                          type="radio"
                          name="identificationMethod"
                          value="QR"
                          checked={identificationMethod === "QR"}
                          onChange={() => setIdentificationMethod("QR")}
                          className="mt-1 text-[#0b4a6e] focus:ring-[#0b4a6e]"
                        />
                        <div className="space-y-1">
                          <div className="flex items-center gap-1.5">
                            <QrCode size={16} className="text-[#0b4a6e]" />
                            <span className="text-xs font-black text-slate-800">QR Code</span>
                          </div>
                          <p className="text-[11px] text-slate-500 leading-normal">
                            Standard 2D code. Best for medium to large assets and supports public verification.
                          </p>
                        </div>
                      </div>
                    </label>

                    {/* Barcode Option */}
                    <label
                      className={`p-4 rounded-xl border-2 flex flex-col justify-between cursor-pointer transition-all ${
                        identificationMethod === "BARCODE"
                          ? "border-[#0b4a6e] bg-sky-50/40 shadow-xs"
                          : "border-slate-200 bg-white hover:border-slate-300"
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        <input
                          type="radio"
                          name="identificationMethod"
                          value="BARCODE"
                          checked={identificationMethod === "BARCODE"}
                          onChange={() => setIdentificationMethod("BARCODE")}
                          className="mt-1 text-[#0b4a6e] focus:ring-[#0b4a6e]"
                        />
                        <div className="space-y-1">
                          <div className="flex items-center gap-1.5">
                            <BarcodeIcon size={16} className="text-[#0b4a6e]" />
                            <span className="text-xs font-black text-slate-800">Barcode (Code 128)</span>
                          </div>
                          <p className="text-[11px] text-slate-500 leading-normal">
                            Camera-readable standard Code 128 sticker. Ideal for compact, slim, or IT accessories.
                          </p>
                        </div>
                      </div>
                    </label>

                    {/* No Code Option */}
                    <label
                      className={`p-4 rounded-xl border-2 flex flex-col justify-between cursor-pointer transition-all ${
                        identificationMethod === "NONE"
                          ? "border-[#0b4a6e] bg-sky-50/40 shadow-xs"
                          : "border-slate-200 bg-white hover:border-slate-300"
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        <input
                          type="radio"
                          name="identificationMethod"
                          value="NONE"
                          checked={identificationMethod === "NONE"}
                          onChange={() => setIdentificationMethod("NONE")}
                          className="mt-1 text-[#0b4a6e] focus:ring-[#0b4a6e]"
                        />
                        <div className="space-y-1">
                          <span className="text-xs font-black text-slate-800">No Code</span>
                          <p className="text-[11px] text-slate-500 leading-normal">
                            No physical tag generated. Tracked exclusively by Asset ID, serial number, and records.
                          </p>
                        </div>
                      </div>
                    </label>
                  </div>
                )}
              </div>

              {/* NAVIGATION BUTTONS */}
              <div className="flex justify-between items-center pt-2">
                <button
                  type="button"
                  onClick={() => setStep(1)}
                  className="px-5 py-2.5 border border-slate-250 text-slate-650 rounded-xl text-xs font-bold flex items-center gap-1.5 hover:bg-slate-50 transition-colors"
                >
                  <ChevronLeft size={14} /> Back to Category
                </button>
                <button
                  type="button"
                  onClick={handleProceedToReview}
                  className="px-6 py-2.5 bg-[#0b4a6e] hover:bg-sky-850 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-sm transition-colors"
                >
                  Proceed to Review <ChevronRight size={14} />
                </button>
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

            {/* Section 1: Asset Image (If enabled & uploaded) */}
            {includeAssetImage && imageUrls.some(Boolean) && (
              <div className="space-y-2">
                <h5 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Asset Photo(s) Preview</h5>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {imageUrls.map((url, idx) => {
                    if (!url) return null;
                    return (
                      <div key={idx} className="space-y-1">
                        <p className="text-[8px] font-bold text-slate-400 uppercase">
                          {idx === 0 ? "Primary Photo" : `Additional Photo ${idx + 1}`}
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
            )}

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
              <div className="flex items-center justify-between border-b border-slate-200/50 pb-1.5">
                <h5 className="text-[9px] font-black text-[#0b4a6e] uppercase tracking-widest m-0">
                  Identification Method
                </h5>
                <span className="text-[10px] font-bold text-sky-850 bg-sky-50 px-2 py-0.5 rounded border border-sky-100">
                  {isBuilding ? "No Code (Building)" : identificationMethod === "QR" ? "QR Code" : identificationMethod === "BARCODE" ? "Barcode Sticker" : "No Code"}
                </span>
              </div>

              {isBuilding || identificationMethod === "NONE" ? (
                <div className="p-3.5 bg-white border border-slate-200 rounded-lg text-xs space-y-1 text-slate-600">
                  <div className="flex items-center space-x-1.5 text-slate-800 font-bold">
                    <Info size={14} className="text-sky-600" />
                    <span>{isBuilding ? "Building Asset - No Physical Code Generated" : "No Code Configured"}</span>
                  </div>
                  <p className="text-[11px] text-slate-500 m-0">
                    {isBuilding
                      ? "Building identification is managed through official building information records. No physical sticker or QR/barcode label is generated."
                      : "This asset is registered without a physical QR or barcode label. It will be identified by serial number and system records."}
                  </p>
                </div>
              ) : identificationMethod === "BARCODE" ? (
                <div className="flex flex-col items-center p-3.5 bg-white border border-slate-200 rounded-lg max-w-sm mx-auto w-full">
                  <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-2">Compact Barcode Sticker Preview</span>
                  <div className="w-full">
                    <BarcodeView value={assetCode} height={36} width={1.8} />
                  </div>
                  <span className="text-[11px] font-mono font-bold mt-1 text-slate-700">{assetCode}</span>
                </div>
              ) : (
                <div className="flex flex-col items-center p-3.5 bg-white border border-slate-200 rounded-lg max-w-sm mx-auto w-full">
                  <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-2">QR Code Tag Preview</span>
                  {liveQrUrl ? (
                    /* eslint-disable-next-line @next/next/no-img-element */
                    <img src={liveQrUrl} alt="QR Code Preview" className="w-24 h-24 object-contain" />
                  ) : (
                    <QrCode size={40} className="text-slate-350 animate-pulse" />
                  )}
                  <span className="text-[10px] font-mono font-bold mt-1.5 text-sky-700">{assetCode}</span>
                </div>
              )}
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
              {isBuilding || identificationMethod === "NONE" ? (
                <div className="w-full border border-dashed border-slate-200 rounded-xl p-5 bg-slate-50 flex flex-col items-center space-y-2 text-center">
                  <div className="w-10 h-10 rounded-full bg-slate-200/70 flex items-center justify-center text-slate-500">
                    <Info size={18} />
                  </div>
                  <span className="text-xs font-bold text-slate-700">No Physical Tag Required</span>
                  <p className="text-[10px] text-slate-400 leading-relaxed max-w-[200px]">
                    {isBuilding
                      ? "Building identification is managed using the building information system. No physical label is generated."
                      : "This asset is configured without a physical QR or barcode label."}
                  </p>
                </div>
              ) : identificationMethod === "BARCODE" ? (
                /* Compact Barcode Sticker Layout for Slim Objects */
                <div className="w-full border-2 border-slate-800 rounded-lg p-3 bg-white flex flex-col items-center space-y-1 relative shadow-sm max-w-[220px]">
                  <div className="w-full flex justify-between items-center text-[9px] font-black tracking-wider text-[#0b4a6e] border-b border-slate-200 pb-1">
                    <span>DBU</span>
                    <span className="text-amber-700 text-[8px]">ASSET</span>
                  </div>
                  <div className="w-full my-1">
                    <BarcodeView value={assetCode || "DBU-CODE"} height={36} width={1.8} />
                  </div>
                  <div className="text-[10px] font-mono font-bold text-slate-800 tracking-wider">
                    {assetCode || "DBU-CODE"}
                  </div>
                </div>
              ) : (
                /* Dedicated QR Label Layout */
                <div className="w-full border border-slate-200 rounded-xl p-4 bg-white flex flex-col items-center space-y-3 relative shadow-sm">
                  <div className="text-center">
                    <p className="text-[10px] font-extrabold text-sky-900 tracking-wider m-0">DEBRE BERHAN UNIVERSITY</p>
                    <p className="text-[7px] text-amber-700 font-bold uppercase tracking-widest mt-0.5 mb-0">DBU ASSET TAG</p>
                  </div>
                  
                  {/* Image display in Label */}
                  <div className="w-full h-28 bg-slate-50 border border-slate-150 rounded-lg overflow-hidden flex items-center justify-center relative">
                    {imageUrl ? (
                      /* eslint-disable-next-line @next/next/no-img-element */
                      <img src={imageUrl} alt="Preview" className="w-full h-full object-cover" />
                    ) : (
                      <div className="text-slate-300 flex flex-col items-center">
                        <ImageIcon size={28} />
                        <span className="text-[9px] mt-1 font-semibold">Photo Placeholder</span>
                      </div>
                    )}
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

                  {/* Basic details */}
                  <div className="text-center w-full space-y-0.5 border-t border-slate-100 pt-2">
                    <p className="text-[10px] text-sky-750 font-mono font-bold leading-none m-0">Asset: {assetCode || "DBU-CODE"}</p>
                    <p className="text-xs font-bold text-slate-800 truncate m-0">{name || "Asset Name"}</p>
                    <p className="text-[8px] text-slate-400 font-bold uppercase tracking-wider mt-0.5">{selectedCategory.name} &rarr; {selectedAssetType?.name || "Type"}</p>
                  </div>
                  
                  <p className="text-[6px] text-slate-400 font-bold tracking-widest text-center uppercase border-t border-slate-100/50 pt-1.5 w-full m-0">Property Administration</p>
                </div>
              )}
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
              Asset <span className="font-mono font-semibold text-slate-700">{assetCode}</span> has been saved into the asset registry.
            </p>
          </div>

          {/* Conditional layout based on Identification Method */}
          {identificationMethod === "NONE" || isBuilding ? (
            <div className="w-full max-w-md bg-amber-50/70 border border-amber-200/80 rounded-xl p-5 text-center flex flex-col items-center space-y-2">
              <div className="w-9 h-9 rounded-full bg-amber-100 flex items-center justify-center text-amber-800">
                {isBuilding ? <Building size={18} /> : <Info size={18} />}
              </div>
              <p className="text-xs font-bold text-amber-900">
                {isBuilding ? "Building Asset — No Physical Label Required" : "No Code Identification Method"}
              </p>
              <p className="text-[11px] text-amber-800 leading-relaxed max-w-xs">
                {isBuilding
                  ? "QR/barcode identification is not applicable to buildings. Building identification is managed using the building information."
                  : "This asset is registered without a barcode or QR code. No physical label generated."}
              </p>
            </div>
          ) : identificationMethod === "BARCODE" ? (
            <div className="flex flex-col items-center space-y-2">
              <p className="text-[11px] font-semibold text-slate-500">Compact Barcode Sticker Preview</p>
              {/* Compact Barcode Sticker Layout for Slim Objects */}
              <div className="w-full border-2 border-slate-800 rounded-lg p-3 bg-white flex flex-col items-center space-y-1 relative shadow-sm max-w-[220px]">
                <div className="w-full flex justify-between items-center text-[9px] font-black tracking-wider text-[#0b4a6e] border-b border-slate-200 pb-1">
                  <span>DBU</span>
                  <span className="text-amber-700 text-[8px]">ASSET</span>
                </div>
                <div className="w-full my-1">
                  <BarcodeView value={assetCode || "DBU-CODE"} height={36} width={1.8} />
                </div>
                <div className="text-[10px] font-mono font-bold text-slate-800 tracking-wider">
                  {assetCode || "DBU-CODE"}
                </div>
              </div>
              <p className="text-[10px] text-slate-400">Suitable for keyboards, mice, cables, small tools, and narrow surfaces.</p>
            </div>
          ) : (
            <div className="flex flex-col items-center space-y-2">
              <p className="text-[11px] font-semibold text-slate-500">QR Code Label Preview</p>
              {/* Dedicated QR Label Layout */}
              <div className="w-full border border-slate-200 rounded-xl p-4 bg-white flex flex-col items-center space-y-3 relative shadow-sm max-w-[240px]">
                <div className="text-center">
                  <p className="text-[10px] font-extrabold text-sky-900 tracking-wider m-0">DEBRE BERHAN UNIVERSITY</p>
                  <p className="text-[7px] text-amber-700 font-bold uppercase tracking-widest mt-0.5 mb-0">DBU ASSET TAG</p>
                </div>

                <div className="w-24 h-24 border border-slate-100 bg-white rounded-lg flex items-center justify-center">
                  {qrCodeUrl ? (
                    /* eslint-disable-next-line @next/next/no-img-element */
                    <img src={qrCodeUrl} alt="Asset Tag QR Code" className="w-full h-full object-contain" />
                  ) : (
                    <QrCode size={36} className="text-slate-300" />
                  )}
                </div>

                <div className="text-center w-full space-y-0.5 border-t border-slate-100 pt-2">
                  <p className="text-[10px] text-sky-750 font-mono font-bold leading-none m-0">Asset: {assetCode || "DBU-CODE"}</p>
                  <p className="text-xs font-bold text-slate-800 truncate m-0">{name || "Asset Name"}</p>
                  <p className="text-[8px] text-slate-400 font-bold uppercase tracking-wider mt-0.5">{selectedCategory.name} &rarr; {selectedAssetType.name}</p>
                </div>

                <p className="text-[6px] text-slate-400 font-bold tracking-widest text-center uppercase border-t border-slate-100/50 pt-1.5 w-full m-0">Property Administration</p>
              </div>
            </div>
          )}

          {/* Action buttons */}
          <div className="w-full flex flex-col sm:flex-row gap-2">
            {identificationMethod === "BARCODE" && !isBuilding && (
              <>
                <button
                  type="button"
                  onClick={() =>
                    printBarcodeSticker({
                      assetCode,
                      name,
                      categoryName: selectedCategory.name,
                      typeName: selectedAssetType.name
                    })
                  }
                  className="flex-1 py-2.5 bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-700 rounded-xl text-xs font-bold flex items-center justify-center space-x-1.5 transition-all shadow-sm"
                >
                  <BarcodeIcon size={14} className="text-sky-700" />
                  <span>Print Barcode Sticker</span>
                </button>
                <button
                  type="button"
                  onClick={() =>
                    printFullAssetLabel(
                      {
                        assetCode,
                        name,
                        categoryName: selectedCategory.name,
                        typeName: selectedAssetType.name,
                        imageUrl
                      },
                      "BARCODE"
                    )
                  }
                  className="flex-1 py-2.5 bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-700 rounded-xl text-xs font-bold flex items-center justify-center space-x-1.5 transition-all shadow-sm"
                >
                  <Printer size={14} />
                  <span>Print Asset Label</span>
                </button>
              </>
            )}

            {identificationMethod === "QR" && !isBuilding && (
              <>
                <button
                  type="button"
                  onClick={() =>
                    printQrLabel(
                      {
                        assetCode,
                        name,
                        categoryName: selectedCategory.name,
                        typeName: selectedAssetType.name
                      },
                      qrCodeUrl
                    )
                  }
                  className="flex-1 py-2.5 bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-700 rounded-xl text-xs font-bold flex items-center justify-center space-x-1.5 transition-all shadow-sm"
                >
                  <QrCode size={14} className="text-sky-700" />
                  <span>Print QR Label</span>
                </button>
                <button
                  type="button"
                  onClick={() =>
                    printFullAssetLabel(
                      {
                        assetCode,
                        name,
                        categoryName: selectedCategory.name,
                        typeName: selectedAssetType.name,
                        imageUrl
                      },
                      "QR",
                      qrCodeUrl
                    )
                  }
                  className="flex-1 py-2.5 bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-700 rounded-xl text-xs font-bold flex items-center justify-center space-x-1.5 transition-all shadow-sm"
                >
                  <Printer size={14} />
                  <span>Print Asset Label</span>
                </button>
                {qrCodeUrl && (
                  <a
                    href={qrCodeUrl}
                    download={`qr-${assetCode}.png`}
                    className="flex-1 py-2.5 bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-700 rounded-xl text-xs font-bold flex items-center justify-center space-x-1.5 transition-all shadow-sm"
                  >
                    <Download size={14} />
                    <span>Download QR</span>
                  </a>
                )}
              </>
            )}

            <button
              type="button"
              onClick={() => {
                setCategoryId("");
                setStep(1);
              }}
              className="flex-1 py-2.5 bg-sky-700 hover:bg-sky-850 text-white rounded-xl text-xs font-bold transition-all shadow-sm"
            >
              Register Another
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
