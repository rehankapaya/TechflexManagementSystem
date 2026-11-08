import React, { useState, useEffect } from 'react';
import { db } from '../firebase.js';
import { useAuth } from '../contexts/AuthContext';
import { ref, set, push, onValue, remove, update } from 'firebase/database';
import { downloadFeeSample, parseExcelUpload } from '../utils/bulkUpload';
import toast from 'react-hot-toast';
import { MONTHS_SHORT, normalizeMonth, normalizeMonthKey, getCanonicalShortMonth, MONTH_ORDER } from '../utils/monthUtils';
import {
  CreditCard,
  Search,
  RotateCcw,
  FileSpreadsheet,
  Upload,
  Clock,
  CheckCircle2,
  XCircle,
  Pencil,
  Trash2,
  Calendar,
  AlertCircle,
  BookOpen,
  ArrowRight,
  ShieldCheck,
  UserCheck
} from 'lucide-react';

const Fees = () => {
  const { currentUser, isAdmin } = useAuth();

  // Data States
  const [students, setStudents] = useState([]);
  const [feesData, setFeesData] = useState({});
  const [pendingFees, setPendingFees] = useState([]);

  // UI States
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [selectedCourseId, setSelectedCourseId] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(false);
  const [editingTransaction, setEditingTransaction] = useState(null);

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
    waived: 0
  };

  const [formData, setFormData] = useState(initialFormState);

  // --- 1. Realtime Listeners ---
  useEffect(() => {
    const unsubStudents = onValue(ref(db, 'students'), (snap) => {
      const data = snap.val();
      setStudents(data ? Object.keys(data).map(id => ({ id, ...data[id] })) : []);
    });

    const unsubFees = onValue(ref(db, 'fee_transactions'), (snap) => {
      setFeesData(snap.val() || {});
    });

    const unsubPending = onValue(ref(db, 'pending_fee_approvals'), (snap) => {
      const data = snap.val();
      setPendingFees(data ? Object.keys(data).map(id => ({ id, ...data[id] })) : []);
    });

    return () => {
      unsubStudents();
      unsubFees();
      unsubPending();
    };
  }, []);

  // --- 2. Logic Functions ---
  const handleReset = () => {
    setSelectedStudent(null);
    setSelectedCourseId('');
    setSearchTerm('');
    setFormData(initialFormState);
    setEditingTransaction(null);
  };

  const handleStudentSelect = (student) => {
    setSelectedStudent(student);
    setSelectedCourseId('');
    setFormData(prev => ({ ...prev, payable: 0, paid: 0, waived: 0, pay_date: getTodayDateStr() }));
    setSearchTerm("");
    setEditingTransaction(null);
  };

  const handleCourseSelect = (courseId) => {
    setSelectedCourseId(courseId);
    const courseData = selectedStudent.enrolled_courses[courseId];
    if (courseData) {
      setFormData(prev => ({
        ...prev,
        payable: courseData.agreed_monthly_fee,
        paid: courseData.agreed_monthly_fee,
        waived: 0,
        pay_date: prev.pay_date || getTodayDateStr()
      }));
    }
    setEditingTransaction(null);
  };

  const handleEdit = (transaction) => {
    setEditingTransaction(transaction);
    const resolvedPayDate = transaction.pay_date
      || transaction.payment_date
      || (transaction.timestamp ? new Date(transaction.timestamp).toISOString().split('T')[0] : getTodayDateStr());

    setFormData({
      month: transaction.month || transaction.month_key.split('_')[0],
      year: transaction.year || transaction.month_key.split('_')[1],
      pay_date: resolvedPayDate,
      payable: transaction.payable,
      paid: transaction.paid,
      waived: transaction.waived
    });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleDeleteFee = async (id) => {
    if (!selectedStudent || !selectedCourseId) return;

    const confirmDelete = window.confirm("Are you sure you want to delete this record?");

    if (confirmDelete) {
      try {
        await remove(ref(db, `fee_transactions/${selectedStudent.id}/${selectedCourseId}/${id}`));
        toast.success("Record deleted successfully.");
      } catch (err) {
        toast.error("Error deleting record: " + err.message);
      }
    }
  };

  const handlePaymentSubmit = async (e) => {
    e.preventDefault();
    if (!selectedStudent || !selectedCourseId) return toast.error("Select student and course");
    if (!formData.pay_date) return toast.error("Please select the fee pay date");

    setLoading(true);
    const monthKey = `${formData.month}_${formData.year}`;
    const balance = Number(formData.payable) - Number(formData.paid) - Number(formData.waived);
    const nowIso = new Date().toISOString();
    const nowTimestamp = Date.now();

    const transaction = {
      student_id: selectedStudent.id,
      student_name: selectedStudent.name,
      student_custom_id: selectedStudent.student_id,
      course_id: selectedCourseId,
      course_name: selectedStudent.enrolled_courses[selectedCourseId].course_name,
      month_key: monthKey,
      month: formData.month,
      year: formData.year,
      pay_date: formData.pay_date,
      payment_date: formData.pay_date,
      record_added_date: editingTransaction?.record_added_date || nowIso,
      record_added_at: editingTransaction?.record_added_at || nowTimestamp,
      timestamp: editingTransaction?.timestamp || nowTimestamp,
      payable: Number(formData.payable),
      paid: Number(formData.paid),
      waived: Number(formData.waived),
      balance: balance,
      addedBy: editingTransaction?.addedBy || currentUser.displayName || 'Staff'
    };

    if (editingTransaction) {
      transaction.updated_at = nowTimestamp;
      transaction.updated_by = currentUser.displayName || 'Admin';
    }

    try {
      if (!isAdmin) {
        await push(ref(db, 'pending_fee_approvals'), transaction);
        toast.success("Transaction sent to Admin for approval.");
        setFormData(prev => ({ ...prev, paid: prev.payable, waived: 0, pay_date: getTodayDateStr() }));
      } else if (editingTransaction) {
        if (editingTransaction.month_key !== monthKey) {
          await remove(ref(db, `fee_transactions/${selectedStudent.id}/${selectedCourseId}/${editingTransaction.id}`));
        }
        await update(ref(db, `fee_transactions/${selectedStudent.id}/${selectedCourseId}/${monthKey}`), transaction);
        toast.success("Transaction updated successfully.");
        setEditingTransaction(null);
        setFormData(prev => ({ ...prev, paid: prev.payable, waived: 0, pay_date: getTodayDateStr() }));
      } else {
        await update(ref(db, `fee_transactions/${selectedStudent.id}/${selectedCourseId}/${monthKey}`), transaction);
        toast.success("Payment recorded.");
        setFormData(prev => ({ ...prev, paid: prev.payable, waived: 0, pay_date: getTodayDateStr() }));
      }
    } catch (err) {
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleBulkUploadFees = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setLoading(true);
    try {
      const rows = await parseExcelUpload(file);
      let successCount = 0;
      const updates = {};
      const nowIso = new Date().toISOString();
      const defaultPayDate = getTodayDateStr();

      for (const row of rows) {
        const sId = row['Student ID'];
        const cName = row['Course Name'];
        const m = row['Month'];
        const y = row['Year'];
        const payable = row['Payable'];
        const paid = row['Paid'];
        const waived = row['Waived'];
        const payDateRaw = row['Pay Date'] || row['Payment Date'] || row['Date'] || defaultPayDate;

        if (sId && cName && m && y && payable !== undefined && paid !== undefined) {
          const normMonth = normalizeMonth(m);
          const monthKey = `${normMonth}_${y}`;
          const balance = Number(payable) - Number(paid) - Number(waived || 0);

          const student = students.find(s => s.student_id === sId || s.id === sId);
          if (student && student.enrolled_courses) {
            const cId = Object.keys(student.enrolled_courses).find(id =>
              student.enrolled_courses[id].course_name?.toLowerCase() === cName.toString().trim().toLowerCase()
            );

            if (cId) {
              const courseName = student.enrolled_courses[cId].course_name;
              const transaction = {
                student_id: student.id,
                student_name: student.name,
                student_custom_id: student.student_id || sId,
                course_id: cId,
                course_name: courseName,
                month_key: monthKey,
                month: normMonth,
                year: y.toString(),
                pay_date: payDateRaw,
                payment_date: payDateRaw,
                record_added_date: nowIso,
                record_added_at: Date.now(),
                payable: Number(payable),
                paid: Number(paid),
                waived: Number(waived || 0),
                balance: balance,
                addedBy: currentUser.displayName || 'Admin Upload',
                timestamp: Date.now()
              };

              updates[`fee_transactions/${student.id}/${cId}/${monthKey}`] = transaction;
              successCount++;
            }
          }
        }
      }

      if (Object.keys(updates).length > 0) {
        await update(ref(db), updates);
        toast.success(`Successfully imported ${successCount} fee records!`);
      } else {
        toast.error("No valid rows found to import. Ensure Student ID and Course Name are exact matches.");
      }
    } catch (error) {
      toast.error("Failed to import fees: " + error.message);
    } finally {
      setLoading(false);
      e.target.value = null;
    }
  };

  const approveFee = async (reqId, data) => {
    try {
      const { id, ...cleanData } = data;
      await update(ref(db, `fee_transactions/${data.student_id}/${data.course_id}/${data.month_key}`), {
        ...cleanData,
        approvedBy: currentUser.displayName || "Admin",
        approvedAt: Date.now()
      });
      await remove(ref(db, `pending_fee_approvals/${reqId}`));
      toast.success("Fee Approved.");
    } catch (err) { toast.error(err.message); }
  };

  const rejectFee = async (reqId) => {
    if (window.confirm("Reject request?")) await remove(ref(db, `pending_fee_approvals/${reqId}`));
  };

  const getHistory = () => {
    if (!selectedStudent || !selectedCourseId || !feesData[selectedStudent.id]) return [];
    const transactions = feesData[selectedStudent.id][selectedCourseId] || {};
    const monthOrder = MONTH_ORDER;

    return Object.keys(transactions)
      .map(key => ({ id: key, ...transactions[key] }))
      .sort((a, b) => {
        const yearA = parseInt(a.year || a.id.split('_')[1] || 0, 10);
        const yearB = parseInt(b.year || b.id.split('_')[1] || 0, 10);
        if (yearA !== yearB) return yearB - yearA;

        const monthA = monthOrder[normalizeMonth(a.month || a.id.split('_')[0])] || 0;
        const monthB = monthOrder[normalizeMonth(b.month || b.id.split('_')[0])] || 0;
        return monthB - monthA;
      });
  };

  const searchResults = students.filter(s =>
    s.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (s.student_id && s.student_id.toLowerCase().includes(searchTerm.toLowerCase()))
  ).slice(0, 5);

  const balanceCalc = Number(formData.payable) - Number(formData.paid) - Number(formData.waived);

  return (
    <div className="space-y-6 font-sans animate-fade-in">
      {/* HEADER */}
      <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-200/80">
        <div>
          <div className="flex items-center gap-2">
            <CreditCard className="text-blue-600" size={24} />
            <h1 className="text-2xl md:text-3xl font-extrabold text-slate-900 tracking-tight">Fee Management</h1>
          </div>
          <p className="text-sm text-slate-500 mt-1 font-medium">Multi-Course Billing, Ledgers & Payment Entry</p>
        </div>
        <button
          onClick={handleReset}
          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 text-xs font-bold transition-all shadow-xs w-fit"
        >
          <RotateCcw size={14} className="text-slate-400" />
          <span>Reset Form</span>
        </button>
      </header>

      {/* MAIN TWO-COLUMN GRID */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* LEFT COLUMN: FORM & BULK UPLOAD (5 cols) */}
        <div className="lg:col-span-5 space-y-6">
          {/* COLLECT / EDIT FEE CARD */}
          <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-xs">
            <div className="flex items-center justify-between pb-3 mb-5 border-b border-slate-100">
              <h2 className="text-base font-bold text-slate-900 tracking-tight">
                {editingTransaction ? `Edit Fee (${editingTransaction.month_key.replace('_', ' ')})` : 'Collect Fee Payment'}
              </h2>
              {editingTransaction && (
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200">
                  Editing
                </span>
              )}
            </div>

            {/* Student Search */}
            <div className="relative mb-5">
              <label className="block text-xs font-bold text-slate-600 mb-1.5 uppercase tracking-wider">
                Search Student
              </label>
              <div className="relative">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                <input
                  type="text"
                  placeholder="Enter name or ID (e.g. STU-001)..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  disabled={!!editingTransaction}
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 bg-slate-50 text-sm font-medium focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all disabled:opacity-60"
                />
              </div>

              {searchTerm && searchResults.length > 0 && !editingTransaction && (
                <div className="absolute top-full left-0 right-0 mt-1.5 bg-white border border-slate-200 rounded-xl shadow-xl z-30 divide-y divide-slate-100 overflow-hidden">
                  {searchResults.map(s => (
                    <div
                      key={s.id}
                      onClick={() => handleStudentSelect(s)}
                      className="p-3 text-xs cursor-pointer hover:bg-blue-50/70 transition-colors flex items-center justify-between"
                    >
                      <span className="font-bold text-slate-900">{s.name}</span>
                      <span className="font-mono text-blue-600 font-semibold bg-blue-50 px-2 py-0.5 rounded-md">
                        {s.student_id}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {selectedStudent ? (
              <form onSubmit={handlePaymentSubmit} className="space-y-4">
                {/* Active Student Pill */}
                <div className="p-3 rounded-xl bg-blue-50/70 border border-blue-100 flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-lg bg-blue-600 text-white flex items-center justify-center font-bold text-xs">
                      {selectedStudent.name?.charAt(0) || 'S'}
                    </div>
                    <div>
                      <div className="text-xs font-bold text-slate-900 leading-tight">{selectedStudent.name}</div>
                      <div className="text-[11px] font-mono text-blue-600">{selectedStudent.student_id}</div>
                    </div>
                  </div>
                  <span className="text-[10px] font-bold text-emerald-700 bg-emerald-100/70 px-2 py-0.5 rounded-md">
                    {selectedStudent.status?.toUpperCase() || 'ACTIVE'}
                  </span>
                </div>

                {/* Course Selection */}
                <div>
                  <label className="block text-xs font-bold text-slate-600 mb-1.5 uppercase tracking-wider">
                    Select Enrolled Course
                  </label>
                  <select
                    value={selectedCourseId}
                    onChange={(e) => handleCourseSelect(e.target.value)}
                    disabled={!!editingTransaction}
                    required
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-slate-50 text-xs font-semibold focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all disabled:opacity-60"
                  >
                    <option value="">-- Choose Course --</option>
                    {Object.entries(selectedStudent.enrolled_courses || {}).map(([id, data]) => (
                      <option key={id} value={id}>{data.course_name}</option>
                    ))}
                  </select>
                </div>

                {selectedCourseId && (
                  <>
                    {/* Month & Year Row */}
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-bold text-slate-600 mb-1.5 uppercase tracking-wider">
                          Month
                        </label>
                        <select
                          value={formData.month}
                          onChange={e => setFormData({ ...formData, month: e.target.value })}
                          className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-slate-50 text-xs font-medium focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
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
                          onChange={e => setFormData({ ...formData, year: e.target.value })}
                          className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-slate-50 text-xs font-mono font-medium focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                        />
                      </div>
                    </div>

                    {/* Fee Pay Date */}
                    <div>
                      <div className="flex items-center justify-between mb-1.5">
                        <label className="text-xs font-bold text-slate-600 uppercase tracking-wider flex items-center gap-1.5">
                          <Calendar size={13} className="text-blue-600" />
                          <span>Fee Pay Date</span>
                          <span className="text-rose-500">*</span>
                        </label>
                        <span className="text-[10px] text-slate-400 font-medium">Actual date payment received</span>
                      </div>
                      <input
                        type="date"
                        value={formData.pay_date}
                        onChange={e => setFormData({ ...formData, pay_date: e.target.value })}
                        required
                        className="w-full px-3.5 py-2 rounded-xl border border-slate-200 bg-slate-50 text-xs font-medium text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                      />
                      <div className="text-[10px] text-slate-400 mt-1 px-0.5">
                        System entry date will automatically record as today (<span className="font-medium text-slate-500">{new Date().toLocaleDateString('en-GB')}</span>)
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
                          readOnly
                          className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-slate-100 text-xs font-mono font-bold text-slate-600 cursor-not-allowed"
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
                          className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-slate-50 text-xs font-mono font-bold text-emerald-700 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
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
                        className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-slate-50 text-xs font-mono font-medium text-slate-700 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
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
                            : 'bg-blue-600 hover:bg-blue-700'
                        }`}
                      >
                        <CheckCircle2 size={16} />
                        <span>
                          {loading
                            ? "Saving..."
                            : editingTransaction
                            ? "Update Transaction"
                            : !isAdmin
                            ? "Submit for Approval"
                            : "Record Payment"}
                        </span>
                      </button>

                      {editingTransaction ? (
                        <button
                          type="button"
                          onClick={() => { setEditingTransaction(null); setFormData(initialFormState); }}
                          className="px-4 py-3 rounded-xl border border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-700 text-xs font-bold transition-all"
                        >
                          Cancel
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={handleReset}
                          className="px-4 py-3 rounded-xl border border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-700 text-xs font-bold transition-all"
                        >
                          Clear
                        </button>
                      )}
                    </div>
                  </>
                )}
              </form>
            ) : (
              <div className="p-8 text-center border-2 border-dashed border-slate-200 rounded-xl text-slate-400 text-xs">
                Search and select a student above to start payment collection.
              </div>
            )}
          </div>

          {/* BULK UPLOAD CARD */}
          {isAdmin && (
            <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-xs space-y-4">
              <div className="flex items-center gap-2 pb-3 border-b border-slate-100">
                <FileSpreadsheet className="text-emerald-600" size={18} />
                <h3 className="text-sm font-bold text-slate-900 tracking-tight">Bulk Upload Fee Records</h3>
              </div>
              <p className="text-xs text-slate-500 leading-relaxed">
                Upload an Excel sheet to batch import student fee records. Existing transactions matching student and month will be synchronized.
              </p>
              <div className="flex flex-col sm:flex-row gap-2.5">
                <button
                  type="button"
                  onClick={downloadFeeSample}
                  className="flex-1 flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl border border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-700 text-xs font-bold transition-all"
                >
                  <FileSpreadsheet size={15} />
                  <span>Download Sample</span>
                </button>
                <input
                  type="file"
                  accept=".xlsx, .xls"
                  onChange={handleBulkUploadFees}
                  id="fee-upload"
                  className="hidden"
                />
                <button
                  type="button"
                  onClick={() => document.getElementById('fee-upload').click()}
                  disabled={loading}
                  className="flex-1 flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition-all shadow-xs disabled:opacity-60"
                >
                  <Upload size={15} />
                  <span>{loading ? "Processing..." : "Upload Excel"}</span>
                </button>
              </div>
            </div>
          )}
        </div>

        {/* RIGHT COLUMN: PENDING APPROVALS & COURSE LEDGER (7 cols) */}
        <div className="lg:col-span-7 space-y-6">
          {/* PENDING APPROVALS CARD */}
          {isAdmin && pendingFees.length > 0 && (
            <div className="bg-amber-50/80 p-5 rounded-2xl border border-amber-200 shadow-xs space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-amber-200/60">
                <div className="flex items-center gap-2">
                  <Clock className="text-amber-700" size={18} />
                  <h3 className="text-sm font-bold text-amber-900 tracking-tight">
                    Pending Fee Approvals ({pendingFees.length})
                  </h3>
                </div>
                <span className="text-[10px] font-bold text-amber-800 uppercase tracking-wider bg-amber-100 px-2 py-0.5 rounded-md">
                  Action Required
                </span>
              </div>

              <div className="overflow-x-auto rounded-xl border border-amber-200/80 bg-white">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-amber-100/50 border-b border-amber-200 text-amber-900 font-bold uppercase tracking-wider text-[11px]">
                      <th className="py-2.5 px-3">Student</th>
                      <th className="py-2.5 px-3">Course</th>
                      <th className="py-2.5 px-3">Month</th>
                      <th className="py-2.5 px-3">Pay Date</th>
                      <th className="py-2.5 px-3 text-right">Paid / Waived</th>
                      <th className="py-2.5 px-3 text-center">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-amber-100">
                    {pendingFees.map(f => (
                      <tr key={f.id} className="hover:bg-amber-50/50">
                        <td className="py-2.5 px-3 font-semibold text-slate-900">{f.student_name}</td>
                        <td className="py-2.5 px-3 text-slate-600">{f.course_name}</td>
                        <td className="py-2.5 px-3 font-mono font-bold text-slate-700">{f.month_key}</td>
                        <td className="py-2.5 px-3 font-mono text-[11px]">
                          <div className="font-bold text-slate-800">{f.pay_date || '—'}</div>
                          <div className="text-[10px] text-slate-400 font-sans">
                            Added: {f.timestamp ? new Date(f.timestamp).toLocaleDateString('en-GB') : '—'}
                          </div>
                        </td>
                        <td className="py-2.5 px-3 text-right font-mono">
                          <span className="font-bold text-emerald-700">PKR {f.paid}</span>
                          {f.waived > 0 && <span className="text-rose-600 text-[10px] block">Waived: PKR {f.waived}</span>}
                        </td>
                        <td className="py-2.5 px-3 text-center space-x-1.5 whitespace-nowrap">
                          <button
                            onClick={() => approveFee(f.id, f)}
                            className="px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-[11px] shadow-xs"
                          >
                            Approve
                          </button>
                          <button
                            onClick={() => rejectFee(f.id)}
                            className="px-2.5 py-1 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 font-bold text-[11px]"
                          >
                            Reject
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* COURSE LEDGER HISTORY CARD */}
          <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-xs space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <BookOpen className="text-blue-600" size={18} />
                <h3 className="text-base font-bold text-slate-900 tracking-tight">
                  Course Ledger {selectedCourseId && selectedStudent?.enrolled_courses?.[selectedCourseId]
                    ? `(${selectedStudent.enrolled_courses[selectedCourseId].course_name})`
                    : ''}
                </h3>
              </div>
              {selectedCourseId && (
                <span className="text-xs font-mono font-bold text-blue-600 bg-blue-50 px-2.5 py-1 rounded-md">
                  {getHistory().length} Entries
                </span>
              )}
            </div>

            {selectedCourseId ? (
              <div className="overflow-x-auto rounded-xl border border-slate-200">
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
                    {getHistory().length > 0 ? (
                      getHistory().map(h => (
                        <tr key={h.id} className="hover:bg-slate-50/70 transition-colors">
                          <td className="py-3 px-3.5 font-bold text-slate-800">
                            {h.month_key ? h.month_key.replace('_', ' ') : h.id.replace('_', ' ')}
                          </td>
                          <td className="py-3 px-3.5">
                            <div className="font-semibold text-slate-800 font-mono text-xs">
                              {h.pay_date || h.payment_date || (h.timestamp ? new Date(h.timestamp).toISOString().split('T')[0] : '—')}
                            </div>
                            <div className="text-[10px] text-slate-400">
                              Entry: {h.record_added_date 
                                ? new Date(h.record_added_date).toLocaleDateString('en-GB') 
                                : (h.timestamp ? new Date(h.timestamp).toLocaleDateString('en-GB') : '—')}
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
                                  className="p-1.5 rounded-lg text-blue-600 hover:bg-blue-50 transition-colors"
                                  title="Edit Transaction"
                                >
                                  <Pencil size={14} />
                                </button>
                                <button
                                  onClick={() => handleDeleteFee(h.id)}
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
                          No transaction records found for this course.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="p-12 text-center border-2 border-dashed border-slate-200 rounded-xl text-slate-400 text-xs space-y-1">
                <CreditCard className="mx-auto text-slate-300" size={32} />
                <p className="font-semibold text-slate-600">Select a student and course to inspect ledger records.</p>
                <p className="text-[11px] text-slate-400">Transaction history will be displayed here automatically.</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Fees;
