"use client";

import React, { useState, useTransition } from "react";
import { loginAction } from "@/app/actions/auth";
import { DbuLogo } from "@/components/dbu-logo";
import Image from "next/image";
import { Eye, EyeOff, Lock, Mail, Loader2 } from "lucide-react";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [rememberMe, setRememberMe] = useState(false);
  const [isPending, startTransition] = useTransition();

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!email || !password) {
      setError("Please fill in all fields.");
      return;
    }

    startTransition(async () => {
      const formData = new FormData();
      formData.append("email", email);
      formData.append("password", password);

      const res = await loginAction(null, formData);
      if (res && res.error) {
        setError(res.error);
      }
    });
  };

  return (
    <div className="flex min-h-screen bg-slate-50">
      {/* Left side: branding banner matching mockup */}
      <div className="hidden lg:flex lg:w-1/3 flex-col bg-[#0b4a6e] text-white justify-between p-12 relative overflow-hidden">
        {/* Abstract background circles */}
        <div className="absolute top-0 right-0 w-80 h-80 bg-sky-800 rounded-full filter blur-3xl opacity-30 transform translate-x-1/2 -translate-y-1/2" />
        <div className="absolute bottom-0 left-0 w-80 h-80 bg-sky-950 rounded-full filter blur-3xl opacity-50 transform -translate-x-1/2 translate-y-1/2" />

        {/* Top brand header */}
        <div className="z-10 flex items-center space-x-3">
          <DbuLogo className="w-12 h-12" />
          <div>
            <h1 className="font-bold text-lg tracking-wider leading-none text-white">DEBRE BERHAN UNIVERSITY</h1>
            <p className="text-[10px] text-yellow-400 font-medium tracking-widest mt-1">ASSET TRACKING SYSTEM</p>
          </div>
        </div>

        {/* Center quote */}
        <div className="z-10 my-auto pr-6">
          <h2 className="text-3xl font-extrabold leading-tight text-white mb-4">
            Enterprise Asset Management.
          </h2>
          <p className="text-sky-200 text-sm leading-relaxed mb-6">
            Track, Manage, Maintain. Optimizing resources and facilitating institutional accountability across all faculties.
          </p>
          <div className="h-1.5 w-16 bg-yellow-400 rounded-full" />
        </div>

        {/* Bottom illustration (Generated DBU Campus image) */}
        <div className="z-10 relative h-48 w-full rounded-xl overflow-hidden shadow-2xl border border-sky-800">
          <Image
            src="/dbu_campus_building.png"
            alt="Debre Berhan University Campus"
            fill
            className="object-cover"
            priority
          />
          <div className="absolute inset-0 bg-gradient-to-t from-sky-950/80 via-transparent to-transparent" />
          <p className="absolute bottom-3 left-3 text-xs text-white/95 font-semibold">DBU Administration Block</p>
        </div>
      </div>

      {/* Right side: Login Panel */}
      <div className="flex-1 flex flex-col justify-center items-center px-6 py-12 lg:px-20 bg-slate-50 relative">
        <div className="w-full max-w-md bg-white p-8 rounded-2xl shadow-xl border border-slate-100 relative overflow-hidden">
          {/* Decorative element */}
          <div className="absolute top-0 left-0 right-0 h-1.5 bg-[#0b4a6e]" />
          
          <div className="flex flex-col items-center mb-8">
            <DbuLogo className="w-20 h-20 mb-4" />
            <h2 className="text-2xl font-bold text-slate-800 tracking-tight">Welcome Back!</h2>
            <p className="text-xs text-slate-500 mt-1.5">Sign in to continue to DBU Asset Tracking System</p>
          </div>

          {error && (
            <div className="mb-6 p-3 bg-red-50 border-l-4 border-red-500 rounded text-xs font-semibold text-red-700">
              {error}
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-5">
            {/* Email/Username field */}
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1.5" htmlFor="email">
                Email Address or Username
              </label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-400">
                  <Mail size={16} />
                </span>
                <input
                  id="email"
                  type="text"
                  required
                  disabled={isPending}
                  className="w-full pl-9 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-sky-600 focus:bg-white transition-all"
                  placeholder="Enter your email or username"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>
            </div>

            {/* Password field */}
            <div>
              <div className="flex justify-between items-center mb-1.5">
                <label className="block text-xs font-semibold text-slate-600" htmlFor="password">
                  Password
                </label>
                <a href="#" className="text-xs font-medium text-sky-700 hover:underline">
                  Forgot password?
                </a>
              </div>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-400">
                  <Lock size={16} />
                </span>
                <input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  required
                  disabled={isPending}
                  className="w-full pl-9 pr-10 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-sky-600 focus:bg-white transition-all"
                  placeholder="Enter your password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
                <button
                  type="button"
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            {/* Remember Me */}
            <div className="flex items-center">
              <input
                id="remember"
                type="checkbox"
                disabled={isPending}
                className="w-4 h-4 text-sky-600 border-slate-300 rounded focus:ring-sky-500"
                checked={rememberMe}
                onChange={(e) => setRememberMe(e.target.checked)}
              />
              <label htmlFor="remember" className="ml-2 text-xs font-medium text-slate-600 select-none">
                Remember me
              </label>
            </div>

            {/* Sign In Button */}
            <button
              type="submit"
              disabled={isPending}
              className="w-full flex justify-center items-center py-2.5 px-4 border border-transparent rounded-lg text-sm font-semibold text-white bg-[#0b4a6e] hover:bg-sky-800 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-sky-500 disabled:opacity-50 transition-colors"
            >
              {isPending ? (
                <>
                  <Loader2 size={16} className="animate-spin mr-2" />
                  Signing In...
                </>
              ) : (
                "Sign In"
              )}
            </button>
          </form>

          {/* Divider */}
          <div className="relative my-6">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-slate-200" />
            </div>
            
          </div>
        </div>
      </div>
    </div>
  );
}
