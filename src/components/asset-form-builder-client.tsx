"use client";

import React, { useState, useTransition, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  createCategoryAction,
  updateCategoryAction,
  createAssetTypeAction,
  updateAssetTypeAction,
  deleteAssetTypeAction,
  createCustomFieldAction,
  updateAssetTypeFieldAction,
  saveAssetTypeConfigAction,
  deleteFieldAction,
  createSupplierAction,
  updateSupplierAction,
  saveSupplierAssignmentsAction
} from "@/app/actions/form-builder";
import {
  ArrowUp,
  ArrowDown,
  Trash2,
  Eye,
  Plus,
  Search,
  Settings2,
  XCircle,
  Sliders
} from "lucide-react";

interface CategoryItem {
  id: string;
  name: string;
  code: string;
  description?: string | null;
  isActive: boolean;
  displayOrder: number;
}

interface AssetTypeItem {
  id: string;
  name: string;
  categoryId: string;
  description?: string | null;
  icon?: string | null;
  isActive: boolean;
  displayOrder: number;
  createdAt?: Date | string;
  formFields?: { id: string; isEnabled: boolean }[];
  supplierAssignments?: { id: string; isActive: boolean }[];
}

interface RegistrationFieldItem {
  id: string;
  name: string;
  label: string;
  fieldType: string;
  placeholder?: string | null;
  description?: string | null;
  isActive: boolean;
  defaultValue?: string | null;
  options?: string | null;
}

interface TypeFieldConfig {
  id: string;
  assetTypeId: string;
  fieldId: string;
  isEnabled: boolean;
  isRequired: boolean;
  displayOrder: number;
  defaultValue?: string | null;
  options?: string | null;
  labelOverride?: string | null;
  placeholderOverride?: string | null;
  descriptionOverride?: string | null;
  validationMin?: number | null;
  validationMax?: number | null;
  validationMinLength?: number | null;
  validationMaxLength?: number | null;
  field: RegistrationFieldItem;
}

interface SupplierItem {
  id: string;
  name: string;
  contactPerson?: string | null;
  phone?: string | null;
  email?: string | null;
  address?: string | null;
  isActive: boolean;
}

interface SupplierAssignmentItem {
  id: string;
  supplierId: string;
  categoryId?: string | null;
  assetTypeId?: string | null;
  isActive: boolean;
  supplier: SupplierItem;
}

const standardFieldNames = [
  "name",
  "serialNumber",
  "purchaseCost",
  "purchaseDate",
  "usefulLife",
  "salvageValue",
  "fundingSource",
  "warrantyStartDate",
  "warrantyEndDate",
  "expiryDate"
];

interface AssetFormBuilderClientProps {
  categories: CategoryItem[];
  assetTypes: AssetTypeItem[];
  initialFields: RegistrationFieldItem[];
  initialTypeFields: TypeFieldConfig[];
  initialSuppliers: SupplierItem[];
  initialSupplierAssignments: SupplierAssignmentItem[];
}

export function AssetFormBuilderClient({
  categories,
  assetTypes,
  initialFields,
  initialTypeFields,
  initialSuppliers,
  initialSupplierAssignments
}: AssetFormBuilderClientProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  // Panel tabs: form-builder, categories, asset-types, suppliers
  const [activePanel, setActivePanel] = useState<"form-builder" | "categories" | "asset-types" | "suppliers">("form-builder");

  // Redesigned Selector: Select Asset Type (Asset Type is chosen first)
  const [selectedTypeId, setSelectedTypeId] = useState<string>("");

  // Field configurations list states
  const [localConfigs, setLocalConfigs] = useState<TypeFieldConfig[]>([]);

  // Modals state
  const [showPreviewModal, setShowPreviewModal] = useState(false);
  const [editingFieldConfig, setEditingFieldConfig] = useState<TypeFieldConfig | null>(null);
  const [showAddCustomModal, setShowAddCustomModal] = useState(false);
  const [showAssignSupplierModal, setShowAssignSupplierModal] = useState<SupplierItem | null>(null);

  // Field edit modal form states
  const [editLabel, setEditLabel] = useState("");
  const [editPlaceholder, setEditPlaceholder] = useState("");
  const [editHelpText, setEditHelpText] = useState("");
  const [editRequired, setEditRequired] = useState(false);
  const [editEnabled, setEditEnabled] = useState(true);
  const [editDefaultVal, setEditDefaultVal] = useState("");
  const [editOptionsList, setEditOptionsList] = useState<string[]>([]);
  const [newOptionVal, setNewOptionVal] = useState("");
  const [editMin, setEditMin] = useState<number | "">("");
  const [editMax, setEditMax] = useState<number | "">("");
  const [editMinLen, setEditMinLen] = useState<number | "">("");
  const [editMaxLen, setEditMaxLen] = useState<number | "">("");
  const [editError, setEditError] = useState<string | null>(null);

  // Custom Field creation form states
  const [newFieldName, setNewFieldName] = useState("");
  const [newFieldLabel, setNewFieldLabel] = useState("");
  const [newFieldType, setNewFieldType] = useState("TEXT");
  const [newFieldPlaceholder, setNewFieldPlaceholder] = useState("");
  const [newFieldHelpText, setNewFieldHelpText] = useState("");
  const [newFieldRequired, setNewFieldRequired] = useState(false);
  const [newFieldEnabled, setNewFieldEnabled] = useState(true);
  const [newFieldDefaultVal, setNewFieldDefaultVal] = useState("");
  const [newFieldOptionsList, setNewFieldOptionsList] = useState<string[]>([]);
  const [newFieldOptionVal, setNewFieldOptionVal] = useState("");
  const [addCustomError, setAddCustomError] = useState<string | null>(null);

  // CRUD States for other panels
  const [catName, setCatName] = useState("");
  const [catCode, setCatCode] = useState("");
  const [catDesc, setCatDesc] = useState("");

  const [typeName, setTypeName] = useState("");
  const [typeCatId, setTypeCatId] = useState(categories[0]?.id || "");
  const [typeDesc, setTypeDesc] = useState("");
  const [typeIcon, setTypeIcon] = useState("");
  const [typeDisplayOrder, setTypeDisplayOrder] = useState("1");

  const [typeSearch, setTypeSearch] = useState("");

  const [viewingAssetType, setViewingAssetType] = useState<AssetTypeItem | null>(null);
  const [editingAssetType, setEditingAssetType] = useState<AssetTypeItem | null>(null);

  const [editTypeName, setEditTypeName] = useState("");
  const [editTypeCatId, setEditTypeCatId] = useState("");
  const [editTypeDesc, setEditTypeDesc] = useState("");
  const [editTypeIcon, setEditTypeIcon] = useState("");
  const [editTypeDisplayOrder, setEditTypeDisplayOrder] = useState("1");
  const [editTypeIsActive, setEditTypeIsActive] = useState(true);

  const [supName, setSupName] = useState("");
  const [supContact, setSupContact] = useState("");
  const [supEmail, setSupEmail] = useState("");
  const [supPhone, setSupPhone] = useState("");
  const [supAddress, setSupAddress] = useState("");

  const [assignCatId, setAssignCatId] = useState<string>("");
  const [assignTypeId, setAssignTypeId] = useState<string>("");

  // Reload configurations when selected Asset Type changes
  useEffect(() => {
    if (!selectedTypeId) {
      setLocalConfigs([]);
      return;
    }

    const typeFields = initialTypeFields.filter((tf) => tf.assetTypeId === selectedTypeId);

    // Load standard fields if not mapped yet
    const standardFields = initialFields.filter((f) => standardFieldNames.includes(f.name));
    const merged: TypeFieldConfig[] = [
      ...typeFields,
      ...standardFields
        .filter((f) => !typeFields.some((tf) => tf.fieldId === f.id))
        .map((f, idx) => ({
          id: `temp-${f.id}`,
          assetTypeId: selectedTypeId,
          fieldId: f.id,
          isEnabled: true, // enabled by default
          isRequired: ["name", "serialNumber", "purchaseCost", "purchaseDate"].includes(f.name),
          displayOrder: typeFields.length + idx + 1,
          field: f
        }))
    ].sort((a, b) => a.displayOrder - b.displayOrder);

    setLocalConfigs(merged);
  }, [selectedTypeId, initialTypeFields, initialFields]);

  // Visual separation lists
  const standardFields = localConfigs.filter((cfg) => standardFieldNames.includes(cfg.field.name));
  const customFields = localConfigs.filter((cfg) => !standardFieldNames.includes(cfg.field.name));

  /* ==========================================
     ORDER MANAGEMENT / UP AND DOWN ORDER SWAPS
     ========================================== */
  const handleOrderChange = (idx: number, direction: "up" | "down") => {
    const swapIdx = direction === "up" ? idx - 1 : idx + 1;
    if (swapIdx < 0 || swapIdx >= localConfigs.length) return;

    const updated = [...localConfigs];
    const temp = updated[idx];
    updated[idx] = updated[swapIdx];
    updated[swapIdx] = temp;

    // Re-index displayOrders
    const reindexed = updated.map((cfg, index) => ({
      ...cfg,
      displayOrder: index + 1
    }));

    setLocalConfigs(reindexed);

    // Auto-save the new displayOrder configuration in background
    startTransition(async () => {
      const payload = reindexed.map((c) => ({
        fieldId: c.fieldId,
        isEnabled: c.isEnabled,
        isRequired: c.isRequired,
        displayOrder: c.displayOrder,
        defaultValue: c.defaultValue,
        options: c.options
      }));
      await saveAssetTypeConfigAction(selectedTypeId, payload);
    });
  };

  /* ==========================================
     FIELD SAVING & CREATION HANDLERS
     ========================================== */
  const openEditFieldModal = (cfg: TypeFieldConfig) => {
    setEditError(null);
    setEditingFieldConfig(cfg);
    setEditLabel(cfg.labelOverride || cfg.field.label);
    setEditPlaceholder(cfg.placeholderOverride || cfg.field.placeholder || "");
    setEditHelpText(cfg.descriptionOverride || cfg.field.description || "");
    setEditRequired(cfg.isRequired);
    setEditEnabled(cfg.isEnabled);
    setEditDefaultVal(cfg.defaultValue || "");
    setEditOptionsList(cfg.options ? cfg.options.split(",") : (cfg.field.options ? cfg.field.options.split(",") : []));
    setEditMin(cfg.validationMin !== null && cfg.validationMin !== undefined ? cfg.validationMin : "");
    setEditMax(cfg.validationMax !== null && cfg.validationMax !== undefined ? cfg.validationMax : "");
    setEditMinLen(cfg.validationMinLength !== null && cfg.validationMinLength !== undefined ? cfg.validationMinLength : "");
    setEditMaxLen(cfg.validationMaxLength !== null && cfg.validationMaxLength !== undefined ? cfg.validationMaxLength : "");
  };

  const handleEditFieldSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingFieldConfig) return;

    setEditError(null);
    startTransition(async () => {
      const res = await updateAssetTypeFieldAction(selectedTypeId, editingFieldConfig.fieldId, {
        isEnabled: editEnabled,
        isRequired: editRequired,
        labelOverride: editLabel,
        placeholderOverride: editPlaceholder || undefined,
        descriptionOverride: editHelpText || undefined,
        defaultValue: editDefaultVal || undefined,
        options: editOptionsList.length > 0 ? editOptionsList.join(",") : undefined,
        validationMin: editMin !== "" ? Number(editMin) : null,
        validationMax: editMax !== "" ? Number(editMax) : null,
        validationMinLength: editMinLen !== "" ? Number(editMinLen) : null,
        validationMaxLength: editMaxLen !== "" ? Number(editMaxLen) : null
      });

      if (res.error) {
        setEditError(res.error);
      } else {
        setEditingFieldConfig(null);
        alert("Field configuration saved successfully!");
        router.refresh();
      }
    });
  };

  const handleAddCustomFieldSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTypeId) return;

    setAddCustomError(null);
    startTransition(async () => {
      const res = await createCustomFieldAction(selectedTypeId, {
        name: newFieldName,
        label: newFieldLabel,
        fieldType: newFieldType,
        placeholder: newFieldPlaceholder || undefined,
        description: newFieldHelpText || undefined,
        options: newFieldOptionsList.length > 0 ? newFieldOptionsList.join(",") : undefined,
        defaultValue: newFieldDefaultVal || undefined,
        isRequired: newFieldRequired,
        isEnabled: newFieldEnabled
      });

      if (res.error) {
        setAddCustomError(res.error);
      } else {
        setShowAddCustomModal(false);
        // Reset states
        setNewFieldName("");
        setNewFieldLabel("");
        setNewFieldType("TEXT");
        setNewFieldPlaceholder("");
        setNewFieldHelpText("");
        setNewFieldRequired(false);
        setNewFieldEnabled(true);
        setNewFieldDefaultVal("");
        setNewFieldOptionsList([]);
        alert("Custom field added to this Asset Type successfully!");
        router.refresh();
      }
    });
  };

  /* ==========================================
     CRUD SUBMISSIONS FOR NON-CONFIG PANELS
     ========================================== */
  const handleCreateCategory = (e: React.FormEvent) => {
    e.preventDefault();
    startTransition(async () => {
      const res = await createCategoryAction(null, {
        name: catName,
        code: catCode,
        description: catDesc,
        displayOrder: categories.length + 1
      });
      if (res.error) {
        alert(res.error);
      } else {
        setCatName("");
        setCatCode("");
        setCatDesc("");
        router.refresh();
      }
    });
  };

  const handleToggleCategoryActive = (id: string, active: boolean) => {
    startTransition(async () => {
      await updateCategoryAction(id, { isActive: !active });
      router.refresh();
    });
  };

  const handleCreateType = (e: React.FormEvent) => {
    e.preventDefault();
    startTransition(async () => {
      const res = await createAssetTypeAction(null, {
        name: typeName,
        categoryId: typeCatId,
        description: typeDesc || undefined,
        icon: typeIcon || undefined,
        displayOrder: parseInt(typeDisplayOrder) || 1
      });
      if (res.error) {
        alert(res.error);
      } else {
        setTypeName("");
        setTypeDesc("");
        setTypeIcon("");
        setTypeDisplayOrder("1");
        router.refresh();
      }
    });
  };

  const handleEditTypeSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingAssetType) return;
    startTransition(async () => {
      const res = await updateAssetTypeAction(editingAssetType.id, {
        name: editTypeName,
        categoryId: editTypeCatId,
        description: editTypeDesc || undefined,
        icon: editTypeIcon || undefined,
        displayOrder: parseInt(editTypeDisplayOrder) || 1,
        isActive: editTypeIsActive
      });
      if (res.error) {
        alert(res.error);
      } else {
        setEditingAssetType(null);
        router.refresh();
      }
    });
  };

  const handleDeleteField = (fieldId: string) => {
    if (!confirm("Are you sure you want to delete this custom field? This will delete all asset registration values submitted for this field!")) return;
    startTransition(async () => {
      const res = await deleteFieldAction(fieldId);
      if (res.error) {
        alert(res.error);
      } else {
        alert("Custom field deleted successfully!");
        router.refresh();
      }
    });
  };

  const handleToggleTypeActive = (id: string, active: boolean) => {
    startTransition(async () => {
      await updateAssetTypeAction(id, { isActive: !active });
      router.refresh();
    });
  };

  const handleCreateSupplierSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    startTransition(async () => {
      const res = await createSupplierAction(null, {
        name: supName,
        contactPerson: supContact,
        email: supEmail,
        phone: supPhone,
        address: supAddress
      });
      if (res.error) {
        alert(res.error);
      } else {
        setSupName("");
        setSupContact("");
        setSupEmail("");
        setSupPhone("");
        setSupAddress("");
        router.refresh();
      }
    });
  };

  const handleToggleSupplierActive = (id: string, active: boolean) => {
    startTransition(async () => {
      await updateSupplierAction(id, { isActive: !active });
      router.refresh();
    });
  };

  const handleAssignSupplierSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!showAssignSupplierModal) return;
    startTransition(async () => {
      const currentAssignments = initialSupplierAssignments.filter(
        (sa) => sa.supplierId === showAssignSupplierModal.id
      );

      const isDuplicated = currentAssignments.some(
        (a) => a.categoryId === (assignCatId || null) && a.assetTypeId === (assignTypeId || null)
      );

      if (isDuplicated) {
        alert("This assignment configuration already exists.");
        return;
      }

      const list = [
        ...currentAssignments.map((a) => ({
          categoryId: a.categoryId || null,
          assetTypeId: a.assetTypeId || null
        })),
        {
          categoryId: assignCatId || null,
          assetTypeId: assignTypeId || null
        }
      ];

      const res = await saveSupplierAssignmentsAction(showAssignSupplierModal.id, list);
      if (res.error) {
        alert(res.error);
      } else {
        setAssignCatId("");
        setAssignTypeId("");
        alert("Supplier scope assigned!");
        router.refresh();
      }
    });
  };

  const handleRemoveSupplierAssignment = (supplierId: string, saId: string) => {
    startTransition(async () => {
      const updatedList = initialSupplierAssignments
        .filter((sa) => sa.supplierId === supplierId && sa.id !== saId)
        .map((sa) => ({
          categoryId: sa.categoryId || null,
          assetTypeId: sa.assetTypeId || null
        }));

      await saveSupplierAssignmentsAction(supplierId, updatedList);
      router.refresh();
    });
  };

  // Preview elements calculations
  const activeFields = localConfigs.filter((f) => f.isEnabled);
  const selectedType = assetTypes.find((t) => t.id === selectedTypeId);
  const activeSuppliers = initialSupplierAssignments
    .filter(
      (sa) =>
        sa.isActive &&
        sa.supplier.isActive &&
        (sa.assetTypeId === selectedTypeId || sa.categoryId === selectedType?.categoryId)
    )
    .map((sa) => sa.supplier);

  // Sorting Asset Types lists for details management tab
  const detailedFilteredTypes = assetTypes
    .filter((t) => t.name.toLowerCase().includes(typeSearch.toLowerCase()))
    .sort((a, b) => a.name.localeCompare(b.name));

  return (
    <div className="space-y-6 select-none">
      
      {/* Top Header */}
      <div className="flex items-center justify-between border-b border-sky-100 pb-4">
        <div>
          <h2 className="text-xl font-bold text-sky-950 flex items-center gap-2">
            <Settings2 className="text-sky-700" />
            <span>Asset Registration Form Builder</span>
          </h2>
          <p className="text-xs text-sky-600 font-semibold mt-1">
            Redesign dynamic forms, customize placeholders, validation constraints, and map custom specs per Asset Type
          </p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-slate-200">
        <button
          onClick={() => setActivePanel("form-builder")}
          className={`px-4 py-2.5 text-xs font-bold -mb-px border-b-2 transition-all ${
            activePanel === "form-builder"
              ? "border-[#0b4a6e] text-[#0b4a6e]"
              : "border-transparent text-slate-500 hover:text-slate-700"
          }`}
        >
          Form Builder
        </button>
        <button
          onClick={() => setActivePanel("categories")}
          className={`px-4 py-2.5 text-xs font-bold -mb-px border-b-2 transition-all ${
            activePanel === "categories"
              ? "border-[#0b4a6e] text-[#0b4a6e]"
              : "border-transparent text-slate-500 hover:text-slate-700"
          }`}
        >
          Categories
        </button>
        <button
          onClick={() => setActivePanel("asset-types")}
          className={`px-4 py-2.5 text-xs font-bold -mb-px border-b-2 transition-all ${
            activePanel === "asset-types"
              ? "border-[#0b4a6e] text-[#0b4a6e]"
              : "border-transparent text-slate-500 hover:text-slate-700"
          }`}
        >
          Asset Types
        </button>
        <button
          onClick={() => setActivePanel("suppliers")}
          className={`px-4 py-2.5 text-xs font-bold -mb-px border-b-2 transition-all ${
            activePanel === "suppliers"
              ? "border-[#0b4a6e] text-[#0b4a6e]"
              : "border-transparent text-slate-500 hover:text-slate-700"
          }`}
        >
          Supplier Scopes
        </button>
      </div>

      {/* 1. MAIN FORM BUILDER CONFIGURATION PANEL */}
      {activePanel === "form-builder" && (
        <div className="space-y-6">
          
          {/* Top Asset Type Selector Card */}
          <div className="bg-slate-50 p-5 rounded-2xl border border-slate-200 space-y-3 max-w-2xl">
            <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider">
              Select Asset Type *
            </label>
            
            <select
              className="w-full p-2.5 bg-white border border-slate-250 rounded-lg text-xs font-bold text-slate-800 focus:ring-1 focus:ring-[#0b4a6e] focus:outline-none"
              value={selectedTypeId}
              onChange={(e) => setSelectedTypeId(e.target.value)}
            >
              <option value="">-- Choose Asset Type to configure --</option>
              {categories.map((cat) => (
                <optgroup key={cat.id} label={cat.name}>
                  {assetTypes
                    .filter((t) => t.categoryId === cat.id && t.isActive)
                    .map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.name}
                      </option>
                    ))}
                </optgroup>
              ))}
            </select>
            
            <p className="text-[10px] text-slate-450 font-semibold">
              Select an asset type above to customize its specific fields list, validation parameters, and custom questions.
            </p>
          </div>

          {!selectedTypeId ? (
            <div className="p-16 border border-dashed border-slate-200 rounded-2xl text-center space-y-2 bg-white">
              <Sliders size={28} className="mx-auto text-slate-350" />
              <p className="text-xs text-slate-550 font-bold">Please select an Asset Type first to customize its registration form.</p>
            </div>
          ) : (
            <div className="space-y-6">
              
              {/* Field Groups: Standard and Custom */}
              <div className="grid grid-cols-1 gap-6">
                
                {/* 1. STANDARD FIELDS */}
                <div className="bg-white p-5 border border-slate-150 rounded-2xl shadow-sm space-y-4">
                  <div>
                    <h3 className="text-xs font-black text-slate-450 uppercase tracking-widest">
                      Standard / System Fields
                    </h3>
                    <p className="text-[10px] text-slate-400 font-semibold mt-1">
                      Required core columns. You can change their labels, placeholders, and toggle active state.
                    </p>
                  </div>

                  <div className="border border-slate-100 rounded-xl overflow-hidden divide-y divide-slate-50 text-xs">
                    {standardFields.length === 0 ? (
                      <p className="p-4 text-center text-slate-400 font-medium">No standard fields loaded.</p>
                    ) : (
                      standardFields.map((cfg) => {
                        const originalIdx = localConfigs.findIndex(x => x.fieldId === cfg.fieldId);
                        
                        return (
                          <div key={cfg.fieldId} className="p-3 bg-white flex flex-wrap md:flex-nowrap gap-4 items-center justify-between hover:bg-slate-50/50 transition-colors">
                            <div className="flex-1 min-w-[200px]">
                              <p className="font-bold text-slate-800 flex items-center gap-1.5">
                                <span>{cfg.labelOverride || cfg.field.label}</span>
                                {cfg.labelOverride && (
                                  <span className="text-[9px] font-mono text-slate-400 normal-case">(Internal: {cfg.field.name})</span>
                                )}
                              </p>
                              <p className="text-[10px] text-slate-400 font-semibold">{cfg.placeholderOverride || cfg.field.placeholder || "No placeholder text"}</p>
                            </div>

                            <div className="flex items-center gap-4">
                              <span className={`px-2 py-0.5 rounded text-[9px] font-bold border ${
                                cfg.isRequired ? "bg-red-50 text-red-700 border-red-150" : "bg-slate-100 text-slate-650"
                              }`}>
                                {cfg.isRequired ? "Required" : "Optional"}
                              </span>

                              <span className={`px-2 py-0.5 rounded text-[9px] font-bold border ${
                                cfg.isEnabled ? "bg-emerald-50 text-emerald-700 border-emerald-150" : "bg-amber-50 text-amber-600"
                              }`}>
                                {cfg.isEnabled ? "Enabled" : "Disabled"}
                              </span>

                              {/* Order Arrows */}
                              <div className="flex items-center space-x-1 shrink-0">
                                <button
                                  type="button"
                                  disabled={originalIdx === 0}
                                  onClick={() => handleOrderChange(originalIdx, "up")}
                                  className="p-1 hover:bg-slate-150 rounded text-slate-400 hover:text-slate-800 disabled:opacity-30"
                                >
                                  <ArrowUp size={12} />
                                </button>
                                <button
                                  type="button"
                                  disabled={originalIdx === localConfigs.length - 1}
                                  onClick={() => handleOrderChange(originalIdx, "down")}
                                  className="p-1 hover:bg-slate-150 rounded text-slate-400 hover:text-slate-800 disabled:opacity-30"
                                >
                                  <ArrowDown size={12} />
                                </button>
                              </div>

                              <button
                                onClick={() => openEditFieldModal(cfg)}
                                className="px-2.5 py-1.5 bg-slate-50 border border-slate-200 hover:bg-slate-100 text-slate-700 rounded text-[11px] font-bold transition-all"
                              >
                                Edit
                              </button>
                              <button
                                onClick={() => {
                                  if (confirm("Standard fields cannot be deleted from the database. Would you like to disable and hide this field from the registration form?")) {
                                    startTransition(async () => {
                                      const res = await updateAssetTypeFieldAction(selectedTypeId, cfg.fieldId, {
                                        isEnabled: false,
                                        isRequired: false,
                                        labelOverride: cfg.labelOverride || undefined,
                                        placeholderOverride: cfg.placeholderOverride || undefined,
                                        descriptionOverride: cfg.descriptionOverride || undefined,
                                        defaultValue: cfg.defaultValue || undefined,
                                        options: cfg.options || undefined,
                                        validationMin: cfg.validationMin,
                                        validationMax: cfg.validationMax,
                                        validationMinLength: cfg.validationMinLength,
                                        validationMaxLength: cfg.validationMaxLength
                                      });
                                      if (res.error) alert(res.error);
                                      else {
                                        alert("Standard field disabled and hidden successfully!");
                                        router.refresh();
                                      }
                                    });
                                  }
                                }}
                                className="px-2.5 py-1.5 bg-red-50 border border-red-200 hover:bg-red-100 text-red-700 rounded text-[11px] font-bold transition-all"
                              >
                                Delete
                              </button>
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>

                {/* 2. CUSTOM FIELDS */}
                <div className="bg-white p-5 border border-slate-150 rounded-2xl shadow-sm space-y-4">
                  <div className="flex justify-between items-start">
                    <div>
                      <h3 className="text-xs font-black text-slate-450 uppercase tracking-widest">
                        Custom Fields
                      </h3>
                      <p className="text-[10px] text-slate-400 font-semibold mt-1">
                        Form parameters specific only to the {(selectedType?.name || "").toUpperCase()} asset class.
                      </p>
                    </div>

                    <button
                      onClick={() => {
                        setAddCustomError(null);
                        setShowAddCustomModal(true);
                      }}
                      className="px-3 py-1.5 bg-[#0b4a6e] hover:bg-sky-850 text-white rounded-lg text-[10px] font-bold flex items-center gap-1 shadow-sm"
                    >
                      <Plus size={12} />
                      Add Custom Field
                    </button>
                  </div>

                  <div className="border border-slate-100 rounded-xl overflow-hidden divide-y divide-slate-50 text-xs">
                    {customFields.length === 0 ? (
                      <div className="text-center py-8 text-slate-400 font-semibold">
                        No custom fields configured for this Asset Type yet. Click {`"+ Add Custom Field"`} to create one.
                      </div>
                    ) : (
                      customFields.map((cfg) => {
                        const originalIdx = localConfigs.findIndex(x => x.fieldId === cfg.fieldId);
                        
                        return (
                          <div key={cfg.fieldId} className="p-3 bg-white flex flex-wrap md:flex-nowrap gap-4 items-center justify-between hover:bg-slate-50/50 transition-colors">
                            <div className="flex-1 min-w-[200px]">
                              <p className="font-bold text-slate-800">
                                {cfg.labelOverride || cfg.field.label}
                                <span className="text-[9px] font-mono text-slate-400 font-normal ml-1 bg-slate-100 px-1 py-0.5 rounded">
                                  {cfg.field.fieldType}
                                </span>
                              </p>
                              <p className="text-[10px] text-slate-400 font-semibold">{cfg.placeholderOverride || cfg.field.placeholder || "No placeholder text"}</p>
                            </div>

                            <div className="flex items-center gap-4">
                              <span className={`px-2 py-0.5 rounded text-[9px] font-bold border ${
                                cfg.isRequired ? "bg-red-50 text-red-700 border-red-150" : "bg-slate-100 text-slate-650"
                              }`}>
                                {cfg.isRequired ? "Required" : "Optional"}
                              </span>

                              <span className={`px-2 py-0.5 rounded text-[9px] font-bold border ${
                                cfg.isEnabled ? "bg-emerald-50 text-emerald-700 border-emerald-150" : "bg-amber-50 text-amber-600"
                              }`}>
                                {cfg.isEnabled ? "Enabled" : "Disabled"}
                              </span>

                              {/* Order Arrows */}
                              <div className="flex items-center space-x-1 shrink-0">
                                <button
                                  type="button"
                                  disabled={originalIdx === 0}
                                  onClick={() => handleOrderChange(originalIdx, "up")}
                                  className="p-1 hover:bg-slate-150 rounded text-slate-400 hover:text-slate-800 disabled:opacity-30"
                                >
                                  <ArrowUp size={12} />
                                </button>
                                <button
                                  type="button"
                                  disabled={originalIdx === localConfigs.length - 1}
                                  onClick={() => handleOrderChange(originalIdx, "down")}
                                  className="p-1 hover:bg-slate-150 rounded text-slate-400 hover:text-slate-800 disabled:opacity-30"
                                >
                                  <ArrowDown size={12} />
                                </button>
                              </div>

                              <button
                                onClick={() => openEditFieldModal(cfg)}
                                className="px-2.5 py-1.5 bg-slate-50 border border-slate-200 hover:bg-slate-100 text-slate-700 rounded text-[11px] font-bold transition-all"
                              >
                                Edit
                              </button>
                              <button
                                onClick={() => handleDeleteField(cfg.fieldId)}
                                className="px-2.5 py-1.5 bg-red-50 border border-red-200 hover:bg-red-100 text-red-700 rounded text-[11px] font-bold transition-all"
                              >
                                Delete
                              </button>
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>

              </div>

              {/* Preview Form Trigger */}
              <div className="pt-2 flex justify-end">
                <button
                  onClick={() => setShowPreviewModal(true)}
                  className="px-5 py-2 bg-white border border-slate-250 hover:bg-slate-50 rounded-xl text-xs font-extrabold flex items-center gap-1.5 shadow-sm text-slate-700 transition-all"
                >
                  <Eye size={14} className="text-sky-700" />
                  Preview Form
                </button>
              </div>

            </div>
          )}

        </div>
      )}

      {/* 2. CATEGORIES PANEL */}
      {activePanel === "categories" && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm h-fit">
            <h4 className="text-xs font-extrabold text-[#0b4a6e] uppercase pb-2 border-b border-slate-100 mb-4">
              Add Category
            </h4>
            <form onSubmit={handleCreateCategory} className="space-y-4">
              <div>
                <label className="block text-[9px] font-bold text-slate-400 uppercase mb-1">Category Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. ICT Equipment"
                  className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg text-xs"
                  value={catName}
                  onChange={(e) => setCatName(e.target.value)}
                />
              </div>
              <div>
                <label className="block text-[9px] font-bold text-slate-400 uppercase mb-1">Category Code</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. ICT"
                  className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg text-xs"
                  value={catCode}
                  onChange={(e) => setCatCode(e.target.value)}
                />
              </div>
              <div>
                <label className="block text-[9px] font-bold text-slate-400 uppercase mb-1">Description</label>
                <textarea
                  placeholder="Details..."
                  className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg text-xs h-16 resize-none"
                  value={catDesc}
                  onChange={(e) => setCatDesc(e.target.value)}
                />
              </div>
              <button
                type="submit"
                disabled={isPending}
                className="w-full py-2 bg-[#0b4a6e] hover:bg-sky-850 text-white rounded-lg text-xs font-bold"
              >
                Create Category
              </button>
            </form>
          </div>

          <div className="lg:col-span-2 bg-white p-5 rounded-2xl border border-slate-100 shadow-sm">
            <h4 className="text-xs font-extrabold text-[#0b4a6e] uppercase pb-2 border-b border-slate-100 mb-4">
              Configured Categories
            </h4>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-slate-100 text-[10px] font-extrabold text-slate-400 uppercase">
                    <th className="py-2.5">Code</th>
                    <th className="py-2.5">Name</th>
                    <th className="py-2.5">Status</th>
                    <th className="py-2.5 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {categories.map((cat) => (
                    <tr key={cat.id} className="hover:bg-slate-50/20 text-slate-650">
                      <td className="py-3 font-mono font-bold text-[#0b4a6e]">{cat.code}</td>
                      <td className="py-3 font-bold text-slate-800">{cat.name}</td>
                      <td className="py-3">
                        <span className={`px-2 py-0.5 rounded text-[8px] font-bold ${
                          cat.isActive ? "bg-emerald-50 text-emerald-700" : "bg-red-50 text-red-600"
                        }`}>
                          {cat.isActive ? "Active" : "Inactive"}
                        </span>
                      </td>
                      <td className="py-3 text-right">
                        <button
                          onClick={() => handleToggleCategoryActive(cat.id, cat.isActive)}
                          className={`text-[10px] font-bold ${cat.isActive ? "text-amber-600" : "text-emerald-600"}`}
                        >
                          {cat.isActive ? "Deactivate" : "Activate"}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* 3. ASSET TYPES PANEL */}
      {activePanel === "asset-types" && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm h-fit">
            <h4 className="text-xs font-extrabold text-[#0b4a6e] uppercase pb-2 border-b border-slate-100 mb-4">
              Create Asset Type
            </h4>
            <form onSubmit={handleCreateType} className="space-y-4">
              <div>
                <label className="block text-[9px] font-bold text-slate-400 uppercase mb-1">Asset Type Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Laptop"
                  className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg text-xs"
                  value={typeName}
                  onChange={(e) => setTypeName(e.target.value)}
                />
              </div>
              <div>
                <label className="block text-[9px] font-bold text-slate-400 uppercase mb-1">Parent Category *</label>
                <select
                  required
                  className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-700 focus:outline-none"
                  value={typeCatId}
                  onChange={(e) => setTypeCatId(e.target.value)}
                >
                  {categories.map((c) => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-[9px] font-bold text-slate-400 uppercase mb-1">Description</label>
                <textarea
                  placeholder="Details..."
                  className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg text-xs h-16 resize-none"
                  value={typeDesc}
                  onChange={(e) => setTypeDesc(e.target.value)}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[9px] font-bold text-slate-400 uppercase mb-1">Icon Name</label>
                  <input
                    type="text"
                    placeholder="e.g. Laptop"
                    className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg text-xs"
                    value={typeIcon}
                    onChange={(e) => setTypeIcon(e.target.value)}
                  />
                </div>
                <div>
                  <label className="block text-[9px] font-bold text-slate-400 uppercase mb-1">Display Order</label>
                  <input
                    type="number"
                    min="1"
                    className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg text-xs"
                    value={typeDisplayOrder}
                    onChange={(e) => setTypeDisplayOrder(e.target.value)}
                  />
                </div>
              </div>
              <button
                type="submit"
                disabled={isPending}
                className="w-full py-2 bg-[#0b4a6e] hover:bg-sky-850 text-white rounded-lg text-xs font-bold"
              >
                Create Asset Type
              </button>
            </form>
          </div>

          <div className="lg:col-span-2 bg-white p-5 rounded-2xl border border-slate-100 shadow-sm space-y-4">
            <div className="flex justify-between items-center pb-2 border-b border-slate-100">
              <h4 className="text-xs font-extrabold text-[#0b4a6e] uppercase">
                Asset Types List
              </h4>
              <div className="relative w-48">
                <Search size={12} className="absolute left-2.5 top-2.5 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search types..."
                  className="w-full pl-7 pr-2 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-[10px] focus:outline-none"
                  value={typeSearch}
                  onChange={(e) => setTypeSearch(e.target.value)}
                />
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-slate-100 text-[10px] font-extrabold text-slate-400 uppercase">
                    <th className="py-2.5">Name</th>
                    <th className="py-2.5">Category</th>
                    <th className="py-2.5">Icon</th>
                    <th className="py-2.5">Status</th>
                    <th className="py-2.5 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {detailedFilteredTypes.map((t) => (
                    <tr key={t.id} className="hover:bg-slate-50/20 text-slate-650">
                      <td className="py-3 font-bold text-slate-800">{t.name}</td>
                      <td className="py-3 font-semibold text-slate-600">
                        {categories.find(c => c.id === t.categoryId)?.name || "N/A"}
                      </td>
                      <td className="py-3 font-mono text-[10px]">{t.icon || "default"}</td>
                      <td className="py-3">
                        <span className={`px-2 py-0.5 rounded text-[8px] font-bold ${
                          t.isActive ? "bg-emerald-50 text-emerald-700" : "bg-red-50 text-red-655"
                        }`}>
                          {t.isActive ? "Active" : "Inactive"}
                        </span>
                      </td>
                      <td className="py-3 text-right space-x-2">
                        <button onClick={() => setViewingAssetType(t)} className="text-[#0b4a6e] hover:underline font-bold text-[10px]">View</button>
                        <button
                          onClick={() => {
                            setEditingAssetType(t);
                            setEditTypeName(t.name);
                            setEditTypeCatId(t.categoryId);
                            setEditTypeDesc(t.description || "");
                            setEditTypeIcon(t.icon || "");
                            setEditTypeDisplayOrder(t.displayOrder.toString());
                            setEditTypeIsActive(t.isActive);
                          }}
                          className="text-slate-700 hover:underline font-bold text-[10px]"
                        >
                          Edit
                        </button>
                        <button onClick={() => handleToggleTypeActive(t.id, t.isActive)} className="text-amber-600 hover:underline font-bold text-[10px]">
                          {t.isActive ? "Disable" : "Enable"}
                        </button>
                        <button
                          onClick={() => {
                            if (confirm(`Are you sure you want to delete the "${t.name}" asset type? This cannot be undone.`)) {
                              startTransition(async () => {
                                const res = await deleteAssetTypeAction(t.id);
                                if (res.error) alert(res.error);
                                else {
                                  alert("Asset type deleted successfully!");
                                  router.refresh();
                                }
                              });
                            }
                          }}
                          className="text-red-650 hover:underline font-bold text-[10px]"
                        >
                          Delete
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* 4. SUPPLIER PANELS */}
      {activePanel === "suppliers" && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm h-fit">
            <h4 className="text-xs font-extrabold text-[#0b4a6e] uppercase pb-2 border-b border-slate-100 mb-4">
              Add Supplier
            </h4>
            <form onSubmit={handleCreateSupplierSubmit} className="space-y-4">
              <div>
                <label className="block text-[9px] font-bold text-slate-400 uppercase mb-1">Supplier Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. DBU Logistics Supply"
                  className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg text-xs"
                  value={supName}
                  onChange={(e) => setSupName(e.target.value)}
                />
              </div>
              <div>
                <label className="block text-[9px] font-bold text-slate-400 uppercase mb-1">Contact Person</label>
                <input
                  type="text"
                  placeholder="e.g. John Doe"
                  className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg text-xs"
                  value={supContact}
                  onChange={(e) => setSupContact(e.target.value)}
                />
              </div>
              <div>
                <label className="block text-[9px] font-bold text-slate-400 uppercase mb-1">Email Address</label>
                <input
                  type="email"
                  placeholder="e.g. contact@supplier.com"
                  className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg text-xs"
                  value={supEmail}
                  onChange={(e) => setSupEmail(e.target.value)}
                />
              </div>
              <div>
                <label className="block text-[9px] font-bold text-slate-400 uppercase mb-1">Phone</label>
                <input
                  type="text"
                  placeholder="e.g. +251..."
                  className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg text-xs"
                  value={supPhone}
                  onChange={(e) => setSupPhone(e.target.value)}
                />
              </div>
              <div>
                <label className="block text-[9px] font-bold text-slate-400 uppercase mb-1">Physical Address</label>
                <input
                  type="text"
                  placeholder="e.g. Addis Ababa"
                  className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg text-xs"
                  value={supAddress}
                  onChange={(e) => setSupAddress(e.target.value)}
                />
              </div>
              <button
                type="submit"
                disabled={isPending}
                className="w-full py-2 bg-[#0b4a6e] hover:bg-sky-850 text-white rounded-lg text-xs font-bold"
              >
                Save Supplier
              </button>
            </form>
          </div>

          <div className="lg:col-span-2 bg-white p-5 rounded-2xl border border-slate-100 shadow-sm space-y-4">
            <h4 className="text-xs font-extrabold text-[#0b4a6e] uppercase pb-2 border-b border-slate-100 mb-4">
              Registered Suppliers List
            </h4>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-slate-100 text-[10px] font-extrabold text-slate-400 uppercase">
                    <th className="py-2.5">Supplier Name</th>
                    <th className="py-2.5">Contact info</th>
                    <th className="py-2.5">Assigned Scopes</th>
                    <th className="py-2.5 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {initialSuppliers.map((s) => {
                    const scopes = initialSupplierAssignments.filter((sa) => sa.supplierId === s.id && sa.isActive);
                    return (
                      <tr key={s.id} className="hover:bg-slate-50/20 text-slate-650">
                        <td className="py-3">
                          <p className="font-bold text-slate-800">{s.name}</p>
                          <p className="text-[10px] text-slate-400">{s.address || "No address"}</p>
                        </td>
                        <td className="py-3">
                          <p className="font-semibold text-slate-700">{s.contactPerson || "-"}</p>
                          <p className="text-[10px] text-slate-450">{s.phone || s.email || "-"}</p>
                        </td>
                        <td className="py-3">
                          <div className="flex flex-wrap gap-1">
                            {scopes.length === 0 ? (
                              <span className="text-[9px] text-slate-400 font-semibold bg-slate-50 border px-1.5 py-0.5 rounded">All Scopes</span>
                            ) : (
                              scopes.map((scope) => {
                                const catName = categories.find(c => c.id === scope.categoryId)?.name || "All Cat";
                                const typeName = assetTypes.find(t => t.id === scope.assetTypeId)?.name || "";
                                return (
                                  <span key={scope.id} className="text-[8px] bg-sky-50 text-sky-700 border border-sky-100 px-1.5 py-0.5 rounded font-bold flex items-center gap-1">
                                    <span>{catName} {typeName ? `• ${typeName}` : ""}</span>
                                    <button onClick={() => handleRemoveSupplierAssignment(s.id, scope.id)} className="text-red-500 hover:text-red-750 font-black">✕</button>
                                  </span>
                                );
                              })
                            )}
                          </div>
                        </td>
                        <td className="py-3 text-right space-x-2">
                          <button
                            onClick={() => {
                              setShowAssignSupplierModal(s);
                              setAssignCatId("");
                              setAssignTypeId("");
                            }}
                            className="text-[#0b4a6e] hover:underline font-bold text-[10px]"
                          >
                            Assign Scope
                          </button>
                          <button
                            onClick={() => handleToggleSupplierActive(s.id, s.isActive)}
                            className={`hover:underline font-bold text-[10px] ${s.isActive ? "text-amber-600" : "text-emerald-600"}`}
                          >
                            {s.isActive ? "Disable" : "Enable"}
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* EDIT FIELD SPECIFIC DETAILS OVERRIDES MODAL */}
      {editingFieldConfig && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl border border-slate-100 shadow-2xl w-full max-w-lg overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="bg-slate-50 px-6 py-4 border-b border-slate-100 flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-slate-800 flex items-center gap-1.5">
                  <Settings2 size={16} className="text-[#0b4a6e]" />
                  <span>Configure Field Properties</span>
                </h3>
                <p className="text-[10px] text-slate-400 font-semibold mt-1">
                  Adjust labels, options, validations, and visibility on the Dynamic Form.
                </p>
              </div>
              <button onClick={() => setEditingFieldConfig(null)} className="text-xs text-slate-400 hover:text-slate-600 font-bold">✕</button>
            </div>

            {editError && (
              <div className="p-3 mx-6 mt-4 bg-red-50 border border-red-200 rounded-xl text-xs font-semibold text-red-700 flex items-center gap-2">
                <XCircle size={14} className="shrink-0" />
                <span>{editError}</span>
              </div>
            )}

            <form onSubmit={handleEditFieldSubmit}>
              <div className="p-6 space-y-4 text-xs max-h-[450px] overflow-y-auto pr-2">
                <div className="grid grid-cols-2 gap-4">
                  {/* Field Name */}
                  <div>
                    <label className="block text-[9px] font-bold text-slate-400 uppercase mb-1">Field Name (Internal)</label>
                    <input
                      type="text"
                      disabled
                      className="w-full p-2 bg-slate-100 border border-slate-200 rounded-lg text-slate-500 font-mono font-bold"
                      value={editingFieldConfig.field.name}
                    />
                  </div>

                  {/* Field Type */}
                  <div>
                    <label className="block text-[9px] font-bold text-slate-400 uppercase mb-1">Field Type</label>
                    <input
                      type="text"
                      disabled
                      className="w-full p-2 bg-slate-100 border border-slate-200 rounded-lg text-slate-550 font-bold uppercase"
                      value={editingFieldConfig.field.fieldType}
                    />
                  </div>

                  {/* Display Label Override */}
                  <div className="col-span-2">
                    <label className="block text-[9px] font-bold text-slate-400 uppercase mb-1">Field Label *</label>
                    <input
                      type="text"
                      required
                      placeholder="Display label on form"
                      className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg font-semibold text-slate-700"
                      value={editLabel}
                      onChange={(e) => setEditLabel(e.target.value)}
                    />
                  </div>

                  {/* Placeholder Override */}
                  <div>
                    <label className="block text-[9px] font-bold text-slate-400 uppercase mb-1">Placeholder</label>
                    <input
                      type="text"
                      placeholder="e.g. Enter value..."
                      className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-650"
                      value={editPlaceholder}
                      onChange={(e) => setEditPlaceholder(e.target.value)}
                    />
                  </div>

                  {/* Help Text / Description */}
                  <div>
                    <label className="block text-[9px] font-bold text-slate-400 uppercase mb-1">Help Text</label>
                    <input
                      type="text"
                      placeholder="e.g. Enter warranty specifications"
                      className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-650"
                      value={editHelpText}
                      onChange={(e) => setEditHelpText(e.target.value)}
                    />
                  </div>

                  {/* Default Value */}
                  <div>
                    <label className="block text-[9px] font-bold text-slate-400 uppercase mb-1">Default Value</label>
                    <input
                      type="text"
                      placeholder="Optional default preset"
                      className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-650"
                      value={editDefaultVal}
                      onChange={(e) => setEditDefaultVal(e.target.value)}
                    />
                  </div>

                  {/* Toggles */}
                  <div className="flex gap-4 pt-4">
                    <div className="flex items-center space-x-1.5">
                      <input
                        type="checkbox"
                        id="editRequired"
                        className="rounded text-[#0b4a6e]"
                        checked={editRequired}
                        onChange={(e) => setEditRequired(e.target.checked)}
                      />
                      <label htmlFor="editRequired" className="font-bold text-slate-650 select-none cursor-pointer">
                        Required
                      </label>
                    </div>

                    <div className="flex items-center space-x-1.5">
                      <input
                        type="checkbox"
                        id="editEnabled"
                        className="rounded text-[#0b4a6e]"
                        checked={editEnabled}
                        onChange={(e) => setEditEnabled(e.target.checked)}
                      />
                      <label htmlFor="editEnabled" className="font-bold text-slate-655 select-none cursor-pointer">
                        Enabled
                      </label>
                    </div>
                  </div>
                </div>

                {/* Dropdown Options Editor */}
                {(editingFieldConfig.field.fieldType === "DROPDOWN" || editingFieldConfig.field.fieldType === "RADIO") && (
                  <div className="border-t border-slate-100 pt-4 space-y-2">
                    <label className="block text-[9px] font-bold text-slate-400 uppercase">
                      Select Options List (Add, Edit, Delete, Reorder)
                    </label>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        placeholder="Add new option item..."
                        className="flex-1 p-2 bg-slate-50 border border-slate-200 rounded-lg text-xs"
                        value={newOptionVal}
                        onChange={(e) => setNewOptionVal(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            e.preventDefault();
                            if (newOptionVal.trim()) {
                              setEditOptionsList([...editOptionsList, newOptionVal.trim()]);
                              setNewOptionVal("");
                            }
                          }
                        }}
                      />
                      <button
                        type="button"
                        onClick={() => {
                          if (newOptionVal.trim()) {
                            setEditOptionsList([...editOptionsList, newOptionVal.trim()]);
                            setNewOptionVal("");
                          }
                        }}
                        className="px-3 bg-slate-100 border rounded-lg text-xs font-bold"
                      >
                        + Add
                      </button>
                    </div>

                    <div className="border border-slate-100 rounded-lg overflow-hidden divide-y divide-slate-50 max-h-36 overflow-y-auto">
                      {editOptionsList.length === 0 ? (
                        <p className="p-3 text-center text-slate-400 text-[10px]">No options configured.</p>
                      ) : (
                        editOptionsList.map((option, oIdx) => (
                          <div key={option + oIdx} className="flex justify-between items-center p-2 bg-white text-xs">
                            <span className="font-bold text-slate-700">{option}</span>
                            <div className="flex items-center space-x-1 shrink-0">
                              <button
                                type="button"
                                disabled={oIdx === 0}
                                onClick={() => {
                                  const next = [...editOptionsList];
                                  next[oIdx] = next[oIdx - 1];
                                  next[oIdx - 1] = option;
                                  setEditOptionsList(next);
                                }}
                                className="p-0.5 hover:bg-slate-100 rounded"
                              >
                                <ArrowUp size={10} />
                              </button>
                              <button
                                type="button"
                                disabled={oIdx === editOptionsList.length - 1}
                                onClick={() => {
                                  const next = [...editOptionsList];
                                  next[oIdx] = next[oIdx + 1];
                                  next[oIdx + 1] = option;
                                  setEditOptionsList(next);
                                }}
                                className="p-0.5 hover:bg-slate-100 rounded"
                              >
                                <ArrowDown size={10} />
                              </button>
                              <button
                                type="button"
                                onClick={() => {
                                  setEditOptionsList(editOptionsList.filter((_, idx) => idx !== oIdx));
                                }}
                                className="p-0.5 hover:bg-red-50 text-red-550 rounded"
                              >
                                <Trash2 size={10} />
                              </button>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                )}

                {/* Validation Constraints */}
                <div className="border-t border-slate-100 pt-4">
                  <h5 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">
                    Validation Limits (Optional)
                  </h5>
                  <div className="grid grid-cols-2 gap-3.5">
                    {/* Range limits */}
                    {(editingFieldConfig.field.fieldType === "NUMBER" ||
                      editingFieldConfig.field.fieldType === "DECIMAL" ||
                      ["purchaseCost", "salvageValue", "usefulLife"].includes(editingFieldConfig.field.name)) && (
                      <>
                        <div>
                          <label className="block text-[9px] font-bold text-slate-500 mb-1">Minimum Numeric Value</label>
                          <input
                            type="number"
                            placeholder="e.g. 0"
                            className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg"
                            value={editMin}
                            onChange={(e) => setEditMin(e.target.value === "" ? "" : Number(e.target.value))}
                          />
                        </div>
                        <div>
                          <label className="block text-[9px] font-bold text-slate-500 mb-1">Maximum Numeric Value</label>
                          <input
                            type="number"
                            placeholder="e.g. 1000000"
                            className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg"
                            value={editMax}
                            onChange={(e) => setEditMax(e.target.value === "" ? "" : Number(e.target.value))}
                          />
                        </div>
                      </>
                    )}

                    {/* Length limits */}
                    {(editingFieldConfig.field.fieldType === "TEXT" ||
                      editingFieldConfig.field.fieldType === "TEXTAREA" ||
                      editingFieldConfig.field.fieldType === "EMAIL" ||
                      editingFieldConfig.field.fieldType === "URL" ||
                      ["name", "serialNumber"].includes(editingFieldConfig.field.name)) && (
                      <>
                        <div>
                          <label className="block text-[9px] font-bold text-slate-500 mb-1">Minimum Char Length</label>
                          <input
                            type="number"
                            placeholder="e.g. 5"
                            className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg font-mono"
                            value={editMinLen}
                            onChange={(e) => setEditMinLen(e.target.value === "" ? "" : Number(e.target.value))}
                          />
                        </div>
                        <div>
                          <label className="block text-[9px] font-bold text-slate-500 mb-1">Maximum Char Length</label>
                          <input
                            type="number"
                            placeholder="e.g. 100"
                            className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg font-mono"
                            value={editMaxLen}
                            onChange={(e) => setEditMaxLen(e.target.value === "" ? "" : Number(e.target.value))}
                          />
                        </div>
                      </>
                    )}
                  </div>
                </div>

              </div>

              <div className="bg-slate-50 px-6 py-3.5 border-t border-slate-100 flex justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setEditingFieldConfig(null)}
                  className="px-4 py-1.5 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-lg text-xs font-bold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isPending}
                  className="px-4 py-1.5 bg-[#0b4a6e] hover:bg-sky-850 text-white rounded-lg text-xs font-bold flex items-center gap-1"
                >
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ADD CUSTOM FIELD MODAL */}
      {showAddCustomModal && selectedType && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl border border-slate-100 shadow-2xl w-full max-w-lg overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="bg-slate-50 px-6 py-4 border-b border-slate-100 flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-slate-800 flex items-center gap-1.5">
                  <Plus size={16} className="text-[#0b4a6e]" />
                  <span>Add Custom Field</span>
                </h3>
                <p className="text-[10px] text-slate-400 font-semibold mt-1">
                  Create a custom question specifically for the <strong className="text-slate-750">{selectedType.name}</strong> Asset Type.
                </p>
              </div>
              <button onClick={() => setShowAddCustomModal(false)} className="text-xs text-slate-400 hover:text-slate-600 font-bold">✕</button>
            </div>

            {addCustomError && (
              <div className="p-3 mx-6 mt-4 bg-red-50 border border-red-200 rounded-xl text-xs font-semibold text-red-700 flex items-center gap-2">
                <XCircle size={14} className="shrink-0" />
                <span>{addCustomError}</span>
              </div>
            )}

            <form onSubmit={handleAddCustomFieldSubmit}>
              <div className="p-6 space-y-4 text-xs max-h-[450px] overflow-y-auto pr-2">
                <div className="grid grid-cols-2 gap-4">
                  {/* Selected Asset Type (read-only) */}
                  <div>
                    <label className="block text-[9px] font-bold text-slate-400 uppercase mb-1">Asset Type</label>
                    <input
                      type="text"
                      disabled
                      className="w-full p-2 bg-slate-100 border border-slate-200 rounded-lg text-slate-500 font-bold"
                      value={selectedType.name}
                    />
                  </div>

                  {/* Field Type Select */}
                  <div>
                    <label className="block text-[9px] font-bold text-[#0b4a6e] uppercase mb-1">Field Type *</label>
                    <select
                      className="w-full p-2 bg-slate-55 border border-slate-200 rounded-lg font-semibold text-slate-700 focus:outline-none"
                      value={newFieldType}
                      onChange={(e) => setNewFieldType(e.target.value)}
                    >
                      <option value="TEXT">Text</option>
                      <option value="TEXTAREA">Textarea</option>
                      <option value="NUMBER">Number (Integer)</option>
                      <option value="DECIMAL">Decimal Number</option>
                      <option value="DATE">Date</option>
                      <option value="BOOLEAN">Boolean (Yes/No)</option>
                      <option value="DROPDOWN">Dropdown / Select</option>
                      <option value="RADIO">Radio Choices</option>
                      <option value="EMAIL">Email</option>
                      <option value="URL">URL</option>
                    </select>
                  </div>

                  {/* Field Name Identifier */}
                  <div>
                    <label className="block text-[9px] font-bold text-[#0b4a6e] uppercase mb-1">Field Name (Internal Keyword) *</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. battery_capacity"
                      className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg text-xs"
                      value={newFieldName}
                      onChange={(e) => setNewFieldName(e.target.value)}
                    />
                  </div>

                  {/* Field Label */}
                  <div>
                    <label className="block text-[9px] font-bold text-[#0b4a6e] uppercase mb-1">Field Label *</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Battery Capacity"
                      className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-semibold"
                      value={newFieldLabel}
                      onChange={(e) => setNewFieldLabel(e.target.value)}
                    />
                  </div>

                  {/* Placeholder */}
                  <div>
                    <label className="block text-[9px] font-bold text-slate-400 uppercase mb-1">Placeholder</label>
                    <input
                      type="text"
                      placeholder="e.g. Enter Capacity..."
                      className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg text-xs"
                      value={newFieldPlaceholder}
                      onChange={(e) => setNewFieldPlaceholder(e.target.value)}
                    />
                  </div>

                  {/* Help Text */}
                  <div>
                    <label className="block text-[9px] font-bold text-slate-400 uppercase mb-1">Help Text</label>
                    <input
                      type="text"
                      placeholder="Helpful details for user"
                      className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg text-xs"
                      value={newFieldHelpText}
                      onChange={(e) => setNewFieldHelpText(e.target.value)}
                    />
                  </div>

                  {/* Default Value */}
                  <div>
                    <label className="block text-[9px] font-bold text-slate-400 uppercase mb-1">Default Value</label>
                    <input
                      type="text"
                      placeholder="Optional default preset"
                      className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg text-xs"
                      value={newFieldDefaultVal}
                      onChange={(e) => setNewFieldDefaultVal(e.target.value)}
                    />
                  </div>

                  {/* Toggles */}
                  <div className="flex gap-4 pt-4">
                    <div className="flex items-center space-x-1.5">
                      <input
                        type="checkbox"
                        id="newFieldRequired"
                        className="rounded text-[#0b4a6e]"
                        checked={newFieldRequired}
                        onChange={(e) => setNewFieldRequired(e.target.checked)}
                      />
                      <label htmlFor="newFieldRequired" className="font-bold text-slate-650 select-none cursor-pointer">
                        Required
                      </label>
                    </div>

                    <div className="flex items-center space-x-1.5">
                      <input
                        type="checkbox"
                        id="newFieldEnabled"
                        className="rounded text-[#0b4a6e]"
                        checked={newFieldEnabled}
                        onChange={(e) => setNewFieldEnabled(e.target.checked)}
                      />
                      <label htmlFor="newFieldEnabled" className="font-bold text-slate-655 select-none cursor-pointer">
                        Enabled
                      </label>
                    </div>
                  </div>
                </div>

                {/* Dropdown Options Editor */}
                {(newFieldType === "DROPDOWN" || newFieldType === "RADIO") && (
                  <div className="border-t border-slate-100 pt-4 space-y-2">
                    <label className="block text-[9px] font-bold text-slate-400 uppercase">
                      Configure Options List *
                    </label>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        placeholder="Add option item..."
                        className="flex-1 p-2 bg-slate-50 border border-slate-200 rounded-lg text-xs"
                        value={newFieldOptionVal}
                        onChange={(e) => setNewFieldOptionVal(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            e.preventDefault();
                            if (newFieldOptionVal.trim()) {
                              setNewFieldOptionsList([...newFieldOptionsList, newFieldOptionVal.trim()]);
                              setNewFieldOptionVal("");
                            }
                          }
                        }}
                      />
                      <button
                        type="button"
                        onClick={() => {
                          if (newFieldOptionVal.trim()) {
                            setNewFieldOptionsList([...newFieldOptionsList, newFieldOptionVal.trim()]);
                            setNewFieldOptionVal("");
                          }
                        }}
                        className="px-3 bg-slate-100 border rounded-lg text-xs font-bold"
                      >
                        + Add
                      </button>
                    </div>

                    <div className="border border-slate-100 rounded-lg overflow-hidden divide-y divide-slate-50 max-h-36 overflow-y-auto">
                      {newFieldOptionsList.length === 0 ? (
                        <p className="p-3 text-center text-slate-400 text-[10px]">No options configured.</p>
                      ) : (
                        newFieldOptionsList.map((option, oIdx) => (
                          <div key={option + oIdx} className="flex justify-between items-center p-2 bg-white text-xs">
                            <span className="font-bold text-slate-700">{option}</span>
                            <button
                              type="button"
                              onClick={() => {
                                setNewFieldOptionsList(newFieldOptionsList.filter((_, idx) => idx !== oIdx));
                              }}
                              className="p-0.5 hover:bg-red-50 text-red-550 rounded"
                            >
                              <Trash2 size={10} />
                            </button>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                )}

              </div>

              <div className="bg-slate-50 px-6 py-3.5 border-t border-slate-100 flex justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setShowAddCustomModal(false)}
                  className="px-4 py-1.5 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-lg text-xs font-bold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 bg-[#0b4a6e] hover:bg-sky-850 text-white rounded-lg text-xs font-bold"
                >
                  Add Field
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* FORM PREVIEW MODAL */}
      {showPreviewModal && selectedType && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl border border-slate-100 shadow-2xl w-full max-w-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="bg-slate-50 px-6 py-4 border-b border-slate-100 flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-slate-800 flex items-center gap-1.5">
                  <Eye size={16} className="text-[#0b4a6e]" />
                  <span>Asset Registration Form Preview</span>
                </h3>
                <p className="text-[10px] text-slate-400 font-semibold mt-1">
                  Preview exactly what the registration screen looks like for a <strong className="text-slate-700">{selectedType.name}</strong>.
                </p>
              </div>
              <button onClick={() => setShowPreviewModal(false)} className="text-xs text-slate-400 hover:text-slate-600 font-bold">✕</button>
            </div>

            <div className="p-6 space-y-4 max-h-[450px] overflow-y-auto pr-2">
              <div className="bg-slate-50 border border-slate-200 p-3.5 rounded-xl text-slate-600 text-xs font-semibold uppercase">
                Register {selectedType.name}
              </div>

              <div className="bg-white p-5 border border-slate-150 rounded-2xl space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Generated Asset ID (Auto-Generated, read-only) */}
                  <div>
                    <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Asset ID (Auto-Generated)</label>
                    <input
                      type="text"
                      disabled
                      placeholder="e.g. DBU-ICT-982405"
                      className="w-full p-2 bg-slate-100 border border-slate-200 rounded-lg text-slate-400 font-mono text-xs"
                    />
                  </div>

                  {activeFields.map((cfg) => {
                    const isRequired = cfg.isRequired;
                    const label = cfg.labelOverride || cfg.field.label;
                    const placeholder = cfg.placeholderOverride || cfg.field.placeholder;
                    const helpText = cfg.descriptionOverride || cfg.field.description;

                    return (
                      <div key={cfg.fieldId} className={cfg.field.fieldType === "TEXTAREA" ? "col-span-2" : ""}>
                        <label className="block text-[10px] font-bold text-slate-600 uppercase mb-1">
                          {label} {isRequired && <span className="text-red-500">*</span>}
                        </label>

                        {cfg.field.fieldType === "TEXT" && (
                          <input
                            type="text"
                            placeholder={placeholder || `Enter ${label.toLowerCase()}...`}
                            defaultValue={cfg.defaultValue || ""}
                            className="w-full p-2 bg-slate-50 border border-slate-250 rounded-lg text-xs"
                          />
                        )}

                        {cfg.field.fieldType === "TEXTAREA" && (
                          <textarea
                            placeholder={placeholder || `Enter ${label.toLowerCase()}...`}
                            defaultValue={cfg.defaultValue || ""}
                            className="w-full p-2 bg-slate-50 border border-slate-250 rounded-lg text-xs h-16 resize-none"
                          />
                        )}

                        {cfg.field.fieldType === "NUMBER" && (
                          <input
                            type="number"
                            placeholder={placeholder || "0"}
                            defaultValue={cfg.defaultValue || ""}
                            className="w-full p-2 bg-slate-50 border border-slate-250 rounded-lg text-xs font-mono"
                          />
                        )}

                        {cfg.field.fieldType === "DECIMAL" && (
                          <input
                            type="text"
                            placeholder={placeholder || "0.00"}
                            defaultValue={cfg.defaultValue || ""}
                            className="w-full p-2 bg-slate-50 border border-slate-250 rounded-lg text-xs font-mono"
                          />
                        )}

                        {cfg.field.fieldType === "DATE" && (
                          <input
                            type="date"
                            className="w-full p-2 bg-slate-50 border border-slate-250 rounded-lg text-xs text-slate-700"
                          />
                        )}

                        {cfg.field.fieldType === "BOOLEAN" && (
                          <select className="w-full p-2 bg-slate-50 border border-slate-250 rounded-lg text-xs text-slate-600">
                            <option value="">-- Choose Option --</option>
                            <option value="Yes">Yes</option>
                            <option value="No">No</option>
                          </select>
                        )}

                        {cfg.field.fieldType === "CHECKBOX" && (
                          <div className="flex items-center space-x-2 p-2 bg-slate-50 border border-slate-200 rounded-lg">
                            <input type="checkbox" className="rounded border-slate-300" />
                            <span className="text-xs text-slate-600 font-semibold">Active State / Yes</span>
                          </div>
                        )}

                        {cfg.field.fieldType === "RADIO" && (
                          <div className="flex flex-wrap gap-3 p-1">
                            {(cfg.options || cfg.field.options || "Option A,Option B").split(",").map((o) => (
                              <label key={o} className="flex items-center space-x-1.5 text-xs text-slate-600 cursor-pointer">
                                <input type="radio" name={`preview-radio-${cfg.fieldId}`} className="text-[#0b4a6e]" />
                                <span>{o}</span>
                              </label>
                            ))}
                          </div>
                        )}

                        {cfg.field.fieldType === "DROPDOWN" && (
                          <select className="w-full p-2 bg-slate-50 border border-slate-255 rounded-lg text-xs text-slate-650 font-bold focus:outline-none">
                            <option value="">-- Choose Option --</option>
                            {cfg.field.name === "supplier" ? (
                              activeSuppliers.map((s) => (
                                <option key={s.id} value={s.id}>
                                  {s.name}
                                </option>
                              ))
                            ) : (
                              (cfg.options || cfg.field.options || "Option A,Option B").split(",").map((o) => (
                                <option key={o} value={o}>
                                  {o}
                                </option>
                              ))
                            )}
                          </select>
                        )}

                        {helpText && (
                          <p className="text-[9px] text-slate-400 mt-1 font-semibold">💡 {helpText}</p>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            <div className="p-4 border-t border-slate-100 bg-slate-50 text-right">
              <button
                onClick={() => setShowPreviewModal(false)}
                className="px-4 py-2 bg-slate-600 hover:bg-slate-700 text-white rounded-lg text-xs font-bold"
              >
                Close Preview
              </button>
            </div>
          </div>
        </div>
      )}

      {/* INSPECTOR VIEW MODAL FOR ASSET TYPE */}
      {viewingAssetType && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl border border-slate-100 shadow-2xl w-full max-w-lg overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="bg-slate-50 px-6 py-4 border-b border-slate-100 flex items-center justify-between">
              <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2">
                <span className="text-[#0b4a6e] font-extrabold uppercase text-[10px] bg-[#0b4a6e]/15 px-2 py-0.5 rounded-md">Type Profile</span>
                {viewingAssetType.name}
              </h3>
              <button onClick={() => setViewingAssetType(null)} className="text-xs text-slate-400 hover:text-slate-600 font-bold">✕</button>
            </div>
            <div className="p-6 space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <span className="block text-[9px] font-bold text-slate-400 uppercase">Category</span>
                  <span className="text-slate-800 font-semibold">{categories.find(c => c.id === viewingAssetType.categoryId)?.name || "N/A"}</span>
                </div>
                <div>
                  <span className="block text-[9px] font-bold text-slate-400 uppercase">Display Order</span>
                  <span className="text-slate-800 font-semibold">{viewingAssetType.displayOrder}</span>
                </div>
                <div>
                  <span className="block text-[9px] font-bold text-slate-400 uppercase">Icon</span>
                  <span className="text-slate-800 font-semibold">{viewingAssetType.icon || "Default"}</span>
                </div>
                <div>
                  <span className="block text-[9px] font-bold text-slate-400 uppercase">Status</span>
                  <span className={`inline-block px-2 py-0.5 rounded-full text-[9px] font-bold ${viewingAssetType.isActive ? "bg-emerald-50 text-emerald-700" : "bg-red-50 text-red-700"}`}>
                    {viewingAssetType.isActive ? "Active" : "Inactive"}
                  </span>
                </div>
              </div>
              <div>
                <span className="block text-[9px] font-bold text-slate-400 uppercase">Description</span>
                <p className="text-slate-600 mt-1 font-medium bg-slate-50 p-2.5 rounded-lg border border-slate-100">{viewingAssetType.description || "No description provided."}</p>
              </div>
            </div>
            <div className="bg-slate-50 px-6 py-3 border-t border-slate-100 flex justify-end">
              <button onClick={() => setViewingAssetType(null)} className="px-4 py-1.5 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-lg text-xs font-bold transition-all">Close</button>
            </div>
          </div>
        </div>
      )}

      {/* EDIT ASSET TYPE INFO MODAL */}
      {editingAssetType && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl border border-slate-100 shadow-2xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="bg-slate-50 px-6 py-4 border-b border-slate-100 flex items-center justify-between">
              <h3 className="text-sm font-bold text-slate-800">Edit Asset Type</h3>
              <button onClick={() => setEditingAssetType(null)} className="text-xs text-slate-400 hover:text-slate-600 font-bold">✕</button>
            </div>
            <form onSubmit={handleEditTypeSubmit}>
              <div className="p-6 space-y-4 text-xs">
                <div>
                  <label className="block text-[9px] font-bold text-slate-400 uppercase mb-1">Asset Type Name *</label>
                  <input
                    type="text"
                    required
                    className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-semibold focus:outline-none"
                    value={editTypeName}
                    onChange={(e) => setEditTypeName(e.target.value)}
                  />
                </div>
                <div>
                  <label className="block text-[9px] font-bold text-slate-400 uppercase mb-1">Asset Category *</label>
                  <select
                    required
                    className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-semibold text-slate-700 focus:outline-none"
                    value={editTypeCatId}
                    onChange={(e) => setEditTypeCatId(e.target.value)}
                  >
                    {categories.map((c) => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-[9px] font-bold text-slate-400 uppercase mb-1">Description</label>
                  <textarea
                    className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg text-xs h-16 resize-none focus:outline-none"
                    value={editTypeDesc}
                    onChange={(e) => setEditTypeDesc(e.target.value)}
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[9px] font-bold text-slate-400 uppercase mb-1">Icon Name</label>
                    <input
                      type="text"
                      className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg text-xs"
                      value={editTypeIcon}
                      onChange={(e) => setEditTypeIcon(e.target.value)}
                    />
                  </div>
                  <div>
                    <label className="block text-[9px] font-bold text-slate-400 uppercase mb-1">Display Order *</label>
                    <input
                      type="number"
                      required
                      min="1"
                      className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-semibold"
                      value={editTypeDisplayOrder}
                      onChange={(e) => setEditTypeDisplayOrder(e.target.value)}
                    />
                  </div>
                </div>
                <div className="flex items-center space-x-2 pt-2">
                  <input
                    type="checkbox"
                    id="editTypeIsActive"
                    className="rounded text-[#0b4a6e]"
                    checked={editTypeIsActive}
                    onChange={(e) => setEditTypeIsActive(e.target.checked)}
                  />
                  <label htmlFor="editTypeIsActive" className="text-xs font-bold text-slate-705 cursor-pointer select-none">Active / Available for registrations</label>
                </div>
              </div>
              <div className="bg-slate-50 px-6 py-3 border-t border-slate-100 flex justify-end space-x-2">
                <button type="button" onClick={() => setEditingAssetType(null)} className="px-4 py-1.5 bg-slate-200 hover:bg-slate-300 text-slate-750 rounded-lg text-xs font-bold">Cancel</button>
                <button type="submit" disabled={isPending} className="px-4 py-1.5 bg-[#0b4a6e] hover:bg-sky-850 text-white rounded-lg text-xs font-bold">Save Changes</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ASSIGN SUPPLIER MODAL */}
      {showAssignSupplierModal && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl border border-slate-100 shadow-2xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="bg-slate-50 px-6 py-4 border-b border-slate-100 flex items-center justify-between">
              <h3 className="text-sm font-bold text-slate-800">Assign Supplier Scope</h3>
              <button onClick={() => setShowAssignSupplierModal(null)} className="text-xs text-slate-400 hover:text-slate-600 font-bold">✕</button>
            </div>
            <form onSubmit={handleAssignSupplierSubmit}>
              <div className="p-6 space-y-4 text-xs">
                <div>
                  <span className="block text-[9px] font-bold text-slate-400 uppercase">Supplier Name</span>
                  <span className="text-sm font-extrabold text-[#0b4a6e]">{showAssignSupplierModal.name}</span>
                </div>
                <div>
                  <label className="block text-[9px] font-bold text-slate-400 uppercase mb-1">Target Category (Required)</label>
                  <select
                    required
                    className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-700 focus:outline-none"
                    value={assignCatId}
                    onChange={(e) => {
                      setAssignCatId(e.target.value);
                      setAssignTypeId("");
                    }}
                  >
                    <option value="">-- Choose Category --</option>
                    {categories.map((c) => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-[9px] font-bold text-slate-400 uppercase mb-1">Specific Asset Type (Optional)</label>
                  <select
                    disabled={!assignCatId}
                    className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-700 focus:outline-none disabled:opacity-60"
                    value={assignTypeId}
                    onChange={(e) => setAssignTypeId(e.target.value)}
                  >
                    <option value="">-- All Types in Category --</option>
                    {assetTypes
                      .filter((t) => t.categoryId === assignCatId && t.isActive)
                      .map((t) => (
                        <option key={t.id} value={t.id}>{t.name}</option>
                      ))}
                  </select>
                </div>
              </div>
              <div className="bg-slate-50 px-6 py-3 border-t border-slate-100 flex justify-end space-x-2">
                <button type="button" onClick={() => setShowAssignSupplierModal(null)} className="px-4 py-1.5 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-lg text-xs font-bold">Cancel</button>
                <button type="submit" disabled={isPending} className="px-4 py-1.5 bg-[#0b4a6e] hover:bg-sky-850 text-white rounded-lg text-xs font-bold">Assign</button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
