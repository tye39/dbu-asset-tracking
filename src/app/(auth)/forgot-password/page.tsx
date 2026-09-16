"use client";

import React, { useState, useTransition } from "react";
import { requestPasswordResetAction } from "@/app/actions/password-reset";
import { DbuLogo } from "@/components/dbu-logo";
import Image from "next/image";
import Link from "next/link";
import { Mail, Loader2, ArrowLeft, CheckCircle2 } from "lucide-react";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccessMessage(null);

    if (!email) {
      setError("Please enter your email address.");
      return;
    }

    startTransition(async () => {
      const formData = new FormData();
      formData.append("email", email);

      const res = await requestPasswordResetAction(null, formData);
      if (res.error) {
        setError(res.error);
      } else if (res.success && res.message) {
        setSuccessMessage(res.message);
      }
    });
  };

  return (
    <div className="flex min-h-screen bg-slate-50">
      {/* Left side: branding banner matching login page */}
      <div className="hidden lg:flex lg:w-1/3 flex-col bg-[#0b4a6e] text-white justify-between p-12 relative overflow-hidden">
        {/* Background ambient lighting */}
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

        {/* Center content message */}
        <div className="z-10 my-auto pr-6">
          <h2 className="text-3xl font-extrabold leading-tight text-white mb-4">
            Account Security &amp; Access Recovery
          </h2>
          <p className="text-sky-200 text-sm leading-relaxed mb-6">
            Securely reset your password using your institutional email credentials.
          </p>
          <div className="h-1.5 w-16 bg-yellow-400 rounded-full" />
        </div>

        {/* Bottom illustration */}
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

      {/* Right side: Forgot Password Panel */}
      <div className="flex-1 flex flex-col justify-center items-center px-6 py-12 lg:px-20 bg-slate-50 relative">
        <div className="w-full max-w-md bg-white p-8 rounded-2xl shadow-xl border border-slate-100 relative overflow-hidden">
          {/* Decorative accent bar */}
          <div className="absolute top-0 left-0 right-0 h-1.5 bg-[#0b4a6e]" />

          <div className="flex flex-col items-center mb-6">
            <DbuLogo className="w-16 h-16 mb-3" />
            <h2 className="text-2xl font-bold text-slate-800 tracking-tight">Forgot Password?</h2>
            <p className="text-xs text-slate-500 mt-1 text-center">
              Enter your registered email address and we will send you instructions to reset your password.
            </p>
          </div>

          {error && (
            <div className="mb-6 p-3 bg-red-50 border-l-4 border-red-500 rounded text-xs font-semibold text-red-700">
              {error}
            </div>
          )}

          {successMessage ? (
            <div className="space-y-6">
              <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl text-center space-y-2">
                <CheckCircle2 className="mx-auto text-emerald-600 w-8 h-8" />
                <h3 className="text-sm font-bold text-emerald-900">Check Your Email</h3>
                <p className="text-xs text-emerald-700 leading-relaxed">
                  {successMessage}
                </p>
              </div>

              <Link
                href="/login"
                className="w-full py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-sm font-bold transition-all flex items-center justify-center space-x-2"
              >
                <ArrowLeft size={16} />
                <span>Return to Sign In</span>
              </Link>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-5">
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1.5" htmlFor="email">
                  Institutional Email Address
                </label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-400">
                    <Mail size={16} />
                  </span>
                  <input
                    id="email"
                    type="email"
                    required
                    disabled={isPending}
                    className="w-full pl-9 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-sky-600 focus:bg-white transition-all"
                    placeholder="e.g. pao@dbu.edu.et"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={isPending}
                className="w-full py-2.5 bg-[#0b4a6e] hover:bg-sky-800 text-white rounded-lg text-sm font-bold transition-all shadow-md flex items-center justify-center space-x-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isPending ? (
                  <>
                    <Loader2 size={16} className="animate-spin" />
                    <span>Sending Reset Link...</span>
                  </>
                ) : (
                  <span>Send Reset Link</span>
                )}
              </button>

              <div className="pt-2 text-center">
                <Link
                  href="/login"
                  className="inline-flex items-center space-x-1.5 text-xs font-semibold text-sky-700 hover:underline"
                >
                  <ArrowLeft size={14} />
                  <span>Back to Sign In</span>
                </Link>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
