import React, { useState, useEffect } from 'react';
import { db } from '../firebase';
import { useAuth } from '../contexts/AuthContext';
import { ref, push, set, onValue, remove } from 'firebase/database';

const Expenses = () => {
  const { currentUser, isAdmin } = useAuth();
  const [expenses, setExpenses] = useState([]);
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(false);
  const [filterMonth, setFilterMonth] = useState(new Date().getMonth() + 1); // 1-12
  const [filterYear, setFilterYear] = useState(new Date().getFullYear());

  const today = new Date().toISOString().split('T')[0];
  const [formData, setFormData] = useState({
    date: today,
    amount: '',
    description: '',
    courseName: 'General',
  });

  useEffect(() => {
    onValue(ref(db, 'courses'), (snap) => {
      const data = snap.val();
      setCourses(data ? Object.keys(data).map(id => ({ id, ...data[id] })) : []);
    });

    onValue(ref(db, 'expenses'), (snap) => {
      const data = snap.val();
      setExpenses(data ? Object.keys(data).map(id => ({ id, ...data[id] })) : []);
    });
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
      setFormData({ ...formData, amount: '', description: '' });
    } catch (err) {
      alert("Error adding expense");
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id) => {
    if (window.confirm("Delete this expense?")) {
      await remove(ref(db, `expenses/${id}`));
    }
  };

  const filteredExpenses = expenses.filter(e => {
    const d = new Date(e.date);
    return d.getMonth() + 1 === parseInt(filterMonth) && d.getFullYear() === parseInt(filterYear);
  }).sort((a, b) => new Date(b.date) - new Date(a.date));

  const totalExpense = filteredExpenses.reduce((acc, curr) => acc + (curr.amount || 0), 0);

  const monthsFull = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
  const currentYear = new Date().getFullYear();
  const years = [currentYear - 2, currentYear - 1, currentYear, currentYear + 1, currentYear + 2];

  return (
    <div style={styles.container}>
      <header style={styles.header}>
        <div style={styles.titleArea}>
          <h2 style={styles.title}>Expense Tracker 💸</h2>
          <p style={styles.subtitle}>Track operational costs per course</p>
        </div>
        <div style={styles.totalCard}>
          <div style={styles.totalLabel}>Total Expenses ({monthsFull[filterMonth - 1]} {filterYear})</div>
          <div style={styles.totalAmount}>PKR {totalExpense.toLocaleString()}</div>
        </div>
      </header>

      <div style={styles.mainGrid}>
        {/* ADD EXPENSE FORM */}
        <div style={styles.card}>
          <h3 style={styles.cardTitle}>Add New Expense</h3>
          <form onSubmit={handleSubmit} style={styles.form}>
            <div style={styles.formGroup}>
              <label style={styles.label}>Date</label>
              <input type="date" name="date" value={formData.date} onChange={handleChange} required style={styles.input} />
            </div>
            
            <div style={styles.formGroup}>
              <label style={styles.label}>Course Category</label>
              <select name="courseName" value={formData.courseName} onChange={handleChange} required style={styles.select}>
                <option value="General">General / Administrative</option>
                {courses.map(c => <option key={c.id} value={c.name}>{c.name}</option>)}
              </select>
            </div>

            <div style={styles.formGroup}>
              <label style={styles.label}>Description</label>
              <input type="text" name="description" placeholder="e.g. Marketing, Stationery, Rent" value={formData.description} onChange={handleChange} required style={styles.input} />
            </div>

            <div style={styles.formGroup}>
              <label style={styles.label}>Amount (PKR)</label>
              <input type="number" name="amount" placeholder="0" value={formData.amount} onChange={handleChange} required style={styles.input} />
            </div>

            <button type="submit" disabled={loading} style={styles.btnPrimary}>
              {loading ? "Saving..." : "Add Expense"}
            </button>
          </form>
        </div>

        {/* EXPENSE LIST */}
        <div style={styles.card}>
          <div style={styles.listHeader}>
            <h3 style={styles.cardTitle}>Expense Records</h3>
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
                  <th style={styles.th}>Date</th>
                  <th style={styles.th}>Course / Category</th>
                  <th style={styles.th}>Description</th>
                  <th style={styles.th}>Amount</th>
                  <th style={styles.th}>Added By</th>
                  <th style={styles.th}>Action</th>
                </tr>
              </thead>
              <tbody>
                {filteredExpenses.length === 0 ? (
                  <tr><td colSpan="6" style={styles.emptyCell}>No expenses recorded for this month.</td></tr>
                ) : (
                  filteredExpenses.map(e => (
                    <tr key={e.id} style={styles.tr}>
                      <td style={styles.tdDate}>{new Date(e.date).toLocaleDateString('en-GB')}</td>
                      <td style={styles.tdCategory}>
                        <span style={{...styles.badge, background: e.courseName === 'General' ? '#F1F5F9' : '#FEF3C7', color: e.courseName === 'General' ? '#475569' : '#92400E'}}>
                          {e.courseName}
                        </span>
                      </td>
                      <td style={styles.td}>{e.description}</td>
                      <td style={styles.tdAmount}>PKR {e.amount.toLocaleString()}</td>
                      <td style={styles.tdUser}>{e.addedBy}</td>
                      <td style={styles.td}>
                        {isAdmin && <button onClick={() => handleDelete(e.id)} style={styles.btnDelete}>🗑️</button>}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};

const styles = {
  container: { maxWidth: '1200px', margin: '0 auto', animation: 'fadeIn 0.5s ease-out' },
  header: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '30px', flexWrap: 'wrap', gap: '20px' },
  titleArea: { flex: 1 },
  title: { fontSize: '24px', fontWeight: '800', color: '#1E293B', margin: 0 },
  subtitle: { color: '#64748B', fontSize: '14px', marginTop: '4px' },
  
  totalCard: { background: '#10B981', padding: '15px 25px', borderRadius: '16px', color: '#fff', boxShadow: '0 10px 15px -3px rgba(16, 185, 129, 0.3)' },
  totalLabel: { fontSize: '12px', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '1px', opacity: 0.9 },
  totalAmount: { fontSize: '24px', fontWeight: '800', marginTop: '4px' },

  mainGrid: { display: 'grid', gridTemplateColumns: '320px 1fr', gap: '25px', alignItems: 'start' },
  
  card: { background: '#fff', padding: '24px', borderRadius: '20px', border: '1px solid #E2E8F0', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)' },
  cardTitle: { margin: '0 0 20px 0', fontSize: '16px', fontWeight: '700', color: '#1E293B' },
  
  form: { display: 'flex', flexDirection: 'column', gap: '15px' },
  formGroup: { display: 'flex', flexDirection: 'column', gap: '6px' },
  label: { fontSize: '12px', fontWeight: '600', color: '#64748B' },
  input: { padding: '12px 14px', borderRadius: '10px', border: '1px solid #E2E8F0', outline: 'none', fontSize: '14px', transition: 'border 0.2s', background: '#F8FAFC' },
  select: { padding: '12px 14px', borderRadius: '10px', border: '1px solid #E2E8F0', outline: 'none', fontSize: '14px', background: '#F8FAFC' },
  btnPrimary: { background: '#3B82F6', color: '#fff', border: 'none', padding: '12px', borderRadius: '10px', fontWeight: '700', cursor: 'pointer', marginTop: '10px', transition: 'background 0.2s' },

  listHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' },
  filters: { display: 'flex', gap: '10px' },
  selectSmall: { padding: '8px 12px', borderRadius: '8px', border: '1px solid #E2E8F0', fontSize: '13px', outline: 'none' },

  tableWrapper: { overflowX: 'auto' },
  table: { width: '100%', borderCollapse: 'collapse', textAlign: 'left' },
  thRow: { background: '#F8FAFC', borderBottom: '1px solid #E2E8F0' },
  th: { padding: '12px 15px', color: '#64748B', fontSize: '12px', fontWeight: '700', textTransform: 'uppercase' },
  tr: { borderBottom: '1px solid #F1F5F9', transition: 'background 0.2s', ':hover': { background: '#F8FAFC' } },
  td: { padding: '14px 15px', fontSize: '14px', color: '#1E293B' },
  tdDate: { padding: '14px 15px', fontSize: '13px', color: '#64748B', fontWeight: '500' },
  tdCategory: { padding: '14px 15px' },
  badge: { fontSize: '11px', fontWeight: '700', padding: '4px 10px', borderRadius: '20px', display: 'inline-block' },
  tdAmount: { padding: '14px 15px', fontSize: '14px', fontWeight: '700', color: '#10B981' },
  tdUser: { padding: '14px 15px', fontSize: '12px', color: '#94A3B8' },
  btnDelete: { background: 'transparent', border: 'none', cursor: 'pointer', opacity: 0.6, transition: 'opacity 0.2s' },
  emptyCell: { padding: '30px', textAlign: 'center', color: '#94A3B8', fontSize: '14px' },

  '@media (max-width: 1024px)': {
    mainGrid: { gridTemplateColumns: '1fr' }
  }
};

export default Expenses;
