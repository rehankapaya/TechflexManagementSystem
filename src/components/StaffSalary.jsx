import React, { useState, useEffect } from 'react';
import { db } from '../firebase';
import { useAuth } from '../contexts/AuthContext';
import { ref, push, set, onValue, remove } from 'firebase/database';
import toast from 'react-hot-toast';

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
  const [filterMonth, setFilterMonth] = useState(new Date().getMonth() + 1); // 1-12
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

  const monthsFull = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
  const currentYear = new Date().getFullYear();
  const years = Array.from(new Set([
    currentYear,
    ...salaries.map(s => new Date(s.date).getFullYear())
  ])).filter(y => !isNaN(y)).sort((a, b) => a - b);

  useEffect(() => {
    onValue(ref(db, 'staff_salary'), (snap) => {
      const data = snap.val();
      setSalaries(data ? Object.keys(data).map(id => ({ id, ...data[id] })) : []);
    });
    onValue(ref(db, 'staff_directory'), (snap) => {
      const data = snap.val();
      setStaffDirectory(data ? Object.keys(data).map(id => ({ id, ...data[id] })) : []);
    });
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
    if (!editFormData.staffId || !editFormData.amount) return;
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
        description: editFormData.description,
        addedBy: currentUser.name || currentUser.email,
        timestamp: new Date().toISOString()
      };

      await set(ref(db, `staff_salary/${editFormData.id}`), payload);
      toast.success("Salary record updated");
      setShowEditSalaryModal(false);
      setEditFormData(null);
    } catch (err) {
      toast.error("Error updating salary record");
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id) => {
    if (window.confirm("Delete this salary record?")) {
      await remove(ref(db, `staff_salary/${id}`));
      toast.success("Record deleted");
    }
  };

  const filteredSalaries = salaries.filter(s => {
    return parseInt(s.salaryMonth) === parseInt(filterMonth) && parseInt(s.salaryYear) === parseInt(filterYear);
  }).sort((a, b) => new Date(b.date) - new Date(a.date));

  const totalSalary = filteredSalaries.reduce((acc, curr) => acc + (curr.amount || 0), 0);

  return (
    <div style={styles.container}>
      <header style={styles.header}>
        <div style={styles.titleArea}>
          <h2 style={styles.title}>Staff Salary 🧑‍💼</h2>
          <p style={styles.subtitle}>Record and manage staff payroll</p>
        </div>
        <div style={styles.totalCard}>
          <div style={styles.totalLabel}>Total Paid ({monthsFull[filterMonth - 1]} {filterYear})</div>
          <div style={styles.totalAmount}>PKR {totalSalary.toLocaleString()}</div>
        </div>
      </header>

      <div style={styles.mainGrid}>
        {/* LEFT COLUMN: FORM */}
        <div style={styles.leftCol}>
          <div style={styles.card}>
            <h3 style={styles.cardTitle}>Add Salary Record</h3>
            <form onSubmit={handleSubmit} style={styles.form}>
              <div style={styles.formGroup}>
                <label style={styles.label}>Payment Date</label>
                <input type="date" name="date" value={formData.date} onChange={handleChange} required style={styles.input} />
              </div>

              <div style={styles.formGroup}>
                <label style={styles.label}>Staff Name</label>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <select name="staffId" value={formData.staffId} onChange={handleChange} required style={{ ...styles.select, flex: 1, minWidth: 0 }}>
                    <option value="">Select Staff...</option>
                    {staffDirectory.filter(s => s.status === 'active').map(s => (
                      <option key={s.id} value={s.id}>{s.name} ({s.role || 'Staff'})</option>
                    ))}
                  </select>
                  <button type="button" onClick={() => setShowStaffModal(true)} style={{ ...styles.btnPrimary, margin: 0, padding: '0 12px', fontSize: '13px', background: '#475569', whiteSpace: 'nowrap' }}>
                    Manage
                  </button>
                </div>
              </div>

              <div style={styles.formGroup}>
                <label style={styles.label}>Salary For (Month)</label>
                <select name="salaryMonth" value={formData.salaryMonth} onChange={handleChange} required style={styles.select}>
                  {monthsFull.map((m, i) => <option key={m} value={i + 1}>{m}</option>)}
                </select>
              </div>

              <div style={styles.formGroup}>
                <label style={styles.label}>Salary For (Year)</label>
                <select name="salaryYear" value={formData.salaryYear} onChange={handleChange} required style={styles.select}>
                  {years.map(y => <option key={y} value={y}>{y}</option>)}
                </select>
              </div>

              <div style={styles.formGroup}>
                <label style={styles.label}>Amount Paid (PKR)</label>
                <input type="number" name="amount" placeholder="0" value={formData.amount} onChange={handleChange} required style={styles.input} />
              </div>

              <div style={styles.formGroup}>
                <label style={styles.label}>Description / Notes (Optional)</label>
                <input type="text" name="description" placeholder="e.g. Advance paid, Bonus included" value={formData.description} onChange={handleChange} style={styles.input} />
              </div>

              <button type="submit" disabled={loading} style={styles.btnPrimary}>
                {loading ? "Saving..." : "Add Salary"}
              </button>
            </form>
          </div>
        </div>

        {/* RIGHT COLUMN: LIST */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '25px', overflow: 'hidden' }}>
          <div style={styles.card}>
            <div style={styles.listHeader}>
              <h3 style={styles.cardTitle}>Salary Records</h3>
              <div style={styles.filters}>
                <select value={filterMonth} onChange={e => setFilterMonth(e.target.value)} style={styles.selectSmall}>
                  {monthsFull.map((m, i) => <option key={m} value={i + 1}>{m}</option>)}
                </select>
                <select value={filterYear} onChange={e => setFilterYear(e.target.value)} style={styles.selectSmall}>
                  {years.map(y => <option key={y} value={y}>{y}</option>)}
                </select>
              </div>
            </div>

            <div style={styles.tableWrapper}>
              <table style={styles.table}>
                <thead>
                  <tr style={styles.thRow}>
                    <th style={styles.th}>Staff Name</th>
                    <th style={styles.th}>Payment Date</th>
                    <th style={styles.th}>Salary For</th>
                    <th style={styles.th}>Amount</th>
                    <th style={styles.th}>Notes</th>
                    {isAdmin && <th style={styles.th}>Action</th>}
                  </tr>
                </thead>
                <tbody>
                  {filteredSalaries.length === 0 ? (
                    <tr><td colSpan={isAdmin ? "6" : "5"} style={styles.emptyCell}>No salary records for this period.</td></tr>
                  ) : (
                    filteredSalaries.map(s => (
                      <tr key={s.id} style={styles.tr}>
                        <td style={styles.tdStaffName}>{s.staffName}</td>
                        <td style={styles.tdDate}>{new Date(s.date).toLocaleDateString('en-GB')}</td>
                        <td style={styles.tdCategory}>
                          <span style={styles.badge}>
                            {monthsFull[s.salaryMonth - 1]} {s.salaryYear}
                          </span>
                        </td>
                        <td style={styles.tdAmount}>PKR {s.amount.toLocaleString()}</td>
                        <td style={styles.td}>{s.description || '-'}</td>
                        {isAdmin && (
                          <td style={styles.td}>
                            <button onClick={() => handleEditSalary(s)} style={{ ...styles.btnDelete, color: '#3B82F6', marginRight: '10px' }}>✏️</button>
                            <button onClick={() => handleDelete(s.id)} style={styles.btnDelete}>🗑️</button>
                          </td>
                        )}
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>

      {showEditSalaryModal && editFormData && (
        <div style={styles.modalOverlay}>
          <div style={styles.modalContent}>
            <div style={styles.modalHeader}>
              <h3 style={styles.cardTitle}>Edit Salary Record</h3>
              <button onClick={() => setShowEditSalaryModal(false)} style={styles.btnClose}>✕</button>
            </div>
            <form onSubmit={handleUpdateSalary} style={styles.form}>
              <div style={styles.formGroup}>
                <label style={styles.label}>Payment Date</label>
                <input type="date" value={editFormData.date} onChange={e => setEditFormData({ ...editFormData, date: e.target.value })} required style={styles.input} />
              </div>
              <div style={styles.formGroup}>
                <label style={styles.label}>Staff Name</label>
                <select value={editFormData.staffId} onChange={e => setEditFormData({ ...editFormData, staffId: e.target.value })} required style={styles.select}>
                  <option value="">Select Staff...</option>
                  {staffDirectory.filter(s => s.status === 'active' || s.id === editFormData.staffId).map(s => (
                    <option key={s.id} value={s.id}>{s.name} ({s.role || 'Staff'})</option>
                  ))}
                </select>
              </div>
              <div style={styles.formGroup}>
                <label style={styles.label}>Salary For (Month)</label>
                <select value={editFormData.salaryMonth} onChange={e => setEditFormData({ ...editFormData, salaryMonth: e.target.value })} required style={styles.select}>
                  {monthsFull.map((m, i) => <option key={m} value={i + 1}>{m}</option>)}
                </select>
              </div>
              <div style={styles.formGroup}>
                <label style={styles.label}>Salary For (Year)</label>
                <select value={editFormData.salaryYear} onChange={e => setEditFormData({ ...editFormData, salaryYear: e.target.value })} required style={styles.select}>
                  {years.map(y => <option key={y} value={y}>{y}</option>)}
                </select>
              </div>
              <div style={styles.formGroup}>
                <label style={styles.label}>Amount Paid (PKR)</label>
                <input type="number" value={editFormData.amount} onChange={e => setEditFormData({ ...editFormData, amount: e.target.value })} required style={styles.input} />
              </div>
              <div style={styles.formGroup}>
                <label style={styles.label}>Description / Notes (Optional)</label>
                <input type="text" value={editFormData.description} onChange={e => setEditFormData({ ...editFormData, description: e.target.value })} style={styles.input} />
              </div>
              <button type="submit" disabled={loading} style={styles.btnPrimary}>
                {loading ? "Updating..." : "Update Salary"}
              </button>
            </form>
          </div>
        </div>
      )}

      {showStaffModal && (
        <div style={styles.modalOverlay}>
          <div style={styles.modalContent}>
            <div style={styles.modalHeader}>
              <h3 style={styles.cardTitle}>Manage Staff Directory</h3>
              <button onClick={() => setShowStaffModal(false)} style={styles.btnClose}>✕</button>
            </div>

            <form onSubmit={handleAddStaff} style={{ display: 'flex', gap: '10px', marginBottom: '20px' }}>
              <input
                type="text"
                placeholder="Name..."
                value={newStaffName}
                onChange={(e) => setNewStaffName(e.target.value)}
                required
                style={{ ...styles.input, flex: 1 }}
              />
              <input
                type="text"
                placeholder="Role (e.g. Teacher, Guard)"
                value={newStaffRole}
                onChange={(e) => setNewStaffRole(e.target.value)}
                style={{ ...styles.input, flex: 1 }}
              />
              <button type="submit" style={{ ...styles.btnPrimary, margin: 0 }}>{editingStaffId ? "Update" : "Add"}</button>
              {editingStaffId && (
                <button type="button" onClick={() => { setEditingStaffId(null); setNewStaffName(''); setNewStaffRole(''); }} style={{ ...styles.btnPrimary, background: '#94A3B8', margin: 0 }}>Cancel</button>
              )}
            </form>

            <div style={{ maxHeight: '300px', overflowY: 'auto' }}>
              {staffDirectory.length === 0 ? (
                <p style={styles.emptyCell}>No staff in directory.</p>
              ) : (
                <table style={styles.table}>
                  <tbody>
                    {staffDirectory.map(staff => (
                      <tr key={staff.id} style={styles.tr}>
                        <td style={styles.tdStaffName}>
                          {staff.name} <span style={{ fontSize: '11px', color: '#94A3B8', fontWeight: 'normal' }}>({staff.role || 'Staff'})</span>
                        </td>
                        <td style={styles.td}>
                          <span style={{
                            ...styles.badge,
                            background: staff.status === 'active' ? '#DCFCE7' : '#F1F5F9',
                            color: staff.status === 'active' ? '#16A34A' : '#64748B'
                          }}>
                            {staff.status}
                          </span>
                        </td>
                        <td style={{ ...styles.td, textAlign: 'right', display: 'flex', gap: '5px', justifyContent: 'flex-end' }}>
                          <button
                            onClick={() => handleToggleStaffStatus(staff.id, staff.status)}
                            style={{
                              ...styles.btnToggle,
                              background: staff.status === 'active' ? '#FEE2E2' : '#DCFCE7',
                              color: staff.status === 'active' ? '#EF4444' : '#16A34A'
                            }}
                          >
                            {staff.status === 'active' ? 'Mark Inactive' : 'Mark Active'}
                          </button>
                          <button onClick={() => handleEditStaff(staff)} style={{ ...styles.btnToggle, background: '#E0E7FF', color: '#4F46E5' }}>✏️</button>
                          <button onClick={() => handleDeleteStaff(staff.id)} style={{ ...styles.btnToggle, background: '#FEE2E2', color: '#EF4444' }}>🗑️</button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

const styles = {
  container: { width: '100%', animation: 'fadeIn 0.5s ease-out' },
  header: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '30px', flexWrap: 'wrap', gap: '20px' },
  titleArea: { flex: 1 },
  title: { fontSize: '24px', fontWeight: '800', color: '#1E293B', margin: 0 },
  subtitle: { color: '#64748B', fontSize: '14px', marginTop: '4px' },

  totalCard: { background: '#8B5CF6', padding: '15px 25px', borderRadius: '16px', color: '#fff', boxShadow: '0 10px 15px -3px rgba(139, 92, 246, 0.3)' },
  totalLabel: { fontSize: '12px', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '1px', opacity: 0.9 },
  totalAmount: { fontSize: '24px', fontWeight: '800', marginTop: '4px' },

  mainGrid: { display: 'grid', gridTemplateColumns: '320px 1fr', gap: '25px', alignItems: 'start' },
  leftCol: { display: 'flex', flexDirection: 'column', gap: '25px' },

  card: { background: '#fff', padding: '24px', borderRadius: '20px', border: '1px solid #E2E8F0', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)' },
  cardTitle: { margin: '0 0 20px 0', fontSize: '16px', fontWeight: '700', color: '#1E293B' },

  form: { display: 'flex', flexDirection: 'column', gap: '15px' },
  formGroup: { display: 'flex', flexDirection: 'column', gap: '6px' },
  label: { fontSize: '12px', fontWeight: '600', color: '#64748B' },
  input: { padding: '12px 14px', borderRadius: '10px', border: '1px solid #E2E8F0', outline: 'none', fontSize: '14px', transition: 'border 0.2s', background: '#F8FAFC' },
  select: { padding: '12px 14px', borderRadius: '10px', border: '1px solid #E2E8F0', outline: 'none', fontSize: '14px', background: '#F8FAFC' },
  btnPrimary: { background: '#8B5CF6', color: '#fff', border: 'none', padding: '12px', borderRadius: '10px', fontWeight: '700', cursor: 'pointer', marginTop: '10px', transition: 'background 0.2s' },

  listHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' },
  filters: { display: 'flex', gap: '10px' },
  selectSmall: { padding: '8px 12px', borderRadius: '8px', border: '1px solid #E2E8F0', fontSize: '13px', outline: 'none' },

  tableWrapper: { overflowX: 'auto' },
  table: { width: '100%', borderCollapse: 'collapse', textAlign: 'left' },
  thRow: { background: '#F8FAFC', borderBottom: '1px solid #E2E8F0' },
  th: { padding: '12px 15px', color: '#64748B', fontSize: '12px', fontWeight: '700', textTransform: 'uppercase' },
  tr: { borderBottom: '1px solid #F1F5F9', transition: 'background 0.2s', ':hover': { background: '#F8FAFC' } },
  td: { padding: '14px 15px', fontSize: '14px', color: '#1E293B' },
  tdStaffName: { padding: '14px 15px', fontSize: '14px', fontWeight: '600', color: '#334155' },
  tdDate: { padding: '14px 15px', fontSize: '13px', color: '#64748B', fontWeight: '500' },
  tdCategory: { padding: '14px 15px' },
  badge: { fontSize: '11px', fontWeight: '700', padding: '4px 10px', borderRadius: '20px', display: 'inline-block', background: '#EDE9FE', color: '#5B21B6' },
  tdAmount: { padding: '14px 15px', fontSize: '14px', fontWeight: '700', color: '#8B5CF6' },
  btnDelete: { background: 'transparent', border: 'none', cursor: 'pointer', opacity: 0.6, transition: 'opacity 0.2s' },
  emptyCell: { padding: '30px', textAlign: 'center', color: '#94A3B8', fontSize: '14px' },

  modalOverlay: { position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 },
  modalContent: { background: '#fff', padding: '25px', borderRadius: '16px', width: '90%', maxWidth: '500px', boxShadow: '0 10px 25px rgba(0,0,0,0.2)' },
  modalHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' },
  btnClose: { background: 'none', border: 'none', fontSize: '20px', cursor: 'pointer', color: '#64748B' },
  btnToggle: { padding: '6px 12px', borderRadius: '6px', border: 'none', fontSize: '12px', fontWeight: '600', cursor: 'pointer' },

  '@media (max-width: 1024px)': {
    mainGrid: { gridTemplateColumns: '1fr' }
  }
};

export default StaffSalary;
