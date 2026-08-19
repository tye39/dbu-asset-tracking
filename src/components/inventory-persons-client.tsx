"use client";

import React, { useState, useTransition } from "react";
import Link from "next/link";
import {
  registerInventoryPersonAction,
  updateInventoryPersonAction,
  toggleInventoryPersonAction
} from "@/app/actions/inventory-person";
import {
  Search,
  Plus,
  ShieldCheck,
  UserCheck,
  Eye,
  Edit2,
  ToggleLeft,
  ToggleRight,
  XCircle,
  Info,
  Loader2,
  ClipboardList
} from "lucide-react";

interface AssignmentInfo {
  id: string;
  sessionNumber: string;
  status: string;
  departmentName: string;
  verifiedCount: number;
}

interface RegisteredPerson {
  id: string;
  userId: string;
  isActive: boolean;
  registeredAt: string;
  user: {
    name: string;
    username: string;
    email: string;
    roleName: string;
    departmentId: string;
    departmentName: string;
    phoneNumber: string;
    employeeId: string;
  };
  registeredBy: {
    name: string;
  };
  assignments: AssignmentInfo[];
}

interface DepartmentOption {
  id: string;
  name: string;
  code: string;
}

interface InventoryPersonsClientProps {
  registeredPersons: RegisteredPerson[];
  departments: DepartmentOption[];
}

export function InventoryPersonsClient({
  registeredPersons,
  departments
}: InventoryPersonsClientProps) {
  const [isPending, startTransition] = useTransition();

  // Search & Filter state for registered table
  const [searchTerm, setSearchTerm] = useState("");

  // Registration Modal states
  const [showRegModal, setShowRegModal] = useState(false);
  const [fullName, setFullName] = useState("");
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [departmentId, setDepartmentId] = useState("");
  const [employeeId, setEmployeeId] = useState("");
  const [isActive, setIsActive] = useState(true);
  const [modalError, setModalError] = useState<string | null>(null);

  // Edit Modal states
  const [showEditModal, setShowEditModal] = useState(false);
  const [editPersonId, setEditPersonId] = useState("");
  const [editFullName, setEditFullName] = useState("");
  const [editUsername, setEditUsername] = useState("");
  const [editEmail, setEditEmail] = useState("");
  const [editPhoneNumber, setEditPhoneNumber] = useState("");
  const [editPassword, setEditPassword] = useState("");
  const [editConfirmPassword, setEditConfirmPassword] = useState("");
  const [editDepartmentId, setEditDepartmentId] = useState("");
  const [editEmployeeId, setEditEmployeeId] = useState("");
  const [editIsActive, setEditIsActive] = useState(true);
  const [editModalError, setEditModalError] = useState<string | null>(null);

  // Inspector details states
  const [selectedPerson, setSelectedPerson] = useState<RegisteredPerson | null>(null);

  // Search filtered registered lists
  const filteredPersons = registeredPersons.filter((p) => {
    const term = searchTerm.toLowerCase();
    return (
      p.user.name.toLowerCase().includes(term) ||
      p.user.username.toLowerCase().includes(term) ||
      p.user.email.toLowerCase().includes(term) ||
      p.user.departmentName.toLowerCase().includes(term) ||
      p.user.employeeId.toLowerCase().includes(term)
    );
  });

  const handleRegisterSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (password !== confirmPassword) {
      setModalError("Passwords do not match.");
      return;
    }

    setModalError(null);
    startTransition(async () => {
      const res = await registerInventoryPersonAction({
        fullName,
        username,
        email,
        phoneNumber: phoneNumber || undefined,
        password,
        departmentId,
        employeeId: employeeId || undefined,
        isActive
      });

      if (res.error) {
        setModalError(res.error);
      } else {
        setShowRegModal(false);
        // Reset fields
        setFullName("");
        setUsername("");
        setEmail("");
        setPhoneNumber("");
        setPassword("");
        setConfirmPassword("");
        setDepartmentId("");
        setEmployeeId("");
        setIsActive(true);
        alert("Inventory Person account created successfully!");
      }
    });
  };

  const openEditModal = (person: RegisteredPerson) => {
    setEditModalError(null);
    setEditPersonId(person.id);
    setEditFullName(person.user.name);
    setEditUsername(person.user.username);
    setEditEmail(person.user.email);
    setEditPhoneNumber(person.user.phoneNumber || "");
    setEditPassword("");
    setEditConfirmPassword("");
    setEditDepartmentId(person.user.departmentId);
    setEditEmployeeId(person.user.employeeId || "");
    setEditIsActive(person.isActive);
    setShowEditModal(true);
  };

  const handleEditSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (editPassword && editPassword !== editConfirmPassword) {
      setEditModalError("Passwords do not match.");
      return;
    }

    setEditModalError(null);
    startTransition(async () => {
      const res = await updateInventoryPersonAction(editPersonId, {
        fullName: editFullName,
        username: editUsername,
        email: editEmail,
        phoneNumber: editPhoneNumber || undefined,
        password: editPassword || undefined,
        departmentId: editDepartmentId,
        employeeId: editEmployeeId || undefined,
        isActive: editIsActive
      });

      if (res.error) {
        setEditModalError(res.error);
      } else {
        setShowEditModal(false);
        alert("Inventory Person details updated successfully!");
      }
    });
  };

  const handleToggleStatus = (id: string, currentStatus: boolean) => {
    if (!confirm(`Are you sure you want to ${currentStatus ? "deactivate" : "activate"} this Inventory Person?`)) {
      return;
    }

    startTransition(async () => {
      const res = await toggleInventoryPersonAction(id, !currentStatus);
      if (res.error) {
        alert(res.error);
      } else {
        alert(`Inventory Person status updated successfully!`);
        if (selectedPerson && selectedPerson.id === id) {
          setSelectedPerson(prev => prev ? { ...prev, isActive: !currentStatus } : null);
        }
      }
    });
  };

  return (
    <div className="space-y-6">
      
      {/* Title */}
      <div className="border-b border-sky-100 pb-4 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-sky-950 flex items-center gap-2">
            <UserCheck className="text-sky-700" />
            <span>Manage Inventory Persons</span>
          </h2>
          <p className="text-xs text-sky-600 font-semibold mt-1">
            Register and manage dedicated physical asset inventory counters.
          </p>
        </div>

        <button
          onClick={() => {
            setModalError(null);
            setShowRegModal(true);
          }}
          className="px-4 py-2 bg-[#0b4a6e] hover:bg-sky-855 text-white rounded-lg text-xs font-bold transition-all shadow-sm flex items-center gap-1.5 shrink-0 self-start md:self-auto"
        >
          <Plus size={14} />
          Register Inventory Person
        </button>
      </div>

      {/* Main List & Search Bar */}
      <div className="bg-white border border-slate-100 rounded-2xl p-5 shadow-sm space-y-4">
        
        {/* Search */}
        <div className="relative max-w-md">
          <Search size={14} className="absolute left-3 top-3 text-slate-400" />
          <input
            type="text"
            placeholder="Search registered counters by name, username, email, department..."
            className="w-full p-2 pl-9 bg-slate-50 border border-slate-200 rounded-lg text-xs font-semibold focus:outline-none focus:border-sky-500"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        {/* Table list */}
        <div className="bg-white border border-slate-100 rounded-xl overflow-hidden shadow-sm">
          {filteredPersons.length === 0 ? (
            <div className="text-center py-12 text-slate-400 text-xs font-semibold">
              No registered Inventory Persons found matching criteria.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-slate-100 text-[10px] font-extrabold text-slate-400 uppercase bg-slate-50/50">
                    <th className="py-3 px-4">Name & Email</th>
                    <th className="py-3 px-4">Username</th>
                    <th className="py-3 px-4">Employee ID</th>
                    <th className="py-3 px-4">Department Unit</th>
                    <th className="py-3 px-4 text-center">Status</th>
                    <th className="py-3 px-4">Registered Date</th>
                    <th className="py-3 px-4 text-center">Tasks Count</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredPersons.map((person) => {
                    const activeTasks = person.assignments.filter(a => a.status === "ASSIGNED" || a.status === "IN_PROGRESS" || a.status === "REOPENED").length;
                    
                    return (
                      <tr key={person.id} className="border-b border-slate-50 hover:bg-slate-50/30 text-slate-650 transition-colors">
                        <td className="py-3.5 px-4">
                          <p className="font-bold text-slate-800">{person.user.name}</p>
                          <p className="text-[10px] text-slate-450">{person.user.email}</p>
                        </td>
                        <td className="py-3.5 px-4 font-mono font-semibold text-slate-700">
                          {person.user.username}
                        </td>
                        <td className="py-3.5 px-4 font-semibold text-slate-600">
                          {person.user.employeeId || "-"}
                        </td>
                        <td className="py-3.5 px-4 font-semibold text-slate-700">
                          {person.user.departmentName}
                        </td>
                        <td className="py-3.5 px-4 text-center">
                          <span className={`inline-block px-2 py-0.5 rounded text-[9px] font-bold border ${
                            person.isActive
                              ? "bg-emerald-50 text-emerald-700 border-emerald-150"
                              : "bg-red-50 text-red-700 border-red-150"
                          }`}>
                            {person.isActive ? "Active" : "Inactive"}
                          </span>
                        </td>
                        <td className="py-3.5 px-4 font-medium text-slate-500">
                          {new Date(person.registeredAt).toLocaleDateString()}
                        </td>
                        <td className="py-3.5 px-4 text-center font-bold text-slate-850">
                          {activeTasks} Active / {person.assignments.length} Total
                        </td>
                        <td className="py-3.5 px-4 text-right flex items-center justify-end space-x-1">
                          <button
                            onClick={() => setSelectedPerson(person)}
                            className="p-1.5 text-sky-700 hover:text-sky-900 rounded hover:bg-sky-50 transition-all"
                            title="Inspect Assignments"
                          >
                            <Eye size={14} />
                          </button>
                          <button
                            onClick={() => openEditModal(person)}
                            className="p-1.5 text-slate-700 hover:text-slate-900 rounded hover:bg-slate-50 transition-all"
                            title="Edit Account Details"
                          >
                            <Edit2 size={13} />
                          </button>
                          <button
                            disabled={isPending}
                            onClick={() => handleToggleStatus(person.id, person.isActive)}
                            className={`p-1.5 rounded transition-all ${
                              person.isActive
                                ? "text-amber-600 hover:text-amber-800 hover:bg-amber-50"
                                : "text-emerald-600 hover:text-emerald-800 hover:bg-emerald-50"
                            }`}
                            title={person.isActive ? "Deactivate User" : "Activate User"}
                          >
                            {person.isActive ? <ToggleRight size={18} /> : <ToggleLeft size={18} />}
                          </button>
                          <Link
                            href="/pao/inventory"
                            className="p-1.5 text-emerald-700 hover:text-emerald-905 rounded hover:bg-emerald-50 transition-all"
                            title="Assign Inventory Session"
                          >
                            <ClipboardList size={14} />
                          </Link>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* REGISTER NEW INVENTORY PERSON MODAL */}
      {showRegModal && (
        <div className="fixed inset-0 bg-slate-900/60 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
          <div className="bg-white rounded-2xl w-full max-w-lg shadow-2xl p-6 border border-slate-150 space-y-4">
            
            {/* Header */}
            <div className="flex justify-between items-start border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-sm font-bold text-slate-800 flex items-center gap-1.5">
                  <ShieldCheck size={16} className="text-[#0b4a6e]" />
                  <span>Register Inventory Person</span>
                </h3>
                <p className="text-[10px] text-slate-400 font-semibold mt-1">
                  Create an authorized account for physical asset inventory verification.
                </p>
              </div>
              <button
                onClick={() => setShowRegModal(false)}
                className="text-slate-450 hover:text-slate-650 text-sm font-bold hover:bg-slate-100 px-2.5 py-1 rounded-lg"
              >
                ✕
              </button>
            </div>

            {/* Error alerts */}
            {modalError && (
              <div className="p-3 bg-red-50 border border-red-155 rounded-xl text-red-800 text-[11px] font-semibold flex items-center gap-2">
                <XCircle size={14} className="shrink-0" />
                <span>{modalError}</span>
              </div>
            )}

            <form onSubmit={handleRegisterSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-3.5">
                {/* Full Name */}
                <div className="space-y-1">
                  <label className="block text-[10px] font-bold text-slate-500 uppercase">
                    Full Name *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Abreham Kebede"
                    className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-semibold focus:outline-none"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                  />
                </div>

                {/* Username */}
                <div className="space-y-1">
                  <label className="block text-[10px] font-bold text-slate-500 uppercase">
                    Username *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. abreham_k"
                    className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-semibold focus:outline-none"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                  />
                </div>

                {/* Email */}
                <div className="space-y-1">
                  <label className="block text-[10px] font-bold text-slate-500 uppercase">
                    Email Address *
                  </label>
                  <input
                    type="email"
                    required
                    placeholder="e.g. abreham@dbu.edu.et"
                    className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-semibold focus:outline-none"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                  />
                </div>

                {/* Phone Number */}
                <div className="space-y-1">
                  <label className="block text-[10px] font-bold text-slate-500 uppercase">
                    Phone Number
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. +251912345678"
                    className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-semibold focus:outline-none"
                    value={phoneNumber}
                    onChange={(e) => setPhoneNumber(e.target.value)}
                  />
                </div>

                {/* Password */}
                <div className="space-y-1">
                  <label className="block text-[10px] font-bold text-slate-500 uppercase">
                    Password *
                  </label>
                  <input
                    type="password"
                    required
                    placeholder="Min 6 characters"
                    className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-semibold focus:outline-none"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                  />
                </div>

                {/* Confirm Password */}
                <div className="space-y-1">
                  <label className="block text-[10px] font-bold text-slate-500 uppercase">
                    Confirm Password *
                  </label>
                  <input
                    type="password"
                    required
                    placeholder="Re-enter password"
                    className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-semibold focus:outline-none"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                  />
                </div>

                {/* Department Select */}
                <div className="space-y-1 col-span-2">
                  <label className="block text-[10px] font-bold text-slate-500 uppercase">
                    Department / Organizational Unit *
                  </label>
                  <select
                    required
                    className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-semibold text-slate-700 focus:outline-none"
                    value={departmentId}
                    onChange={(e) => setDepartmentId(e.target.value)}
                  >
                    <option value="">-- Select Department --</option>
                    {departments.map((dept) => (
                      <option key={dept.id} value={dept.id}>
                        {dept.name} ({dept.code})
                      </option>
                    ))}
                  </select>
                </div>

                {/* Employee ID */}
                <div className="space-y-1">
                  <label className="block text-[10px] font-bold text-slate-500 uppercase">
                    Employee ID
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. EMP-9824"
                    className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-semibold focus:outline-none"
                    value={employeeId}
                    onChange={(e) => setEmployeeId(e.target.value)}
                  />
                </div>

                {/* Active Status */}
                <div className="space-y-1">
                  <label className="block text-[10px] font-bold text-slate-500 uppercase">
                    Status
                  </label>
                  <select
                    className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-semibold text-slate-700 focus:outline-none"
                    value={isActive ? "true" : "false"}
                    onChange={(e) => setIsActive(e.target.value === "true")}
                  >
                    <option value="true">Active</option>
                    <option value="false">Inactive</option>
                  </select>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex justify-end space-x-2 border-t border-slate-100 pt-3">
                <button
                  type="button"
                  onClick={() => setShowRegModal(false)}
                  className="px-4 py-2 border border-slate-200 rounded-lg text-xs font-bold text-slate-500 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isPending}
                  className="px-5 py-2 bg-[#0b4a6e] hover:bg-sky-850 text-white rounded-lg text-xs font-bold transition-all shadow-sm flex items-center gap-1"
                >
                  {isPending && <Loader2 size={12} className="animate-spin" />}
                  Create Inventory Person
                </button>
              </div>

            </form>
          </div>
        </div>
      )}

      {/* EDIT INVENTORY PERSON MODAL */}
      {showEditModal && (
        <div className="fixed inset-0 bg-slate-900/60 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
          <div className="bg-white rounded-2xl w-full max-w-lg shadow-2xl p-6 border border-slate-150 space-y-4">
            
            {/* Header */}
            <div className="flex justify-between items-start border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-sm font-bold text-slate-800 flex items-center gap-1.5">
                  <ShieldCheck size={16} className="text-[#0b4a6e]" />
                  <span>Edit Inventory Person Account</span>
                </h3>
                <p className="text-[10px] text-slate-400 font-semibold mt-1">
                  Modify credentials or information for this counter.
                </p>
              </div>
              <button
                onClick={() => setShowEditModal(false)}
                className="text-slate-450 hover:text-slate-650 text-sm font-bold hover:bg-slate-100 px-2.5 py-1 rounded-lg"
              >
                ✕
              </button>
            </div>

            {/* Error alerts */}
            {editModalError && (
              <div className="p-3 bg-red-50 border border-red-155 rounded-xl text-red-800 text-[11px] font-semibold flex items-center gap-2">
                <XCircle size={14} className="shrink-0" />
                <span>{editModalError}</span>
              </div>
            )}

            <form onSubmit={handleEditSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-3.5">
                {/* Full Name */}
                <div className="space-y-1">
                  <label className="block text-[10px] font-bold text-slate-500 uppercase">
                    Full Name *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Abreham Kebede"
                    className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-semibold focus:outline-none"
                    value={editFullName}
                    onChange={(e) => setEditFullName(e.target.value)}
                  />
                </div>

                {/* Username */}
                <div className="space-y-1">
                  <label className="block text-[10px] font-bold text-slate-500 uppercase">
                    Username *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. abreham_k"
                    className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-semibold focus:outline-none"
                    value={editUsername}
                    onChange={(e) => setEditUsername(e.target.value)}
                  />
                </div>

                {/* Email */}
                <div className="space-y-1">
                  <label className="block text-[10px] font-bold text-slate-500 uppercase">
                    Email Address *
                  </label>
                  <input
                    type="email"
                    required
                    placeholder="e.g. abreham@dbu.edu.et"
                    className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-semibold focus:outline-none"
                    value={editEmail}
                    onChange={(e) => setEditEmail(e.target.value)}
                  />
                </div>

                {/* Phone Number */}
                <div className="space-y-1">
                  <label className="block text-[10px] font-bold text-slate-500 uppercase">
                    Phone Number
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. +251912345678"
                    className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-semibold focus:outline-none"
                    value={editPhoneNumber}
                    onChange={(e) => setEditPhoneNumber(e.target.value)}
                  />
                </div>

                {/* Password (Optional update) */}
                <div className="space-y-1">
                  <label className="block text-[10px] font-bold text-slate-500 uppercase">
                    New Password (Optional)
                  </label>
                  <input
                    type="password"
                    placeholder="Leave blank to keep same"
                    className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-semibold focus:outline-none"
                    value={editPassword}
                    onChange={(e) => setEditPassword(e.target.value)}
                  />
                </div>

                {/* Confirm Password */}
                <div className="space-y-1">
                  <label className="block text-[10px] font-bold text-slate-500 uppercase">
                    Confirm New Password
                  </label>
                  <input
                    type="password"
                    placeholder="Re-enter password"
                    className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-semibold focus:outline-none"
                    value={editConfirmPassword}
                    onChange={(e) => setEditConfirmPassword(e.target.value)}
                  />
                </div>

                {/* Department Select */}
                <div className="space-y-1 col-span-2">
                  <label className="block text-[10px] font-bold text-slate-500 uppercase">
                    Department / Organizational Unit *
                  </label>
                  <select
                    required
                    className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-semibold text-slate-700 focus:outline-none"
                    value={editDepartmentId}
                    onChange={(e) => setEditDepartmentId(e.target.value)}
                  >
                    <option value="">-- Select Department --</option>
                    {departments.map((dept) => (
                      <option key={dept.id} value={dept.id}>
                        {dept.name} ({dept.code})
                      </option>
                    ))}
                  </select>
                </div>

                {/* Employee ID */}
                <div className="space-y-1">
                  <label className="block text-[10px] font-bold text-slate-500 uppercase">
                    Employee ID
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. EMP-9824"
                    className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-semibold focus:outline-none"
                    value={editEmployeeId}
                    onChange={(e) => setEditEmployeeId(e.target.value)}
                  />
                </div>

                {/* Active Status */}
                <div className="space-y-1">
                  <label className="block text-[10px] font-bold text-slate-500 uppercase">
                    Status
                  </label>
                  <select
                    className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-semibold text-slate-700 focus:outline-none"
                    value={editIsActive ? "true" : "false"}
                    onChange={(e) => setEditIsActive(e.target.value === "true")}
                  >
                    <option value="true">Active</option>
                    <option value="false">Inactive</option>
                  </select>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex justify-end space-x-2 border-t border-slate-100 pt-3">
                <button
                  type="button"
                  onClick={() => setShowEditModal(false)}
                  className="px-4 py-2 border border-slate-200 rounded-lg text-xs font-bold text-slate-500 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isPending}
                  className="px-5 py-2 bg-[#0b4a6e] hover:bg-sky-850 text-white rounded-lg text-xs font-bold transition-all shadow-sm flex items-center gap-1"
                >
                  {isPending && <Loader2 size={12} className="animate-spin" />}
                  Save Changes
                </button>
              </div>

            </form>
          </div>
        </div>
      )}

      {/* INSPECTOR DETAILS DRAWER / MODAL */}
      {selectedPerson && (
        <div className="fixed inset-0 bg-slate-900/60 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
          <div className="bg-white rounded-2xl w-full max-w-2xl shadow-2xl p-6 border border-slate-150 space-y-4">
            
            {/* Header */}
            <div className="flex justify-between items-start border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-sm font-bold text-slate-800 flex items-center gap-1.5">
                  <Info size={16} className="text-[#0b4a6e]" />
                  <span>Assignments profile for {selectedPerson.user.name}</span>
                </h3>
                <p className="text-[10px] text-slate-400 font-semibold mt-1">
                  Email: {selectedPerson.user.email} • Username: {selectedPerson.user.username} • Dept: {selectedPerson.user.departmentName}
                </p>
              </div>
              <button
                onClick={() => setSelectedPerson(null)}
                className="text-slate-450 hover:text-slate-655 text-sm font-bold hover:bg-slate-100 px-2.5 py-1 rounded-lg"
              >
                ✕ Close
              </button>
            </div>

            {/* Content lists */}
            <div className="space-y-4 max-h-[350px] overflow-y-auto pr-1">
              
              {/* Section 1: Active assignments */}
              <div>
                <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-50 pb-1 mb-2">
                  Active Counting Permits / Tasks
                </h4>
                
                {selectedPerson.assignments.filter(a => a.status === "ASSIGNED" || a.status === "IN_PROGRESS" || a.status === "REOPENED").length === 0 ? (
                  <p className="text-xs text-slate-400 py-2">No active inventory sessions assigned.</p>
                ) : (
                  <div className="space-y-2">
                    {selectedPerson.assignments.filter(a => a.status === "ASSIGNED" || a.status === "IN_PROGRESS" || a.status === "REOPENED").map((a) => (
                      <div key={a.id} className="p-3 bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-between text-xs">
                        <div>
                          <p className="font-bold text-slate-800">{a.sessionNumber}</p>
                          <p className="text-[10px] text-slate-455">Department: {a.departmentName}</p>
                        </div>
                        <span className={`px-2 py-0.5 rounded text-[8px] font-bold uppercase ${
                          a.status === "IN_PROGRESS"
                            ? "bg-sky-50 text-sky-700 border border-sky-150"
                            : a.status === "REOPENED"
                            ? "bg-amber-50 text-amber-705 border border-amber-150"
                            : "bg-slate-100 text-slate-600 border border-slate-200"
                        }`}>
                          {a.status}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Section 2: Completed assignments */}
              <div>
                <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-50 pb-1 mb-2">
                  Completed Counting Tasks History
                </h4>

                {selectedPerson.assignments.filter(a => a.status === "COMPLETED" || a.status === "APPROVED" || a.status === "CANCELLED").length === 0 ? (
                  <p className="text-xs text-slate-400 py-2">No completed inventory sessions recorded.</p>
                ) : (
                  <div className="space-y-2">
                    {selectedPerson.assignments.filter(a => a.status === "COMPLETED" || a.status === "APPROVED" || a.status === "CANCELLED").map((a) => (
                      <div key={a.id} className="p-3 bg-slate-50 border border-slate-150 rounded-xl flex items-center justify-between text-xs">
                        <div>
                          <p className="font-bold text-slate-800">{a.sessionNumber}</p>
                          <p className="text-[10px] text-slate-455">Department: {a.departmentName}</p>
                        </div>
                        <div className="text-right">
                          <p className="font-bold text-emerald-700">{a.verifiedCount} Assets Verified</p>
                          <span className={`px-2 py-0.5 rounded text-[8px] font-bold uppercase ${
                            a.status === "APPROVED"
                              ? "bg-emerald-50 text-emerald-750 border border-emerald-150"
                              : "bg-slate-100 text-slate-600 border border-slate-150"
                          }`}>
                            {a.status}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

            </div>

          </div>
        </div>
      )}

    </div>
  );
}
