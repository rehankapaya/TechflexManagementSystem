import React, { useState, useEffect } from 'react';
import { db } from '../firebase';
import { useAuth } from '../contexts/AuthContext';
import { ref, push, set, onValue, remove } from 'firebase/database';
import { downloadExpenseSample, parseExcelUpload, exportExpenses } from '../utils/bulkUpload';
import toast from 'react-hot-toast';
import { MONTHS_FULL } from '../utils/monthUtils';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Cell } from 'recharts';
import {
  Receipt,
  Plus,
  FileSpreadsheet,
  Upload,
  Download,
  Pencil,
  Trash2,
  X,
  Calendar,
  CheckCircle2,
  DollarSign,
  BarChart3,
  Layers
} from 'lucide-react';

const Expenses = () => {
  const { currentUser, isAdmin } = useAuth();
  const [expenses, setExpenses] = useState([]);
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(false);
  const [filterMonth, setFilterMonth] = useState(new Date().getMonth() + 1);
  const [filterYear, setFilterYear] = useState(new Date().getFullYear());
  const [showEditExpenseModal, setShowEditExpenseModal] = useState(false);
  const [editFormData, setEditFormData] = useState(null);

  const today = new Date().toISOString().split('T')[0];
  const [formData, setFormData] = useState({
    date: today,
    amount: '',
    description: '',
    courseName: 'General',
  });

  useEffect(() => {
    const unsubCourses = onValue(ref(db, 'courses'), (snap) => {
      const data = snap.val();
      setCourses(data ? Object.keys(data).map(id => ({ id, ...data[id] })) : []);
    });

    const unsubExpenses = onValue(ref(db, 'expenses'), (snap) => {
      const data = snap.val();
      setExpenses(data ? Object.keys(data).map(id => {
        const exp = { id, ...data[id] };
        if (exp.courseName && typeof exp.courseName === 'object') {
          exp.courseName = exp.courseName.richText ? exp.courseName.richText.map(r => r.text).join('') : (exp.courseName.text || String(exp.courseName));
        }
        if (exp.description && typeof exp.description === 'object') {
          exp.description = exp.description.richText ? exp.description.richText.map(r => r.text).join('') : (exp.description.text || String(exp.description));
        }
        return exp;
      }) : []);
    });

    return () => {
      unsubCourses();
      unsubExpenses();
    };
  }, []);

  const handleChange = (e) => setFormData({ ...formData, [e.target.name]: e.target.value });

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.amount || !formData.description) return;
    setLoading(true);
    try {
      const payload = {
        date: formData.date,
        amount: Number(formData.amount),
        description: formData.description,
        courseName: formData.courseName,
        addedBy: currentUser.name || currentUser.email,
        timestamp: new Date().toISOString()
      };
      await set(push(ref(db, 'expenses')), payload);
      toast.success("Expense added successfully");
      setFormData({ ...formData, amount: '', description: '' });
    } catch (err) {
      toast.error("Error adding expense");
    } finally {
      setLoading(false);
    }
  };

  const handleEditExpense = (expense) => {
    setEditFormData({
      id: expense.id,
      date: expense.date,
      amount: expense.amount,
      description: expense.description,
      courseName: expense.courseName
    });
    setShowEditExpenseModal(true);
  };

  const handleUpdateExpense = async (e) => {
    e.preventDefault();
    if (!editFormData.amount || !editFormData.description) return;
    setLoading(true);
    try {
      const payload = {
        date: editFormData.date,
        amount: Number(editFormData.amount),
        description: editFormData.description,
        courseName: editFormData.courseName,
        addedBy: currentUser.name || currentUser.email,
        timestamp: new Date().toISOString()
      };
      await set(ref(db, `expenses/${editFormData.id}`), payload);
      toast.success("Expense updated successfully");
      setShowEditExpenseModal(false);
      setEditFormData(null);
    } catch (err) {
      toast.error("Error updating expense");
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id) => {
    if (window.confirm("Delete this expense?")) {
      await remove(ref(db, `expenses/${id}`));
      toast.success("Expense deleted");
    }
  };

  const handleBulkUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setLoading(true);
    try {
      const rows = await parseExcelUpload(file);
      let successCount = 0;

      for (const row of rows) {
        const date = row['Date (DD-MMM-YYYY)'] || row['Date (YYYY-MM-DD)'] || row['Date'];
        const course = row['Course Name'] || row['Course Name (or General)'] || row['Course Category'];
        const desc = row['Description'];
        const amt = row['Amount'];

        if (date && desc && amt) {
          const payload = {
            date: date,
            amount: Number(amt),
            description: desc,
            courseName: course || 'General',
            addedBy: currentUser.name || currentUser.email || 'Admin',
            timestamp: new Date().toISOString()
          };
          await set(push(ref(db, 'expenses')), payload);
          successCount++;
        }
      }

      toast.success(`Successfully uploaded ${successCount} expenses!`);
    } catch (error) {
      toast.error("Failed to upload: " + error.message);
    } finally {
      setLoading(false);
      e.target.value = null;
    }
  };

  const currentYear = new Date().getFullYear();
  const years = Array.from(new Set([
    currentYear,
    ...expenses.map(e => new Date(e.date).getFullYear())
  ])).filter(y => !isNaN(y)).sort((a, b) => a - b);

  const monthsFull = MONTHS_FULL;

  const filteredExpenses = expenses.filter(e => {
    if (!e.date) return false;
    const d = new Date(e.date);
    return (d.getMonth() + 1) === parseInt(filterMonth) && d.getFullYear() === parseInt(filterYear);
  }).sort((a, b) => new Date(b.date) - new Date(a.date));

  const totalExpense = filteredExpenses.reduce((sum, item) => sum + (Number(item.amount) || 0), 0);

  const categoryData = filteredExpenses.reduce((acc, curr) => {
    const cat = curr.courseName || 'General';
    acc[cat] = (acc[cat] || 0) + curr.amount;
    return acc;
  }, {});

  const chartData = Object.keys(categoryData).map(key => ({
    name: key,
    amount: categoryData[key]
  }));

  const COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899', '#6366F1'];

  return (
    <div className="space-y-6 font-sans animate-fade-in">
      {/* HEADER & SUMMARY CARD */}
      <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-200/80">
        <div>
          <div className="flex items-center gap-2">
            <Receipt className="text-blue-600" size={24} />
            <h1 className="text-2xl md:text-3xl font-extrabold text-slate-900 tracking-tight">Operating Expenses</h1>
          </div>
          <p className="text-sm text-slate-500 mt-1 font-medium">Record and analyze institute operational costs & departmental expenses</p>
        </div>

        <div className="p-4 rounded-2xl bg-emerald-500 text-white shadow-lg shadow-emerald-500/20 flex items-center gap-4 min-w-[200px]">
          <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center font-bold">
            <DollarSign size={20} />
          </div>
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-100 block">
              {monthsFull[filterMonth - 1]} Expense
            </span>
            <div className="text-2xl font-black font-mono">
              PKR {totalExpense.toLocaleString()}
            </div>
          </div>
        </div>
      </header>

      {/* MAIN TWO-COLUMN GRID */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* LEFT COLUMN: ADD FORM & BULK EXCEL (5 cols) */}
        <div className="lg:col-span-5 space-y-6">
          {/* Add Expense Form */}
          <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-xs">
            <h2 className="text-base font-bold text-slate-900 tracking-tight pb-3 mb-5 border-b border-slate-100 flex items-center gap-2">
              <Plus size={18} className="text-blue-600" />
              <span>Record New Expense</span>
            </h2>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1.5 uppercase tracking-wider">
                  Date
                </label>
                <input
                  type="date"
                  name="date"
                  value={formData.date}
                  onChange={handleChange}
                  required
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-slate-50 text-xs font-medium focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1.5 uppercase tracking-wider">
                  Course / Department Category
                </label>
                <select
                  name="courseName"
                  value={formData.courseName}
                  onChange={handleChange}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-slate-50 text-xs font-semibold focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                >
                  <option value="General">General / Administrative</option>
                  {courses.map(c => <option key={c.id} value={c.name}>{c.name}</option>)}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1.5 uppercase tracking-wider">
                  Description
                </label>
                <input
                  type="text"
                  name="description"
                  placeholder="e.g. Electricity bill, Printer paper, Internet"
                  value={formData.description}
                  onChange={handleChange}
                  required
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-slate-50 text-xs font-medium focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1.5 uppercase tracking-wider">
                  Amount (PKR)
                </label>
                <input
                  type="number"
                  name="amount"
                  placeholder="0.00"
                  value={formData.amount}
                  onChange={handleChange}
                  required
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-slate-50 text-xs font-mono font-bold text-emerald-700 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 px-4 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold transition-all shadow-xs flex items-center justify-center gap-2 disabled:opacity-60"
              >
                <CheckCircle2 size={16} />
                <span>{loading ? "Recording..." : "Save Expense"}</span>
              </button>
            </form>
          </div>

          {/* Bulk Operations */}
          {isAdmin && (
            <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-xs space-y-4">
              <div className="flex items-center gap-2 pb-3 border-b border-slate-100">
                <FileSpreadsheet className="text-emerald-600" size={18} />
                <h3 className="text-sm font-bold text-slate-900 tracking-tight">Bulk Excel Actions</h3>
              </div>
              <p className="text-xs text-slate-500 leading-relaxed">
                Import historical expenses or export the current filtered month's records to an Excel file.
              </p>
              <div className="flex flex-col gap-2.5">
                <div className="flex gap-2.5">
                  <button
                    onClick={downloadExpenseSample}
                    className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-xl border border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-700 text-xs font-bold transition-all"
                  >
                    <Download size={14} />
                    <span>Sample File</span>
                  </button>
                  <input
                    type="file"
                    accept=".xlsx, .xls"
                    onChange={handleBulkUpload}
                    id="expense-upload"
                    className="hidden"
                  />
                  <button
                    onClick={() => document.getElementById('expense-upload').click()}
                    disabled={loading}
                    className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition-all shadow-xs disabled:opacity-60"
                  >
                    <Upload size={14} />
                    <span>Upload File</span>
                  </button>
                </div>
                <button
                  onClick={() => exportExpenses(filteredExpenses, `${monthsFull[filterMonth - 1]}_${filterYear}`)}
                  className="w-full flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-bold transition-all"
                >
                  <FileSpreadsheet size={14} className="text-emerald-600" />
                  <span>Export {monthsFull[filterMonth - 1]} Expenses</span>
                </button>
              </div>
            </div>
          )}
        </div>

        {/* RIGHT COLUMN: CHART & TABLE (7 cols) */}
        <div className="lg:col-span-7 space-y-6">
          {/* Recharts Distribution */}
          {chartData.length > 0 && (
            <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-xs space-y-4">
              <div className="flex items-center gap-2 pb-3 border-b border-slate-100">
                <BarChart3 className="text-blue-600" size={18} />
                <h3 className="text-sm font-bold text-slate-900 tracking-tight">Category Breakdown</h3>
              </div>
              <div className="h-48 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F1F5F9" />
                    <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#64748B' }} />
                    <YAxis tick={{ fontSize: 11, fill: '#64748B' }} />
                    <Tooltip
                      formatter={(val) => [`PKR ${Number(val).toLocaleString()}`, 'Amount']}
                      contentStyle={{ borderRadius: '12px', border: '1px solid #E2E8F0', fontSize: '12px' }}
                    />
                    <Bar dataKey="amount" radius={[6, 6, 0, 0]}>
                      {chartData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}

          {/* Expenses Table */}
          <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
            <div className="p-4 bg-slate-50/70 border-b border-slate-200/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-slate-700">Expense Ledger</span>
                <span className="font-mono text-xs font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded-md">
                  {filteredExpenses.length} Records
                </span>
              </div>
              <div className="flex items-center gap-2">
                <select
                  value={filterMonth}
                  onChange={e => setFilterMonth(e.target.value)}
                  className="px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white text-xs font-medium"
                >
                  {monthsFull.map((m, i) => <option key={m} value={i + 1}>{m}</option>)}
                </select>
                <select
                  value={filterYear}
                  onChange={e => setFilterYear(e.target.value)}
                  className="px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white text-xs font-mono font-medium"
                >
                  {years.map(y => <option key={y} value={y}>{y}</option>)}
                </select>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 uppercase font-bold tracking-wider text-[11px]">
                    <th className="py-3 px-4">Date</th>
                    <th className="py-3 px-4">Category</th>
                    <th className="py-3 px-4">Description</th>
                    <th className="py-3 px-4 text-right">Amount</th>
                    <th className="py-3 px-4">Added By</th>
                    {isAdmin && <th className="py-3 px-4 text-center">Actions</th>}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredExpenses.length > 0 ? (
                    filteredExpenses.map(e => (
                      <tr key={e.id} className="hover:bg-slate-50/70 transition-colors">
                        <td className="py-3.5 px-4 font-mono text-slate-600 font-medium">
                          {new Date(e.date).toLocaleDateString('en-GB')}
                        </td>
                        <td className="py-3.5 px-4">
                          <span className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold border uppercase tracking-wider ${
                            e.courseName === 'General'
                              ? 'bg-slate-100 text-slate-700 border-slate-200'
                              : 'bg-amber-50 text-amber-800 border-amber-200'
                          }`}>
                            {e.courseName}
                          </span>
                        </td>
                        <td className="py-3.5 px-4 font-medium text-slate-900 max-w-[200px] truncate">
                          {e.description}
                        </td>
                        <td className="py-3.5 px-4 text-right font-mono font-bold text-emerald-700">
                          PKR {Number(e.amount).toLocaleString()}
                        </td>
                        <td className="py-3.5 px-4 text-[11px] text-slate-400 font-medium">
                          {e.addedBy || 'Admin'}
                        </td>
                        {isAdmin && (
                          <td className="py-3.5 px-4 text-center">
                            <div className="inline-flex items-center gap-1">
                              <button
                                onClick={() => handleEditExpense(e)}
                                className="p-1.5 rounded-lg text-blue-600 hover:bg-blue-50 transition-colors"
                                title="Edit Expense"
                              >
                                <Pencil size={14} />
                              </button>
                              <button
                                onClick={() => handleDelete(e.id)}
                                className="p-1.5 rounded-lg text-rose-600 hover:bg-rose-50 transition-colors"
                                title="Delete Expense"
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
                      <td colSpan={isAdmin ? 6 : 5} className="py-12 text-center text-slate-400 text-xs">
                        No expenses recorded for {monthsFull[filterMonth - 1]} {filterYear}.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>

      {/* EDIT EXPENSE MODAL */}
      {showEditExpenseModal && editFormData && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl p-6 w-full max-w-md space-y-5 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="text-base font-bold text-slate-900 tracking-tight">Edit Expense Record</h3>
              <button
                onClick={() => setShowEditExpenseModal(false)}
                className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleUpdateExpense} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1.5 uppercase tracking-wider">
                  Date
                </label>
                <input
                  type="date"
                  value={editFormData.date}
                  onChange={e => setEditFormData({ ...editFormData, date: e.target.value })}
                  required
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-slate-50 text-xs font-medium"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1.5 uppercase tracking-wider">
                  Category
                </label>
                <select
                  value={editFormData.courseName}
                  onChange={e => setEditFormData({ ...editFormData, courseName: e.target.value })}
                  required
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-slate-50 text-xs font-semibold"
                >
                  <option value="General">General / Administrative</option>
                  {courses.map(c => <option key={c.id} value={c.name}>{c.name}</option>)}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1.5 uppercase tracking-wider">
                  Description
                </label>
                <input
                  type="text"
                  value={editFormData.description}
                  onChange={e => setEditFormData({ ...editFormData, description: e.target.value })}
                  required
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-slate-50 text-xs font-medium"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1.5 uppercase tracking-wider">
                  Amount (PKR)
                </label>
                <input
                  type="number"
                  value={editFormData.amount}
                  onChange={e => setEditFormData({ ...editFormData, amount: e.target.value })}
                  required
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-slate-50 text-xs font-mono font-bold text-emerald-700"
                />
              </div>

              <div className="flex gap-2.5 pt-2">
                <button
                  type="submit"
                  disabled={loading}
                  className="flex-1 py-3 px-4 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-xs flex items-center justify-center gap-2"
                >
                  <CheckCircle2 size={16} />
                  <span>{loading ? "Updating..." : "Update Expense"}</span>
                </button>
                <button
                  type="button"
                  onClick={() => setShowEditExpenseModal(false)}
                  className="px-4 py-3 rounded-xl border border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-700 text-xs font-bold"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Expenses;
