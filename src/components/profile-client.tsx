"use client";

import React, { useState, useTransition } from "react";
import { changePasswordAction } from "@/app/actions/profile";
import { Eye, EyeOff, Lock, User, Shield, Info, Check, X } from "lucide-react";

interface ProfileClientProps {
  user: {
    id: string;
    name: string;
    email: string;
    role: string;
    department: string;
  };
}

export function ProfileClient({ user }: ProfileClientProps) {
  const [activeTab, setActiveTab] = useState<"info" | "security">("info");
  const [isPending, startTransition] = useTransition();

  React.useEffect(() => {
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      const tab = params.get("tab");
      if (tab === "security") {
        setActiveTab("security");
      }
    }
  }, []);

  // Password fields
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  // Visibility toggles
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  // Status messages
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Dynamic Password Validation Checks
  const hasMinLength = newPassword.length >= 8;
  const hasUppercase = /[A-Z]/.test(newPassword);
  const hasLowercase = /[a-z]/.test(newPassword);
  const hasNumber = /[0-9]/.test(newPassword);
  const hasSpecial = /[!@#$%^&*(),.?":{}|<>]/.test(newPassword);

  const isFormValid =
    currentPassword &&
    newPassword &&
    confirmPassword &&
    newPassword === confirmPassword &&
    hasMinLength &&
    hasUppercase &&
    hasLowercase &&
    hasNumber &&
    hasSpecial &&
    newPassword !== currentPassword;

  const handlePasswordChange = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    if (newPassword !== confirmPassword) {
      setError("New password and confirm password do not match.");
      return;
    }

    if (newPassword === currentPassword) {
      setError("New password cannot be the same as your current password.");
      return;
    }

    startTransition(async () => {
      const res = await changePasswordAction(null, {
        currentPassword,
        newPassword,
        confirmPassword
      });

      if (res.error) {
        setError(res.error);
      } else {
        setSuccess("Password changed successfully. Please log out and sign in again with your new credentials.");
        setCurrentPassword("");
        setNewPassword("");
        setConfirmPassword("");
      }
    });
  };

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="flex items-center justify-between border-b border-blue-100 pb-4 bg-blue-950/5 -mx-6 -mt-6 p-6">
        <div>
          <h2 className="text-xl font-bold text-blue-900">Account Settings</h2>
          <p className="text-xs text-blue-600 font-semibold mt-1">
            Manage your personal profile, department mappings, and security preferences
          </p>
        </div>
      </div>

      <div className="flex flex-col md:flex-row gap-6">
        {/* Left Side Tabs Sidebar */}
        <div className="w-full md:w-64 bg-white rounded-2xl border border-slate-100 p-4 h-fit space-y-2 shadow-sm">
          <button
            onClick={() => setActiveTab("info")}
            className={`w-full flex items-center space-x-3 px-4 py-3 rounded-xl text-xs font-bold transition-all ${
              activeTab === "info"
                ? "bg-[#0b4a6e] text-white shadow-md shadow-sky-950/10"
                : "text-slate-650 hover:bg-slate-50"
            }`}
          >
            <User size={16} />
            <span>Profile Details</span>
          </button>
          <button
            onClick={() => setActiveTab("security")}
            className={`w-full flex items-center space-x-3 px-4 py-3 rounded-xl text-xs font-bold transition-all ${
              activeTab === "security"
                ? "bg-[#0b4a6e] text-white shadow-md shadow-sky-950/10"
                : "text-slate-650 hover:bg-slate-50"
            }`}
          >
            <Lock size={16} />
            <span>Security & Password</span>
          </button>
        </div>

        {/* Right Side Content Panel */}
        <div className="flex-1 bg-white rounded-2xl border border-slate-100 p-6 shadow-sm min-h-[400px]">
          {activeTab === "info" && (
            <div className="space-y-6">
              <div className="border-b border-slate-100 pb-3">
                <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2">
                  <User size={16} className="text-sky-700" />
                  Personal Information
                </h3>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Full Name</label>
                  <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700">
                    {user.name}
                  </div>
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Email Address</label>
                  <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700">
                    {user.email}
                  </div>
                </div>
              </div>

              <div className="border-b border-slate-100 pb-3 pt-4">
                <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2">
                  <Shield size={16} className="text-sky-700" />
                  Organizational Access Roles
                </h3>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Assigned System Role</label>
                  <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-[#0b4a6e] uppercase tracking-wide">
                    {user.role.replace(/_/g, " ")}
                  </div>
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Primary Department</label>
                  <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700">
                    {user.department}
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === "security" && (
            <div className="space-y-6">
              <div className="border-b border-slate-100 pb-3">
                <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2">
                  <Lock size={16} className="text-sky-700" />
                  Change Account Password
                </h3>
              </div>

              {error && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-xs font-semibold text-red-700 flex items-center gap-2">
                  <X size={14} />
                  <span>{error}</span>
                </div>
              )}

              {success && (
                <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-xs font-semibold text-emerald-800 flex items-center gap-2">
                  <Check size={14} />
                  <span>{success}</span>
                </div>
              )}

              <form onSubmit={handlePasswordChange} className="space-y-4 max-w-lg">
                {/* Current Password */}
                <div className="relative">
                  <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Current Password *</label>
                  <input
                    type={showCurrent ? "text" : "password"}
                    required
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-sky-600 focus:bg-white transition-all font-mono"
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                  />
                  <button
                    type="button"
                    onClick={() => setShowCurrent(!showCurrent)}
                    className="absolute right-3 top-7.5 text-slate-450 hover:text-slate-700"
                  >
                    {showCurrent ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>

                {/* New Password */}
                <div className="relative">
                  <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">New Password *</label>
                  <input
                    type={showNew ? "text" : "password"}
                    required
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-sky-600 focus:bg-white transition-all font-mono"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                  />
                  <button
                    type="button"
                    onClick={() => setShowNew(!showNew)}
                    className="absolute right-3 top-7.5 text-slate-450 hover:text-slate-700"
                  >
                    {showNew ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>

                {/* Confirm New Password */}
                <div className="relative">
                  <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Confirm New Password *</label>
                  <input
                    type={showConfirm ? "text" : "password"}
                    required
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-sky-600 focus:bg-white transition-all font-mono"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirm(!showConfirm)}
                    className="absolute right-3 top-7.5 text-slate-450 hover:text-slate-700"
                  >
                    {showConfirm ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>

                {/* Password Policy Tracker */}
                <div className="bg-slate-50 border border-slate-100 rounded-2xl p-4 space-y-2.5">
                  <h4 className="text-[10px] font-extrabold text-slate-500 uppercase flex items-center gap-1.5">
                    <Info size={12} />
                    Password Requirements
                  </h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px]">
                    <div className="flex items-center space-x-1.5">
                      {hasMinLength ? (
                        <Check size={12} className="text-emerald-600 font-bold" />
                      ) : (
                        <span className="w-1.5 h-1.5 rounded-full bg-slate-300 inline-block" />
                      )}
                      <span className={hasMinLength ? "text-emerald-700 font-semibold" : "text-slate-500"}>
                        At least 8 characters
                      </span>
                    </div>
                    <div className="flex items-center space-x-1.5">
                      {hasUppercase ? (
                        <Check size={12} className="text-emerald-600 font-bold" />
                      ) : (
                        <span className="w-1.5 h-1.5 rounded-full bg-slate-300 inline-block" />
                      )}
                      <span className={hasUppercase ? "text-emerald-700 font-semibold" : "text-slate-500"}>
                        At least 1 uppercase letter
                      </span>
                    </div>
                    <div className="flex items-center space-x-1.5">
                      {hasLowercase ? (
                        <Check size={12} className="text-emerald-600 font-bold" />
                      ) : (
                        <span className="w-1.5 h-1.5 rounded-full bg-slate-300 inline-block" />
                      )}
                      <span className={hasLowercase ? "text-emerald-700 font-semibold" : "text-slate-500"}>
                        At least 1 lowercase letter
                      </span>
                    </div>
                    <div className="flex items-center space-x-1.5">
                      {hasNumber ? (
                        <Check size={12} className="text-emerald-600 font-bold" />
                      ) : (
                        <span className="w-1.5 h-1.5 rounded-full bg-slate-300 inline-block" />
                      )}
                      <span className={hasNumber ? "text-emerald-700 font-semibold" : "text-slate-500"}>
                        At least 1 number
                      </span>
                    </div>
                    <div className="flex items-center space-x-1.5">
                      {hasSpecial ? (
                        <Check size={12} className="text-emerald-600 font-bold" />
                      ) : (
                        <span className="w-1.5 h-1.5 rounded-full bg-slate-300 inline-block" />
                      )}
                      <span className={hasSpecial ? "text-emerald-700 font-semibold" : "text-slate-500"}>
                        At least 1 special char (!@#$)
                      </span>
                    </div>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={isPending || !isFormValid}
                  className="w-full py-2.5 bg-[#0b4a6e] hover:bg-sky-850 text-white rounded-xl text-xs font-bold transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isPending ? "Changing Password..." : "Change Password"}
                </button>
              </form>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
