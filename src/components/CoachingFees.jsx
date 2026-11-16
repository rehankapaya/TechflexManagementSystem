import React, { useState, useEffect } from 'react';
import { db } from '../firebase';
import { ref, set, remove } from 'firebase/database';
import { useData } from '../contexts/DataContext';
import { useAuth } from '../contexts/AuthContext';
import { useSearchParams } from 'react-router-dom';
import toast from 'react-hot-toast';
import { MONTHS_SHORT, normalizeMonthKey, getCanonicalShortMonth } from '../utils/monthUtils';
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
  FileSpreadsheet
} from 'lucide-react';
import * as XLSX from 'xlsx';

const CoachingFees = () => {
  const { coachingStudents, coachingFeeTransactions } = useData();
  const { currentUser, isAdmin } = useAuth();
  const [searchParams] = useSearchParams();

  // Selected student
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [editingTransaction, setEditingTransaction] = useState(null);
  const [loading, setLoading] = useState(false);

  // Form State
  const getTodayDateStr = () => new Date().toISOString().split('T')[0];

  const initialFormState = {
    month: getCanonicalShortMonth(),
    year: new Date().getFullYear().toString(),
    pay_date: getTodayDateStr(),
    payable: 0,
    paid: 0,
    waived: 0,
    note: ''
  };

  const [formData, setFormData] = useState(initialFormState);

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
    const mFee = Number(student.monthly_fee) || 0;
    setFormData({
      ...initialFormState,
      payable: mFee,
      paid: mFee,
      waived: 0,
      pay_date: getTodayDateStr()
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
    setFormData({
      month: trx.month || parts[0] || getCanonicalShortMonth(),
      year: trx.year || parts[1] || new Date().getFullYear().toString(),
      pay_date: trx.pay_date || getTodayDateStr(),
      payable: Number(trx.payable) || 0,
      paid: Number(trx.paid) || 0,
      waived: Number(trx.waived) || 0,
      note: trx.note || ''
    });
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

    setLoading(true);
    try {
      await set(ref(db, `coaching_fees/${selectedStudent.id}/${trxId}`), {
        id: trxId,
        studentId: selectedStudent.id,
        studentName: selectedStudent.name,
        rollNo: selectedStudent.roll_no || selectedStudent.student_id,
        grade: selectedStudent.grade || '',
        month: formData.month,
        year: formData.year,
        month_key: monthKey,
        payable,
        paid,
        waived,
        balance,
        pay_date: formData.pay_date,
        note: formData.note.trim(),
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
        note: ''
      }));
    } catch (err) {
      toast.error(err.message || "Failed to record payment");
    } finally {
      setLoading(false);
    }
  };

  // Student Fee History
  const history = React.useMemo(() => {
    if (!selectedStudent || !coachingFeeTransactions) return [];
    const studentRecords = coachingFeeTransactions[selectedStudent.id];
    if (!studentRecords) return [];
    return Object.keys(studentRecords).map(id => ({
      id,
      ...studentRecords[id]
    })).sort((a, b) => new Date(b.timestamp || b.pay_date) - new Date(a.timestamp || a.pay_date));
  }, [selectedStudent, coachingFeeTransactions]);

  // Search Results
  const searchResults = React.useMemo(() => {
    if (!searchTerm.trim()) return [];
    const q = searchTerm.toLowerCase();
    return coachingStudents.filter(s =>
      (s.name && s.name.toLowerCase().includes(q)) ||
      (s.roll_no && s.roll_no.toLowerCase().includes(q)) ||
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
      "Pay Date": h.pay_date,
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

  return (
    <div className="space-y-6 font-sans animate-fade-in pb-12">
      {/* HEADER SECTION */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-200/80">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-emerald-600 to-teal-600 flex items-center justify-center text-white shadow-md shadow-emerald-600/20 shrink-0">
            <CreditCard size={22} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight">Coaching Fee Entry</h1>
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 uppercase tracking-wider">
                Monthly Billing
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5 font-medium">Record monthly coaching tuition payments & inspect student ledgers</p>
          </div>
        </div>

        {selectedStudent && (
          <button
            onClick={handleReset}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 text-xs font-bold transition-all shadow-xs w-fit cursor-pointer"
          >
            <RotateCcw size={14} className="text-slate-400" />
            <span>Select Different Student</span>
          </button>
        )}
      </div>

      {/* MAIN TWO COLUMN LAYOUT */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* LEFT COLUMN: SEARCH & PAYMENT FORM (5 cols) */}
        <div className="lg:col-span-5 space-y-5">
          <div className="bg-white p-5 sm:p-6 rounded-2xl border border-slate-300 md:border-slate-200/80 shadow-[0_2px_10px_rgba(15,23,42,0.06)] md:shadow-xs space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h2 className="text-base font-bold text-slate-900 tracking-tight flex items-center gap-2">
                <CreditCard size={18} className="text-emerald-600" />
                <span>{editingTransaction ? `Edit Payment (${formData.month} ${formData.year})` : 'Collect Coaching Fee'}</span>
              </h2>
              {editingTransaction && (
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200">
                  Editing
                </span>
              )}
            </div>

            {/* Student Search Box */}
            <div className="relative">
              <label className="block text-xs font-bold text-slate-600 mb-1.5 uppercase tracking-wider">
                Find Coaching Student
              </label>
              <div className="relative">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                <input
                  type="text"
                  placeholder="Type student name or roll number (e.g. TFC-001)..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 bg-slate-50 text-xs font-medium focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all"
                />
              </div>

              {/* Autocomplete dropdown */}
              {searchTerm && searchResults.length > 0 && (
                <div className="absolute top-full left-0 right-0 mt-1.5 bg-white border border-slate-200 rounded-2xl shadow-2xl z-30 divide-y divide-slate-100 overflow-hidden">
                  {searchResults.map(s => (
                    <div
                      key={s.id}
                      onClick={() => handleStudentSelect(s)}
                      className="p-3 text-xs cursor-pointer hover:bg-emerald-50/70 transition-colors flex items-center justify-between"
                    >
                      <div className="flex items-center gap-2.5">
                        {s.profile_image || s.photo ? (
                          <img src={s.profile_image || s.photo} alt={s.name} className="w-7 h-7 rounded-lg object-cover" />
                        ) : (
                          <div className="w-7 h-7 rounded-lg bg-emerald-600 text-white flex items-center justify-center font-bold text-xs">
                            {s.name?.charAt(0)}
                          </div>
                        )}
                        <div>
                          <div className="font-bold text-slate-900">{s.name}</div>
                          <div className="text-[10px] text-slate-500">{s.grade || 'Coaching'}</div>
                        </div>
                      </div>
                      <span className="font-mono text-emerald-800 font-bold bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">
                        {s.roll_no || s.student_id}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Active Selected Student Card */}
            {selectedStudent ? (
              <form onSubmit={handleSubmit} className="space-y-4 pt-2">
                <div className="p-3.5 rounded-2xl bg-emerald-50/80 border border-emerald-200 flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3 min-w-0">
                    {selectedStudent.profile_image || selectedStudent.photo ? (
                      <img
                        src={selectedStudent.profile_image || selectedStudent.photo}
                        alt={selectedStudent.name}
                        className="w-12 h-12 rounded-xl object-cover border border-emerald-300 shadow-2xs shrink-0"
                      />
                    ) : (
                      <div className="w-12 h-12 rounded-xl bg-emerald-600 text-white flex items-center justify-center font-bold text-base shrink-0">
                        {selectedStudent.name?.charAt(0) || 'S'}
                      </div>
                    )}
                    <div className="min-w-0">
                      <div className="font-extrabold text-slate-900 text-sm leading-tight truncate">
                        {selectedStudent.name}
                      </div>
                      <div className="text-xs text-emerald-800 font-medium">
                        {selectedStudent.grade || 'Coaching'} • <span className="font-mono font-bold">{selectedStudent.roll_no || selectedStudent.student_id}</span>
                      </div>
                      <div className="text-[11px] text-slate-500 font-mono mt-0.5">
                        Agreed Fee: <span className="font-bold text-slate-900">PKR {Number(selectedStudent.monthly_fee || 0).toLocaleString()}</span>
                      </div>
                    </div>
                  </div>

                  <span className="text-[10px] font-bold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-md shrink-0">
                    {selectedStudent.status?.toUpperCase() || 'ACTIVE'}
                  </span>
                </div>

                {/* Month & Year Selection */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 uppercase tracking-wider mb-1">
                      Billing Month
                    </label>
                    <select
                      value={formData.month}
                      onChange={(e) => setFormData({ ...formData, month: e.target.value })}
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-slate-50 text-xs font-bold text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 cursor-pointer"
                    >
                      {MONTHS_SHORT.map(m => (
                        <option key={m} value={m}>{m}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 uppercase tracking-wider mb-1">
                      Billing Year
                    </label>
                    <input
                      type="number"
                      value={formData.year}
                      onChange={(e) => setFormData({ ...formData, year: e.target.value })}
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-slate-50 text-xs font-mono font-bold text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                    />
                  </div>
                </div>

                {/* Payment Date */}
                <div>
                  <label className="block text-[11px] font-bold text-slate-600 uppercase tracking-wider mb-1">
                    Payment Date
                  </label>
                  <input
                    type="date"
                    value={formData.pay_date}
                    onChange={(e) => setFormData({ ...formData, pay_date: e.target.value })}
                    required
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-slate-50 text-xs font-medium focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                  />
                </div>

                {/* Financial Fields */}
                <div className="grid grid-cols-3 gap-2 text-xs">
                  <div>
                    <label className="block text-[10px] font-bold text-slate-600 uppercase tracking-wider mb-1">
                      Payable (PKR)
                    </label>
                    <input
                      type="number"
                      value={formData.payable}
                      onChange={(e) => setFormData({ ...formData, payable: e.target.value })}
                      className="w-full px-2.5 py-2 rounded-xl border border-slate-200 bg-slate-50 font-mono font-bold text-slate-900 focus:bg-white text-xs"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-emerald-800 uppercase tracking-wider mb-1">
                      Paid (PKR) *
                    </label>
                    <input
                      type="number"
                      value={formData.paid}
                      onChange={(e) => setFormData({ ...formData, paid: e.target.value })}
                      required
                      className="w-full px-2.5 py-2 rounded-xl border border-emerald-300 bg-emerald-50/50 font-mono font-bold text-emerald-800 focus:bg-white text-xs"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-slate-600 uppercase tracking-wider mb-1">
                      Waived (PKR)
                    </label>
                    <input
                      type="number"
                      value={formData.waived}
                      onChange={(e) => setFormData({ ...formData, waived: e.target.value })}
                      className="w-full px-2.5 py-2 rounded-xl border border-slate-200 bg-slate-50 font-mono font-bold text-slate-900 focus:bg-white text-xs"
                    />
                  </div>
                </div>

                {/* Remaining Balance Indicator */}
                <div className="p-3 rounded-xl bg-slate-100 flex items-center justify-between text-xs">
                  <span className="font-bold text-slate-600">Calculated Balance Due:</span>
                  <span className={`font-mono font-extrabold text-sm ${balanceCalc > 0 ? 'text-rose-600' : 'text-emerald-700'}`}>
                    PKR {balanceCalc.toLocaleString()}
                  </span>
                </div>

                {/* Optional Note */}
                <div>
                  <label className="block text-[11px] font-bold text-slate-600 uppercase tracking-wider mb-1">
                    Payment Method / Note
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Cash, JazzCash, receipt #102..."
                    value={formData.note}
                    onChange={(e) => setFormData({ ...formData, note: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-slate-50 text-xs font-medium focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                  />
                </div>

                <div className="flex gap-2.5 pt-2">
                  {editingTransaction && (
                    <button
                      type="button"
                      onClick={() => {
                        setEditingTransaction(null);
                        setFormData({
                          ...initialFormState,
                          payable: Number(selectedStudent.monthly_fee) || 0,
                          paid: Number(selectedStudent.monthly_fee) || 0
                        });
                      }}
                      className="px-4 py-2.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-600 text-xs font-bold transition-all cursor-pointer"
                    >
                      Cancel
                    </button>
                  )}
                  <button
                    type="submit"
                    disabled={loading}
                    className="flex-1 py-3 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-md shadow-emerald-600/20 transition-all cursor-pointer disabled:opacity-60 flex items-center justify-center gap-2"
                  >
                    <CheckCircle2 size={16} />
                    <span>{loading ? "Recording..." : editingTransaction ? "Update Payment Record" : `Record Fee for ${formData.month}`}</span>
                  </button>
                </div>
              </form>
            ) : (
              <div className="p-8 text-center border-2 border-dashed border-slate-200 rounded-2xl text-slate-400 text-xs space-y-2">
                <GraduationCap className="mx-auto text-slate-300" size={32} />
                <p className="font-bold text-slate-600">Search and select a coaching student</p>
                <p className="text-[11px] text-slate-400">Search above or click "Collect Fee" on the student directory.</p>
              </div>
            )}
          </div>
        </div>

        {/* RIGHT COLUMN: STUDENT FEE HISTORY & LEDGER (7 cols) */}
        <div className="lg:col-span-7 space-y-4">
          <div className="bg-white p-5 sm:p-6 rounded-2xl border border-slate-300 md:border-slate-200/80 shadow-[0_2px_10px_rgba(15,23,42,0.06)] md:shadow-xs space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <CreditCard size={18} className="text-emerald-600" />
                <h3 className="text-base font-bold text-slate-900 tracking-tight">
                  {selectedStudent ? `${selectedStudent.name}'s Fee Ledger` : 'Coaching Fee Ledger'}
                </h3>
              </div>

              {selectedStudent && history.length > 0 && (
                <div className="flex items-center gap-2">
                  <span className="font-mono text-xs font-bold text-emerald-800 bg-emerald-50 px-2.5 py-1 rounded-md border border-emerald-200">
                    {history.length} Months
                  </span>
                  <button
                    onClick={exportStudentHistory}
                    className="p-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 text-slate-600 cursor-pointer"
                    title="Export Ledger to Excel"
                  >
                    <FileSpreadsheet size={15} />
                  </button>
                </div>
              )}
            </div>

            {selectedStudent ? (
              history.length > 0 ? (
                <div className="space-y-3">
                  {history.map(item => {
                    const hasDue = Number(item.balance || 0) > 0;
                    return (
                      <div
                        key={item.id}
                        className="bg-white rounded-2xl border border-slate-300 md:border-slate-200/80 p-3.5 space-y-2.5 shadow-xs relative overflow-hidden"
                      >
                        <div className={`absolute top-0 left-0 bottom-0 w-1.5 ${hasDue ? 'bg-rose-500' : 'bg-emerald-500'}`} />

                        <div className="pl-2 flex items-start justify-between">
                          <div>
                            <div className="font-extrabold text-slate-950 text-sm">
                              {item.month} {item.year}
                            </div>
                            <div className="text-[11px] text-slate-500 font-mono mt-0.5">
                              Paid On: {item.pay_date || '—'} {item.note ? `• ${item.note}` : ''}
                            </div>
                          </div>

                          <div className="flex items-center gap-1">
                            <button
                              onClick={() => handleEdit(item)}
                              className="p-1.5 rounded-lg text-blue-600 hover:bg-blue-50 cursor-pointer"
                              title="Edit Record"
                            >
                              <Pencil size={14} />
                            </button>
                            {isAdmin && (
                              <button
                                onClick={() => handleDelete(item.id)}
                                className="p-1.5 rounded-lg text-rose-600 hover:bg-rose-50 cursor-pointer"
                                title="Delete Record"
                              >
                                <Trash2 size={14} />
                              </button>
                            )}
                          </div>
                        </div>

                        <div className="pl-2 grid grid-cols-3 gap-2 text-center text-xs">
                          <div className="p-2 bg-slate-50 rounded-xl border border-slate-100">
                            <div className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Payable</div>
                            <div className="font-mono font-bold text-slate-800 mt-0.5">
                              PKR {Number(item.payable || 0).toLocaleString()}
                            </div>
                          </div>

                          <div className="p-2 bg-emerald-50/70 rounded-xl border border-emerald-100">
                            <div className="text-[10px] text-emerald-800 font-bold uppercase tracking-wider">Paid</div>
                            <div className="font-mono font-extrabold text-emerald-800 mt-0.5">
                              PKR {Number(item.paid || 0).toLocaleString()}
                            </div>
                          </div>

                          <div className={`p-2 rounded-xl border ${hasDue ? 'bg-rose-50 border-rose-200' : 'bg-slate-50 border-slate-100'}`}>
                            <div className={`text-[10px] font-bold uppercase tracking-wider ${hasDue ? 'text-rose-800' : 'text-slate-400'}`}>
                              Balance
                            </div>
                            <div className={`font-mono font-extrabold mt-0.5 ${hasDue ? 'text-rose-700' : 'text-slate-700'}`}>
                              PKR {Number(item.balance || 0).toLocaleString()}
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="p-12 text-center border-2 border-dashed border-slate-200 rounded-2xl text-slate-400 text-xs space-y-1">
                  <Clock className="mx-auto text-slate-300" size={32} />
                  <p className="font-bold text-slate-600">No payment records yet for {selectedStudent.name}</p>
                  <p className="text-[11px] text-slate-400">Use the form on the left to record the first monthly tuition payment.</p>
                </div>
              )
            ) : (
              <div className="p-12 text-center border-2 border-dashed border-slate-200 rounded-2xl text-slate-400 text-xs space-y-1">
                <CreditCard className="mx-auto text-slate-300" size={32} />
                <p className="font-bold text-slate-600">No student selected</p>
                <p className="text-[11px] text-slate-400">Select a student on the left to inspect their complete payment history.</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default CoachingFees;

