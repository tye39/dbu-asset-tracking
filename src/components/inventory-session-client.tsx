"use client";

import React, { useState, useRef, useEffect, useTransition, useCallback } from "react";
import Link from "next/link";
import jsQR from "jsqr";
import {
  scanAssetAction,
  completeInventoryAction,
  cancelInventoryAction,
  approveInventoryAction,
  reopenInventoryAction
} from "@/app/actions/inventory";
import {
  Camera,
  QrCode,
  CheckCircle,
  AlertTriangle,
  XCircle,
  Search,
  Filter,
  Loader2,
  ChevronLeft,
  Printer,
  Download,
  AlertOctagon,
  XOctagon,
  Info
} from "lucide-react";

interface ExpectedAsset {
  id: string;
  name: string;
  assetCode: string;
  serialNumber: string;
  categoryName: string;
  typeName: string;
  status: string;
  imageUrl: string | null;
  assignedTo: string;
}

interface VerificationRecord {
  id: string;
  assetId: string;
  scannedAt: string;
  scannedBy: { name: string };
  asset: {
    name: string;
    assetCode: string;
    typeName: string;
    categoryName: string;
  };
}

interface InventorySessionClientProps {
  session: {
    id: string;
    sessionNumber: string;
    notes: string;
    status: string;
    startDate: string;
    dueDate: string;
    completedAt: string | null;
    department: { id: string; name: string; code: string };
    assignedBy: { name: string };
    inventoryPerson: { id: string; name: string };
    completedBy: { name: string } | null;
  };
  expectedAssets: ExpectedAsset[];
  initialVerifications: VerificationRecord[];
  isOperator: boolean;
}

// Audio Feedback Web Audio API
const playBeep = (type: "success" | "duplicate" | "error") => {
  try {
    const AudioContextClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof window.AudioContext }).webkitAudioContext;
    if (!AudioContextClass) return;
    const ctx = new AudioContextClass();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);

    if (type === "success") {
      osc.type = "sine";
      osc.frequency.setValueAtTime(880, ctx.currentTime);
      gain.gain.setValueAtTime(0.08, ctx.currentTime);
      osc.start();
      osc.stop(ctx.currentTime + 0.1);
    } else if (type === "duplicate") {
      osc.type = "triangle";
      osc.frequency.setValueAtTime(440, ctx.currentTime);
      gain.gain.setValueAtTime(0.08, ctx.currentTime);
      osc.start();
      osc.stop(ctx.currentTime + 0.25);
    } else {
      osc.type = "sawtooth";
      osc.frequency.setValueAtTime(220, ctx.currentTime);
      gain.gain.setValueAtTime(0.08, ctx.currentTime);
      osc.start();
      osc.stop(ctx.currentTime + 0.35);
    }
  } catch (err) {
    console.error("Web Audio beep failed", err);
  }
};

export function InventorySessionClient({
  session,
  expectedAssets,
  initialVerifications,
  isOperator
}: InventorySessionClientProps) {
  const [verifications, setVerifications] = useState<VerificationRecord[]>(initialVerifications);
  const [isPending, startTransition] = useTransition();

  // Scan & camera states
  const [activeScan, setActiveScan] = useState(false);
  const [manualInput, setManualInput] = useState("");
  const [cameraPermission, setCameraPermission] = useState<boolean | null>(null);
  const [scanStatus, setScanStatus] = useState<"idle" | "success" | "duplicate" | "error">("idle");
  const [scanMessage, setScanMessage] = useState("");
  const [lastScannedAsset, setLastScannedAsset] = useState<ExpectedAsset | null>(null);

  // Tab & lists states
  const [activeTab, setActiveTab] = useState<"verified" | "unverified">("verified");
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("");
  const [selectedStatus, setSelectedStatus] = useState("");

  // Complete & Reopen modals
  const [showCompleteModal, setShowCompleteModal] = useState(false);
  const [showReopenModal, setShowReopenModal] = useState(false);
  const [reopenReason, setReopenReason] = useState("");
  const [reopenError, setReopenError] = useState<string | null>(null);

  // Video & Canvas Refs for QR Decoding
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationFrameId = useRef<number | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  // Start Camera QR Scanning
  const startCamera = async () => {
    setScanStatus("idle");
    setScanMessage("");
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "environment" }
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.setAttribute("playsinline", "true");
        videoRef.current.play();
      }
      setCameraPermission(true);
      setActiveScan(true);
    } catch (err) {
      console.error("Camera access error", err);
      setCameraPermission(false);
      setActiveScan(false);
    }
  };

  const stopCamera = () => {
    if (animationFrameId.current) {
      cancelAnimationFrame(animationFrameId.current);
      animationFrameId.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    setActiveScan(false);
  };

  // Submit scan to backend action
  const handleScanVerify = useCallback((assetTag: string) => {
    setScanStatus("idle");
    setScanMessage("");

    startTransition(async () => {
      const res = await scanAssetAction(session.id, assetTag);
      if (res.error) {
        if (res.error === "Already Counted") {
          setScanStatus("duplicate");
          setScanMessage(`Already Counted: ${assetTag} has already been verified in this session.`);
          playBeep("duplicate");
        } else if (res.error.startsWith("Wrong Department")) {
          setScanStatus("error");
          setScanMessage(res.error);
          playBeep("error");
        } else {
          setScanStatus("error");
          setScanMessage(res.error || "Asset Not Found.");
          playBeep("error");
        }
      } else if (res.success && res.verification && res.asset) {
        setScanStatus("success");
        setScanMessage(`✓ Asset verified successfully: ${res.asset.name}`);
        playBeep("success");

        // Set Last Scanned Card details
        setLastScannedAsset(res.asset);

        // Append to verified state
        const newRecord: VerificationRecord = {
          id: res.verification.id,
          assetId: res.asset.id,
          scannedAt: res.verification.scannedAt,
          scannedBy: { name: session.inventoryPerson.name }, // actor
          asset: {
            name: res.asset.name,
            assetCode: res.asset.assetCode,
            typeName: res.asset.typeName,
            categoryName: res.asset.categoryName
          }
        };

        setVerifications(prev => {
          if (prev.some(v => v.assetId === res.asset!.id)) return prev;
          return [newRecord, ...prev];
        });
      }
    });
  }, [session.id, session.inventoryPerson.name]);

  // Scan frame processing loop
  useEffect(() => {
    if (!activeScan) return;

    const processFrame = () => {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      if (!video || !canvas) return;

      if (video.readyState === video.HAVE_ENOUGH_DATA) {
        const ctx = canvas.getContext("2d");
        if (ctx) {
          canvas.width = video.videoWidth;
          canvas.height = video.videoHeight;
          ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
          const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
          const code = jsQR(imageData.data, imageData.width, imageData.height, {
            inversionAttempts: "dontInvert"
          });

          if (code && code.data) {
            // Found QR tag - stop camera and verify
            stopCamera();
            handleScanVerify(code.data);
            return;
          }
        }
      }
      animationFrameId.current = requestAnimationFrame(processFrame);
    };

    animationFrameId.current = requestAnimationFrame(processFrame);

    return () => {
      if (animationFrameId.current) {
        cancelAnimationFrame(animationFrameId.current);
      }
    };
  }, [activeScan, handleScanVerify]);

  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualInput.trim()) return;
    handleScanVerify(manualInput.trim());
    setManualInput("");
  };

  // Complete session trigger
  const handleCompleteSession = () => {
    startTransition(async () => {
      const res = await completeInventoryAction(session.id);
      if (res.error) {
        alert(res.error);
      } else {
        setShowCompleteModal(false);
        window.location.reload();
      }
    });
  };

  // Cancel session trigger
  const handleCancelSession = () => {
    if (!confirm("Are you sure you want to cancel this inventory session? All current verification scans will remain, but the session status will change to CANCELLED.")) return;
    startTransition(async () => {
      const res = await cancelInventoryAction(session.id);
      if (res.error) {
        alert(res.error);
      } else {
        window.location.reload();
      }
    });
  };

  // Approve session trigger
  const handleApproveSession = () => {
    if (!confirm("Are you sure you want to approve this completed inventory audit?")) return;
    startTransition(async () => {
      const res = await approveInventoryAction(session.id);
      if (res.error) {
        alert(res.error);
      } else {
        alert("Inventory session approved successfully!");
        window.location.reload();
      }
    });
  };

  // Reopen session trigger
  const handleReopenSession = (e: React.FormEvent) => {
    e.preventDefault();
    if (!reopenReason.trim()) {
      setReopenError("Reopen reason is required.");
      return;
    }
    setReopenError(null);
    startTransition(async () => {
      const res = await reopenInventoryAction(session.id, reopenReason);
      if (res.error) {
        setReopenError(res.error);
      } else {
        setShowReopenModal(false);
        setReopenReason("");
        alert("Inventory session rejected and reopened successfully!");
        window.location.reload();
      }
    });
  };

  // Computed totals & indicators
  const totalExpected = expectedAssets.length;
  const totalVerified = verifications.length;
  const totalUnverified = Math.max(0, totalExpected - totalVerified);
  const progressPercent = totalExpected > 0 ? Math.round((totalVerified / totalExpected) * 100) : 0;

  // Filter lists
  const verifiedIds = new Set(verifications.map(v => v.assetId));

  const listVerified = verifications.filter(v => {
    const searchMatch =
      v.asset.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      v.asset.assetCode.toLowerCase().includes(searchTerm.toLowerCase());
    const categoryMatch = !selectedCategory || v.asset.categoryName === selectedCategory;
    return searchMatch && categoryMatch;
  });

  const listUnverified = expectedAssets.filter(a => {
    if (verifiedIds.has(a.id)) return false;
    const searchMatch =
      a.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      a.assetCode.toLowerCase().includes(searchTerm.toLowerCase()) ||
      a.serialNumber.toLowerCase().includes(searchTerm.toLowerCase());
    const categoryMatch = !selectedCategory || a.categoryName === selectedCategory;
    const statusMatch = !selectedStatus || a.status === selectedStatus;
    return searchMatch && categoryMatch && statusMatch;
  });

  // Extract unique categories for filter select dropdown options
  const uniqueCategories = Array.from(new Set(expectedAssets.map(a => a.categoryName)));

  // Client-side CSV/Excel Export (Section 15)
  const exportToCSV = () => {
    const headers = ["Asset Tag", "Asset Name", "Category", "Asset Type", "Serial Number", "Responsible Dept", "Assigned User", "Verification Status", "Scanned At", "Scanned By"];
    
    // Create rows representing all assets and their scan logs
    const rows = expectedAssets.map(a => {
      const isScanned = verifiedIds.has(a.id);
      const scanLog = verifications.find(v => v.assetId === a.id);
      return [
        a.assetCode,
        a.name,
        a.categoryName,
        a.typeName,
        a.serialNumber,
        session.department.name,
        a.assignedTo,
        isScanned ? "VERIFIED" : "MISSING",
        scanLog ? new Date(scanLog.scannedAt).toLocaleString() : "-",
        scanLog ? scanLog.scannedBy.name : "-"
      ];
    });

    const csvContent =
      "data:text/csv;charset=utf-8," +
      [headers.join(","), ...rows.map(e => e.map(val => `"${val.replace(/"/g, '""')}"`).join(","))].join("\n");
    
    const encodedUri = encodeURI(csvContent);
     const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `Inventory_Report_${session.sessionNumber.replace(/\s+/g, "_")}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6">
      
      {/* Session Breadcrumb & Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between border-b border-sky-100 pb-4 no-print">
        <div className="space-y-1">
          <Link href="/pao/inventory" className="text-xs text-sky-700 hover:underline font-bold flex items-center space-x-1 mb-1">
            <ChevronLeft size={12} />
            <span>Back to Sessions</span>
          </Link>
          <h2 className="text-xl font-bold text-sky-950">{session.sessionNumber}</h2>
          <div className="flex flex-wrap gap-2 pt-0.5">
            <span className="text-[10px] font-extrabold bg-[#0b4a6e]/10 border border-[#0b4a6e]/20 text-[#0b4a6e] px-2.5 py-0.5 rounded-full uppercase tracking-wider">
              Dept: {session.department.name} ({session.department.code})
            </span>
            <span className="text-[10px] font-extrabold bg-slate-100 border border-slate-200 text-slate-600 px-2.5 py-0.5 rounded-full uppercase tracking-wider">
              Assigned by: {session.assignedBy.name}
            </span>
            <span className="text-[10px] font-extrabold bg-sky-100 border border-sky-200 text-sky-700 px-2.5 py-0.5 rounded-full uppercase tracking-wider">
              Person: {session.inventoryPerson.name}
            </span>
            <span className="text-[10px] font-extrabold bg-amber-50 border border-amber-200 text-amber-700 px-2.5 py-0.5 rounded-full uppercase tracking-wider">
              Due: {new Date(session.dueDate).toLocaleDateString()}
            </span>
          </div>
        </div>

        <div className="flex items-center space-x-2 mt-4 sm:mt-0">
          {/* Operator Action Controls (PAO/Admin) */}
          {isOperator && (
            <>
              {session.status === "COMPLETED" && (
                <>
                  <button
                    disabled={isPending}
                    onClick={() => setShowReopenModal(true)}
                    className="px-3.5 py-2 bg-amber-600 hover:bg-amber-750 text-white rounded-lg text-xs font-bold transition-all shadow-sm flex items-center gap-1"
                  >
                    Reject & Reopen
                  </button>
                  <button
                    disabled={isPending}
                    onClick={handleApproveSession}
                    className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-750 text-white rounded-lg text-xs font-bold transition-all shadow-sm flex items-center gap-1"
                  >
                    Approve Session
                  </button>
                </>
              )}
              {(session.status === "ASSIGNED" || session.status === "IN_PROGRESS" || session.status === "REOPENED") && (
                <button
                  disabled={isPending}
                  onClick={handleCancelSession}
                  className="px-3.5 py-2 border border-red-200 text-red-750 hover:bg-red-50 rounded-lg text-xs font-bold transition-all shadow-sm"
                >
                  Cancel Session
                </button>
              )}
            </>
          )}

          {/* Inventory Person Action Controls */}
          {!isOperator && (
            <>
              {(session.status === "ASSIGNED" || session.status === "IN_PROGRESS" || session.status === "REOPENED") && (
                <button
                  onClick={() => setShowCompleteModal(true)}
                  className="px-4 py-2 bg-yellow-500 hover:bg-yellow-600 text-slate-900 rounded-lg text-xs font-bold shadow-sm transition-all transform hover:scale-[1.01]"
                >
                  Complete Inventory
                </button>
              )}
              {session.status === "COMPLETED" && (
                <span className="px-3.5 py-2 bg-emerald-50 border border-emerald-250 text-emerald-750 text-xs font-bold rounded-lg select-none">
                  Submitted • Awaiting Review
                </span>
              )}
            </>
          )}

          {/* Standard Reports Print/CSV Exports */}
          <div className="flex items-center space-x-1.5 pl-1.5 border-l border-slate-200">
            <button
              onClick={() => window.print()}
              className="p-2 bg-white border border-slate-200 hover:bg-slate-50 text-slate-650 rounded-lg text-xs font-bold flex items-center shadow-sm"
              title="Print Summary Report"
            >
              <Printer size={12} />
            </button>
            <button
              onClick={exportToCSV}
              className="p-2 bg-[#0b4a6e] hover:bg-sky-850 text-white rounded-lg text-xs font-bold flex items-center shadow-sm"
              title="Export csv format"
            >
              <Download size={12} />
            </button>
          </div>
        </div>
      </div>

      {/* PRINT BANNER ONLY FOR PRINT OUTPUTS */}
      <div className="hidden print:block border-b-2 border-slate-800 pb-4 mb-6">
        <div className="text-center">
          <h1 className="text-lg font-black uppercase text-[#0b4a6e] tracking-wider m-0">Debre Berhan University</h1>
          <p className="text-[10px] text-amber-700 font-extrabold uppercase tracking-widest mt-1 mb-0">PHYSICAL INVENTORY AUDIT RECONCILIATION SUMMARY</p>
        </div>
        <div className="grid grid-cols-2 gap-4 mt-6 text-xs border border-slate-200 rounded-lg p-4 bg-slate-50/50">
          <div>
            <p className="mb-1"><span className="font-bold text-slate-500">Session Number:</span> <span className="font-bold text-slate-800">{session.sessionNumber}</span></p>
            <p className="mb-1"><span className="font-bold text-slate-500">Responsible Unit:</span> <span className="font-bold text-slate-800">{session.department.name} ({session.department.code})</span></p>
            <p className="mb-1"><span className="font-bold text-slate-500">Inventory Timeline:</span> <span className="font-bold text-slate-800">{new Date(session.startDate).toLocaleDateString()} to {new Date(session.dueDate).toLocaleDateString()}</span></p>
          </div>
          <div>
            <p className="mb-1"><span className="font-bold text-slate-500">Assigned To:</span> <span className="font-bold text-slate-800">{session.inventoryPerson.name}</span></p>
            <p className="mb-1"><span className="font-bold text-slate-500">Assigned By:</span> <span className="font-bold text-slate-800">{session.assignedBy.name}</span></p>
            <p className="mb-1"><span className="font-bold text-slate-500">Session Status:</span> <span className="font-bold text-slate-800 uppercase">{session.status}</span></p>
          </div>
        </div>
      </div>

      {/* STATUS OVERVIEW BLOCKS */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white border border-slate-100 rounded-xl p-4 shadow-sm">
          <p className="text-[9px] font-extrabold text-slate-400 uppercase tracking-wider mb-1">Expected Assets</p>
          <p className="text-xl font-black text-slate-800">{totalExpected}</p>
        </div>
        <div className="bg-white border border-slate-100 rounded-xl p-4 shadow-sm">
          <p className="text-[9px] font-extrabold text-slate-400 uppercase tracking-wider mb-1">Verified Count</p>
          <p className="text-xl font-black text-emerald-600">{totalVerified}</p>
        </div>
        <div className="bg-white border border-slate-100 rounded-xl p-4 shadow-sm">
          <p className="text-[9px] font-extrabold text-slate-400 uppercase tracking-wider mb-1">Missing Count</p>
          <p className="text-xl font-black text-amber-600">{totalUnverified}</p>
        </div>
        <div className="bg-white border border-slate-100 rounded-xl p-4 shadow-sm">
          <p className="text-[9px] font-extrabold text-slate-400 uppercase tracking-wider mb-1">Verification Rate</p>
          <p className="text-xl font-black text-sky-700">{progressPercent}%</p>
        </div>
      </div>

      {/* PROGRESS BAR */}
      <div className="bg-white border border-slate-100 rounded-2xl p-4 shadow-sm">
        <div className="flex justify-between items-center text-xs font-bold text-slate-700 mb-1.5">
          <span>Audit Progress</span>
          <span>{totalVerified} / {totalExpected} Assets Scanned</span>
        </div>
        <div className="w-full bg-slate-100 rounded-full h-3 overflow-hidden border border-slate-200">
          <div
            className="bg-sky-700 h-full transition-all duration-300 rounded-full"
            style={{ width: `${progressPercent}%` }}
          />
        </div>
      </div>

      {/* CORE WORKSPACE FOR ACTIVE SESSIONS */}
      {session.status === "ASSIGNED" || session.status === "IN_PROGRESS" || session.status === "REOPENED" ? (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start no-print">
          
          {/* LEFT: SCANNER CONFIGS & FEEDBACK (1/3 WIDTH) */}
          <div className="lg:col-span-1 space-y-6">
            {isOperator ? (
              <div className="bg-white border border-slate-100 rounded-2xl p-5 shadow-sm space-y-4">
                <h3 className="text-xs font-black text-slate-800 uppercase tracking-widest border-b border-slate-50 pb-2">
                  Inventory Monitoring Panel
                </h3>
                <div className="space-y-3.5 text-xs">
                  <div className="p-3 bg-sky-50/50 border border-sky-100 rounded-xl space-y-1.5">
                    <p className="text-slate-500 font-bold uppercase text-[9px] tracking-wider">Assigned Inventory Person</p>
                    <p className="font-extrabold text-sky-950 text-sm">{session.inventoryPerson.name}</p>
                  </div>
                  <div className="p-3 bg-slate-50 border border-slate-100 rounded-xl space-y-1">
                    <p className="text-slate-500 font-bold uppercase text-[9px]">Timeline</p>
                    <p className="font-bold text-slate-800">Start: {new Date(session.startDate).toLocaleDateString()}</p>
                    <p className="font-bold text-slate-800">Due: {new Date(session.dueDate).toLocaleDateString()}</p>
                  </div>
                  {session.notes && (
                    <div className="p-3 bg-slate-50 border border-slate-100 rounded-xl space-y-1">
                      <p className="text-slate-500 font-bold uppercase text-[9px]">Instructions</p>
                      <p className="text-slate-700 leading-normal font-medium">{session.notes}</p>
                    </div>
                  )}
                  <div className="p-3 bg-amber-50 border border-amber-250 rounded-xl flex items-start gap-1.5">
                    <Info size={14} className="text-amber-600 shrink-0 mt-0.5" />
                    <p className="text-[10px] text-amber-800 leading-normal">
                      Inventory counting is assigned to the Inventory Person. You can monitor the progress bar and verified lists in real-time as they scan tags.
                    </p>
                  </div>
                </div>
              </div>
            ) : (
              <>
                {/* Webcam Scanner Frame */}
                <div className="bg-white border border-slate-100 rounded-2xl p-5 shadow-sm space-y-4">
                  <h3 className="text-xs font-black text-slate-800 uppercase tracking-widest border-b border-slate-50 pb-2">
                    QR Tag Scanner
                  </h3>

                  {activeScan ? (
                    <div className="space-y-3">
                      <div className="relative w-full aspect-video bg-black rounded-xl overflow-hidden border-2 border-sky-600 shadow-inner flex items-center justify-center">
                        <video
                          ref={videoRef}
                          className="w-full h-full object-cover transform scale-x-[-1]"
                        />
                        <canvas ref={canvasRef} className="hidden" />
                        
                        {/* Scanner sight overlay */}
                        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                          <div className="w-36 h-36 border-2 border-emerald-500/80 rounded-xl relative shadow-[0_0_0_9999px_rgba(15,23,42,0.6)] animate-pulse">
                            <div className="absolute top-0 left-0 w-4 h-4 border-t-4 border-l-4 border-emerald-400 -mt-1 -ml-1 rounded-tl" />
                            <div className="absolute top-0 right-0 w-4 h-4 border-t-4 border-r-4 border-emerald-400 -mt-1 -mr-1 rounded-tr" />
                            <div className="absolute bottom-0 left-0 w-4 h-4 border-b-4 border-l-4 border-emerald-400 -mb-1 -ml-1 rounded-bl" />
                            <div className="absolute bottom-0 right-0 w-4 h-4 border-b-4 border-r-4 border-emerald-400 -mb-1 -mr-1 rounded-br" />
                          </div>
                        </div>
                      </div>
                      <button
                        onClick={stopCamera}
                        className="w-full py-2 bg-red-655 hover:bg-red-750 text-white rounded-lg text-xs font-bold transition-all shadow-sm"
                      >
                        Close Camera Stream
                      </button>
                    </div>
                  ) : (
                    <div className="text-center py-6 border-2 border-dashed border-slate-150 rounded-xl space-y-3 bg-slate-50/50">
                      <Camera className="mx-auto text-slate-400" size={32} />
                      <div>
                        <p className="text-xs font-bold text-slate-700">Scan QR Code via Device Camera</p>
                        <p className="text-[10px] text-slate-400 mt-0.5">Compatible with webcams & mobile cameras</p>
                      </div>
                      <button
                        onClick={startCamera}
                        className="px-4 py-2 bg-sky-700 hover:bg-sky-850 text-white rounded-lg text-xs font-bold transition-all shadow-sm flex items-center space-x-1 mx-auto"
                      >
                        <Camera size={12} />
                        <span>Open QR Camera</span>
                      </button>

                      {cameraPermission === false && (
                        <p className="text-[10px] text-red-650 font-bold px-4">
                          Camera permission is required. Grant permissions or key-in tag manually.
                        </p>
                      )}
                    </div>
                  )}

                  {/* Manual Input Fallback */}
                  <div className="border-t border-slate-100 pt-4 mt-2">
                    <p className="text-[10px] text-slate-400 font-bold uppercase mb-2">Manual Asset Tag Fallback</p>
                    <form onSubmit={handleManualSubmit} className="flex space-x-2">
                      <input
                        type="text"
                        placeholder="e.g. DBU-ELEC-4532"
                        className="flex-1 p-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-semibold focus:outline-none focus:border-sky-500 uppercase font-mono"
                        value={manualInput}
                        onChange={(e) => setManualInput(e.target.value)}
                      />
                      <button
                        type="submit"
                        disabled={isPending}
                        className="px-4 py-2 bg-slate-800 hover:bg-slate-900 text-white rounded-lg text-xs font-bold transition-all shadow-sm"
                      >
                        {isPending ? <Loader2 size={12} className="animate-spin" /> : "Verify"}
                      </button>
                    </form>
                  </div>

                </div>

                {/* SCAN RESULT STICKERS & BANNERS */}
                {scanStatus !== "idle" && (
                  <div className={`p-4 rounded-2xl border flex items-start gap-3 shadow-sm ${
                    scanStatus === "success"
                      ? "bg-emerald-50 border-emerald-250 text-emerald-800 animate-fade-in"
                      : scanStatus === "duplicate"
                      ? "bg-amber-50 border-amber-250 text-amber-800 animate-fade-in"
                      : "bg-red-50 border-red-250 text-red-800 animate-fade-in"
                  }`}>
                    {scanStatus === "success" && <CheckCircle size={16} className="text-emerald-600 shrink-0 mt-0.5" />}
                    {scanStatus === "duplicate" && <AlertTriangle size={16} className="text-amber-600 shrink-0 mt-0.5" />}
                    {scanStatus === "error" && <XCircle size={16} className="text-red-600 shrink-0 mt-0.5" />}
                    <div>
                      <h4 className="text-xs font-extrabold uppercase">
                        {scanStatus === "success" && "✓ Asset Verified"}
                        {scanStatus === "duplicate" && "Already Counted"}
                        {scanStatus === "error" && "Scan Error"}
                      </h4>
                      <p className="text-[11px] font-semibold leading-relaxed mt-0.5">{scanMessage}</p>
                    </div>
                  </div>
                )}
              </>
            )}

            {/* Last verified asset card details */}
            {lastScannedAsset && (
              <div className="bg-white border border-slate-100 rounded-2xl p-5 shadow-sm space-y-4">
                <h3 className="text-xs font-black text-slate-800 uppercase tracking-widest border-b border-slate-50 pb-2">
                  Last Scanned Asset
                </h3>

                <div className="flex gap-4">
                  {lastScannedAsset.imageUrl ? (
                    /* eslint-disable-next-line @next/next/no-img-element */
                    <img
                      src={lastScannedAsset.imageUrl}
                      alt="Verified Item"
                      className="w-16 h-16 rounded-lg object-cover border border-slate-100 shrink-0"
                    />
                  ) : (
                    <div className="w-16 h-16 rounded-lg bg-slate-50 border border-slate-100 flex items-center justify-center text-slate-350 shrink-0">
                      <QrCode size={24} />
                    </div>
                  )}
                  <div className="overflow-hidden">
                    <h4 className="text-xs font-bold text-slate-800 truncate leading-none mb-1.5">{lastScannedAsset.name}</h4>
                    <p className="text-[10px] font-mono font-bold text-sky-700 leading-none mb-1">{lastScannedAsset.assetCode}</p>
                    <p className="text-[10px] text-slate-400 font-semibold truncate leading-none mb-1">S/N: {lastScannedAsset.serialNumber}</p>
                    <span className="inline-block px-1.5 py-0.5 bg-slate-100 text-[8px] font-bold text-slate-600 rounded">
                      {lastScannedAsset.categoryName} &rarr; {lastScannedAsset.typeName}
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3 text-[10px] border-t border-slate-100 pt-3">
                  <div>
                    <span className="text-slate-400 font-bold block mb-0.5">Assigned Custodian</span>
                    <span className="font-bold text-slate-700">{lastScannedAsset.assignedTo}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 font-bold block mb-0.5">Asset Status</span>
                    <span className="font-extrabold text-emerald-700 uppercase">{lastScannedAsset.status}</span>
                  </div>
                </div>
              </div>
            )}

          </div>

          {/* RIGHT: TABBED VERIFIED VS MISSING LISTS (2/3 WIDTH) */}
          <div className="lg:col-span-2 space-y-6">
            
            {/* Search and Filters */}
            <div className="bg-white border border-slate-100 rounded-2xl p-4 shadow-sm flex flex-col md:flex-row md:items-center gap-3">
              <div className="relative flex-1">
                <Search size={14} className="absolute left-3 top-3 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search assets by tag, name, or serial number..."
                  className="w-full p-2 pl-9 bg-slate-50 border border-slate-200 rounded-lg text-xs font-semibold focus:outline-none focus:border-sky-500"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>

              <div className="flex items-center space-x-2">
                <Filter size={12} className="text-slate-400" />
                <select
                  className="p-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-semibold text-slate-600 focus:outline-none"
                  value={selectedCategory}
                  onChange={(e) => setSelectedCategory(e.target.value)}
                >
                  <option value="">All Categories</option>
                  {uniqueCategories.map(c => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>

                <select
                  className="p-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-semibold text-slate-600 focus:outline-none"
                  value={selectedStatus}
                  onChange={(e) => setSelectedStatus(e.target.value)}
                >
                  <option value="">All Statuses</option>
                  <option value="ACTIVE">ACTIVE</option>
                  <option value="ASSIGNED">ASSIGNED</option>
                  <option value="UNDER_MAINTENANCE">UNDER MAINTENANCE</option>
                  <option value="DISPOSED">DISPOSED</option>
                </select>
              </div>
            </div>

            {/* List Panels */}
            <div className="bg-white border border-slate-100 rounded-2xl shadow-sm overflow-hidden">
              
              {/* Tab Navigation header */}
              <div className="flex border-b border-slate-100">
                <button
                  onClick={() => setActiveTab("verified")}
                  className={`flex-1 py-3 text-xs font-extrabold uppercase tracking-wider transition-colors border-b-2 ${
                    activeTab === "verified"
                      ? "border-sky-700 text-sky-700 bg-sky-50/20"
                      : "border-transparent text-slate-450 hover:text-slate-700"
                  }`}
                >
                  Verified Assets ({listVerified.length})
                </button>
                <button
                  onClick={() => setActiveTab("unverified")}
                  className={`flex-1 py-3 text-xs font-extrabold uppercase tracking-wider transition-colors border-b-2 ${
                    activeTab === "unverified"
                      ? "border-amber-600 text-amber-600 bg-amber-50/10"
                      : "border-transparent text-slate-450 hover:text-slate-700"
                  }`}
                >
                  Missing / Unverified ({listUnverified.length})
                </button>
              </div>

              {/* Verified Tab List */}
              {activeTab === "verified" && (
                <div className="p-4 overflow-x-auto">
                  {listVerified.length === 0 ? (
                    <div className="text-center py-12 text-xs text-slate-400 font-semibold">
                      No verified assets matching filter criteria found in this session.
                    </div>
                  ) : (
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="border-b border-slate-100 text-[10px] font-extrabold text-slate-400 uppercase tracking-wider bg-slate-50/40">
                          <th className="py-2 px-3">Asset Code</th>
                          <th className="py-2 px-3">Asset Name</th>
                          <th className="py-2 px-3">Classification</th>
                          <th className="py-2 px-3">Scanned At</th>
                          <th className="py-2 px-3">Verifier</th>
                          <th className="py-2 px-3 text-center">Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {listVerified.map(item => (
                          <tr key={item.id} className="border-b border-slate-50 text-xs text-slate-700 hover:bg-slate-50/20">
                            <td className="py-2 px-3 font-mono font-bold text-sky-750">{item.asset.assetCode}</td>
                            <td className="py-2 px-3 font-bold text-slate-800">{item.asset.name}</td>
                            <td className="py-2 px-3 font-semibold text-slate-500">
                              {item.asset.categoryName} &rarr; {item.asset.typeName}
                            </td>
                            <td className="py-2 px-3 font-mono text-[10px]">
                              {new Date(item.scannedAt).toLocaleTimeString()}
                            </td>
                            <td className="py-2 px-3 text-slate-650">{item.scannedBy.name}</td>
                            <td className="py-2 px-3 text-center">
                              <span className="inline-block px-1.5 py-0.5 bg-emerald-50 text-emerald-700 text-[9px] font-extrabold rounded">
                                VERIFIED
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </div>
              )}

              {/* Unverified Tab List */}
              {activeTab === "unverified" && (
                <div className="p-4 overflow-x-auto">
                  {listUnverified.length === 0 ? (
                    <div className="text-center py-12 text-xs text-emerald-600 font-extrabold">
                      ✓ All expected department assets have been successfully verified!
                    </div>
                  ) : (
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="border-b border-slate-100 text-[10px] font-extrabold text-slate-400 uppercase tracking-wider bg-slate-50/40">
                          <th className="py-2 px-3">Asset Code</th>
                          <th className="py-2 px-3">Asset Name</th>
                          <th className="py-2 px-3">Serial Number</th>
                          <th className="py-2 px-3">Classification</th>
                          <th className="py-2 px-3">Current Custodian</th>
                          <th className="py-2 px-3 text-center">Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {listUnverified.map(asset => (
                          <tr key={asset.id} className="border-b border-slate-50 text-xs text-slate-700 hover:bg-slate-50/20">
                            <td className="py-2 px-3 font-mono font-bold text-slate-600">{asset.assetCode}</td>
                            <td className="py-2 px-3 font-bold text-slate-800">{asset.name}</td>
                            <td className="py-2 px-3 font-mono text-slate-500">{asset.serialNumber}</td>
                            <td className="py-2 px-3 font-semibold text-slate-500">
                              {asset.categoryName} &rarr; {asset.typeName}
                            </td>
                            <td className="py-2 px-3 text-slate-650">{asset.assignedTo}</td>
                            <td className="py-2 px-3 text-center">
                              <span className="inline-block px-1.5 py-0.5 bg-red-50 text-red-700 text-[9px] font-extrabold rounded">
                                MISSING
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </div>
              )}

            </div>

          </div>

        </div>
      ) : (
        /* REPORT VIEW FOR COMPLETED OR CANCELLED SESSIONS */
        <div className="space-y-6">
          {isOperator && session.status === "COMPLETED" && (
            <div className="bg-white border border-emerald-200 rounded-2xl p-6 shadow-md space-y-4 no-print border-l-4 border-l-emerald-650">
              <div className="flex justify-between items-start">
                <div>
                  <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                    <CheckCircle className="text-emerald-650" size={16} />
                    <span>Awaiting Operator Final Review</span>
                  </h3>
                  <p className="text-[11px] text-slate-500 font-medium mt-1">
                    Inventory Person <strong>{session.inventoryPerson.name}</strong> submitted this inventory session. Review the counting results below and approve or reopen the audit.
                  </p>
                </div>
              </div>

              <div className="bg-slate-50 border border-slate-150 p-4 rounded-xl text-xs grid grid-cols-2 sm:grid-cols-4 gap-4">
                <div>
                  <span className="text-slate-400 font-bold block mb-0.5">Total Expected</span>
                  <span className="text-sm font-black text-slate-850">{totalExpected}</span>
                </div>
                <div>
                  <span className="text-slate-400 font-bold block mb-0.5">Verified / Counted</span>
                  <span className="text-sm font-black text-emerald-700">{totalVerified}</span>
                </div>
                <div>
                  <span className="text-slate-400 font-bold block mb-0.5">Unverified / Missing</span>
                  <span className="text-sm font-black text-red-750">{totalUnverified}</span>
                </div>
                <div>
                  <span className="text-slate-400 font-bold block mb-0.5">Success Rate</span>
                  <span className="text-sm font-black text-sky-700">{progressPercent}%</span>
                </div>
              </div>

              <div className="flex gap-2">
                <button
                  onClick={() => {
                    setReopenError(null);
                    setShowReopenModal(true);
                  }}
                  className="px-4 py-2 border border-amber-300 text-amber-800 hover:bg-amber-50 rounded-lg text-xs font-bold transition-all shadow-sm"
                >
                  Reject & Reopen
                </button>
                <button
                  onClick={handleApproveSession}
                  className="px-5 py-2 bg-emerald-600 hover:bg-emerald-750 text-white rounded-lg text-xs font-bold transition-all shadow-md"
                >
                  Approve & Finalize Audit
                </button>
              </div>
            </div>
          )}

          <div className="bg-white border border-slate-100 rounded-2xl p-6 shadow-sm space-y-4 no-print">
            <h3 className="text-sm font-black text-slate-800 uppercase tracking-widest border-b border-slate-100 pb-2 flex items-center space-x-1.5">
              <CheckCircle className="text-emerald-500" size={16} />
              <span>Inventory session Report Summary</span>
            </h3>
            
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-xs">
              <div>
                <span className="text-slate-400 font-bold block">Start Date</span>
                <span className="font-bold text-slate-700">{new Date(session.startDate).toLocaleDateString()}</span>
              </div>
              <div>
                <span className="text-slate-400 font-bold block">Completion Date</span>
                <span className="font-bold text-slate-700">
                  {session.completedAt ? new Date(session.completedAt).toLocaleDateString() : "-"}
                </span>
              </div>
              <div>
                <span className="text-slate-400 font-bold block">Conducted By</span>
                <span className="font-bold text-slate-700">{session.inventoryPerson.name}</span>
              </div>
              <div>
                <span className="text-slate-400 font-bold block">Approved / Closed By</span>
                <span className="font-bold text-slate-700">{session.completedBy?.name || "System Controller"}</span>
              </div>
            </div>
            
            {session.notes && (
              <div className="p-3 bg-slate-50 border border-slate-150 rounded-lg text-xs leading-relaxed text-slate-600">
                <span className="font-bold text-slate-700 block mb-1">Session Scope Notes:</span>
                {session.notes}
              </div>
            )}
          </div>

          {/* TABLE DISPLAY FOR COMPLETED INVENTORIES */}
          <div className="bg-white border border-slate-100 rounded-2xl shadow-sm p-6 space-y-4">
            <h4 className="text-xs font-black text-slate-850 uppercase tracking-widest pb-2 border-b border-slate-50">
              Audit Detail Registry List
            </h4>
            
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b-2 border-slate-200 text-[10px] font-extrabold text-slate-500 uppercase tracking-wider bg-slate-50/50">
                    <th className="py-2.5 px-3">Asset Tag</th>
                    <th className="py-2.5 px-3">Asset Name</th>
                    <th className="py-2.5 px-3">Classification</th>
                    <th className="py-2.5 px-3">Serial Number</th>
                    <th className="py-2.5 px-3">Default Custodian</th>
                    <th className="py-2.5 px-3 text-center">Audit Status</th>
                    <th className="py-2.5 px-3">Verify Date</th>
                  </tr>
                </thead>
                <tbody>
                  {expectedAssets.map(asset => {
                    const isVerified = verifiedIds.has(asset.id);
                    const log = verifications.find(v => v.assetId === asset.id);
                    return (
                      <tr key={asset.id} className="border-b border-slate-100 text-slate-700 hover:bg-slate-50/10">
                        <td className="py-3 px-3 font-mono font-bold text-slate-800">{asset.assetCode}</td>
                        <td className="py-3 px-3 font-bold text-slate-850">{asset.name}</td>
                        <td className="py-3 px-3 font-semibold text-slate-500">
                          {asset.categoryName} {asset.typeName ? `→ ${asset.typeName}` : ""}
                        </td>
                        <td className="py-3 px-3 font-mono text-slate-450">{asset.serialNumber}</td>
                        <td className="py-3 px-3 font-semibold text-slate-650">{asset.assignedTo}</td>
                        <td className="py-3 px-3 text-center">
                          <span className={`inline-block px-2 py-0.5 text-[9px] font-extrabold rounded ${
                            isVerified
                              ? "bg-emerald-50 text-emerald-700 border border-emerald-100"
                              : "bg-red-50 text-red-700 border border-red-100"
                          }`}>
                            {isVerified ? "VERIFIED" : "MISSING"}
                          </span>
                        </td>
                        <td className="py-3 px-3 font-mono text-slate-500">
                          {log ? new Date(log.scannedAt).toLocaleDateString() : "-"}
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
      {/* COMPLETE INVENTORY CONFIRMATION MODAL */}
      {showCompleteModal && (
        <div className="fixed inset-0 bg-slate-900/60 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
          <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl p-6 border border-slate-150 text-center space-y-4">
            <div className="w-12 h-12 rounded-full bg-yellow-50 flex items-center justify-center mx-auto text-yellow-500 border border-yellow-100">
              <AlertOctagon size={24} />
            </div>
            
            <div>
              <h3 className="text-base font-bold text-slate-800">Complete Inventory Audit?</h3>
              <p className="text-[11px] text-slate-450 font-medium mt-1">
                Completing the session locks all audits. No further asset scans or verifications can be added.
              </p>
            </div>

            <div className="bg-slate-50 border border-slate-150 rounded-xl p-4 text-xs grid grid-cols-3 gap-2">
              <div>
                <span className="text-slate-400 font-bold block mb-0.5">Expected</span>
                <span className="font-extrabold text-slate-800 text-sm">{totalExpected}</span>
              </div>
              <div>
                <span className="text-slate-450 font-bold block mb-0.5">Verified</span>
                <span className="font-extrabold text-emerald-600 text-sm">{totalVerified}</span>
              </div>
              <div>
                <span className="text-slate-450 font-bold block mb-0.5">Missing</span>
                <span className="font-extrabold text-red-600 text-sm">{totalUnverified}</span>
              </div>
            </div>

            <div className="flex space-x-3 pt-2">
              <button
                onClick={() => setShowCompleteModal(false)}
                className="flex-1 py-2 bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold rounded-lg text-xs transition-colors"
              >
                Go Back
              </button>
              <button
                onClick={handleCompleteSession}
                disabled={isPending}
                className="flex-1 py-2 bg-[#0b4a6e] hover:bg-sky-850 text-white font-bold rounded-lg text-xs transition-colors flex items-center justify-center space-x-1"
              >
                {isPending ? (
                  <>
                    <Loader2 size={12} className="animate-spin" />
                    <span>Completing...</span>
                  </>
                ) : (
                  <span>Yes, Complete</span>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* REOPEN SESSION REJECTION MODAL */}
      {showReopenModal && (
        <div className="fixed inset-0 bg-slate-900/60 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
          <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl p-6 border border-slate-150 space-y-4">
            
            <div className="flex justify-between items-start border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-sm font-bold text-slate-800 flex items-center gap-1.5">
                  <XOctagon size={16} className="text-amber-600" />
                  <span>Reject & Reopen Session</span>
                </h3>
                <p className="text-[10px] text-slate-400 font-semibold mt-1">
                  Reopening the session allows the Inventory Person to continue scanning assets.
                </p>
              </div>
              <button
                onClick={() => {
                  setShowReopenModal(false);
                  setReopenReason("");
                  setReopenError(null);
                }}
                className="text-slate-450 hover:text-slate-650 text-sm font-bold hover:bg-slate-100 px-2.5 py-1 rounded-lg"
              >
                ✕
              </button>
            </div>

            {reopenError && (
              <div className="p-3 bg-red-50 border border-red-150 rounded-xl text-red-800 text-[11px] font-semibold">
                {reopenError}
              </div>
            )}

            <form onSubmit={handleReopenSession} className="space-y-4">
              <div className="space-y-1">
                <label className="block text-[10px] font-bold text-slate-500 uppercase">
                  Rejection Reason / Reopen Instructions *
                </label>
                <textarea
                  className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-semibold focus:outline-none h-24 resize-none"
                  placeholder="Specify what needs to be verified, missing scans, or comments..."
                  value={reopenReason}
                  onChange={(e) => setReopenReason(e.target.value)}
                  required
                />
              </div>

              <div className="flex justify-end space-x-2 border-t border-slate-100 pt-3">
                <button
                  type="button"
                  onClick={() => {
                    setShowReopenModal(false);
                    setReopenReason("");
                    setReopenError(null);
                  }}
                  className="px-4 py-2 border border-slate-200 rounded-lg text-xs font-bold text-slate-500 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isPending}
                  className="px-5 py-2 bg-amber-605 hover:bg-amber-700 text-white rounded-lg text-xs font-bold transition-all shadow-sm flex items-center gap-1"
                >
                  {isPending && <Loader2 size={12} className="animate-spin" />}
                  Reject & Reopen Audit
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
