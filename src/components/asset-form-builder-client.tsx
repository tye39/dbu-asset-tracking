"use client";

import React, { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  createCategoryAction,
  updateCategoryAction,
  deleteCategoryAction,
  createAssetTypeAction,
  updateAssetTypeAction,
  deleteAssetTypeAction,
  createFieldAction,
  updateFieldAction,
  deleteFieldAction,
  saveAssetTypeConfigAction,
  createSupplierAction,
  updateSupplierAction,
  deleteSupplierAction,
  saveSupplierAssignmentsAction
} from "@/app/actions/form-builder";
import {
  ArrowUp,
  ArrowDown,
  Trash2,
  Eye,
  Link as LinkIcon,
  Maximize2,
  Pencil,
  Plus,
  Search
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

  // Navigation Tabs: form-config, categories, asset-types, custom-fields, suppliers
  const [activePanel, setActivePanel] = useState<"form-config" | "categories" | "asset-types" | "custom-fields" | "suppliers">("form-config");

  // Selection states for form configuration
  const [selectedCatId, setSelectedCatId] = useState<string>(categories[0]?.id || "");
  const filteredTypes = assetTypes.filter((t) => t.categoryId === selectedCatId && t.isActive);
  const [selectedTypeId, setSelectedTypeId] = useState<string>(filteredTypes[0]?.id || "");

  // Local Field Configuration state (derived & reorderable)
  const [localConfigs, setLocalConfigs] = useState<TypeFieldConfig[]>([]);
  const [lastLoadedTypeId, setLastLoadedTypeId] = useState<string>("");

  // Modals
  const [showPreviewModal, setShowPreviewModal] = useState(false);
  const [showAssignSupplierModal, setShowAssignSupplierModal] = useState<SupplierItem | null>(null);

  // Form states
  const [catName, setCatName] = useState("");
  const [catCode, setCatCode] = useState("");
  const [catDesc, setCatDesc] = useState("");

  const [typeName, setTypeName] = useState("");
  const [typeCatId, setTypeCatId] = useState(categories[0]?.id || "");
  const [typeDesc, setTypeDesc] = useState("");
  const [typeIcon, setTypeIcon] = useState("");
  const [typeDisplayOrder, setTypeDisplayOrder] = useState("1");

  // Asset Type Management detailed search, filter & modals
  const [typeSearch, setTypeSearch] = useState("");
  const [typeCatFilter, setTypeCatFilter] = useState("");
  const [typeStatusFilter, setTypeStatusFilter] = useState("");
  const [typeSortBy, setTypeSortBy] = useState<"name" | "displayOrder">("name");

  const [viewingAssetType, setViewingAssetType] = useState<AssetTypeItem | null>(null);
  const [editingAssetType, setEditingAssetType] = useState<AssetTypeItem | null>(null);
  
  // Edit Form state copies
  const [editTypeName, setEditTypeName] = useState("");
  const [editTypeCatId, setEditTypeCatId] = useState("");
  const [editTypeDesc, setEditTypeDesc] = useState("");
  const [editTypeIcon, setEditTypeIcon] = useState("");
  const [editTypeDisplayOrder, setEditTypeDisplayOrder] = useState("1");
  const [editTypeIsActive, setEditTypeIsActive] = useState(true);

  const [fieldName, setFieldName] = useState("");
  const [fieldLabel, setFieldLabel] = useState("");
  const [fieldType, setFieldType] = useState("TEXT");
  const [fieldPlaceholder, setFieldPlaceholder] = useState("");
  const [fieldDesc, setFieldDesc] = useState("");
  const [fieldOptions, setFieldOptions] = useState("");
  const [fieldDefVal, setFieldDefVal] = useState("");

  const [supName, setSupName] = useState("");
  const [supContact, setSupContact] = useState("");
  const [supEmail, setSupEmail] = useState("");
  const [supPhone, setSupPhone] = useState("");
  const [supAddress, setSupAddress] = useState("");

  // Supplier assignment mapping checkboxes
  const [assignCatId, setAssignCatId] = useState<string>("");
  const [assignTypeId, setAssignTypeId] = useState<string>("");

  // Synchronize dynamic local configurations based on selected Asset Type
  if (selectedTypeId && selectedTypeId !== lastLoadedTypeId) {
    const existingConfigs = initialTypeFields.filter((tf) => tf.assetTypeId === selectedTypeId);
    
    // Include fields not yet mapped to this Asset Type
    const unmappedFields = initialFields.filter(
      (f) => !existingConfigs.some((ec) => ec.fieldId === f.id)
    );

    const merged: TypeFieldConfig[] = [
      ...existingConfigs,
      ...unmappedFields.map((f, idx) => ({
        id: `temp-${f.id}`,
        assetTypeId: selectedTypeId,
        fieldId: f.id,
        isEnabled: false,
        isRequired: false,
        displayOrder: existingConfigs.length + idx + 1,
        field: f
      }))
    ].sort((a, b) => a.displayOrder - b.displayOrder);

    setLocalConfigs(merged);
    setLastLoadedTypeId(selectedTypeId);
  }

  // Handle switching categories -> resets sub-type
  const handleCategoryChange = (catId: string) => {
    setSelectedCatId(catId);
    const subTypes = assetTypes.filter((t) => t.categoryId === catId && t.isActive);
    setSelectedTypeId(subTypes[0]?.id || "");
  };

  /* ==========================================
     FORM DRAG & DROP REORDERING (Section 15)
     ========================================== */
  const [draggingIdx, setDraggingIdx] = useState<number | null>(null);

  const handleDragStart = (idx: number) => {
    setDraggingIdx(idx);
  };

  const handleDragOver = (e: React.DragEvent, idx: number) => {
    e.preventDefault();
    if (draggingIdx === null || draggingIdx === idx) return;

    // Swap indexes locally
    const items = [...localConfigs];
    const draggedItem = items[draggingIdx];
    items.splice(draggingIdx, 1);
    items.splice(idx, 0, draggedItem);
    
    // Re-index displayOrder
    const reindexed = items.map((item, index) => ({
      ...item,
      displayOrder: index + 1
    }));

    setDraggingIdx(idx);
    setLocalConfigs(reindexed);
  };

  const handleDragEnd = () => {
    setDraggingIdx(null);
  };

  // Toggle field attributes in config
  const toggleConfigEnabled = (fieldId: string) => {
    setLocalConfigs(
      localConfigs.map((c) => (c.fieldId === fieldId ? { ...c, isEnabled: !c.isEnabled } : c))
    );
  };

  const toggleConfigRequired = (fieldId: string) => {
    setLocalConfigs(
      localConfigs.map((c) => (c.fieldId === fieldId ? { ...c, isRequired: !c.isRequired } : c))
    );
  };

  const updateConfigOptions = (fieldId: string, optionsVal: string) => {
    setLocalConfigs(
      localConfigs.map((c) => (c.fieldId === fieldId ? { ...c, options: optionsVal } : c))
    );
  };

  const updateConfigDefault = (fieldId: string, defVal: string) => {
    setLocalConfigs(
      localConfigs.map((c) => (c.fieldId === fieldId ? { ...c, defaultValue: defVal } : c))
    );
  };

  // Save current dynamic fields layout configuration
  const handleSaveConfig = () => {
    if (!selectedTypeId) return;
    startTransition(async () => {
      const payload = localConfigs.map((c) => ({
        fieldId: c.fieldId,
        isEnabled: c.isEnabled,
        isRequired: c.isRequired,
        displayOrder: c.displayOrder,
        defaultValue: c.defaultValue,
        options: c.options
      }));

      const res = await saveAssetTypeConfigAction(selectedTypeId, payload);
      if (res.error) {
        alert(res.error);
      } else {
        alert("Form configuration updated successfully!");
        router.refresh();
      }
    });
  };

  /* ==========================================
     CRUD SUBMISSIONS
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

  const handleCategoryOrder = (id: string, dir: "up" | "down", currentOrder: number) => {
    startTransition(async () => {
      const swapOrder = dir === "up" ? currentOrder - 1 : currentOrder + 1;
      const swapCat = categories.find((c) => c.displayOrder === swapOrder);
      if (swapCat) {
        await updateCategoryAction(id, { displayOrder: swapOrder });
        await updateCategoryAction(swapCat.id, { displayOrder: currentOrder });
        router.refresh();
      }
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

  const handleToggleTypeActive = (id: string, active: boolean) => {
    startTransition(async () => {
      await updateAssetTypeAction(id, { isActive: !active });
      router.refresh();
    });
  };

  const handleAddFieldSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    startTransition(async () => {
      const res = await createFieldAction(null, {
        name: fieldName,
        label: fieldLabel,
        fieldType,
        placeholder: fieldPlaceholder,
        description: fieldDesc,
        options: fieldOptions,
        defaultValue: fieldDefVal
      });
      if (res.error) {
        alert(res.error);
      } else {
        setFieldName("");
        setFieldLabel("");
        setFieldPlaceholder("");
        setFieldDesc("");
        setFieldOptions("");
        setFieldDefVal("");
        router.refresh();
      }
    });
  };

  const handleToggleFieldActive = (id: string, active: boolean) => {
    startTransition(async () => {
      await updateFieldAction(id, { isActive: !active });
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

  // Supplier Assignments mapping
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
        alert("Supplier assignment saved!");
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

  // Preview properties
  const activeFields = localConfigs.filter((f) => f.isEnabled);
  const selectedType = assetTypes.find((t) => t.id === selectedTypeId);
  const selectedCategory = categories.find((c) => c.id === selectedCatId);
  const activeSuppliers = initialSupplierAssignments
    .filter(
      (sa) =>
        sa.isActive &&
        sa.supplier.isActive &&
        (sa.assetTypeId === selectedTypeId || sa.categoryId === selectedCatId)
    )
    .map((sa) => sa.supplier);

  // Filtered and Sorted Asset Types for Asset Type Management Dashboard
  const detailedFilteredTypes = assetTypes.filter((t) => {
    const matchesSearch = t.name.toLowerCase().includes(typeSearch.toLowerCase());
    const matchesCategory = !typeCatFilter || t.categoryId === typeCatFilter;
    const matchesStatus = !typeStatusFilter || (typeStatusFilter === "active" ? t.isActive : !t.isActive);
    return matchesSearch && matchesCategory && matchesStatus;
  }).sort((a, b) => {
    if (typeSortBy === "name") {
      return a.name.localeCompare(b.name);
    } else {
      return a.displayOrder - b.displayOrder;
    }
  });

  return (
    <div className="space-y-6 select-none">
      {/* Top Banner */}
      <div className="flex items-center justify-between border-b border-blue-100 pb-4 bg-blue-950/5 -mx-6 -mt-6 p-6">
        <div>
          <h2 className="text-xl font-bold text-blue-900">Asset Registration Form Builder</h2>
          <p className="text-xs text-blue-600 font-semibold mt-1">
            Build context-sensitive dynamic forms, local supplier lists, and custom specs per Asset Type
          </p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-slate-200">
        <button
          onClick={() => setActivePanel("form-config")}
          className={`px-4 py-2 text-xs font-bold -mb-px border-b-2 transition-all ${
            activePanel === "form-config"
              ? "border-[#0b4a6e] text-[#0b4a6e]"
              : "border-transparent text-slate-500 hover:text-slate-700"
          }`}
        >
          Form Configuration
        </button>
        <button
          onClick={() => setActivePanel("categories")}
          className={`px-4 py-2 text-xs font-bold -mb-px border-b-2 transition-all ${
            activePanel === "categories"
              ? "border-[#0b4a6e] text-[#0b4a6e]"
              : "border-transparent text-slate-500 hover:text-slate-700"
          }`}
        >
          Categories
        </button>
        <button
          onClick={() => setActivePanel("asset-types")}
          className={`px-4 py-2 text-xs font-bold -mb-px border-b-2 transition-all ${
            activePanel === "asset-types"
              ? "border-[#0b4a6e] text-[#0b4a6e]"
              : "border-transparent text-slate-500 hover:text-slate-700"
          }`}
        >
          Asset Types
        </button>
        <button
          onClick={() => setActivePanel("custom-fields")}
          className={`px-4 py-2 text-xs font-bold -mb-px border-b-2 transition-all ${
            activePanel === "custom-fields"
              ? "border-[#0b4a6e] text-[#0b4a6e]"
              : "border-transparent text-slate-500 hover:text-slate-700"
          }`}
        >
          Dynamic Custom Fields
        </button>
        <button
          onClick={() => setActivePanel("suppliers")}
          className={`px-4 py-2 text-xs font-bold -mb-px border-b-2 transition-all ${
            activePanel === "suppliers"
              ? "border-[#0b4a6e] text-[#0b4a6e]"
              : "border-transparent text-slate-500 hover:text-slate-700"
          }`}
        >
          Supplier Scopes
        </button>
      </div>

      {/* 1. FORM CONFIGURATION PANEL */}
      {activePanel === "form-config" && (
        <div className="space-y-6">
          <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 flex flex-wrap gap-4 items-center">
            {/* Category Select */}
            <div className="flex-1 min-w-[200px]">
              <label className="block text-[9px] font-bold text-slate-400 uppercase mb-1">Select Category</label>
              <select
                className="w-full p-2 bg-white border border-slate-200 rounded-lg text-xs font-semibold text-slate-700"
                value={selectedCatId}
                onChange={(e) => handleCategoryChange(e.target.value)}
              >
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name} ({c.code})
                  </option>
                ))}
              </select>
            </div>

            {/* Asset Type Select */}
            <div className="flex-1 min-w-[200px]">
              <label className="block text-[9px] font-bold text-slate-400 uppercase mb-1">Select Asset Type</label>
              <select
                className="w-full p-2 bg-white border border-slate-200 rounded-lg text-xs font-semibold text-slate-700"
                value={selectedTypeId}
                onChange={(e) => setSelectedTypeId(e.target.value)}
              >
                {filteredTypes.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Save & Preview controls */}
            <div className="flex gap-3 pt-4">
              <button
                onClick={handleSaveConfig}
                disabled={isPending || !selectedTypeId}
                className="px-4 py-2 bg-[#0b4a6e] hover:bg-sky-850 text-white rounded-lg text-xs font-bold flex items-center gap-1.5"
              >
                Save Layout
              </button>
              <button
                onClick={() => setShowPreviewModal(true)}
                disabled={!selectedTypeId}
                className="px-4 py-2 border border-slate-200 text-slate-650 hover:bg-slate-50 bg-white rounded-lg text-xs font-bold flex items-center gap-1.5"
              >
                <Eye size={14} />
                Preview Form
              </button>
            </div>
          </div>

          {/* Configurator drag list */}
          <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm space-y-4">
            <div>
              <h3 className="text-xs font-extrabold text-[#0b4a6e] uppercase tracking-wide">
                Configured Fields for {(selectedType?.name || "Selected Type").toUpperCase()}
              </h3>
              <p className="text-[10px] text-slate-400 mt-1">
                Drag and drop fields to arrange registration layout. Enable checkboxes and configure visibility constraints.
              </p>
            </div>

            <div className="divide-y divide-slate-100 border border-slate-100 rounded-xl overflow-hidden">
              {localConfigs.map((cfg, idx) => {
                const isBuiltIn = ["name", "serialNumber", "purchaseCost", "purchaseDate", "usefulLife", "salvageValue", "fundingSource", "warrantyStartDate", "warrantyEndDate", "expiryDate"].includes(cfg.field.name);

                return (
                  <div
                    key={cfg.fieldId}
                    draggable
                    onDragStart={() => handleDragStart(idx)}
                    onDragOver={(e) => handleDragOver(e, idx)}
                    onDragEnd={handleDragEnd}
                    className={`p-3.5 bg-white flex flex-wrap md:flex-nowrap gap-4 items-center transition-all ${
                      draggingIdx === idx ? "opacity-40 bg-sky-50/20" : "hover:bg-slate-50/40"
                    } cursor-grab active:cursor-grabbing`}
                  >
                    {/* Index / Grip */}
                    <div className="flex items-center space-x-2 shrink-0">
                      <span className="text-[10px] text-slate-300 font-bold font-mono">#{cfg.displayOrder}</span>
                      <div className="flex flex-col gap-0.5 opacity-30">
                        <span className="w-3 h-0.5 bg-slate-800 rounded"></span>
                        <span className="w-3 h-0.5 bg-slate-800 rounded"></span>
                        <span className="w-3 h-0.5 bg-slate-800 rounded"></span>
                      </div>
                    </div>

                    {/* Field info */}
                    <div className="flex-1 min-w-[150px]">
                      <span className="text-xs font-bold text-slate-700 block">{cfg.field.label}</span>
                      <span className="text-[9px] text-slate-400 font-mono tracking-wider">
                        {cfg.field.name} • {cfg.field.fieldType} {isBuiltIn && "(Built-In)"}
                      </span>
                    </div>

                    {/* Enabled checkbox */}
                    <div className="flex items-center space-x-2 bg-slate-50 p-2 rounded-lg border border-slate-100">
                      <input
                        type="checkbox"
                        id={`enabled-${cfg.fieldId}`}
                        checked={cfg.isEnabled}
                        onChange={() => toggleConfigEnabled(cfg.fieldId)}
                        className="rounded border-slate-350 text-[#0b4a6e]"
                      />
                      <label htmlFor={`enabled-${cfg.fieldId}`} className="text-[10px] font-bold text-slate-500 uppercase select-none cursor-pointer">
                        Enabled
                      </label>
                    </div>

                    {/* Required checkbox */}
                    <div className="flex items-center space-x-2 bg-slate-50 p-2 rounded-lg border border-slate-100">
                      <input
                        type="checkbox"
                        id={`required-${cfg.fieldId}`}
                        checked={cfg.isRequired}
                        disabled={!cfg.isEnabled}
                        onChange={() => toggleConfigRequired(cfg.fieldId)}
                        className="rounded border-slate-350 text-[#0b4a6e]"
                      />
                      <label htmlFor={`required-${cfg.fieldId}`} className="text-[10px] font-bold text-slate-500 uppercase select-none cursor-pointer">
                        Required
                      </label>
                    </div>

                    {/* Default value override */}
                    <div className="w-[120px]">
                      <input
                        type="text"
                        placeholder="Default value"
                        disabled={!cfg.isEnabled}
                        className="w-full p-1.5 bg-slate-50 border border-slate-200 rounded text-[10px] focus:outline-none"
                        value={cfg.defaultValue || ""}
                        onChange={(e) => updateConfigDefault(cfg.fieldId, e.target.value)}
                      />
                    </div>

                    {/* Options list for select types */}
                    {(cfg.field.fieldType === "DROPDOWN" || cfg.field.fieldType === "RADIO") && (
                      <div className="w-[150px]">
                        <input
                          type="text"
                          placeholder="Options (comma-separated)"
                          disabled={!cfg.isEnabled}
                          className="w-full p-1.5 bg-slate-50 border border-slate-200 rounded text-[10px] focus:outline-none"
                          value={cfg.options || ""}
                          onChange={(e) => updateConfigOptions(cfg.fieldId, e.target.value)}
                        />
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
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

          <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm lg:col-span-2 space-y-4">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-100 text-[10px] text-slate-400 font-bold uppercase">
                    <th className="py-2">Order</th>
                    <th className="py-2">Code</th>
                    <th className="py-2">Name</th>
                    <th className="py-2">Status</th>
                    <th className="py-2 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50 text-xs">
                  {categories.map((c, idx) => (
                    <tr key={c.id}>
                      <td className="py-3">
                        <div className="flex items-center space-x-1.5">
                          <button
                            disabled={idx === 0}
                            onClick={() => handleCategoryOrder(c.id, "up", c.displayOrder)}
                            className="p-1 hover:bg-slate-100 rounded disabled:opacity-30"
                          >
                            <ArrowUp size={10} />
                          </button>
                          <button
                            disabled={idx === categories.length - 1}
                            onClick={() => handleCategoryOrder(c.id, "down", c.displayOrder)}
                            className="p-1 hover:bg-slate-100 rounded disabled:opacity-30"
                          >
                            <ArrowDown size={10} />
                          </button>
                        </div>
                      </td>
                      <td className="py-3 font-mono font-bold text-slate-800">{c.code}</td>
                      <td className="py-3 font-semibold text-slate-700">{c.name}</td>
                      <td className="py-3">
                        <button
                          onClick={() => handleToggleCategoryActive(c.id, c.isActive)}
                          className={`px-2 py-0.5 rounded-full text-[9px] font-bold ${
                            c.isActive ? "bg-emerald-50 text-emerald-700 border border-emerald-250" : "bg-red-50 text-red-700 border border-red-250"
                          }`}
                        >
                          {c.isActive ? "Active" : "Inactive"}
                        </button>
                      </td>
                      <td className="py-3 text-right">
                        <button
                          onClick={async () => {
                            if (confirm("Are you sure you want to delete this category?")) {
                              const res = await deleteCategoryAction(c.id);
                              if (res.error) alert(res.error);
                              else router.refresh();
                            }
                          }}
                          className="p-1 text-slate-400 hover:text-red-700"
                        >
                          <Trash2 size={12} />
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
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 animate-in fade-in duration-200">
          {/* Add Asset Type Form */}
          <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm h-fit">
            <h4 className="text-xs font-extrabold text-[#0b4a6e] uppercase pb-2 border-b border-slate-100 mb-4 flex items-center gap-1.5">
              <Plus size={14} className="text-[#0b4a6e]" />
              Add Asset Type
            </h4>
            <form onSubmit={handleCreateType} className="space-y-4 text-xs">
              <div>
                <label className="block text-[9px] font-bold text-slate-400 uppercase mb-1">Asset Type Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Laptop"
                  className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-[#0b4a6e]"
                  value={typeName}
                  onChange={(e) => setTypeName(e.target.value)}
                />
              </div>
              <div>
                <label className="block text-[9px] font-bold text-slate-400 uppercase mb-1">Asset Category *</label>
                <select
                  required
                  className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-semibold text-slate-700 focus:outline-none focus:ring-1 focus:ring-[#0b4a6e]"
                  value={typeCatId}
                  onChange={(e) => setTypeCatId(e.target.value)}
                >
                  {categories.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-[9px] font-bold text-slate-400 uppercase mb-1">Description</label>
                <textarea
                  placeholder="e.g. Portable computer used for university academic..."
                  className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg text-xs h-16 resize-none focus:outline-none focus:ring-1 focus:ring-[#0b4a6e]"
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
                    className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg text-xs focus:outline-none focus:ring-1 focus:ring-[#0b4a6e]"
                    value={typeIcon}
                    onChange={(e) => setTypeIcon(e.target.value)}
                  />
                </div>
                <div>
                  <label className="block text-[9px] font-bold text-slate-400 uppercase mb-1">Display Order *</label>
                  <input
                    type="number"
                    required
                    min="1"
                    className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-[#0b4a6e]"
                    value={typeDisplayOrder}
                    onChange={(e) => setTypeDisplayOrder(e.target.value)}
                  />
                </div>
              </div>
              <button
                type="submit"
                disabled={isPending}
                className="w-full py-2.5 bg-[#0b4a6e] hover:bg-sky-850 text-white rounded-lg text-xs font-bold transition-all shadow-md active:translate-y-0.5"
              >
                Save Asset Type
              </button>
            </form>
          </div>

          {/* Types Table and Filter Options */}
          <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm lg:col-span-2 space-y-4 h-fit">
            {/* Search and Filters Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 p-3 bg-slate-50 rounded-xl border border-slate-100">
              <div className="relative">
                <input
                  type="text"
                  placeholder="Search types..."
                  className="w-full p-1.5 pl-7 bg-white border border-slate-200 rounded-lg text-[11px] focus:outline-none"
                  value={typeSearch}
                  onChange={(e) => setTypeSearch(e.target.value)}
                />
                <Search size={12} className="absolute left-2.5 top-2.5 text-slate-400" />
              </div>
              <div>
                <select
                  className="w-full p-1.5 bg-white border border-slate-200 rounded-lg text-[11px] font-semibold text-slate-600 focus:outline-none"
                  value={typeCatFilter}
                  onChange={(e) => setTypeCatFilter(e.target.value)}
                >
                  <option value="">All Categories</option>
                  {categories.map((c) => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <select
                  className="w-full p-1.5 bg-white border border-slate-200 rounded-lg text-[11px] font-semibold text-slate-600 focus:outline-none"
                  value={typeStatusFilter}
                  onChange={(e) => setTypeStatusFilter(e.target.value)}
                >
                  <option value="">All Statuses</option>
                  <option value="active">Active Only</option>
                  <option value="inactive">Inactive Only</option>
                </select>
              </div>
              <div>
                <select
                  className="w-full p-1.5 bg-white border border-slate-200 rounded-lg text-[11px] font-semibold text-slate-600 focus:outline-none"
                  value={typeSortBy}
                  onChange={(e) => setTypeSortBy(e.target.value as "name" | "displayOrder")}
                >
                  <option value="name">Sort by Name</option>
                  <option value="displayOrder">Sort by Display Order</option>
                </select>
              </div>
            </div>

            {/* Detailed Table */}
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse min-w-[700px]">
                <thead>
                  <tr className="border-b border-slate-100 text-[10px] text-slate-400 font-bold uppercase">
                    <th className="py-2.5">Asset Type Name</th>
                    <th className="py-2.5">Category</th>
                    <th className="py-2.5">Description</th>
                    <th className="py-2.5 text-center">Fields</th>
                    <th className="py-2.5 text-center">Suppliers</th>
                    <th className="py-2.5 text-center">Order</th>
                    <th className="py-2.5">Created Date</th>
                    <th className="py-2.5">Status</th>
                    <th className="py-2.5 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50 text-xs">
                  {detailedFilteredTypes.length === 0 ? (
                    <tr>
                      <td colSpan={9} className="py-6 text-center text-slate-400 font-semibold">
                        No asset types match your search criteria.
                      </td>
                    </tr>
                  ) : (
                    detailedFilteredTypes.map((t) => {
                      const cat = categories.find((c) => c.id === t.categoryId);
                      const fieldsCount = t.formFields?.length || 0;
                      const suppliersCount = t.supplierAssignments?.length || 0;
                      return (
                        <tr key={t.id} className="hover:bg-slate-50/50 transition-colors">
                          <td className="py-3 pr-2">
                            <span className="font-bold text-slate-800 block">{t.name}</span>
                            {t.icon && <span className="text-[9px] font-mono text-slate-400">Icon: {t.icon}</span>}
                          </td>
                          <td className="py-3 font-semibold text-slate-500">{cat?.name || "N/A"}</td>
                          <td className="py-3 text-slate-400 truncate max-w-[120px] font-medium" title={t.description || ""}>
                            {t.description || "—"}
                          </td>
                          <td className="py-3 text-center">
                            <span className="px-1.5 py-0.5 rounded bg-blue-50 text-blue-700 font-bold text-[9px] border border-blue-100">
                              {fieldsCount}
                            </span>
                          </td>
                          <td className="py-3 text-center">
                            <span className="px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-700 font-bold text-[9px] border border-emerald-100">
                              {suppliersCount}
                            </span>
                          </td>
                          <td className="py-3 text-center font-bold text-slate-600">{t.displayOrder}</td>
                          <td className="py-3 text-slate-400">
                            {t.createdAt ? new Date(t.createdAt).toLocaleDateString() : "—"}
                          </td>
                          <td className="py-3">
                            <button
                              onClick={() => handleToggleTypeActive(t.id, t.isActive)}
                              className={`px-2 py-0.5 rounded-full text-[9px] font-bold border transition-colors ${
                                t.isActive
                                  ? "bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100"
                                  : "bg-red-50 text-red-700 border-red-200 hover:bg-red-100"
                              }`}
                            >
                              {t.isActive ? "Active" : "Inactive"}
                            </button>
                          </td>
                          <td className="py-3 text-right">
                            <div className="flex items-center justify-end space-x-1.5">
                              {/* View Action */}
                              <button
                                onClick={() => setViewingAssetType(t)}
                                className="p-1 text-slate-400 hover:text-[#0b4a6e] hover:bg-slate-100 rounded transition-colors"
                                title="View Details"
                              >
                                <Eye size={12} />
                              </button>
                              {/* Edit Action */}
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
                                className="p-1 text-slate-400 hover:text-yellow-600 hover:bg-slate-100 rounded transition-colors"
                                title="Edit Type Details"
                              >
                                <Pencil size={12} />
                              </button>
                              {/* Configure Fields Action */}
                              <button
                                onClick={() => {
                                  setSelectedCatId(t.categoryId);
                                  setSelectedTypeId(t.id);
                                  setActivePanel("form-config");
                                }}
                                className="p-1 text-slate-400 hover:text-sky-700 hover:bg-slate-100 rounded transition-colors"
                                title="Configure Fields Layout"
                              >
                                <LinkIcon size={12} />
                              </button>
                              {/* Delete Action */}
                              <button
                                onClick={async () => {
                                  if (confirm("Are you sure you want to delete this asset type?")) {
                                    const res = await deleteAssetTypeAction(t.id);
                                    if (res.error) alert(res.error);
                                    else router.refresh();
                                  }
                                }}
                                className="p-1 text-slate-400 hover:text-red-700 hover:bg-slate-100 rounded transition-colors"
                                title="Delete"
                              >
                                <Trash2 size={12} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* 4. CUSTOM FIELDS PANEL */}
      {activePanel === "custom-fields" && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm h-fit">
            <h4 className="text-xs font-extrabold text-[#0b4a6e] uppercase pb-2 border-b border-slate-100 mb-4">
              Add Field Builder
            </h4>
            <form onSubmit={handleAddFieldSubmit} className="space-y-4">
              <div>
                <label className="block text-[9px] font-bold text-slate-400 uppercase mb-1">Field Name (ID)</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. processor"
                  className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg text-xs"
                  value={fieldName}
                  onChange={(e) => setFieldName(e.target.value)}
                />
              </div>
              <div>
                <label className="block text-[9px] font-bold text-slate-400 uppercase mb-1">Display Label</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. CPU Processor"
                  className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg text-xs"
                  value={fieldLabel}
                  onChange={(e) => setFieldLabel(e.target.value)}
                />
              </div>
              <div>
                <label className="block text-[9px] font-bold text-slate-400 uppercase mb-1">Field Type</label>
                <select
                  required
                  className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-semibold text-slate-700"
                  value={fieldType}
                  onChange={(e) => setFieldType(e.target.value)}
                >
                  <option value="TEXT">Short Text</option>
                  <option value="TEXTAREA">Textarea / Paragraph</option>
                  <option value="NUMBER">Number</option>
                  <option value="DECIMAL">Decimal</option>
                  <option value="DATE">Date</option>
                  <option value="BOOLEAN">Boolean / Yes-No</option>
                  <option value="CHECKBOX">Checkbox</option>
                  <option value="RADIO">Radio Buttons</option>
                  <option value="DROPDOWN">Dropdown Selector</option>
                  <option value="FILE_UPLOAD">File / Image Upload</option>
                </select>
              </div>
              <div>
                <label className="block text-[9px] font-bold text-slate-400 uppercase mb-1">Placeholder</label>
                <input
                  type="text"
                  placeholder="e.g. Choose CPU..."
                  className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg text-xs"
                  value={fieldPlaceholder}
                  onChange={(e) => setFieldPlaceholder(e.target.value)}
                />
              </div>
              <div>
                <label className="block text-[9px] font-bold text-slate-400 uppercase mb-1">Dropdown/Radio Options (Comma-separated)</label>
                <input
                  type="text"
                  placeholder="e.g. Intel i5,Intel i7"
                  className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg text-xs"
                  value={fieldOptions}
                  onChange={(e) => setFieldOptions(e.target.value)}
                />
              </div>
              <button
                type="submit"
                disabled={isPending}
                className="w-full py-2 bg-[#0b4a6e] hover:bg-sky-850 text-white rounded-lg text-xs font-bold"
              >
                Create Field
              </button>
            </form>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm lg:col-span-2 space-y-4">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-100 text-[10px] text-slate-400 font-bold uppercase">
                    <th className="py-2">Identifier</th>
                    <th className="py-2">Label</th>
                    <th className="py-2">Field Type</th>
                    <th className="py-2">Status</th>
                    <th className="py-2 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50 text-xs">
                  {initialFields.map((f) => (
                    <tr key={f.id}>
                      <td className="py-3 font-mono text-slate-500">{f.name}</td>
                      <td className="py-3 font-bold text-slate-800">{f.label}</td>
                      <td className="py-3 uppercase text-[10px] font-extrabold text-[#0b4a6e]">{f.fieldType}</td>
                      <td className="py-3">
                        <button
                          onClick={() => handleToggleFieldActive(f.id, f.isActive)}
                          className={`px-2 py-0.5 rounded-full text-[9px] font-bold ${
                            f.isActive ? "bg-emerald-50 text-emerald-700 border border-emerald-250" : "bg-red-50 text-red-700 border border-red-250"
                          }`}
                        >
                          {f.isActive ? "Active" : "Inactive"}
                        </button>
                      </td>
                      <td className="py-3 text-right">
                        <button
                          onClick={async () => {
                            if (confirm("Are you sure you want to delete this dynamic field?")) {
                              const res = await deleteFieldAction(f.id);
                              if (res.error) alert(res.error);
                              else router.refresh();
                            }
                          }}
                          className="p-1 text-slate-400 hover:text-red-700"
                        >
                          <Trash2 size={12} />
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

      {/* 5. SUPPLIERS PANEL */}
      {activePanel === "suppliers" && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm h-fit">
            <h4 className="text-xs font-extrabold text-[#0b4a6e] uppercase pb-2 border-b border-slate-100 mb-4">
              Add Supplier Scope
            </h4>
            <form onSubmit={handleCreateSupplierSubmit} className="space-y-4">
              <div>
                <label className="block text-[9px] font-bold text-slate-400 uppercase mb-1">Supplier Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. IT Technology PLC"
                  className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg text-xs"
                  value={supName}
                  onChange={(e) => setSupName(e.target.value)}
                />
              </div>
              <div>
                <label className="block text-[9px] font-bold text-slate-400 uppercase mb-1">Contact Person</label>
                <input
                  type="text"
                  placeholder="e.g. Daniel Chala"
                  className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg text-xs"
                  value={supContact}
                  onChange={(e) => setSupContact(e.target.value)}
                />
              </div>
              <div>
                <label className="block text-[9px] font-bold text-slate-400 uppercase mb-1">Email</label>
                <input
                  type="email"
                  placeholder="e.g. daniel@it.com"
                  className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg text-xs"
                  value={supEmail}
                  onChange={(e) => setSupEmail(e.target.value)}
                />
              </div>
              <button
                type="submit"
                disabled={isPending}
                className="w-full py-2 bg-[#0b4a6e] hover:bg-sky-850 text-white rounded-lg text-xs font-bold"
              >
                Create Supplier
              </button>
            </form>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm lg:col-span-2 space-y-4">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-100 text-[10px] text-slate-400 font-bold uppercase">
                    <th className="py-2">Supplier Name</th>
                    <th className="py-2">Assignments Scope</th>
                    <th className="py-2">Status</th>
                    <th className="py-2 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50 text-xs">
                  {initialSuppliers.map((s) => {
                    const currentAssignments = initialSupplierAssignments.filter(
                      (sa) => sa.supplierId === s.id
                    );

                    return (
                      <tr key={s.id}>
                        <td className="py-3 font-bold text-slate-800">{s.name}</td>
                        <td className="py-3">
                          <div className="flex flex-wrap gap-1 max-w-[250px]">
                            {currentAssignments.length === 0 ? (
                              <span className="text-[10px] text-slate-400 font-semibold italic">Global (Unassigned)</span>
                            ) : (
                              currentAssignments.map((a) => {
                                const cName = categories.find((c) => c.id === a.categoryId)?.name || "";
                                const tName = assetTypes.find((t) => t.id === a.assetTypeId)?.name || "";
                                return (
                                  <span
                                    key={a.id}
                                    className="inline-flex items-center gap-1 bg-sky-50 text-[#0b4a6e] text-[9px] font-bold px-2 py-0.5 rounded border border-sky-100"
                                  >
                                    {tName ? `${cName} → ${tName}` : cName}
                                    <button
                                      onClick={() => handleRemoveSupplierAssignment(s.id, a.id)}
                                      className="text-red-600 hover:text-red-800 font-extrabold ml-1"
                                    >
                                      ×
                                    </button>
                                  </span>
                                );
                              })
                            )}
                          </div>
                        </td>
                        <td className="py-3">
                          <button
                            onClick={() => handleToggleSupplierActive(s.id, s.isActive)}
                            className={`px-2 py-0.5 rounded-full text-[9px] font-bold ${
                              s.isActive ? "bg-emerald-50 text-emerald-700 border border-emerald-250" : "bg-red-50 text-red-700 border border-red-250"
                            }`}
                          >
                            {s.isActive ? "Active" : "Inactive"}
                          </button>
                        </td>
                        <td className="py-3 text-right">
                          <div className="flex justify-end space-x-1.5">
                            <button
                              onClick={() => setShowAssignSupplierModal(s)}
                              className="p-1 bg-slate-50 border border-slate-200 rounded text-slate-650 hover:bg-sky-50 hover:text-[#0b4a6e]"
                              title="Assign supplier scopes"
                            >
                              <LinkIcon size={12} />
                            </button>
                            <button
                              onClick={async () => {
                                if (confirm("Are you sure?")) {
                                  const res = await deleteSupplierAction(s.id);
                                  if (res.error) alert(res.error);
                                  else router.refresh();
                                }
                              }}
                              className="p-1 text-slate-400 hover:text-red-700"
                            >
                              <Trash2 size={12} />
                            </button>
                          </div>
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

      {/* MODAL: ASSIGN SUPPLIER */}
      {showAssignSupplierModal && (
        <div className="fixed inset-0 bg-sky-950/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
            <div className="p-4 border-b border-slate-100 bg-[#0b4a6e] text-white flex justify-between items-center">
              <h3 className="text-xs font-extrabold uppercase tracking-widest">
                Assign Supplier: {showAssignSupplierModal.name}
              </h3>
              <button onClick={() => setShowAssignSupplierModal(null)} className="text-white hover:text-slate-200">
                ×
              </button>
            </div>
            <form onSubmit={handleAssignSupplierSubmit} className="p-5 space-y-4">
              <div>
                <label className="block text-[9px] font-bold text-slate-400 uppercase mb-1">Assign to Category</label>
                <select
                  required
                  className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg text-xs"
                  value={assignCatId}
                  onChange={(e) => {
                    setAssignCatId(e.target.value);
                    setAssignTypeId("");
                  }}
                >
                  <option value="">-- Choose Category --</option>
                  {categories.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[9px] font-bold text-slate-400 uppercase mb-1">Assign to Asset Type (Optional)</label>
                <select
                  className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg text-xs"
                  value={assignTypeId}
                  onChange={(e) => setAssignTypeId(e.target.value)}
                  disabled={!assignCatId}
                >
                  <option value="">-- All Types --</option>
                  {assetTypes
                    .filter((t) => t.categoryId === assignCatId)
                    .map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.name}
                      </option>
                    ))}
                </select>
              </div>

              <div className="flex gap-3 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowAssignSupplierModal(null)}
                  className="flex-1 py-2 border border-slate-200 text-slate-500 rounded-lg text-xs font-bold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isPending}
                  className="flex-1 py-2 bg-[#0b4a6e] text-white rounded-lg text-xs font-bold"
                >
                  Save Assignment
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: REGISTRATION FORM PREVIEW (Section 14) */}
      {showPreviewModal && (
        <div className="fixed inset-0 bg-sky-950/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl overflow-hidden max-h-[85vh] flex flex-col">
            <div className="p-4 border-b border-slate-100 bg-[#0b4a6e] text-white flex justify-between items-center">
              <h3 className="text-xs font-extrabold uppercase tracking-widest flex items-center gap-2">
                <Maximize2 size={12} />
                Live Form Layout Preview
              </h3>
              <button onClick={() => setShowPreviewModal(false)} className="text-white hover:text-slate-200 text-lg font-bold">
                ×
              </button>
            </div>
            
            <div className="p-6 overflow-y-auto flex-1 bg-slate-50/50 space-y-6">
              <div className="bg-white p-4 rounded-xl border border-slate-200/60 shadow-sm flex items-center justify-between">
                <div>
                  <span className="text-[10px] text-slate-400 font-extrabold uppercase">Previewing Layout For</span>
                  <div className="text-sm font-extrabold text-[#0b4a6e] mt-0.5">
                    {selectedCategory?.name} → {selectedType?.name}
                  </div>
                </div>
                <div className="text-[9px] font-bold text-slate-400 bg-slate-100 border border-slate-250 px-2.5 py-1 rounded-full uppercase">
                  {activeFields.length} Configured Fields
                </div>
              </div>

              {/* Dynamic form preview mock render */}
              <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {activeFields.map((cfg) => {
                    const isRequired = cfg.isRequired;
                    const f = cfg.field;

                    return (
                      <div key={f.id} className={f.fieldType === "TEXTAREA" ? "col-span-2" : ""}>
                        <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">
                          {f.label} {isRequired && <span className="text-red-500">*</span>}
                        </label>

                        {/* Rendering by field type */}
                        {f.fieldType === "TEXT" && (
                          <input
                            type="text"
                            disabled
                            placeholder={f.placeholder || `Enter ${f.label.toLowerCase()}...`}
                            defaultValue={cfg.defaultValue || ""}
                            className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg text-xs"
                          />
                        )}

                        {f.fieldType === "TEXTAREA" && (
                          <textarea
                            disabled
                            placeholder={f.placeholder || `Enter ${f.label.toLowerCase()}...`}
                            defaultValue={cfg.defaultValue || ""}
                            className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg text-xs h-16 resize-none"
                          />
                        )}

                        {f.fieldType === "NUMBER" && (
                          <input
                            type="number"
                            disabled
                            placeholder={f.placeholder || "0"}
                            defaultValue={cfg.defaultValue || ""}
                            className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-mono"
                          />
                        )}

                        {f.fieldType === "DECIMAL" && (
                          <input
                            type="text"
                            disabled
                            placeholder={f.placeholder || "0.00"}
                            defaultValue={cfg.defaultValue || ""}
                            className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-mono"
                          />
                        )}

                        {f.fieldType === "DATE" && (
                          <input
                            type="date"
                            disabled
                            className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg text-xs"
                          />
                        )}

                        {f.fieldType === "BOOLEAN" && (
                          <select disabled className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-semibold text-slate-600">
                            <option value="">-- Choose Option --</option>
                            <option value="Yes">Yes</option>
                            <option value="No">No</option>
                          </select>
                        )}

                        {f.fieldType === "CHECKBOX" && (
                          <div className="flex items-center space-x-2 p-2 bg-slate-50 rounded-lg border border-slate-100">
                            <input type="checkbox" disabled className="rounded border-slate-350" />
                            <span className="text-xs text-slate-650 font-medium">Toggle state</span>
                          </div>
                        )}

                        {f.fieldType === "RADIO" && (
                          <div className="flex flex-wrap gap-3 p-1">
                            {(cfg.options || f.options || "Option A,Option B").split(",").map((o) => (
                              <label key={o} className="flex items-center space-x-1.5 text-xs text-slate-600 cursor-pointer">
                                <input type="radio" disabled name={`preview-radio-${f.id}`} className="text-[#0b4a6e]" />
                                <span>{o}</span>
                              </label>
                            ))}
                          </div>
                        )}

                        {f.fieldType === "DROPDOWN" && (
                          <select disabled className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-semibold text-slate-600">
                            <option value="">-- Select {f.label} --</option>
                            {/* Special case: suppliers */}
                            {f.name === "supplier" ? (
                              activeSuppliers.map((s) => (
                                <option key={s.id} value={s.id}>
                                  {s.name}
                                </option>
                              ))
                            ) : (
                              (cfg.options || f.options || "Option A,Option B").split(",").map((o) => (
                                <option key={o} value={o}>
                                  {o}
                                </option>
                              ))
                            )}
                          </select>
                        )}

                        {f.fieldType === "FILE_UPLOAD" && (
                          <div className="border border-dashed border-slate-200 p-3 bg-slate-50 rounded-lg text-center text-xs text-slate-400">
                            Attachment File / Image Upload Slot
                          </div>
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

      {/* View Modal */}
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
              <div className="grid grid-cols-2 gap-4 border-t border-slate-100 pt-4">
                <div>
                  <span className="block text-[9px] font-bold text-slate-400 uppercase">Configured Fields</span>
                  <span className="text-[#0b4a6e] font-extrabold text-sm">{viewingAssetType.formFields?.length || 0} Fields</span>
                </div>
                <div>
                  <span className="block text-[9px] font-bold text-slate-400 uppercase">Assigned Suppliers</span>
                  <span className="text-[#0b4a6e] font-extrabold text-sm">{viewingAssetType.supplierAssignments?.length || 0} Suppliers</span>
                </div>
              </div>
            </div>
            <div className="bg-slate-50 px-6 py-3 border-t border-slate-100 flex justify-end">
              <button onClick={() => setViewingAssetType(null)} className="px-4 py-1.5 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-lg text-xs font-bold transition-all">Close</button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Modal */}
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
                    className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-[#0b4a6e]"
                    value={editTypeName}
                    onChange={(e) => setEditTypeName(e.target.value)}
                  />
                </div>
                <div>
                  <label className="block text-[9px] font-bold text-slate-400 uppercase mb-1">Asset Category *</label>
                  <select
                    required
                    className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-semibold text-slate-700 focus:outline-none focus:ring-1 focus:ring-[#0b4a6e]"
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
                    className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg text-xs h-16 resize-none focus:outline-none focus:ring-1 focus:ring-[#0b4a6e]"
                    value={editTypeDesc}
                    onChange={(e) => setEditTypeDesc(e.target.value)}
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[9px] font-bold text-slate-400 uppercase mb-1">Icon Name</label>
                    <input
                      type="text"
                      placeholder="e.g. Monitor"
                      className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg text-xs focus:outline-none focus:ring-1 focus:ring-[#0b4a6e]"
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
                      className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-[#0b4a6e]"
                      value={editTypeDisplayOrder}
                      onChange={(e) => setEditTypeDisplayOrder(e.target.value)}
                    />
                  </div>
                </div>
                <div className="flex items-center space-x-2 pt-2">
                  <input
                    type="checkbox"
                    id="editTypeIsActive"
                    className="w-4 h-4 text-[#0b4a6e] border-slate-200 rounded focus:ring-[#0b4a6e]"
                    checked={editTypeIsActive}
                    onChange={(e) => setEditTypeIsActive(e.target.checked)}
                  />
                  <label htmlFor="editTypeIsActive" className="text-xs font-bold text-slate-700 select-none">Active / Available for new registrations</label>
                </div>
              </div>
              <div className="bg-slate-50 px-6 py-3 border-t border-slate-100 flex justify-end space-x-2">
                <button type="button" onClick={() => setEditingAssetType(null)} className="px-4 py-1.5 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-lg text-xs font-bold transition-all">Cancel</button>
                <button type="submit" disabled={isPending} className="px-4 py-1.5 bg-[#0b4a6e] hover:bg-sky-850 text-white rounded-lg text-xs font-bold transition-all">Save Changes</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
