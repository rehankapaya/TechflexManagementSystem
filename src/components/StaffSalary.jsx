import React, { useState, useEffect } from 'react';
import { db } from '../firebase';
import { useAuth } from '../contexts/AuthContext';
import { ref, push, set, onValue, remove } from 'firebase/database';
import toast from 'react-hot-toast';
import { MONTHS_FULL, normalizeMonth } from '../utils/monthUtils';
import {
  Banknote,
  Users,
  Plus,
  Pencil,
  Trash2,
  X,
  Calendar,
  DollarSign,
  CheckCircle2,
  Contact,
  UserCheck,
  UserX
} from 'lucide-react';

const StaffSalary = () => {
  const { currentUser, isAdmin } = useAuth();
  const [salaries, setSalaries] = useState([]);
  const [loading, setLoading] = useState(false);
  const [staffDirectory, setStaffDirectory] = useState([]);
  const [showStaffModal, setShowStaffModal] = useState(false);
  const [newStaffName, setNewStaffName] = useState('');
  const [newStaffRole, setNewStaffRole] = useState('');
  const [editingStaffId, setEditingStaffId] = useState(null);
  const [showEditSalaryModal, setShowEditSalaryModal] = useState(false);
  const [editFormData, setEditFormData] = useState(null);

  // Filters
  const [filterMonth, setFilterMonth] = useState(new Date().getMonth() + 1);
  const [filterYear, setFilterYear] = useState(new Date().getFullYear());

  const today = new Date().toISOString().split('T')[0];
  const [formData, setFormData] = useState({
    date: today,
    staffId: '',
    amount: '',
    salaryMonth: new Date().getMonth() + 1,
    salaryYear: new Date().getFullYear(),
    description: '',
  });

  const monthsFull = MONTHS_FULL;
  const currentYear = new Date().getFullYear();
  const years = Array.from(new Set([
    currentYear,
    ...salaries.map(s => new Date(s.date).getFullYear())
  ])).filter(y => !isNaN(y)).sort((a, b) => a - b);

  useEffect(() => {
    const unsubSalaries = onValue(ref(db, 'staff_salary'), (snap) => {
      const data = snap.val();
      setSalaries(data ? Object.keys(data).map(id => ({ id, ...data[id] })) : []);
    });
    const unsubDirectory = onValue(ref(db, 'staff_directory'), (snap) => {
      const data = snap.val();
      setStaffDirectory(data ? Object.keys(data).map(id => ({ id, ...data[id] })) : []);
    });

    return () => {
      unsubSalaries();
      unsubDirectory();
    };
  }, []);

  const handleChange = (e) => setFormData({ ...formData, [e.target.name]: e.target.value });

  const handleEditStaff = (staff) => {
    setEditingStaffId(staff.id);
    setNewStaffName(staff.name);
    setNewStaffRole(staff.role || '');
  };

  const handleDeleteStaff = async (id) => {
    if (window.confirm("Delete this staff member from the directory?")) {
      await remove(ref(db, `staff_directory/${id}`));
      toast.success("Staff removed from directory");
    }
  };

  const handleAddStaff = async (e) => {
    e.preventDefault();
    if (!newStaffName.trim()) return;
    try {
      if (editingStaffId) {
        await set(ref(db, `staff_directory/${editingStaffId}/name`), newStaffName.trim());
        await set(ref(db, `staff_directory/${editingStaffId}/role`), newStaffRole.trim() || 'Staff');
        toast.success("Staff updated");
        setEditingStaffId(null);
      } else {
        await set(push(ref(db, 'staff_directory')), {
          name: newStaffName.trim(),
          role: newStaffRole.trim() || 'Staff',
          status: 'active',
          createdAt: new Date().toISOString()
        });
        toast.success("Staff added to directory");
      }
      setNewStaffName('');
      setNewStaffRole('');
    } catch (err) {
      toast.error("Error saving staff");
    }
  };

  const handleToggleStaffStatus = async (id, currentStatus) => {
    try {
      await set(ref(db, `staff_directory/${id}/status`), currentStatus === 'active' ? 'inactive' : 'active');
      toast.success("Staff status updated");
    } catch (err) {
      toast.error("Error updating status");
    }
  };

  const handleEditSalary = (s) => {
    setEditFormData({
      id: s.id,
      date: s.date,
      staffId: s.staffId || '',
      amount: s.amount,
      salaryMonth: s.salaryMonth,
      salaryYear: s.salaryYear,
      description: s.description || ''
    });
    setShowEditSalaryModal(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.staffId || !formData.amount) return;
    setLoading(true);
    try {
      const selectedStaff = staffDirectory.find(s => s.id === formData.staffId);
      const payload = {
        date: formData.date,
        staffId: formData.staffId,
        staffName: selectedStaff ? `${selectedStaff.name} (${selectedStaff.role || 'Staff'})` : 'Unknown Staff',
        amount: Number(formData.amount),
        salaryMonth: parseInt(formData.salaryMonth),
        salaryYear: parseInt(formData.salaryYear),
        description: formData.description,
        addedBy: currentUser.name || currentUser.email,
        timestamp: new Date().toISOString()
      };

      await set(push(ref(db, 'staff_salary')), payload);
      toast.success("Salary record added successfully");

      setFormData({ ...formData, staffId: '', amount: '', description: '' });
    } catch (err) {
      toast.error("Error saving salary record");
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateSalary = async (e) => {
    e.preventDefault();
    if (!editFormData.amount) return;
    setLoading(true);
    try {
      const selectedStaff = staffDirectory.find(s => s.id === editFormData.staffId);
      const payload = {
        date: editFormData.date,
        staffId: editFormData.staffId,
        staffName: selectedStaff ? `${selectedStaff.name} (${selectedStaff.role || 'Staff'})` : 'Unknown Staff',
        amount: Number(editFormData.amount),
        salaryMonth: parseInt(editFormData.salaryMonth),
        salaryYear: parseInt(editFormData.salaryYear),
        description: editFormData.description || '',
        addedBy: currentUser.name || currentUser.email,
        timestamp: new Date().toISOString()
      };

      await set(ref(db, `staff_salary/${editFormData.id}`), payload);
      toast.success("Salary updated successfully");
      setShowEditSalaryModal(false);
      setEditFormData(null);
    } catch (err) {
      toast.error("Error updating salary");
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteSalary = async (id) => {
    if (window.confirm("Delete this salary record?")) {
      await remove(ref(db, `staff_salary/${id}`));
      toast.success("Salary record deleted");
    }
  };

  const filteredSalaries = salaries.filter(s => {
    let sMonth = s.salaryMonth;
    if (typeof sMonth === 'string' && isNaN(parseInt(sMonth))) {
      sMonth = normalizeMonth(sMonth);
    } else {
      sMonth = parseInt(sMonth);
    }
    const targetMonth = parseInt(filterMonth);
    const matchesMonth = sMonth === targetMonth || sMonth === monthsFull[targetMonth - 1];
    const matchesYear = parseInt(s.salaryYear) === parseInt(filterYear);
    return matchesMonth && matchesYear;
  }).sort((a, b) => new Date(b.date) - new Date(a.date));

  const totalMonthlySalary = filteredSalaries.reduce((sum, item) => sum + (Number(item.amount) || 0), 0);

  return (
    <div className="space-y-6 font-sans animate-fade-in">
      {/* HEADER & SUMMARY CARD */}
      <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-200/80">
        <div>
          <div className="flex items-center gap-2">
            <Banknote className="text-blue-600" size={24} />
            <h1 className="text-2xl md:text-3xl font-extrabold text-slate-900 tracking-tight">Staff Salary Disbursements</h1>
          </div>
          <p className="text-sm text-slate-500 mt-1 font-medium">Faculty compensation, staff payroll ledgers & staff directory</p>
        </div>

        <div className="p-4 rounded-2xl bg-blue-600 text-white shadow-lg shadow-blue-600/20 flex items-center gap-4 min-w-[200px]">
          <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center font-bold">
            <DollarSign size={20} />
          </div>
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-blue-100 block">
              {monthsFull[filterMonth - 1]} Payroll
            </span>
            <div className="text-2xl font-black font-mono">
              PKR {totalMonthlySalary.toLocaleString()}
            </div>
          </div>
        </div>
      </header>

      {/* MAIN TWO-COLUMN GRID */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* LEFT COLUMN: PAYROLL ENTRY & DIRECTORY BUTTON (5 cols) */}
        <div className="lg:col-span-5 space-y-6">
          <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-xs">
            <div className="flex items-center justify-between pb-3 mb-5 border-b border-slate-100">
              <h2 className="text-base font-bold text-slate-900 tracking-tight flex items-center gap-2">
                <Plus size={18} className="text-blue-600" />
                <span>Disburse Salary</span>
              </h2>
              <button
                type="button"
                onClick={() => setShowStaffModal(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-700 text-xs font-bold transition-all"
              >
                <Contact size={14} className="text-blue-600" />
                <span>Staff Directory</span>
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1.5 uppercase tracking-wider">
                  Payment Date
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
                  Select Staff Member
                </label>
                <select
                  name="staffId"
                  value={formData.staffId}
                  onChange={handleChange}
                  required
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-slate-50 text-xs font-semibold focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                >
                  <option value="">-- Choose Staff --</option>
                  {staffDirectory.filter(s => s.status === 'active').map(s => (
                    <option key={s.id} value={s.id}>{s.name} ({s.role || 'Staff'})</option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-600 mb-1.5 uppercase tracking-wider">
                    For Month
                  </label>
                  <select
                    name="salaryMonth"
                    value={formData.salaryMonth}
                    onChange={handleChange}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-slate-50 text-xs font-medium focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                  >
                    {monthsFull.map((m, i) => <option key={m} value={i + 1}>{m}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-600 mb-1.5 uppercase tracking-wider">
                    For Year
                  </label>
                  <input
                    type="number"
                    name="salaryYear"
                    value={formData.salaryYear}
                    onChange={handleChange}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-slate-50 text-xs font-mono font-medium focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1.5 uppercase tracking-wider">
                  Amount Disbursed (PKR)
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

              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1.5 uppercase tracking-wider">
                  Description / Remarks
                </label>
                <input
                  type="text"
                  name="description"
                  placeholder="e.g. Monthly salary with bonus"
                  value={formData.description}
                  onChange={handleChange}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-slate-50 text-xs font-medium focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 px-4 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold transition-all shadow-xs flex items-center justify-center gap-2 disabled:opacity-60"
              >
                <CheckCircle2 size={16} />
                <span>{loading ? "Saving..." : "Record Salary Payment"}</span>
              </button>
            </form>
          </div>
        </div>

        {/* RIGHT COLUMN: SALARIES HISTORY TABLE (7 cols) */}
        <div className="lg:col-span-7 bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
          <div className="p-4 bg-slate-50/70 border-b border-slate-200/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-slate-700">Salary Disbursements</span>
              <span className="font-mono text-xs font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded-md">
                {filteredSalaries.length} Records
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
                  <th className="py-3 px-4">Staff Member</th>
                  <th className="py-3 px-4">Billing Period</th>
                  <th className="py-3 px-4 text-right">Amount</th>
                  <th className="py-3 px-4">Paid On</th>
                  {isAdmin && <th className="py-3 px-4 text-center">Actions</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredSalaries.length > 0 ? (
                  filteredSalaries.map(s => (
                    <tr key={s.id} className="hover:bg-slate-50/70 transition-colors">
                      <td className="py-3.5 px-4 font-bold text-slate-900">
                        {s.staffName}
                        {s.description && (
                          <div className="text-[11px] font-normal text-slate-500 mt-0.5">{s.description}</div>
                        )}
                      </td>
                      <td className="py-3.5 px-4 font-mono font-medium text-slate-700">
                        {typeof s.salaryMonth === 'number' ? monthsFull[s.salaryMonth - 1] : s.salaryMonth} {s.salaryYear}
                      </td>
                      <td className="py-3.5 px-4 text-right font-mono font-bold text-emerald-700">
                        PKR {Number(s.amount).toLocaleString()}
                      </td>
                      <td className="py-3.5 px-4 font-mono text-slate-500 text-[11px]">
                        {new Date(s.date).toLocaleDateString('en-GB')}
                      </td>
                      {isAdmin && (
                        <td className="py-3.5 px-4 text-center">
                          <div className="inline-flex items-center gap-1">
                            <button
                              onClick={() => handleEditSalary(s)}
                              className="p-1.5 rounded-lg text-blue-600 hover:bg-blue-50 transition-colors"
                              title="Edit Salary"
                            >
                              <Pencil size={14} />
                            </button>
                            <button
                              onClick={() => handleDeleteSalary(s.id)}
                              className="p-1.5 rounded-lg text-rose-600 hover:bg-rose-50 transition-colors"
                              title="Delete Salary"
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
                    <td colSpan={isAdmin ? 5 : 4} className="py-12 text-center text-slate-400 text-xs">
                      No salary records found for {monthsFull[filterMonth - 1]} {filterYear}.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* EDIT SALARY MODAL */}
      {showEditSalaryModal && editFormData && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl p-6 w-full max-w-md space-y-5 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="text-base font-bold text-slate-900 tracking-tight">Edit Salary Record</h3>
              <button
                onClick={() => setShowEditSalaryModal(false)}
                className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleUpdateSalary} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1.5 uppercase tracking-wider">
                  Payment Date
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
                  Staff Member
                </label>
                <select
                  value={editFormData.staffId}
                  onChange={e => setEditFormData({ ...editFormData, staffId: e.target.value })}
                  required
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-slate-50 text-xs font-semibold"
                >
                  <option value="">-- Choose Staff --</option>
                  {staffDirectory.map(s => (
                    <option key={s.id} value={s.id}>{s.name} ({s.role || 'Staff'})</option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-600 mb-1.5 uppercase tracking-wider">
                    For Month
                  </label>
                  <select
                    value={editFormData.salaryMonth}
                    onChange={e => setEditFormData({ ...editFormData, salaryMonth: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-slate-50 text-xs font-medium"
                  >
                    {monthsFull.map((m, i) => <option key={m} value={i + 1}>{m}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-600 mb-1.5 uppercase tracking-wider">
                    For Year
                  </label>
                  <input
                    type="number"
                    value={editFormData.salaryYear}
                    onChange={e => setEditFormData({ ...editFormData, salaryYear: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-slate-50 text-xs font-mono font-medium"
                  />
                </div>
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

              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1.5 uppercase tracking-wider">
                  Description / Remarks
                </label>
                <input
                  type="text"
                  value={editFormData.description}
                  onChange={e => setEditFormData({ ...editFormData, description: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-slate-50 text-xs font-medium"
                />
              </div>

              <div className="flex gap-2.5 pt-2">
                <button
                  type="submit"
                  disabled={loading}
                  className="flex-1 py-3 px-4 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-xs flex items-center justify-center gap-2"
                >
                  <CheckCircle2 size={16} />
                  <span>{loading ? "Updating..." : "Update Salary"}</span>
                </button>
                <button
                  type="button"
                  onClick={() => setShowEditSalaryModal(false)}
                  className="px-4 py-3 rounded-xl border border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-700 text-xs font-bold"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MANAGE STAFF DIRECTORY MODAL */}
      {showStaffModal && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl p-6 w-full max-w-lg space-y-5 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="text-base font-bold text-slate-900 tracking-tight flex items-center gap-2">
                <Users size={18} className="text-blue-600" />
                <span>Staff Directory</span>
              </h3>
              <button
                onClick={() => setShowStaffModal(false)}
                className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg"
              >
                <X size={18} />
              </button>
            </div>

            {/* Add or Edit Staff Member */}
            <form onSubmit={handleAddStaff} className="flex gap-2.5">
              <input
                type="text"
                placeholder="Full Name..."
                value={newStaffName}
                onChange={(e) => setNewStaffName(e.target.value)}
                required
                className="flex-1 px-3 py-2 rounded-xl border border-slate-200 bg-slate-50 text-xs font-medium focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20"
              />
              <input
                type="text"
                placeholder="Role (e.g. Teacher, Admin)..."
                value={newStaffRole}
                onChange={(e) => setNewStaffRole(e.target.value)}
                className="flex-1 px-3 py-2 rounded-xl border border-slate-200 bg-slate-50 text-xs font-medium focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20"
              />
              <button
                type="submit"
                className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-xs"
              >
                {editingStaffId ? "Update" : "Add"}
              </button>
              {editingStaffId && (
                <button
                  type="button"
                  onClick={() => { setEditingStaffId(null); setNewStaffName(''); setNewStaffRole(''); }}
                  className="px-3 py-2 rounded-xl border border-slate-200 bg-slate-100 text-slate-600 text-xs font-bold"
                >
                  Cancel
                </button>
              )}
            </form>

            {/* Staff Directory List */}
            <div className="max-h-72 overflow-y-auto rounded-xl border border-slate-200 divide-y divide-slate-100">
              {staffDirectory.length > 0 ? (
                staffDirectory.map(staff => (
                  <div key={staff.id} className="p-3 flex items-center justify-between gap-3 text-xs hover:bg-slate-50/70">
                    <div>
                      <span className="font-bold text-slate-900">{staff.name}</span>
                      <span className="text-[11px] text-slate-400 font-normal ml-2">({staff.role || 'Staff'})</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => handleToggleStaffStatus(staff.id, staff.status)}
                        className={`px-2 py-0.5 rounded-md text-[10px] font-bold border ${
                          staff.status === 'active'
                            ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                            : 'bg-slate-100 text-slate-600 border-slate-200'
                        }`}
                      >
                        {staff.status === 'active' ? 'Active' : 'Inactive'}
                      </button>
                      <button
                        type="button"
                        onClick={() => handleEditStaff(staff)}
                        className="p-1 rounded-md text-blue-600 hover:bg-blue-50"
                        title="Edit Staff"
                      >
                        <Pencil size={13} />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDeleteStaff(staff.id)}
                        className="p-1 rounded-md text-rose-600 hover:bg-rose-50"
                        title="Delete Staff"
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </div>
                ))
              ) : (
                <div className="p-8 text-center text-slate-400 text-xs">No staff members in directory.</div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default StaffSalary;
