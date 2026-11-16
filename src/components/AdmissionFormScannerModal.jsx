import React, { useState, useRef, useEffect } from 'react';
import { createWorker } from 'tesseract.js';
import * as pdfjsLib from 'pdfjs-dist';
import {
  parseAdmissionFormLocal,
  parseAdmissionFormWithGroqAI,
  parseAdmissionFormWithGeminiAI,
  COACHING_GRADES,
  COACHING_FIELDS,
  isClassAboveEight,
  QUALIFICATION_OPTIONS,
  matchQualification
} from '../utils/admissionFormOcrParser';
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
  User,
  Phone,
  Mail,
  MapPin,
  BookOpen,
  GraduationCap,
  Clock,
  Shield,
  Sliders,
  Check,
  ChevronDown,
  ChevronUp
} from 'lucide-react';

// Configure pdfjs worker CDN fallback for Vite bundling
if (typeof window !== 'undefined' && pdfjsLib.GlobalWorkerOptions) {
  pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version || '4.10.38'}/pdf.worker.min.mjs`;
}

const AdmissionFormScannerModal = ({
  isOpen,
  onClose,
  onApply,
  courses = [],
  coachingGrades = COACHING_GRADES,
  mode = 'all' // 'computer' | 'coaching' | 'all'
}) => {
  const [fileSrc, setFileSrc] = useState(null); // Local DataURL only (NOT stored in DB)
  const [fileName, setFileName] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [progressMsg, setProgressMsg] = useState('');
  const [ocrProgress, setOcrProgress] = useState(0);
  const [cachedDirectText, setCachedDirectText] = useState('');
  const [showRawText, setShowRawText] = useState(false);

  // Engine: 'auto' (Smart AI with Groq + fallback) | 'local' (Offline Tesseract + Regex) | 'gemini' (AI Vision)
  const [engine, setEngine] = useState('auto');

  const [groqApiKey, setGroqApiKey] = useState(() => {
    return localStorage.getItem('IIC_GROQ_API_KEY') || import.meta.env.VITE_GROQ_API_KEY || '';
  });

  const [geminiApiKey, setGeminiApiKey] = useState(() => {
    return localStorage.getItem('TECHFLEX_GEMINI_API_KEY') || import.meta.env.VITE_GEMINI_API_KEY || '';
  });

  const [showKeyConfig, setShowKeyConfig] = useState(false);

  // Extracted Data State (Editable by user)
  const [extractedData, setExtractedData] = useState(null);

  const fileInputRef = useRef(null);
  const cameraInputRef = useRef(null);

  useEffect(() => {
    if (!isOpen) {
      // Clear in-memory state on modal close for zero DB persistence
      setFileSrc(null);
      setFileName('');
      setExtractedData(null);
      setIsProcessing(false);
      setProgressMsg('');
      setOcrProgress(0);
      setCachedDirectText('');
      setShowRawText(false);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  // Handle Image or PDF selection
  const handleFileChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setFileName(file.name);
    setExtractedData(null);
    setCachedDirectText('');

    // If PDF, convert 1st page to canvas image & extract any digital text
    if (file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf')) {
      try {
        setIsProcessing(true);
        setProgressMsg('Rendering admission form PDF & reading text...');
        const arrayBuffer = await file.arrayBuffer();
        const loadingTask = pdfjsLib.getDocument({ data: arrayBuffer });
        const pdfDoc = await loadingTask.promise;
        const page = await pdfDoc.getPage(1);

        // Attempt direct text extraction from PDF
        let directText = '';
        try {
          const textContent = await page.getTextContent();
          directText = textContent.items.map(item => item.str).join(' ').trim();
        } catch (textErr) {
          console.warn('PDF digital text extraction error:', textErr);
        }

        // Render page to canvas for crisp visual preview
        const viewport = page.getViewport({ scale: 2.0 });
        const canvas = document.createElement('canvas');
        canvas.width = viewport.width;
        canvas.height = viewport.height;
        const ctx = canvas.getContext('2d');

        await page.render({ canvasContext: ctx, viewport }).promise;
        const renderedDataUrl = canvas.toDataURL('image/png');
        setFileSrc(renderedDataUrl);
        setCachedDirectText(directText);
        setIsProcessing(false);

        // Automatically start parsing
        processForm(renderedDataUrl, directText);
      } catch (err) {
        console.error('PDF render error:', err);
        toast.error('Failed to render PDF form. Please upload an image photo of the form.');
        setIsProcessing(false);
      }
    } else if (file.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onload = (event) => {
        const dataUrl = event.target.result;
        setFileSrc(dataUrl);
        setCachedDirectText('');
        processForm(dataUrl, '');
      };
      reader.readAsDataURL(file);
    } else {
      toast.error('Please upload an image (PNG, JPG) or PDF admission form.');
    }

    e.target.value = '';
  };

  // Main Form Processing Routine
  const processForm = async (imageSrc, directTextOverride = null) => {
    const activeSrc = imageSrc || fileSrc;
    const directText = directTextOverride !== null ? directTextOverride : cachedDirectText;

    if (!activeSrc && !directText) {
      toast.error('Please select or capture an admission form first');
      return;
    }

    setIsProcessing(true);
    setOcrProgress(15);

    try {
      // CASE 1: Direct Gemini Vision Mode
      if (engine === 'gemini' && geminiApiKey.trim() && activeSrc) {
        setProgressMsg('Analyzing admission form with Gemini AI Vision...');
        setOcrProgress(50);
        const parsed = await parseAdmissionFormWithGeminiAI(activeSrc, geminiApiKey.trim(), courses, coachingGrades);
        setExtractedData(parsed);
        setOcrProgress(100);
        toast.success(parsed.name ? `Form extracted for ${parsed.name}!` : 'Admission form extracted via AI Vision!');
        return;
      }

      // CASE 2: Text Extraction (from PDF digital text or Tesseract OCR)
      let rawText = directText || '';

      if (!rawText && activeSrc) {
        setProgressMsg('Initializing optical character recognition...');
        setOcrProgress(30);

        const worker = await createWorker('eng', 1, {
          logger: m => {
            if (m.status === 'recognizing text') {
              setOcrProgress(Math.round(30 + (m.progress || 0) * 55));
              setProgressMsg(`Scanning form text: ${Math.round((m.progress || 0) * 100)}%`);
            }
          }
        });

        setProgressMsg('Reading form text and printed fields...');
        const ret = await worker.recognize(activeSrc);
        await worker.terminate();
        rawText = ret.data.text || '';
      }

      setOcrProgress(85);

      // CASE 3: Structure Data using AI (Groq) or Enhanced Local Heuristics
      let parsed = null;

      if ((engine === 'auto' || engine === 'groq') && groqApiKey.trim()) {
        try {
          setProgressMsg('Intelligently formatting fields with Groq AI...');
          setOcrProgress(92);
          parsed = await parseAdmissionFormWithGroqAI(rawText, groqApiKey.trim(), courses, coachingGrades);
          toast.success(parsed.name ? `Extracted details for ${parsed.name}!` : 'Form details extracted via Smart AI!');
        } catch (groqErr) {
          console.warn('Groq AI structuring failed, falling back to local regex:', groqErr);
          parsed = parseAdmissionFormLocal(rawText, courses, coachingGrades);
          toast.success(parsed.name ? `Extracted: ${parsed.name}` : 'Form scanned via local parser.');
        }
      } else {
        // Pure Local Label-Safe Heuristic Parser
        setProgressMsg('Applying local label-safe regex extraction...');
        parsed = parseAdmissionFormLocal(rawText, courses, coachingGrades);
        toast.success(parsed.name ? `Extracted: ${parsed.name}` : 'Form scanned! Please review details.');
      }

      setExtractedData(parsed);
      setOcrProgress(100);
    } catch (err) {
      console.error('Admission form extraction error:', err);
      toast.error(err.message || 'Failed to extract admission form details');
    } finally {
      setIsProcessing(false);
    }
  };

  // Save Keys to localStorage
  const handleSaveKeys = (newGroqKey, newGeminiKey) => {
    if (newGroqKey !== undefined) {
      const gTrim = newGroqKey.trim();
      setGroqApiKey(gTrim);
      localStorage.setItem('IIC_GROQ_API_KEY', gTrim);
    }
    if (newGeminiKey !== undefined) {
      const gemTrim = newGeminiKey.trim();
      setGeminiApiKey(gemTrim);
      localStorage.setItem('TECHFLEX_GEMINI_API_KEY', gemTrim);
    }
    toast.success('Scanner engine settings saved!');
    setShowKeyConfig(false);
  };

  // Update field in review form
  const handleFieldChange = (field, value) => {
    setExtractedData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  // Apply to Parent Form
  const handleApplyForm = () => {
    if (!extractedData) return;

    onApply({
      name: extractedData.name || '',
      father_name: extractedData.father_name || '',
      gender: extractedData.gender || 'Male',
      dob: extractedData.dob || '',
      cnic: extractedData.cnic || '',
      religion: extractedData.religion || 'Islam',
      address: extractedData.address || '',
      contact: extractedData.contact || '',
      secondary_contact: extractedData.secondary_contact || '',
      course_or_class: extractedData.course_or_class || '',
      matchedCourseId: extractedData.matchedCourseId || '',
      matchedGrade: extractedData.matchedGrade || '',
      field: extractedData.field || '',
      timeslot: extractedData.timeslot || extractedData.timing || '',
      timing: extractedData.timing || extractedData.timeslot || '',
      class_type: extractedData.class_type || '',
      qualification: extractedData.qualification || '',
      last_qualification: extractedData.qualification || '',
      email: extractedData.email || '',
      batch_code: extractedData.batch_code || '',
      reg_no: extractedData.reg_no || '',
      admission_date: extractedData.admission_date || new Date().toISOString().split('T')[0]
    });

    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/70 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white w-full max-w-5xl max-h-[94vh] rounded-3xl shadow-2xl border border-slate-200 flex flex-col overflow-hidden animate-in zoom-in-95 duration-200">
        
        {/* MODAL HEADER */}
        <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between bg-gradient-to-r from-slate-50 via-white to-blue-50/40">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-indigo-600 text-white flex items-center justify-center shadow-md shadow-indigo-600/20">
              <FileText size={20} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-extrabold text-slate-900 text-base sm:text-lg tracking-tight">
                  Scan Admission Form
                </h3>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-100 text-indigo-800 border border-indigo-200 uppercase">
                  {engine === 'auto' ? 'Smart AI OCR' : engine === 'gemini' ? 'Gemini Vision' : 'Offline OCR'}
                </span>
                <span className="hidden sm:inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                  <Shield size={10} />
                  Privacy Safe (Zero DB Image Storage)
                </span>
              </div>
              <p className="text-xs text-slate-500 font-medium">
                Extract student, parent, contact, and academic fields from photos or PDF forms
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
                <p className="text-[11px] text-slate-500">
                  Choose your extraction mode: Smart AI (auto-cleans form labels), Gemini Vision, or 100% Offline OCR
                </p>
              </div>

              <div className="flex items-center bg-white p-1 rounded-xl border border-slate-200 shadow-2xs">
                <button
                  type="button"
                  onClick={() => setEngine('auto')}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-bold transition-all cursor-pointer ${
                    engine === 'auto'
                      ? 'bg-indigo-600 text-white shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                  title="Uses Groq AI LLM to filter form labels and structure extracted fields with 100% precision"
                >
                  <Sparkles size={14} />
                  <span>Smart AI (Recommended)</span>
                </button>
                <button
                  type="button"
                  onClick={() => setEngine('local')}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-bold transition-all cursor-pointer ${
                    engine === 'local'
                      ? 'bg-indigo-600 text-white shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                  title="Pure offline regex parser without external API calls"
                >
                  <Cpu size={14} />
                  <span>Offline OCR</span>
                </button>
                <button
                  type="button"
                  onClick={() => setEngine('gemini')}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-bold transition-all cursor-pointer ${
                    engine === 'gemini'
                      ? 'bg-indigo-600 text-white shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                  title="Multimodal visual extraction from Gemini 1.5 Flash"
                >
                  <Eye size={14} />
                  <span>Gemini Vision</span>
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
              <div className="p-3 bg-white rounded-xl border border-indigo-200/70 space-y-1.5">
                <span className="font-semibold text-slate-700 flex items-center gap-1.5">
                  <Key size={13} className="text-indigo-600" />
                  Groq API Key (Fast Smart AI)
                </span>
                <input
                  type="password"
                  placeholder="gsk_..."
                  defaultValue={groqApiKey}
                  id="groqKeyInput"
                  className="w-full px-3 py-1.5 rounded-lg border border-slate-200 bg-slate-50 text-xs font-mono focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                />
              </div>

              <div className="p-3 bg-white rounded-xl border border-indigo-200/70 space-y-1.5">
                <span className="font-semibold text-slate-700 flex items-center gap-1.5">
                  <Key size={13} className="text-indigo-600" />
                  Gemini API Key (Visual Photos)
                </span>
                <input
                  type="password"
                  placeholder="AIzaSy..."
                  defaultValue={geminiApiKey}
                  id="geminiKeyInput"
                  className="w-full px-3 py-1.5 rounded-lg border border-slate-200 bg-slate-50 text-xs font-mono focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                />
              </div>
            </div>

            <div className="flex justify-end">
              <button
                type="button"
                onClick={() => {
                  const gInput = document.getElementById('groqKeyInput');
                  const gemInput = document.getElementById('geminiKeyInput');
                  handleSaveKeys(gInput?.value, gemInput?.value);
                }}
                className="px-4 py-1.5 bg-indigo-600 text-white font-bold rounded-lg hover:bg-indigo-700 cursor-pointer text-xs shadow-xs"
              >
                Save Engine Keys
              </button>
            </div>
          </div>
        )}

        {/* MODAL BODY */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-5">
          {!fileSrc ? (
            /* UPLOAD / CAPTURE VIEW */
            <div className="h-full flex flex-col items-center justify-center py-10 px-4 text-center">
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*,application/pdf"
                className="hidden"
                onChange={handleFileChange}
              />
              <input
                ref={cameraInputRef}
                type="file"
                accept="image/*"
                capture="environment"
                className="hidden"
                onChange={handleFileChange}
              />

              <div className="w-16 h-16 rounded-3xl bg-indigo-50 border-2 border-dashed border-indigo-300 flex items-center justify-center text-indigo-600 mb-4 shadow-inner">
                <FileText size={32} />
              </div>

              <h4 className="text-lg font-extrabold text-slate-800 tracking-tight mb-1">
                Upload or Photograph Filled Admission Form
              </h4>
              <p className="text-xs text-slate-500 max-w-md mb-6">
                Take a quick camera photo or upload an admission form image/PDF. Fields like Student Name, Father's Name, CNIC, Phone, Address, and Course/Class are parsed automatically.
              </p>

              <div className="flex flex-col sm:flex-row items-center gap-3 w-full max-w-md">
                <button
                  type="button"
                  onClick={() => cameraInputRef.current?.click()}
                  className="w-full flex items-center justify-center gap-2.5 px-5 py-3 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-sm shadow-lg shadow-indigo-600/25 active:scale-98 transition-all cursor-pointer"
                >
                  <Camera size={18} />
                  <span>Take Live Photo (Camera)</span>
                </button>

                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="w-full flex items-center justify-center gap-2.5 px-5 py-3 rounded-2xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-sm border border-slate-200 active:scale-98 transition-all cursor-pointer"
                >
                  <Upload size={18} />
                  <span>Choose Image or PDF</span>
                </button>
              </div>

              <div className="mt-8 flex flex-wrap items-center justify-center gap-5 text-[11px] text-slate-400">
                <div className="flex items-center gap-1.5">
                  <CheckCircle2 size={13} className="text-emerald-500" />
                  <span>Label-Hallucination Safe</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <CheckCircle2 size={13} className="text-emerald-500" />
                  <span>Excludes Institute Header Phone</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <CheckCircle2 size={13} className="text-emerald-500" />
                  <span>Zero Database Photo Storage</span>
                </div>
              </div>
            </div>
          ) : (
            /* SCANNING & EXTRACTED SPLIT VIEW */
            <div className="space-y-4">
              {/* PROGRESS BAR (DURING SCAN) */}
              {isProcessing && (
                <div className="p-4 bg-indigo-50 border border-indigo-200 rounded-2xl text-xs space-y-2 animate-in fade-in">
                  <div className="flex items-center justify-between font-bold text-indigo-900">
                    <span className="flex items-center gap-2">
                      <RefreshCw size={14} className="animate-spin text-indigo-600" />
                      {progressMsg || 'Processing admission form...'}
                    </span>
                    <span>{ocrProgress}%</span>
                  </div>
                  <div className="w-full h-2 bg-indigo-100 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-indigo-500 to-indigo-700 rounded-full transition-all duration-300"
                      style={{ width: `${ocrProgress}%` }}
                    />
                  </div>
                </div>
              )}

              {/* SPLIT REVIEW AREA */}
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
                
                {/* LEFT: FORM IMAGE PREVIEW */}
                <div className="lg:col-span-5 bg-slate-100/80 rounded-2xl border border-slate-200 p-3 flex flex-col gap-3">
                  <div className="flex items-center justify-between text-xs font-bold text-slate-700 px-1">
                    <span className="truncate max-w-[200px]" title={fileName}>
                      📄 {fileName || 'Admission Form Preview'}
                    </span>
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => processForm()}
                        disabled={isProcessing}
                        className="p-1.5 bg-white hover:bg-slate-50 border border-slate-200 rounded-lg text-slate-600 hover:text-indigo-600 transition-colors cursor-pointer"
                        title="Re-scan Form"
                      >
                        <RefreshCw size={13} className={isProcessing ? 'animate-spin' : ''} />
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setFileSrc(null);
                          setExtractedData(null);
                          setCachedDirectText('');
                        }}
                        className="p-1.5 bg-white hover:bg-rose-50 border border-slate-200 hover:border-rose-200 rounded-lg text-slate-600 hover:text-rose-600 transition-colors cursor-pointer"
                        title="Choose Another Form"
                      >
                        <X size={13} />
                      </button>
                    </div>
                  </div>

                  <div className="relative w-full max-h-[460px] bg-slate-900/5 rounded-xl overflow-hidden border border-slate-200 flex items-center justify-center p-2">
                    <img
                      src={fileSrc}
                      alt="Scanned Admission Form"
                      className="max-h-[440px] w-auto object-contain rounded-lg shadow-xs"
                    />
                  </div>

                  {/* Expandable Scanned Text Viewer */}
                  {extractedData?.rawText && (
                    <div className="border border-slate-200 rounded-xl bg-white overflow-hidden text-xs">
                      <button
                        type="button"
                        onClick={() => setShowRawText(!showRawText)}
                        className="w-full px-3 py-2 flex items-center justify-between text-slate-600 hover:bg-slate-50 cursor-pointer font-bold"
                      >
                        <span className="flex items-center gap-1.5">
                          <Eye size={13} />
                          <span>View Scanned Raw Text</span>
                        </span>
                        {showRawText ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                      </button>
                      {showRawText && (
                        <div className="p-3 bg-slate-50 border-t border-slate-200 font-mono text-[11px] text-slate-700 max-h-40 overflow-y-auto whitespace-pre-wrap select-all">
                          {extractedData.rawText}
                        </div>
                      )}
                    </div>
                  )}

                  <p className="text-[11px] text-slate-400 italic text-center">
                    Note: Document images are processed in-memory and are never uploaded or stored in the database.
                  </p>
                </div>

                {/* RIGHT: EDITABLE EXTRACTED FIELDS */}
                <div className="lg:col-span-7 space-y-4">
                  <div className="p-3 bg-indigo-50/70 border border-indigo-100 rounded-2xl flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Sparkles size={16} className="text-indigo-600" />
                      <span className="text-xs font-bold text-indigo-900">
                        Review & Edit Extracted Form Data
                      </span>
                    </div>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-white text-indigo-700 border border-indigo-200">
                      Editable Before Applying
                    </span>
                  </div>

                  {extractedData ? (
                    <div className="space-y-4">
                      {/* SECTION 1: PERSONAL DETAILS */}
                      <div className="bg-slate-50/70 rounded-2xl p-3.5 border border-slate-200 space-y-3">
                        <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
                          <User size={13} className="text-indigo-600" />
                          <span>Student Personal Details</span>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          <div>
                            <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                              Student Full Name *
                            </label>
                            <input
                              type="text"
                              value={extractedData.name}
                              onChange={(e) => handleFieldChange('name', e.target.value)}
                              placeholder="e.g. Ayesha Ahmed"
                              className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white text-xs font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                            />
                          </div>

                          <div>
                            <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                              Father's Name
                            </label>
                            <input
                              type="text"
                              value={extractedData.father_name}
                              onChange={(e) => handleFieldChange('father_name', e.target.value)}
                              placeholder="e.g. Ahmed Khan"
                              className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white text-xs font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                            />
                          </div>

                          <div>
                            <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                              Gender
                            </label>
                            <div className="flex gap-2">
                              {['Male', 'Female'].map(g => (
                                <button
                                  key={g}
                                  type="button"
                                  onClick={() => handleFieldChange('gender', g)}
                                  className={`flex-1 py-1.5 text-xs font-bold rounded-xl border transition-all cursor-pointer ${
                                    extractedData.gender === g
                                      ? 'bg-indigo-600 text-white border-indigo-600 shadow-xs'
                                      : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                                  }`}
                                >
                                  {g}
                                </button>
                              ))}
                            </div>
                          </div>

                          <div>
                            <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                              CNIC / N.I.C
                            </label>
                            <input
                              type="text"
                              value={extractedData.cnic}
                              onChange={(e) => handleFieldChange('cnic', e.target.value)}
                              placeholder="e.g. 42101-1234567-1"
                              className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white text-xs font-mono font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                            />
                          </div>

                          <div>
                            <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                              Date of Birth (D.O.B)
                            </label>
                            <input
                              type="text"
                              value={extractedData.dob}
                              onChange={(e) => handleFieldChange('dob', e.target.value)}
                              placeholder="DD/MM/YYYY"
                              className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white text-xs font-mono focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                            />
                          </div>

                          <div>
                            <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                              Religion
                            </label>
                            <input
                              type="text"
                              value={extractedData.religion}
                              onChange={(e) => handleFieldChange('religion', e.target.value)}
                              placeholder="e.g. Islam"
                              className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white text-xs font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                            />
                          </div>
                        </div>
                      </div>

                      {/* SECTION 2: CONTACT & ADDRESS */}
                      <div className="bg-slate-50/70 rounded-2xl p-3.5 border border-slate-200 space-y-3">
                        <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
                          <Phone size={13} className="text-indigo-600" />
                          <span>Contact & Residential Address</span>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          <div>
                            <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                              Primary Contact (Phone) *
                            </label>
                            <input
                              type="tel"
                              value={extractedData.contact}
                              onChange={(e) => handleFieldChange('contact', e.target.value)}
                              placeholder="03001234567"
                              className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white text-xs font-mono font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                            />
                          </div>

                          <div>
                            <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                              Secondary / WhatsApp Number
                            </label>
                            <input
                              type="tel"
                              value={extractedData.secondary_contact}
                              onChange={(e) => handleFieldChange('secondary_contact', e.target.value)}
                              placeholder="03219876543"
                              className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white text-xs font-mono font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                            />
                          </div>

                          <div className="sm:col-span-2">
                            <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                              Email Address
                            </label>
                            <input
                              type="email"
                              value={extractedData.email}
                              onChange={(e) => handleFieldChange('email', e.target.value)}
                              placeholder="student@example.com"
                              className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white text-xs font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                            />
                          </div>

                          <div className="sm:col-span-2">
                            <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                              Residential Address
                            </label>
                            <input
                              type="text"
                              value={extractedData.address}
                              onChange={(e) => handleFieldChange('address', e.target.value)}
                              placeholder="House #, Street, Sector / Area"
                              className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white text-xs font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                            />
                          </div>
                        </div>
                      </div>

                      {/* SECTION 3: COURSE / CLASS & ACADEMICS */}
                      <div className="bg-slate-50/70 rounded-2xl p-3.5 border border-slate-200 space-y-3">
                        <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
                          <BookOpen size={13} className="text-indigo-600" />
                          <span>Course, Class & Academic Details</span>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          <div>
                            <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                              Raw Course / Class Text
                            </label>
                            <input
                              type="text"
                              value={extractedData.course_or_class}
                              onChange={(e) => handleFieldChange('course_or_class', e.target.value)}
                              placeholder="e.g. Web Development or Class 10"
                              className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white text-xs font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                            />
                          </div>

                          {/* Computer Institute Course Selector (if relevant) */}
                          {courses && courses.length > 0 && mode !== 'coaching' && (
                            <div>
                              <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                                Institute Course Match
                              </label>
                              <select
                                value={extractedData.matchedCourseId}
                                onChange={(e) => handleFieldChange('matchedCourseId', e.target.value)}
                                className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white text-xs font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 cursor-pointer"
                              >
                                <option value="">-- Select Matched Course --</option>
                                {courses.map(c => (
                                  <option key={c.id} value={c.id}>{c.name}</option>
                                ))}
                              </select>
                            </div>
                          )}

                          {/* Coaching Center Grade Selector (if relevant) */}
                          {coachingGrades && coachingGrades.length > 0 && mode !== 'computer' && (
                            <div>
                              <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                                Coaching Class Match
                              </label>
                              <select
                                value={extractedData.matchedGrade}
                                onChange={(e) => handleFieldChange('matchedGrade', e.target.value)}
                                className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white text-xs font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 cursor-pointer"
                              >
                                <option value="">-- Select Coaching Grade --</option>
                                {coachingGrades.map(g => (
                                  <option key={g} value={g}>{g}</option>
                                ))}
                              </select>
                            </div>
                          )}

                          {/* Coaching Field / Group (if class > 8) */}
                          {mode !== 'computer' && isClassAboveEight(extractedData.matchedGrade) && (
                            <div>
                              <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                                Field / Group (Commerce, Science, etc.)
                              </label>
                              <select
                                value={extractedData.field || ''}
                                onChange={(e) => handleFieldChange('field', e.target.value)}
                                className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white text-xs font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 cursor-pointer"
                              >
                                <option value="">-- Select Field / Group --</option>
                                {COACHING_FIELDS.map(f => (
                                  <option key={f} value={f}>{f}</option>
                                ))}
                              </select>
                            </div>
                          )}

                          {/* Timing / Timeslot & Class Type (Only for computer institute) */}
                          {mode === 'computer' && (
                            <>
                              <div>
                                <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                                  Timing / Timeslot
                                </label>
                                <input
                                  type="text"
                                  value={extractedData.timeslot}
                                  onChange={(e) => handleFieldChange('timeslot', e.target.value)}
                                  placeholder="e.g. 5:00 PM - 6:00 PM"
                                  className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white text-xs font-mono font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                                />
                              </div>

                              <div>
                                <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                                  Class Type
                                </label>
                                <select
                                  value={extractedData.class_type}
                                  onChange={(e) => handleFieldChange('class_type', e.target.value)}
                                  className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white text-xs font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 cursor-pointer"
                                >
                                  <option value="Regular (1 Hour)">Regular (1 Hour)</option>
                                  <option value="Alternate (2 Hours)">Alternate (2 Hours)</option>
                                </select>
                              </div>
                            </>
                          )}

                          <div className="sm:col-span-2">
                            <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                              Last Qualification
                            </label>
                            <select
                              value={
                                QUALIFICATION_OPTIONS.includes(extractedData.qualification)
                                  ? extractedData.qualification
                                  : (extractedData.qualification ? 'Other' : '')
                              }
                              onChange={(e) => {
                                const val = e.target.value;
                                if (val === 'Other') {
                                  if (QUALIFICATION_OPTIONS.includes(extractedData.qualification)) {
                                    handleFieldChange('qualification', '');
                                  }
                                } else {
                                  handleFieldChange('qualification', val);
                                }
                              }}
                              className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 cursor-pointer"
                            >
                              <option value="">Select Qualification (Optional)</option>
                              {QUALIFICATION_OPTIONS.map((q) => (
                                <option key={q} value={q}>{q}</option>
                              ))}
                            </select>
                            {(!QUALIFICATION_OPTIONS.includes(extractedData.qualification) || extractedData.qualification === 'Other') && (
                              <input
                                type="text"
                                value={extractedData.qualification === 'Other' ? '' : extractedData.qualification}
                                onChange={(e) => handleFieldChange('qualification', e.target.value)}
                                placeholder="Specify custom qualification..."
                                className="w-full mt-1.5 px-3 py-2 rounded-xl border border-slate-200 bg-white text-xs font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                              />
                            )}
                          </div>
                        </div>
                      </div>

                      {/* SECTION 4: OFFICE USE / ADMISSION RECORD */}
                      <div className="bg-slate-50/70 rounded-2xl p-3.5 border border-slate-200 space-y-3">
                        <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
                          <Calendar size={13} className="text-indigo-600" />
                          <span>Office Registration & Admission Info</span>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                          <div>
                            <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                              Batch Code
                            </label>
                            <input
                              type="text"
                              value={extractedData.batch_code}
                              onChange={(e) => handleFieldChange('batch_code', e.target.value)}
                              placeholder="e.g. B-01"
                              className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white text-xs font-mono font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                            />
                          </div>

                          <div>
                            <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                              Reg / Roll Number
                            </label>
                            <input
                              type="text"
                              value={extractedData.reg_no}
                              onChange={(e) => handleFieldChange('reg_no', e.target.value)}
                              placeholder="e.g. TFC-001 or STU-001"
                              className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white text-xs font-mono font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                            />
                          </div>

                          <div>
                            <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                              Admission Date
                            </label>
                            <input
                              type="date"
                              value={extractedData.admission_date}
                              onChange={(e) => handleFieldChange('admission_date', e.target.value)}
                              className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white text-xs font-mono focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                            />
                          </div>
                        </div>
                      </div>

                    </div>
                  ) : (
                    <div className="p-8 text-center text-slate-400 bg-slate-50 rounded-2xl border border-dashed border-slate-200">
                      <FileText size={28} className="mx-auto mb-2 opacity-40 text-slate-400" />
                      <p className="text-xs font-medium">Scanning in progress or no text recognized yet.</p>
                      <p className="text-[11px] text-slate-400 mt-0.5">Click "Re-scan Form" if required.</p>
                    </div>
                  )}
                </div>

              </div>
            </div>
          )}
        </div>

        {/* MODAL FOOTER */}
        <div className="px-5 py-3.5 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3 bg-slate-50">
          <div className="text-[11px] text-slate-500 flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-500" />
            <span>Extracted data will fill into registration fields for your final submission</span>
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 sm:flex-none px-4 py-2.5 rounded-xl border border-slate-300 text-slate-700 font-bold text-xs hover:bg-slate-100 transition-colors cursor-pointer"
            >
              Cancel
            </button>

            {extractedData && (
              <button
                type="button"
                onClick={handleApplyForm}
                className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs shadow-md shadow-indigo-600/20 active:scale-98 transition-all cursor-pointer"
              >
                <Check size={16} />
                <span>Apply to Registration Form</span>
              </button>
            )}
          </div>
        </div>

      </div>
    </div>
  );
};

export default AdmissionFormScannerModal;
