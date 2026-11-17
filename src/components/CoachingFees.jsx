import React, { useState, useEffect, useMemo } from 'react';
import { db } from '../firebase';
import { ref, set, remove } from 'firebase/database';
import { useData } from '../contexts/DataContext';
import { useAuth } from '../contexts/AuthContext';
import { useSearchParams } from 'react-router-dom';
import toast from 'react-hot-toast';
import { MONTHS_SHORT, normalizeMonthKey, getCanonicalShortMonth, MONTH_ORDER, normalizeMonth } from '../utils/monthUtils';
import CoachingSlipScannerModal from './CoachingSlipScannerModal';
import CoachingFeeBulkUploadModal from './CoachingFeeBulkUploadModal';
import { downloadCoachingFeeSample } from '../utils/bulkUpload';
import { getStudentSessionForDate } from '../utils/sessionUtils';
import {
  CreditCard,
  Search,
  RotateCcw,
  Clock,
  Pencil,
  Trash2,
  Calendar,
  AlertCircle,
  GraduationCap,
  DollarSign,
  CheckCircle2,
  Phone,
  FileSpreadsheet,
  Camera,
  Hash,
  Download,
  Upload,
  BookOpen
} from 'lucide-react';
import * as XLSX from 'xlsx';

const CoachingFees = () => {
  const { coachingStudents, coachingFeeTransactions } = useData();
  const { currentUser, isAdmin } = useAuth();
  const [searchParams] = useSearchParams();

  // Selected student & UI states
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [editingTransaction, setEditingTransaction] = useState(null);
  const [loading, setLoading] = useState(false);
  const [isScannerOpen, setIsScannerOpen] = useState(false);
  const [isBulkUploadOpen, setIsBulkUploadOpen] = useState(false);

  // Form State Defaults
  const getTodayDateStr = () => {
    const d = new Date();
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const initialFormState = {
    month: getCanonicalShortMonth(),
    year: new Date().getFullYear().toString(),
    pay_date: getTodayDateStr(),
    payable: 0,
    paid: 0,
    waived: 0,
    serial_no: '',
    payment_method: 'Cash', // strictly 'Cash' | 'Online'
    note: ''
  };

  const [formData, setFormData] = useState(initialFormState);

  // Helper: format dates consistently as dd-mm-yyyy
  const formatDateDMY = (dateVal) => {
    if (!dateVal) return '—';
    if (typeof dateVal?.toDate === 'function') {
      dateVal = dateVal.toDate();
    }
    if (typeof dateVal === 'string') {
      const trimmed = dateVal.trim();
      if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
        const [y, m, d] = trimmed.split('-');
        return `${d}-${m}-${y}`;
      }
      if (/^\d{2}[-/]\d{2}[-/]\d{4}$/.test(trimmed)) {
        return trimmed.replace(/\//g, '-');
      }
    }
    const d = new Date(dateVal);
    if (isNaN(d.getTime())) return '—';
    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const year = d.getFullYear();
    return `${day}-${month}-${year}`;
  };

  // Auto-select student if query param present
  useEffect(() => {
    const sId = searchParams.get('studentId') || searchParams.get('id');
    if (sId && coachingStudents.length > 0) {
      const match = coachingStudents.find(s => s.id === sId || s.roll_no === sId);
      if (match) {
        handleStudentSelect(match);
      }
    }
  }, [searchParams, coachingStudents]);

  const handleStudentSelect = (student) => {
    setSelectedStudent(student);
    setSearchTerm('');
    setEditingTransaction(null);
    const sessionData = getStudentSessionForDate(student, formData.month, formData.year);
    const mFee = Number(sessionData.monthly_fee) || Number(student.monthly_fee) || 0;
    setFormData(prev => ({
      ...initialFormState,
      month: prev.month,
      year: prev.year,
      payable: mFee,
      paid: mFee,
      waived: 0,
      payment_method: 'Cash',
      pay_date: getTodayDateStr()
    }));
  };

  const handleMonthChange = (newMonth) => {
    setFormData(prev => {
      const updated = { ...prev, month: newMonth };
      if (selectedStudent && !editingTransaction) {
        const sess = getStudentSessionForDate(selectedStudent, newMonth, prev.year);
        const mFee = Number(sess.monthly_fee) || Number(selectedStudent.monthly_fee) || 0;
        updated.payable = mFee;
        updated.paid = mFee;
      }
      return updated;
    });
  };

  const handleYearChange = (newYear) => {
    setFormData(prev => {
      const updated = { ...prev, year: newYear };
      if (selectedStudent && !editingTransaction) {
        const sess = getStudentSessionForDate(selectedStudent, prev.month, newYear);
        const mFee = Number(sess.monthly_fee) || Number(selectedStudent.monthly_fee) || 0;
        updated.payable = mFee;
        updated.paid = mFee;
      }
      return updated;
    });
  };

  const handleReset = () => {
    setSelectedStudent(null);
    setSearchTerm('');
    setEditingTransaction(null);
    setFormData(initialFormState);
  };

  const handleEdit = (trx) => {
    setEditingTransaction(trx);
    const parts = (trx.month_key || trx.id || '').split('_');
    const method = (trx.payment_method === 'Online' || (trx.note && /online/i.test(trx.note))) ? 'Online' : 'Cash';
    setFormData({
      month: trx.month || parts[0] || getCanonicalShortMonth(),
      year: trx.year || parts[1] || new Date().getFullYear().toString(),
      pay_date: trx.pay_date || getTodayDateStr(),
      payable: Number(trx.payable) || 0,
      paid: Number(trx.paid) || 0,
      waived: Number(trx.waived) || 0,
      serial_no: trx.serial_no || '',
      payment_method: method,
      note: trx.note || ''
    });
  };

  const handleSlipApplied = (extracted) => {
    let targetStudent = extracted.student;
    if (!targetStudent && extracted.rollNo) {
      targetStudent = coachingStudents.find(s =>
        (s.roll_no && s.roll_no.toUpperCase() === extracted.rollNo.toUpperCase()) ||
        (s.student_id && s.student_id.toUpperCase() === extracted.rollNo.toUpperCase())
      );
    }
    if (!targetStudent && extracted.studentName) {
      const q = extracted.studentName.toLowerCase().trim();
      targetStudent = coachingStudents.find(s => s.name && s.name.toLowerCase().trim() === q) ||
                      coachingStudents.find(s => s.name && (s.name.toLowerCase().includes(q) || q.includes(s.name.toLowerCase())));
    }

    if (targetStudent) {
      setSelectedStudent(targetStudent);
    }

    const payableAmount = extracted.amount > 0
      ? extracted.amount
      : (targetStudent ? Number(targetStudent.monthly_fee) || 0 : 0);

    const paidAmount = extracted.amount > 0 ? extracted.amount : payableAmount;
    const resolvedMethod = (extracted.paymentMethod === 'Online' || extracted.paymentMethod === 'Online Transfer' || (extracted.note && /online/i.test(extracted.note)))
      ? 'Online'
      : 'Cash';

    setFormData({
      month: extracted.month || getCanonicalShortMonth(),
      year: extracted.year || new Date().getFullYear().toString(),
      pay_date: extracted.payDate || getTodayDateStr(),
      payable: payableAmount,
      paid: paidAmount,
      waived: 0,
      serial_no: extracted.serialNo || '',
      payment_method: resolvedMethod,
      note: extracted.serialNo ? `Slip #${extracted.serialNo}${extracted.lateFee ? ` | Late: Rs.${extracted.lateFee}` : ''}` : ''
    });

    if (targetStudent) {
      toast.success(`Slip scanned! Pre-filled for ${targetStudent.name} (${targetStudent.roll_no || ''})`);
    } else {
      toast.success("Slip details extracted! Please select the matching student.");
    }
  };

  const handleDelete = async (trxId) => {
    if (!window.confirm("Delete this fee transaction record?")) return;
    try {
      await remove(ref(db, `coaching_fees/${selectedStudent.id}/${trxId}`));
      toast.success("Transaction removed");
      if (editingTransaction?.id === trxId) {
        setEditingTransaction(null);
        setFormData(initialFormState);
      }
    } catch (err) {
      toast.error("Failed to delete fee transaction");
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!selectedStudent) {
      toast.error("Please select a coaching student");
      return;
    }

    const payable = Number(formData.payable) || 0;
    const paid = Number(formData.paid) || 0;
    const waived = Number(formData.waived) || 0;
    const balance = payable - paid - waived;

    const monthKey = `${formData.month}_${formData.year}`;
    const trxId = editingTransaction ? editingTransaction.id : monthKey;
    const sessionData = getStudentSessionForDate(selectedStudent, formData.month, formData.year);

    setLoading(true);
    try {
      await set(ref(db, `coaching_fees/${selectedStudent.id}/${trxId}`), {
        id: trxId,
        studentId: selectedStudent.id,
        studentName: selectedStudent.name,
        rollNo: selectedStudent.roll_no || selectedStudent.student_id,
        serial_no: formData.serial_no ? formData.serial_no.trim() : '',
        grade: sessionData.grade || selectedStudent.grade || '',
        session: sessionData.session_name || selectedStudent.current_session || '2024-2025',
        month: formData.month,
        year: formData.year,
        month_key: monthKey,
        payable,
        paid,
        waived,
        balance,
        pay_date: formData.pay_date,
        record_added_date: editingTransaction?.record_added_date || getTodayDateStr(),
        payment_method: formData.payment_method || 'Cash',
        note: formData.note ? formData.note.trim() : '',
        collectedBy: editingTransaction?.collectedBy || currentUser?.displayName || currentUser?.name || 'Staff',
        timestamp: editingTransaction?.timestamp || new Date().toISOString()
      });

      toast.success(editingTransaction ? "Fee record updated!" : `Fee recorded for ${formData.month} ${formData.year}!`);
      setEditingTransaction(null);
      setFormData(prev => ({
        ...prev,
        payable: Number(selectedStudent.monthly_fee) || 0,
        paid: Number(selectedStudent.monthly_fee) || 0,
        waived: 0,
        serial_no: '',
        payment_method: 'Cash',
        note: ''
      }));
    } catch (err) {
      toast.error(err.message || "Failed to record payment");
    } finally {
      setLoading(false);
    }
  };

  // Student Fee History - sorted latest month/year first
  const history = useMemo(() => {
    if (!selectedStudent || !coachingFeeTransactions) return [];
    const studentRecords = coachingFeeTransactions[selectedStudent.id];
    if (!studentRecords) return [];
    const monthOrder = MONTH_ORDER;

    return Object.keys(studentRecords).map(id => ({
      id,
      ...studentRecords[id]
    })).sort((a, b) => {
      const yearA = parseInt(a.year || a.id.split('_')[1] || 0, 10);
      const yearB = parseInt(b.year || b.id.split('_')[1] || 0, 10);
      if (yearA !== yearB) return yearB - yearA;

      const monthA = monthOrder[normalizeMonth(a.month || a.id.split('_')[0])] || 0;
      const monthB = monthOrder[normalizeMonth(b.month || b.id.split('_')[0])] || 0;
      return monthB - monthA;
    });
  }, [selectedStudent, coachingFeeTransactions]);

  // Search Results
  const searchResults = useMemo(() => {
    if (!searchTerm.trim()) return [];
    const q = searchTerm.toLowerCase();
    return coachingStudents.filter(s =>
      (s.name && s.name.toLowerCase().includes(q)) ||
      (s.roll_no && s.roll_no.toLowerCase().includes(q)) ||
      (s.student_id && s.student_id.toLowerCase().includes(q)) ||
      (s.contact_number && s.contact_number.includes(q))
    ).slice(0, 5);
  }, [searchTerm, coachingStudents]);

  const balanceCalc = Number(formData.payable) - Number(formData.paid) - Number(formData.waived);

  // Export History
  const exportStudentHistory = () => {
    if (!history.length) {
      toast.error("No ledger records to export");
      return;
    }
    const data = history.map(h => ({
      "Roll No": h.rollNo || selectedStudent.roll_no,
      "Student Name": selectedStudent.name,
      "Class / Grade": selectedStudent.grade,
      "Period": `${h.month} ${h.year}`,
      "Payment Method": h.payment_method || 'Cash',
      "Slip Serial No": h.serial_no || '—',
      "Fee Pay Date": formatDateDMY(h.pay_date),
      "Entry Date": formatDateDMY(h.record_added_date || h.timestamp),
      "Payable (PKR)": h.payable,
      "Paid (PKR)": h.paid,
      "Waived (PKR)": h.waived,
      "Balance (PKR)": h.balance,
      "Note": h.note || ''
    }));

    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Coaching Ledger");
    XLSX.writeFile(wb, `${selectedStudent.name}_Coaching_Ledger.xlsx`);
    toast.success("Ledger exported successfully!");
  };

  // Reusable Bulk Upload Card (matches Computer fees style)
  const renderBulkUploadCard = () => {
    if (!isAdmin) return null;
    return (
      <div className="bg-white p-4 sm:p-6 rounded-2xl border border-slate-300 md:border-slate-200/80 shadow-[0_2px_10px_rgba(15,23,42,0.06)] md:shadow-xs space-y-4">
        <div className="flex items-center gap-2 pb-3 border-b border-slate-100">
          <FileSpreadsheet className="text-emerald-600" size={18} />
          <h3 className="text-sm font-bold text-slate-900 tracking-tight">Bulk Upload Coaching Fee Records</h3>
        </div>
        <p className="text-xs text-slate-500 leading-relaxed">
          Upload an Excel sheet to batch import student fee records. Existing transactions matching student and month will be synchronized.
        </p>
        <div className="flex flex-col sm:flex-row gap-2.5">
          <button
            type="button"
            onClick={downloadCoachingFeeSample}
            className="flex-1 flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl border border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-700 text-xs font-bold transition-all cursor-pointer"
          >
            <Download size={15} className="text-emerald-600" />
            <span>Download Sample</span>
          </button>
          <button
            type="button"
            onClick={() => setIsBulkUploadOpen(true)}
            className="flex-1 flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition-all shadow-xs cursor-pointer active:scale-95"
          >
            <Upload size={15} />
            <span>Upload Excel</span>
          </button>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6 font-sans animate-fade-in pb-12">
      {/* MOBILE COMPACT HEADER (< md) */}
      <div className="flex md:hidden items-center justify-between gap-2 pb-2 border-b border-slate-300/80">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl bg-emerald-600 flex items-center justify-center text-white shadow-xs shrink-0">
            <CreditCard size={18} />
          </div>
          <div>
            <h1 className="text-base font-extrabold text-slate-950 tracking-tight leading-none">Coaching Fee Entry</h1>
            <span className="text-[11px] font-bold text-slate-500">
              Collect & ledger payments
            </span>
          </div>
        </div>
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => setIsScannerOpen(true)}
            className="p-1.5 rounded-xl bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 text-emerald-700 text-xs font-bold transition-all cursor-pointer"
            title="Scan Filled Fee Slip"
          >
            <Camera size={14} />
          </button>
          <button
            onClick={handleReset}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white hover:bg-slate-50 border border-slate-300 text-slate-800 text-xs font-bold transition-all shadow-xs cursor-pointer active:scale-95"
          >
            <RotateCcw size={13} className="text-slate-500" />
            <span>Reset</span>
          </button>
        </div>
      </div>

      {/* DESKTOP HEADER (>= md) */}
      <header className="hidden md:flex flex-row items-center justify-between gap-4 pb-2 border-b border-slate-200/80">
        <div>
          <div className="flex items-center gap-2">
            <CreditCard className="text-emerald-600" size={24} />
            <h1 className="text-2xl md:text-3xl font-extrabold text-slate-900 tracking-tight">Coaching Fee Management</h1>
          </div>
          <p className="text-sm text-slate-500 mt-1 font-medium">Monthly Tuition Billing, Ledgers & Payment Entry</p>
        </div>
        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={() => setIsScannerOpen(true)}
            className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 text-xs font-bold transition-all shadow-xs cursor-pointer"
            title="Scan paper fees slip via camera or file upload"
          >
            <Camera size={14} className="text-emerald-600" />
            <span>Scan Slip</span>
          </button>
          <button
            type="button"
            onClick={() => setIsBulkUploadOpen(true)}
            className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 text-xs font-bold transition-all shadow-xs cursor-pointer"
            title="Bulk import coaching fee collections from Excel or CSV"
          >
            <Upload size={14} className="text-emerald-600" />
            <span>Bulk Upload</span>
          </button>
          <button
            onClick={handleReset}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 text-xs font-bold transition-all shadow-xs w-fit cursor-pointer"
          >
            <RotateCcw size={14} className="text-slate-400" />
            <span>Reset Form</span>
          </button>
        </div>
      </header>

      {/* MAIN TWO-COLUMN GRID */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* LEFT COLUMN: FORM & BULK UPLOAD (5 cols) */}
        <div className="lg:col-span-5 space-y-6">
          {/* COLLECT / EDIT FEE CARD */}
          <div className="bg-white p-4 sm:p-6 rounded-2xl border border-slate-300 md:border-slate-200/80 shadow-[0_2px_10px_rgba(15,23,42,0.06)] md:shadow-xs">
            <div className="flex items-center justify-between pb-3 mb-5 border-b border-slate-100">
              <h2 className="text-base font-bold text-slate-900 tracking-tight">
                {editingTransaction ? `Edit Fee (${formData.month} ${formData.year})` : 'Collect Fee Payment'}
              </h2>
              {editingTransaction && (
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200">
                  Editing
                </span>
              )}
            </div>

            {/* Student Search */}
            <div className="relative mb-5">
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider">
                  Search Student
                </label>
                <button
                  type="button"
                  onClick={() => setIsScannerOpen(true)}
                  className="text-[11px] font-bold text-emerald-700 hover:text-emerald-800 flex items-center gap-1 hover:underline cursor-pointer"
                >
                  <Camera size={12} />
                  <span>Scan Slip</span>
                </button>
              </div>
              <div className="relative">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                <input
                  type="text"
                  placeholder="Enter name or Roll No (e.g. TFC-001)..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  disabled={!!editingTransaction}
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 bg-slate-50 text-sm font-medium focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all disabled:opacity-60"
                />
              </div>

              {searchTerm && searchResults.length > 0 && !editingTransaction && (
                <div className="absolute top-full left-0 right-0 mt-1.5 bg-white border border-slate-200 rounded-xl shadow-xl z-30 divide-y divide-slate-100 overflow-hidden">
                  {searchResults.map(s => (
                    <div
                      key={s.id}
                      onClick={() => handleStudentSelect(s)}
                      className="p-3 text-xs cursor-pointer hover:bg-emerald-50/70 transition-colors flex items-center justify-between"
                    >
                      <div>
                        <div className="font-bold text-slate-900">{s.name}</div>
                        <div className="text-[10px] text-slate-500">{s.grade || 'Coaching'}</div>
                      </div>
                      <span className="font-mono text-emerald-700 font-semibold bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-100">
                        {s.roll_no || s.student_id}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {selectedStudent ? (
              <form onSubmit={handleSubmit} className="space-y-4">
                {/* Active Student Pill */}
                <div className="p-3 rounded-xl bg-emerald-50/70 border border-emerald-100 flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    {selectedStudent.profile_image || selectedStudent.photo ? (
                      <img
                        src={selectedStudent.profile_image || selectedStudent.photo}
                        alt={selectedStudent.name}
                        className="w-8 h-8 rounded-lg object-cover border border-emerald-200 shrink-0"
                      />
                    ) : (
                      <div className="w-8 h-8 rounded-lg bg-emerald-600 text-white flex items-center justify-center font-bold text-xs shrink-0">
                        {selectedStudent.name?.charAt(0) || 'S'}
                      </div>
                    )}
                    <div>
                      <div className="text-xs font-bold text-slate-900 leading-tight">{selectedStudent.name}</div>
                      <div className="text-[11px] font-mono text-emerald-700">
                        {selectedStudent.roll_no || selectedStudent.student_id} • {selectedStudent.grade}
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="text-[10px] font-bold text-emerald-700 bg-emerald-100/70 px-2 py-0.5 rounded-md block">
                      {selectedStudent.status?.toUpperCase() || 'ACTIVE'}
                    </span>
                    <span className="text-[10px] font-mono text-slate-500 font-bold mt-0.5 block">
                      PKR {Number(selectedStudent.monthly_fee || 0).toLocaleString()}/mo
                    </span>
                  </div>
                </div>

                {/* Month & Year Row */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-600 mb-1.5 uppercase tracking-wider">
                      Month
                    </label>
                    <select
                      value={formData.month}
                      onChange={e => handleMonthChange(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-slate-50 text-xs font-medium focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 cursor-pointer"
                    >
                      {MONTHS_SHORT.map(m => (
                        <option key={m} value={m}>{m}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-600 mb-1.5 uppercase tracking-wider">
                      Year
                    </label>
                    <input
                      type="number"
                      value={formData.year}
                      onChange={e => handleYearChange(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-slate-50 text-xs font-mono font-medium focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                    />
                  </div>
                </div>

                {/* Fee Pay Date & Slip Serial No */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <label className="text-xs font-bold text-slate-600 uppercase tracking-wider flex items-center gap-1.5">
                        <Calendar size={13} className="text-emerald-600" />
                        <span>Fee Pay Date</span>
                        <span className="text-rose-500">*</span>
                      </label>
                    </div>
                    <input
                      type="date"
                      value={formData.pay_date}
                      onChange={e => setFormData({ ...formData, pay_date: e.target.value })}
                      required
                      className="w-full px-3.5 py-2 rounded-xl border border-slate-200 bg-slate-50 text-xs font-medium text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all"
                    />
                    <div className="text-[10px] text-slate-400 mt-1 px-0.5">
                      Entry: <span className="font-medium text-slate-500">{formatDateDMY(new Date())}</span>
                    </div>
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <label className="text-xs font-bold text-slate-600 uppercase tracking-wider flex items-center gap-1.5">
                        <Hash size={13} className="text-emerald-600" />
                        <span>Slip Serial No</span>
                      </label>
                      <span className="text-[10px] text-slate-400 font-medium">Optional</span>
                    </div>
                    <input
                      type="text"
                      placeholder="e.g. SN-1042"
                      value={formData.serial_no}
                      onChange={e => setFormData({ ...formData, serial_no: e.target.value })}
                      className="w-full px-3.5 py-2 rounded-xl border border-slate-200 bg-slate-50 text-xs font-mono font-medium text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all"
                    />
                  </div>
                </div>

                {/* Payable & Paid */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-600 mb-1.5 uppercase tracking-wider">
                      Payable (PKR)
                    </label>
                    <input
                      type="number"
                      value={formData.payable}
                      onChange={e => setFormData({ ...formData, payable: e.target.value })}
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-slate-50 text-xs font-mono font-bold text-slate-700 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-600 mb-1.5 uppercase tracking-wider">
                      Amount Paid (PKR)
                    </label>
                    <input
                      type="number"
                      value={formData.paid}
                      onChange={e => setFormData({ ...formData, paid: e.target.value })}
                      required
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-slate-50 text-xs font-mono font-bold text-emerald-700 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                    />
                  </div>
                </div>

                {/* Waiver / Discount */}
                <div>
                  <label className="block text-xs font-bold text-slate-600 mb-1.5 uppercase tracking-wider">
                    Waiver / Discount (PKR)
                  </label>
                  <input
                    type="number"
                    value={formData.waived}
                    onChange={e => setFormData({ ...formData, waived: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-slate-50 text-xs font-mono font-medium text-slate-700 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                  />
                </div>

                {/* Payment Method - Strictly Online or Cash */}
                <div>
                  <label className="block text-xs font-bold text-slate-600 mb-1.5 uppercase tracking-wider">
                    Payment Method *
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setFormData(prev => ({ ...prev, payment_method: 'Cash' }))}
                      className={`flex items-center justify-center gap-2 py-2 px-3 rounded-xl border text-xs font-bold transition-all cursor-pointer ${
                        (formData.payment_method || 'Cash') === 'Cash'
                          ? 'bg-emerald-600 text-white border-emerald-600 shadow-sm shadow-emerald-600/20'
                          : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                      }`}
                    >
                      <span className={`w-2 h-2 rounded-full ${(formData.payment_method || 'Cash') === 'Cash' ? 'bg-white' : 'bg-emerald-500'}`} />
                      <span>Cash</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setFormData(prev => ({ ...prev, payment_method: 'Online' }))}
                      className={`flex items-center justify-center gap-2 py-2 px-3 rounded-xl border text-xs font-bold transition-all cursor-pointer ${
                        formData.payment_method === 'Online'
                          ? 'bg-blue-600 text-white border-blue-600 shadow-sm shadow-blue-600/20'
                          : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                      }`}
                    >
                      <span className={`w-2 h-2 rounded-full ${formData.payment_method === 'Online' ? 'bg-white' : 'bg-blue-500'}`} />
                      <span>Online</span>
                    </button>
                  </div>
                </div>

                {/* Optional Note */}
                <div>
                  <label className="block text-xs font-bold text-slate-600 mb-1.5 uppercase tracking-wider">
                    Note / Remarks <span className="text-[10px] text-slate-400 font-normal lowercase">(optional)</span>
                  </label>
                  <input
                    type="text"
                    placeholder="Optional remarks..."
                    value={formData.note}
                    onChange={(e) => setFormData({ ...formData, note: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-slate-50 text-xs font-medium focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                  />
                </div>

                {/* Balance Banner */}
                <div className={`p-3.5 rounded-xl text-center border font-bold text-xs flex items-center justify-between ${
                  balanceCalc > 0
                    ? 'bg-rose-50 border-rose-200/80 text-rose-700'
                    : 'bg-emerald-50 border-emerald-200/80 text-emerald-700'
                }`}>
                  <span className="uppercase text-[10px] tracking-wider">Remaining Balance</span>
                  <span className="font-mono text-base font-extrabold">PKR {balanceCalc.toLocaleString()}</span>
                </div>

                {/* Actions */}
                <div className="flex gap-2.5 pt-2">
                  <button
                    type="submit"
                    disabled={loading}
                    className={`flex-1 py-3 px-4 rounded-xl text-white text-xs font-bold transition-all shadow-xs flex items-center justify-center gap-2 ${
                      editingTransaction
                        ? 'bg-amber-600 hover:bg-amber-700'
                        : 'bg-emerald-600 hover:bg-emerald-700'
                    }`}
                  >
                    <CheckCircle2 size={16} />
                    <span>
                      {loading
                        ? "Saving..."
                        : editingTransaction
                        ? "Update Transaction"
                        : "Record Payment"}
                    </span>
                  </button>

                  {editingTransaction ? (
                    <button
                      type="button"
                      onClick={() => {
                        setEditingTransaction(null);
                        setFormData({
                          ...initialFormState,
                          payable: Number(selectedStudent.monthly_fee) || 0,
                          paid: Number(selectedStudent.monthly_fee) || 0,
                          payment_method: 'Cash'
                        });
                      }}
                      className="px-4 py-3 rounded-xl border border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-700 text-xs font-bold transition-all cursor-pointer"
                    >
                      Cancel
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={handleReset}
                      className="px-4 py-3 rounded-xl border border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-700 text-xs font-bold transition-all cursor-pointer"
                    >
                      Clear
                    </button>
                  )}
                </div>
              </form>
            ) : (
              <div className="p-8 text-center border-2 border-dashed border-slate-200 rounded-xl text-slate-400 text-xs">
                Search and select a coaching student above to start payment collection.
              </div>
            )}
          </div>

          {/* BULK UPLOAD FEES CARD (DESKTOP VIEW) */}
          <div className="hidden lg:block">
            {renderBulkUploadCard()}
          </div>
        </div>

        {/* RIGHT COLUMN: STUDENT FEE HISTORY & LEDGER (7 cols) */}
        <div className="lg:col-span-7 space-y-6">
          <div className="bg-white p-4 sm:p-6 rounded-2xl border border-slate-300 md:border-slate-200/80 shadow-[0_2px_10px_rgba(15,23,42,0.06)] md:shadow-xs space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <BookOpen className="text-emerald-600" size={18} />
                <h3 className="text-base font-bold text-slate-900 tracking-tight">
                  Coaching Fee Ledger {selectedStudent ? `(${selectedStudent.name})` : ''}
                </h3>
              </div>

              {selectedStudent && (
                <div className="flex items-center gap-2">
                  <span className="text-xs font-mono font-bold text-emerald-800 bg-emerald-50 border border-emerald-200/80 px-2.5 py-1 rounded-md">
                    {history.length} Entries
                  </span>
                  {history.length > 0 && (
                    <button
                      onClick={exportStudentHistory}
                      className="p-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 text-slate-600 cursor-pointer"
                      title="Export Ledger to Excel"
                    >
                      <FileSpreadsheet size={15} />
                    </button>
                  )}
                </div>
              )}
            </div>

            {selectedStudent ? (
              <>
                {/* MOBILE LEDGER CARDS (< md) */}
                <div className="block md:hidden space-y-3">
                  {history.length > 0 ? (
                    history.map(h => (
                      <div key={`mob_hist_${h.id}`} className="bg-white rounded-2xl border border-slate-300 p-3.5 space-y-2.5 shadow-xs relative overflow-hidden">
                        <div className={`absolute top-0 left-0 bottom-0 w-1.5 ${h.balance > 0 ? 'bg-rose-500' : 'bg-emerald-500'}`} />
                        <div className="pl-1.5 flex items-start justify-between">
                          <div>
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <span className="font-extrabold text-slate-950 text-sm">
                                {h.month} {h.year}
                              </span>
                              <span className={`px-1.5 py-0.2 rounded text-[10px] font-bold border ${
                                h.payment_method === 'Online'
                                  ? 'bg-blue-50 text-blue-700 border-blue-200'
                                  : 'bg-emerald-50 text-emerald-800 border-emerald-200'
                              }`}>
                                {h.payment_method || 'Cash'}
                              </span>
                              {h.serial_no && (
                                <span className="inline-flex items-center gap-0.5 px-1.5 py-0.2 rounded text-[10px] font-bold border bg-slate-50 text-slate-700 border-slate-200 font-mono">
                                  <Hash size={9} />
                                  <span>{h.serial_no}</span>
                                </span>
                              )}
                            </div>
                            <div className="text-[11px] text-slate-500 font-mono mt-0.5 font-medium flex flex-wrap items-center gap-x-2">
                              <span>Paid: {formatDateDMY(h.pay_date)}</span>
                              {(h.record_added_date || h.timestamp) && (
                                <span className="text-slate-400">
                                  Entry: {formatDateDMY(h.record_added_date || h.timestamp)}
                                </span>
                              )}
                            </div>
                          </div>

                          {isAdmin && (
                            <div className="flex items-center gap-1 bg-slate-50 border border-slate-200 rounded-lg p-0.5">
                              <button
                                onClick={() => handleEdit(h)}
                                className="p-1.5 rounded-md text-emerald-700 hover:bg-emerald-100"
                                title="Edit"
                              >
                                <Pencil size={14} />
                              </button>
                              <button
                                onClick={() => handleDelete(h.id)}
                                className="p-1.5 rounded-md text-rose-700 hover:bg-rose-100"
                                title="Delete"
                              >
                                <Trash2 size={14} />
                              </button>
                            </div>
                          )}
                        </div>

                        <div className="pl-1.5 grid grid-cols-3 gap-2 text-center text-xs">
                          <div className="p-2 bg-slate-100 rounded-xl border border-slate-200">
                            <div className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Payable</div>
                            <div className="font-mono font-bold text-slate-900 mt-0.5">PKR {Number(h.payable || 0).toLocaleString()}</div>
                          </div>
                          <div className="p-2 bg-emerald-50 rounded-xl border border-emerald-200">
                            <div className="text-[10px] text-emerald-800 font-bold uppercase tracking-wider">Paid</div>
                            <div className="font-mono font-black text-emerald-800 mt-0.5">PKR {Number(h.paid || 0).toLocaleString()}</div>
                          </div>
                          <div className={`p-2 rounded-xl border ${h.balance > 0 ? 'bg-rose-50 border-rose-300' : 'bg-slate-100 border-slate-200'}`}>
                            <div className={`text-[10px] font-bold uppercase tracking-wider ${h.balance > 0 ? 'text-rose-700' : 'text-slate-500'}`}>Balance</div>
                            <div className={`font-mono font-black mt-0.5 ${h.balance > 0 ? 'text-rose-700' : 'text-emerald-700'}`}>
                              {h.balance > 0 ? `PKR ${Number(h.balance).toLocaleString()}` : 'Cleared'}
                            </div>
                          </div>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="py-8 text-center text-slate-500 bg-white rounded-2xl border border-slate-300 font-medium text-xs">
                      No transaction records found for this coaching student.
                    </div>
                  )}
                </div>

                {/* DESKTOP TABLE (>= md) */}
                <div className="hidden md:block overflow-x-auto rounded-xl border border-slate-200">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 uppercase font-bold tracking-wider text-[11px]">
                        <th className="py-3 px-3.5">Month / Year</th>
                        <th className="py-3 px-3.5">Fee Pay Date</th>
                        <th className="py-3 px-3.5 text-right">Payable</th>
                        <th className="py-3 px-3.5 text-right">Paid</th>
                        <th className="py-3 px-3.5 text-right">Waived</th>
                        <th className="py-3 px-3.5 text-right">Balance</th>
                        {isAdmin && <th className="py-3 px-3.5 text-center">Actions</th>}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {history.length > 0 ? (
                        history.map(h => (
                          <tr key={h.id} className="hover:bg-slate-50/70 transition-colors">
                            <td className="py-3 px-3.5 font-bold text-slate-800">
                              <div>{h.month} {h.year}</div>
                              <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
                                <span className={`inline-block px-1.5 py-0.2 rounded text-[10px] font-bold border ${
                                  h.payment_method === 'Online'
                                    ? 'bg-blue-50 text-blue-700 border-blue-200'
                                    : 'bg-emerald-50 text-emerald-800 border-emerald-200'
                                }`}>
                                  {h.payment_method || 'Cash'}
                                </span>
                                {h.serial_no && (
                                  <span className="inline-flex items-center gap-0.5 px-1.5 py-0.2 rounded text-[10px] font-bold border bg-slate-50 text-slate-700 border-slate-200 font-mono">
                                    <Hash size={9} />
                                    <span>{h.serial_no}</span>
                                  </span>
                                )}
                              </div>
                            </td>
                            <td className="py-3 px-3.5">
                              <div className="font-semibold text-slate-800 font-mono text-xs">
                                {formatDateDMY(h.pay_date)}
                              </div>
                              <div className="text-[10px] text-slate-400 font-mono">
                                Entry: {formatDateDMY(h.record_added_date || h.timestamp)}
                              </div>
                            </td>
                            <td className="py-3 px-3.5 text-right font-mono text-slate-600">
                              PKR {Number(h.payable || 0).toLocaleString()}
                            </td>
                            <td className="py-3 px-3.5 text-right font-mono font-bold text-emerald-700">
                              PKR {Number(h.paid || 0).toLocaleString()}
                            </td>
                            <td className="py-3 px-3.5 text-right font-mono text-slate-500">
                              {h.waived > 0 ? `PKR ${Number(h.waived).toLocaleString()}` : '—'}
                            </td>
                            <td className={`py-3 px-3.5 text-right font-mono font-black ${
                              h.balance > 0 ? 'text-rose-600' : 'text-slate-400'
                            }`}>
                              {h.balance > 0 ? `PKR ${Number(h.balance).toLocaleString()}` : 'Cleared'}
                            </td>
                            {isAdmin && (
                              <td className="py-3 px-3.5 text-center">
                                <div className="inline-flex items-center gap-1">
                                  <button
                                    onClick={() => handleEdit(h)}
                                    className="p-1.5 rounded-lg text-emerald-700 hover:bg-emerald-50 transition-colors"
                                    title="Edit Transaction"
                                  >
                                    <Pencil size={14} />
                                  </button>
                                  <button
                                    onClick={() => handleDelete(h.id)}
                                    className="p-1.5 rounded-lg text-rose-600 hover:bg-rose-50 transition-colors"
                                    title="Delete Transaction"
                                  >
                                    <Trash2 size={14} />
                                  </button>
                                </div>
                              </td>
                            )}
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td colSpan={isAdmin ? 7 : 6} className="py-8 text-center text-slate-400 text-xs">
                            No payment transactions recorded yet for this student.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </>
            ) : (
              <div className="p-12 text-center border-2 border-dashed border-slate-200 rounded-2xl text-slate-400 text-xs space-y-1">
                <CreditCard className="mx-auto text-slate-300" size={32} />
                <p className="font-bold text-slate-600">No student selected</p>
                <p className="text-[11px] text-slate-400">Select a coaching student on the left to inspect their complete payment history.</p>
              </div>
            )}
          </div>

          {/* BULK UPLOAD FEES CARD (MOBILE VIEW) */}
          <div className="block lg:hidden">
            {renderBulkUploadCard()}
          </div>
        </div>
      </div>

      {/* COACHING SLIP SCANNER MODAL */}
      <CoachingSlipScannerModal
        isOpen={isScannerOpen}
        onClose={() => setIsScannerOpen(false)}
        onApply={handleSlipApplied}
        coachingStudents={coachingStudents}
      />

      {/* COACHING FEE BULK UPLOAD MODAL */}
      <CoachingFeeBulkUploadModal
        isOpen={isBulkUploadOpen}
        onClose={() => setIsBulkUploadOpen(false)}
        existingStudents={coachingStudents}
        onSuccess={() => {
          toast.success("Coaching fees updated!");
        }}
      />
    </div>
  );
};

export default CoachingFees;
