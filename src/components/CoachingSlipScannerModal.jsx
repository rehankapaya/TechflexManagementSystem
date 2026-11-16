import React, { useState, useRef, useEffect } from 'react';
import { createWorker } from 'tesseract.js';
import * as pdfjsLib from 'pdfjs-dist';
import { parseSlipTextLocal, parseSlipWithGeminiAI, COACHING_GRADES } from '../utils/slipOcrParser';
import { MONTHS_SHORT, getCanonicalShortMonth } from '../utils/monthUtils';
import toast from 'react-hot-toast';
import {
  Camera,
  Upload,
  X,
  FileText,
  Sparkles,
  Cpu,
  CheckCircle2,
  AlertCircle,
  Eye,
  RotateCw,
  RefreshCw,
  Key,
  Calendar,
  CreditCard,
  User,
  Hash,
  ExternalLink,
  Sliders,
  DollarSign
} from 'lucide-react';

// Configure pdfjs worker using CDN fallback to prevent Vite bundling complexities
if (typeof window !== 'undefined' && pdfjsLib.GlobalWorkerOptions) {
  pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version || '4.10.38'}/pdf.worker.min.mjs`;
}

const CoachingSlipScannerModal = ({ isOpen, onClose, onApply, coachingStudents = [] }) => {
  const [fileSrc, setFileSrc] = useState(null); // Local DataURL only (NOT stored in DB)
  const [fileName, setFileName] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [progressMsg, setProgressMsg] = useState('');
  const [ocrProgress, setOcrProgress] = useState(0);

  // Engine: 'local' (Tesseract.js) | 'gemini' (AI Vision)
  const [engine, setEngine] = useState('local');
  const [geminiApiKey, setGeminiApiKey] = useState(() => {
    return localStorage.getItem('TECHFLEX_GEMINI_API_KEY') || import.meta.env.VITE_GEMINI_API_KEY || '';
  });
  const [showKeyConfig, setShowKeyConfig] = useState(false);

  // Extracted Data State
  const [extractedData, setExtractedData] = useState(null);

  const fileInputRef = useRef(null);
  const cameraInputRef = useRef(null);

  useEffect(() => {
    if (!isOpen) {
      // Clear memory to ensure zero persisted slip images
      setFileSrc(null);
      setFileName('');
      setExtractedData(null);
      setIsProcessing(false);
      setProgressMsg('');
      setOcrProgress(0);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  // Handle Image or PDF selection
  const handleFileChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setFileName(file.name);
    setExtractedData(null);

    // If PDF, convert 1st page to high-res canvas image
    if (file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf')) {
      try {
        setIsProcessing(true);
        setProgressMsg('Rendering PDF page to high-resolution image...');
        const arrayBuffer = await file.arrayBuffer();
        const loadingTask = pdfjsLib.getDocument({ data: arrayBuffer });
        const pdfDoc = await loadingTask.promise;
        const page = await pdfDoc.getPage(1);

        const viewport = page.getViewport({ scale: 2.0 }); // 2x for sharp text
        const canvas = document.createElement('canvas');
        canvas.width = viewport.width;
        canvas.height = viewport.height;
        const ctx = canvas.getContext('2d');

        await page.render({ canvasContext: ctx, viewport }).promise;
        const renderedDataUrl = canvas.toDataURL('image/png');
        setFileSrc(renderedDataUrl);
        setIsProcessing(false);
        // Trigger auto-scan
        processSlip(renderedDataUrl);
      } catch (err) {
        console.error("PDF render error:", err);
        toast.error("Failed to render PDF. Please upload a clear photo/image of the slip.");
        setIsProcessing(false);
      }
    } else if (file.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onload = (event) => {
        const dataUrl = event.target.result;
        setFileSrc(dataUrl);
        processSlip(dataUrl);
      };
      reader.readAsDataURL(file);
    } else {
      toast.error("Please upload an image (PNG, JPG) or PDF fee slip.");
    }

    e.target.value = '';
  };

  // Main Slip Processing Routine
  const processSlip = async (imageSrc) => {
    const activeSrc = imageSrc || fileSrc;
    if (!activeSrc) {
      toast.error("Please select or capture a fee slip first");
      return;
    }

    setIsProcessing(true);
    setOcrProgress(10);

    try {
      if (engine === 'gemini' && geminiApiKey.trim()) {
        setProgressMsg('Analyzing fee slip with Gemini AI Vision...');
        setOcrProgress(50);
        const parsed = await parseSlipWithGeminiAI(activeSrc, geminiApiKey.trim(), coachingStudents);
        setExtractedData(parsed);
        setOcrProgress(100);
        toast.success("Fee slip details extracted via AI Vision!");
      } else {
        // Local Browser OCR via Tesseract.js
        setProgressMsg('Initializing local optical character recognition...');
        setOcrProgress(25);

        const worker = await createWorker('eng', 1, {
          logger: m => {
            if (m.status === 'recognizing text') {
              setOcrProgress(Math.round(25 + (m.progress || 0) * 65));
              setProgressMsg(`Scanning slip text: ${Math.round((m.progress || 0) * 100)}%`);
            }
          }
        });

        setProgressMsg('Reading handwritten lines and slip boxes...');
        const ret = await worker.recognize(activeSrc);
        await worker.terminate();

        setOcrProgress(95);
        setProgressMsg('Matching coaching student and payment fields...');

        const parsed = parseSlipTextLocal(ret.data.text, coachingStudents);
        setExtractedData(parsed);
        setOcrProgress(100);

        if (parsed.matchedStudent) {
          toast.success(`Matched Student: ${parsed.matchedStudent.name} (${parsed.matchedStudent.roll_no || ''})`);
        } else {
          toast.success("Slip scanned! Please verify the student name.");
        }
      }
    } catch (err) {
      console.error("Slip extraction error:", err);
      toast.error(err.message || "Failed to extract fee slip details");
    } finally {
      setIsProcessing(false);
    }
  };

  // Save Gemini Key to localStorage
  const handleSaveGeminiKey = (key) => {
    const trimmed = key.trim();
    setGeminiApiKey(trimmed);
    localStorage.setItem('TECHFLEX_GEMINI_API_KEY', trimmed);
    toast.success("Gemini API Key saved for slip scanner");
    setShowKeyConfig(false);
  };

  // Apply to Parent Form
  const handleApplyForm = () => {
    if (!extractedData) return;

    onApply({
      student: extractedData.matchedStudent,
      studentName: extractedData.studentName,
      rollNo: extractedData.rollNo,
      grade: extractedData.grade,
      month: extractedData.month || getCanonicalShortMonth(),
      year: extractedData.year || new Date().getFullYear().toString(),
      payDate: extractedData.payDate || new Date().toISOString().split('T')[0],
      amount: Number(extractedData.amount) || 0,
      lateFee: Number(extractedData.lateFee) || 0,
      serialNo: extractedData.serialNo || '',
      paymentMethod: extractedData.paymentMethod || 'Cash'
    });

    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/70 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white w-full max-w-4xl max-h-[92vh] rounded-3xl shadow-2xl border border-slate-200 flex flex-col overflow-hidden animate-in zoom-in-95 duration-200">
        {/* MODAL HEADER */}
        <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between bg-gradient-to-r from-slate-50 via-white to-emerald-50/40">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-emerald-600 text-white flex items-center justify-center shadow-md shadow-emerald-600/20">
              <Camera size={20} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-extrabold text-slate-900 text-base sm:text-lg tracking-tight">
                  Scan Filled Fee Slip
                </h3>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200 uppercase">
                  Coaching Module
                </span>
              </div>
              <p className="text-xs text-slate-500 font-medium">
                Extract student, month, date, serial number & amount directly into the fee form
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowKeyConfig(!showKeyConfig)}
              className="p-2 rounded-xl text-slate-500 hover:text-slate-800 hover:bg-slate-100 transition-colors cursor-pointer"
              title="Scanner Engine & AI Settings"
            >
              <Sliders size={18} />
            </button>
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 flex items-center justify-center transition-colors cursor-pointer"
            >
              <X size={16} />
            </button>
          </div>
        </div>

        {/* SETTINGS / ENGINE BAR (COLLAPSIBLE) */}
        {showKeyConfig && (
          <div className="p-4 bg-slate-50 border-b border-slate-200 text-xs space-y-3 animate-in slide-in-from-top-2">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <span className="font-bold text-slate-800">OCR Recognition Engine</span>
                <p className="text-[11px] text-slate-500">Choose between 100% free offline OCR or Gemini AI Vision</p>
              </div>

              <div className="flex items-center bg-white p-1 rounded-xl border border-slate-200 shadow-2xs">
                <button
                  type="button"
                  onClick={() => setEngine('local')}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-bold transition-all cursor-pointer ${
                    engine === 'local'
                      ? 'bg-emerald-600 text-white shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <Cpu size={14} />
                  <span>Local Engine (Tesseract)</span>
                </button>
                <button
                  type="button"
                  onClick={() => setEngine('gemini')}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-bold transition-all cursor-pointer ${
                    engine === 'gemini'
                      ? 'bg-blue-600 text-white shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <Sparkles size={14} />
                  <span>Gemini AI Vision</span>
                </button>
              </div>
            </div>

            {engine === 'gemini' && (
              <div className="p-3 bg-blue-50/80 rounded-xl border border-blue-200/80 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-blue-900 flex items-center gap-1.5">
                    <Key size={13} className="text-blue-600" />
                    <span>Gemini API Key (Optional Free Tier)</span>
                  </span>
                  <a
                    href="https://aistudio.google.com/app/apikey"
                    target="_blank"
                    rel="noreferrer"
                    className="text-blue-600 hover:underline flex items-center gap-1 text-[11px] font-semibold"
                  >
                    Get Free Key <ExternalLink size={11} />
                  </a>
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="password"
                    placeholder="AIzaSy..."
                    value={geminiApiKey}
                    onChange={(e) => setGeminiApiKey(e.target.value)}
                    className="flex-1 px-3 py-1.5 bg-white border border-blue-200 rounded-lg text-slate-800 outline-none focus:ring-2 focus:ring-blue-500 font-mono text-xs"
                  />
                  <button
                    type="button"
                    onClick={() => handleSaveGeminiKey(geminiApiKey)}
                    className="px-3 py-1.5 bg-blue-600 text-white font-bold rounded-lg hover:bg-blue-700 transition-colors cursor-pointer shrink-0"
                  >
                    Save Key
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* MODAL BODY (SCROLLABLE) */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-5 custom-scrollbar">
          {/* UPLOAD / CAPTURE BUTTONS */}
          {!fileSrc && (
            <div className="border-2 border-dashed border-slate-300 hover:border-emerald-500 rounded-3xl p-8 sm:p-12 text-center transition-all bg-slate-50/60 hover:bg-emerald-50/20 group">
              <input
                type="file"
                ref={fileInputRef}
                accept="image/*,application/pdf"
                onChange={handleFileChange}
                className="hidden"
              />
              <input
                type="file"
                ref={cameraInputRef}
                accept="image/*"
                capture="environment"
                onChange={handleFileChange}
                className="hidden"
              />

              <div className="w-16 h-16 rounded-3xl bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto mb-4 group-hover:scale-105 transition-transform shadow-xs">
                <Upload size={28} />
              </div>

              <h4 className="text-base font-extrabold text-slate-800 tracking-tight mb-1">
                Upload or Take a Photo of the Filled Fee Slip
              </h4>
              <p className="text-xs text-slate-500 max-w-md mx-auto mb-6">
                Supports camera snapshot, JPG, PNG, and PDF slips (like TechFlex fees slip design). Slip image is strictly processed in-memory and <strong>never stored in the database</strong>.
              </p>

              <div className="flex flex-wrap items-center justify-center gap-3">
                <button
                  type="button"
                  onClick={() => cameraInputRef.current?.click()}
                  className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition-all shadow-md shadow-emerald-600/20 active:scale-95 cursor-pointer"
                >
                  <Camera size={16} />
                  <span>Take Camera Photo</span>
                </button>

                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-white hover:bg-slate-50 border border-slate-300 text-slate-700 text-xs font-bold transition-all shadow-xs active:scale-95 cursor-pointer"
                >
                  <FileText size={16} className="text-emerald-600" />
                  <span>Browse Image / PDF</span>
                </button>
              </div>
            </div>
          )}

          {/* ACTIVE SCAN & REVIEW SPLIT VIEW */}
          {fileSrc && (
            <div className="space-y-5">
              {/* STATUS & RE-SCAN ACTION BAR */}
              <div className="flex items-center justify-between p-3 rounded-2xl bg-slate-100/80 border border-slate-200">
                <div className="flex items-center gap-2 min-w-0">
                  <div className="w-8 h-8 rounded-xl bg-emerald-600 text-white flex items-center justify-center shrink-0">
                    <FileText size={16} />
                  </div>
                  <div className="min-w-0">
                    <div className="text-xs font-bold text-slate-900 truncate">{fileName || 'Scanned Fee Slip'}</div>
                    <div className="text-[10px] text-slate-500">Engine: {engine === 'gemini' ? 'Gemini AI Vision' : 'Tesseract Local OCR'}</div>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <button
                    type="button"
                    onClick={() => processSlip(fileSrc)}
                    disabled={isProcessing}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 text-xs font-bold transition-colors cursor-pointer"
                  >
                    <RefreshCw size={12} className={isProcessing ? 'animate-spin text-emerald-600' : ''} />
                    <span>Re-Scan</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setFileSrc(null);
                      setExtractedData(null);
                    }}
                    className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-200 transition-colors cursor-pointer"
                    title="Change Slip"
                  >
                    <RotateCw size={14} />
                  </button>
                </div>
              </div>

              {/* PROGRESS BAR */}
              {isProcessing && (
                <div className="p-4 bg-emerald-50 rounded-2xl border border-emerald-200 space-y-2 animate-pulse">
                  <div className="flex items-center justify-between text-xs font-bold text-emerald-900">
                    <span>{progressMsg || 'Processing Fee Slip...'}</span>
                    <span>{ocrProgress}%</span>
                  </div>
                  <div className="w-full bg-emerald-200/60 rounded-full h-2 overflow-hidden">
                    <div
                      style={{ width: `${ocrProgress}%` }}
                      className="bg-emerald-600 h-full rounded-full transition-all duration-300"
                    />
                  </div>
                </div>
              )}

              {/* TWO COLUMN PREVIEW & FORM REVIEW */}
              <div className="grid grid-cols-1 md:grid-cols-12 gap-5 items-start">
                {/* SLIP PREVIEW (5 cols) */}
                <div className="md:col-span-5 space-y-2">
                  <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5 px-1">
                    <Eye size={12} className="text-slate-500" />
                    <span>Slip Visual Preview</span>
                  </div>
                  <div className="relative rounded-2xl overflow-hidden border border-slate-300 bg-slate-900 shadow-inner group">
                    <img
                      src={fileSrc}
                      alt="Fee Slip Preview"
                      className="w-full max-h-72 object-contain bg-slate-950/80"
                    />
                    {isProcessing && (
                      <div className="absolute inset-0 bg-emerald-950/40 backdrop-blur-2xs flex flex-col items-center justify-center text-white">
                        <div className="w-8 h-8 border-2 border-emerald-400 border-t-transparent rounded-full animate-spin mb-2" />
                        <span className="text-xs font-bold tracking-tight">Reading Slip Lines...</span>
                      </div>
                    )}
                  </div>
                  <p className="text-[10px] text-slate-400 italic px-1">
                    🔒 Image stays in browser memory only and is discarded after closing.
                  </p>
                </div>

                {/* EXTRACTED FIELDS REVIEW (7 cols) */}
                <div className="md:col-span-7 space-y-4">
                  <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider flex items-center justify-between px-1">
                    <div className="flex items-center gap-1.5">
                      <CheckCircle2 size={12} className="text-emerald-600" />
                      <span>Extracted Fee Slip Fields</span>
                    </div>
                    {extractedData && (
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                        extractedData.matchedStudent
                          ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                          : 'bg-amber-100 text-amber-800 border border-amber-200'
                      }`}>
                        {extractedData.matchedStudent ? 'Student Matched' : 'Verify Student'}
                      </span>
                    )}
                  </div>

                  {extractedData ? (
                    <div className="p-4 rounded-2xl bg-white border border-slate-200 space-y-3.5 shadow-xs">
                      {/* Matched Student Selector / Confirmation */}
                      <div>
                        <label className="block text-[11px] font-bold text-slate-600 mb-1 flex items-center gap-1.5">
                          <User size={13} className="text-emerald-600" />
                          <span>Student Assignment</span>
                        </label>
                        <select
                          value={extractedData.matchedStudent?.id || ''}
                          onChange={(e) => {
                            const found = coachingStudents.find(s => s.id === e.target.value);
                            setExtractedData(prev => ({
                              ...prev,
                              matchedStudent: found || null,
                              studentName: found?.name || prev.studentName,
                              rollNo: found?.roll_no || prev.rollNo,
                              grade: found?.grade || prev.grade
                            }));
                          }}
                          className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold text-slate-800 outline-none focus:ring-2 focus:ring-emerald-500 cursor-pointer"
                        >
                          <option value="">-- Select Coaching Student --</option>
                          {coachingStudents.map(s => (
                            <option key={s.id} value={s.id}>
                              {s.roll_no ? `[${s.roll_no}] ` : ''}{s.name} - {s.grade || 'General'}
                            </option>
                          ))}
                        </select>
                        {extractedData.studentName && !extractedData.matchedStudent && (
                          <p className="text-[11px] text-amber-600 font-medium mt-1">
                            Text read on slip: "{extractedData.studentName}"
                          </p>
                        )}
                      </div>

                      {/* Optional Slip Serial Number & Payment Date */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div>
                          <label className="block text-[11px] font-bold text-slate-600 mb-1 flex items-center gap-1.5">
                            <Hash size={13} className="text-blue-600" />
                            <span>Slip Serial No (Optional)</span>
                          </label>
                          <input
                            type="text"
                            placeholder="e.g. SN-1042 or 042"
                            value={extractedData.serialNo || ''}
                            onChange={(e) => setExtractedData(prev => ({ ...prev, serialNo: e.target.value }))}
                            className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold text-slate-800 outline-none focus:ring-2 focus:ring-emerald-500 font-mono"
                          />
                        </div>

                        <div>
                          <label className="block text-[11px] font-bold text-slate-600 mb-1 flex items-center gap-1.5">
                            <Calendar size={13} className="text-purple-600" />
                            <span>Payment Date</span>
                          </label>
                          <input
                            type="date"
                            value={extractedData.payDate || ''}
                            onChange={(e) => setExtractedData(prev => ({ ...prev, payDate: e.target.value }))}
                            className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold text-slate-800 outline-none focus:ring-2 focus:ring-emerald-500"
                          />
                        </div>
                      </div>

                      {/* Billing Month & Year */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div>
                          <label className="block text-[11px] font-bold text-slate-600 mb-1">
                            Fees for Month
                          </label>
                          <select
                            value={extractedData.month || getCanonicalShortMonth()}
                            onChange={(e) => setExtractedData(prev => ({ ...prev, month: e.target.value }))}
                            className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold text-slate-800 outline-none focus:ring-2 focus:ring-emerald-500"
                          >
                            {MONTHS_SHORT.map(m => <option key={m} value={m}>{m}</option>)}
                          </select>
                        </div>

                        <div>
                          <label className="block text-[11px] font-bold text-slate-600 mb-1">
                            Billing Year
                          </label>
                          <input
                            type="number"
                            value={extractedData.year || new Date().getFullYear().toString()}
                            onChange={(e) => setExtractedData(prev => ({ ...prev, year: e.target.value }))}
                            className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold text-slate-800 outline-none focus:ring-2 focus:ring-emerald-500 font-mono"
                          />
                        </div>
                      </div>

                      {/* Amount Paid & Late Fees */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div>
                          <label className="block text-[11px] font-bold text-slate-600 mb-1 flex items-center gap-1.5">
                            <DollarSign size={13} className="text-emerald-600" />
                            <span>Amount (Rs.)</span>
                          </label>
                          <input
                            type="number"
                            placeholder="0"
                            value={extractedData.amount || ''}
                            onChange={(e) => setExtractedData(prev => ({ ...prev, amount: Number(e.target.value) || 0 }))}
                            className="w-full px-3 py-2 bg-emerald-50/50 border border-emerald-300 rounded-xl text-xs font-extrabold text-emerald-800 outline-none focus:ring-2 focus:ring-emerald-500 font-mono text-base"
                          />
                        </div>

                        <div>
                          <label className="block text-[11px] font-bold text-slate-600 mb-1">
                            Late Fees Rs (Optional)
                          </label>
                          <input
                            type="number"
                            placeholder="0"
                            value={extractedData.lateFee || ''}
                            onChange={(e) => setExtractedData(prev => ({ ...prev, lateFee: Number(e.target.value) || 0 }))}
                            className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold text-slate-800 outline-none focus:ring-2 focus:ring-emerald-500 font-mono"
                          />
                        </div>
                      </div>

                      {/* Payment Method Radio */}
                      <div>
                        <label className="block text-[11px] font-bold text-slate-600 mb-1">
                          Payment Method
                        </label>
                        <div className="flex items-center gap-4">
                          <label className="flex items-center gap-2 cursor-pointer text-xs font-bold text-slate-700">
                            <input
                              type="radio"
                              name="paymentMethod"
                              checked={extractedData.paymentMethod === 'Cash'}
                              onChange={() => setExtractedData(prev => ({ ...prev, paymentMethod: 'Cash' }))}
                              className="text-emerald-600 focus:ring-emerald-500"
                            />
                            <span>Cash</span>
                          </label>
                          <label className="flex items-center gap-2 cursor-pointer text-xs font-bold text-slate-700">
                            <input
                              type="radio"
                              name="paymentMethod"
                              checked={extractedData.paymentMethod === 'Online Transfer'}
                              onChange={() => setExtractedData(prev => ({ ...prev, paymentMethod: 'Online Transfer' }))}
                              className="text-emerald-600 focus:ring-emerald-500"
                            />
                            <span>Online Transfer</span>
                          </label>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="p-8 text-center bg-slate-50 border border-slate-200 rounded-2xl text-slate-400 text-xs">
                      {isProcessing ? 'Analyzing slip contents...' : 'Click Re-Scan or select another slip.'}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* MODAL FOOTER */}
        <div className="px-5 py-4 border-t border-slate-200 bg-slate-50/90 flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-white hover:bg-slate-100 border border-slate-200 text-slate-700 text-xs font-bold transition-colors cursor-pointer"
          >
            Cancel
          </button>

          <button
            type="button"
            onClick={handleApplyForm}
            disabled={!extractedData}
            className={`flex items-center gap-2 px-6 py-2.5 rounded-xl text-xs font-extrabold text-white transition-all shadow-md active:scale-95 cursor-pointer ${
              extractedData
                ? 'bg-emerald-600 hover:bg-emerald-700 shadow-emerald-600/25'
                : 'bg-slate-400 opacity-60 cursor-not-allowed'
            }`}
          >
            <CheckCircle2 size={16} />
            <span>Apply to Fee Form</span>
          </button>
        </div>
      </div>
    </div>
  );
};

export default CoachingSlipScannerModal;
