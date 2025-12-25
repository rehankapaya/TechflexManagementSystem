import React, { useState, useEffect } from 'react';
import { db } from '../firebase.js';
import { useAuth } from '../contexts/AuthContext';
import { ref, set, push, onValue, remove, update } from 'firebase/database';

const Fees = () => {
  const { currentUser, isAdmin } = useAuth();
  
  // Data States
  const [students, setStudents] = useState([]);
  const [feesData, setFeesData] = useState({});
  const [pendingFees, setPendingFees] = useState([]);
  
  // UI States
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(false);

  // Form State
  const [formData, setFormData] = useState({
    month: new Date().toLocaleString('default', { month: 'short' }),
    year: new Date().getFullYear().toString(),
    payable: 0,
    paid: 0,
    waived: 0
  });

  // --- 1. Realtime Listeners ---
  useEffect(() => {
    // Fetch Active Students
    onValue(ref(db, 'students'), (snap) => {
      const data = snap.val();
      setStudents(data ? Object.keys(data).map(id => ({ id, ...data[id] })) : []);
    });

    // Fetch Master Ledger
    onValue(ref(db, 'fee_transactions'), (snap) => {
      setFeesData(snap.val() || {});
    });

    // Fetch Pending Waivers
    onValue(ref(db, 'pending_fee_approvals'), (snap) => {
      const data = snap.val();
      setPendingFees(data ? Object.keys(data).map(id => ({ id, ...data[id] })) : []);
    });
  }, []);

  // --- 2. Logic Functions ---
  const handleStudentSelect = (student) => {
    setSelectedStudent(student);
    if (student) {
      const courseKey = Object.keys(student.enrolled_courses)[0];
      const agreedFee = student.enrolled_courses[courseKey].agreed_monthly_fee;
      setFormData(prev => ({ ...prev, payable: agreedFee, paid: agreedFee, waived: 0 }));
      setSearchTerm(""); // Clear search after selection
    }
  };

  const handlePaymentSubmit = async (e) => {
    e.preventDefault();
    if (!selectedStudent) return alert("Please select a student first");

    setLoading(true);
    const courseId = Object.keys(selectedStudent.enrolled_courses)[0];
    const monthKey = `${formData.month}_${formData.year}`;
    const balance = Number(formData.payable) - Number(formData.paid) - Number(formData.waived);

    const transaction = {
      student_id: selectedStudent.id,
      student_name: selectedStudent.name,
      student_custom_id: selectedStudent.student_id,
      course_id: courseId,
      month_key: monthKey,
      payable: Number(formData.payable),
      paid: Number(formData.paid),
      waived: Number(formData.waived),
      balance: balance,
      addedBy: currentUser.name,
      timestamp: Date.now()
    };

    try {
      if (transaction.waived > 0 && !isAdmin) {
        // Path for Cashier with Waiver
        await push(ref(db, 'pending_fee_approvals'), transaction);
        alert("Waiver request submitted for Admin approval.");
      } else {
        // Path for Admin OR Cashier with NO waiver
        await update(ref(db, `fee_transactions/${selectedStudent.id}/${courseId}/${monthKey}`), transaction);
        alert("Fee record updated successfully.");
      }
      setFormData(prev => ({ ...prev, paid: 0, waived: 0 }));
    } catch (err) {
      alert(err.message);
    } finally {
      setLoading(false);
    }
  };

  const approveFee = async (reqId, data) => {
    try {
      await update(ref(db, `fee_transactions/${data.student_id}/${data.course_id}/${data.month_key}`), {
        ...data,
        approvedBy: currentUser.name,
        approvedAt: Date.now()
      });
      await remove(ref(db, `pending_fee_approvals/${reqId}`));
      alert("Fee Approved and Ledger Updated.");
    } catch (err) { alert(err.message); }
  };

  const rejectFee = async (reqId) => {
    if(window.confirm("Reject this fee waiver request?")) {
        await remove(ref(db, `pending_fee_approvals/${reqId}`));
    }
  };

  // --- 3. Filtered Search Logic ---
  const searchResults = students.filter(s => 
    s.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    (s.student_id && s.student_id.toLowerCase().includes(searchTerm.toLowerCase()))
  ).slice(0, 5); // Limit to top 5 results for clean UI

  const getHistory = () => {
    if (!selectedStudent || !feesData[selectedStudent.id]) return [];
    const courseId = Object.keys(selectedStudent.enrolled_courses)[0];
    const transactions = feesData[selectedStudent.id][courseId] || {};
    return Object.keys(transactions).map(key => ({ id: key, ...transactions[key] }));
  };

  return (
    <div style={styles.container}>
      <header style={styles.header}>
        <h2 style={{margin: 0}}>Fee Management</h2>
        <p style={{color: '#64748b'}}>Role: {isAdmin ? 'Administrator' : 'Fee Cashier'}</p>
      </header>

      <div style={styles.layout}>
        {/* LEFT COLUMN: Search & Collection */}
        <div style={styles.sideCol}>
          <div style={styles.card}>
            <h3>Collect Fee</h3>
            
            {/* SEARCH INPUT */}
            <div style={{position: 'relative', marginBottom: '15px'}}>
              <label style={styles.label}>Search Student (ID or Name)</label>
              <input 
                type="text" 
                placeholder="Ex: STU-2025-001" 
                value={searchTerm} 
                onChange={(e) => setSearchTerm(e.target.value)}
                style={styles.input}
              />
              {searchTerm && searchResults.length > 0 && (
                <div style={styles.dropdown}>
                  {searchResults.map(s => (
                    <div key={s.id} onClick={() => handleStudentSelect(s)} style={styles.dropdownItem}>
                      <strong>{s.student_id}</strong> - {s.name}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {selectedStudent && (
              <form onSubmit={handlePaymentSubmit} style={styles.form}>
                <div style={styles.selectionInfo}>
                   Selected: <strong>{selectedStudent.name}</strong>
                </div>

                <div style={styles.row}>
                   <div style={{flex: 1}}>
                     <label style={styles.label}>Month</label>
                     <select value={formData.month} onChange={e => setFormData({...formData, month: e.target.value})} style={styles.input}>
                        {["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"].map(m => <option key={m} value={m}>{m}</option>)}
                     </select>
                   </div>
                   <div style={{flex: 1}}>
                     <label style={styles.label}>Year</label>
                     <input type="number" value={formData.year} onChange={e => setFormData({...formData, year: e.target.value})} style={styles.input} />
                   </div>
                </div>

                <label style={styles.label}>Total Payable (Agreed)</label>
                <input type="number" value={formData.payable} readOnly style={{...styles.input, background: '#f1f5f9'}} />

                <label style={styles.label}>Amount Paid</label>
                <input type="number" value={formData.paid} onChange={e => setFormData({...formData, paid: e.target.value})} style={styles.input} required />

                <label style={styles.label}>Waiver/Discount {isAdmin ? '' : '(Needs Admin Approval)'}</label>
                <input type="number" value={formData.waived} onChange={e => setFormData({...formData, waived: e.target.value})} style={styles.input} />

                <div style={styles.balanceSummary}>
                   Balance: PKR {formData.payable - formData.paid - formData.waived}
                </div>

                <button type="submit" disabled={loading} style={styles.btnPrimary}>
                   {loading ? "Saving..." : (formData.waived > 0 && !isAdmin ? "Submit Waiver Request" : "Update Ledger")}
                </button>
              </form>
            )}
          </div>
        </div>

        {/* RIGHT COLUMN: History & Approvals */}
        <div style={styles.mainCol}>
          {isAdmin && pendingFees.length > 0 && (
            <div style={styles.pendingCard}>
              <h4 style={{marginTop: 0, color: '#b45309'}}>⏳ Pending Waiver Approvals</h4>
              <table style={styles.table}>
                <thead>
                  <tr style={styles.thRow}>
                    <th>ID</th>
                    <th>Student Name</th>
                    <th>Month</th>
                    <th>Fee</th>
                    <th>Waiver</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {pendingFees.map(f => (
                    <tr key={f.id} style={styles.tr}>
                      <td>{f.student_custom_id}</td>
                      <td>{f.student_name}</td>
                      <td>{f.month_key}</td>
                      <td>{f.payable}</td>
                      <td style={{color: 'red', fontWeight: 'bold'}}>{f.waived}</td>
                      <td>
                        <button onClick={() => approveFee(f.id, f)} style={styles.btnApprove}>Approve</button>
                        <button onClick={() => rejectFee(f.id)} style={styles.btnReject}>Reject</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          <div style={styles.card}>
            <h3>History {selectedStudent && `for ${selectedStudent.name}`}</h3>
            {selectedStudent ? (
              <table style={styles.table}>
                <thead>
                  <tr style={styles.thRow}>
                    <th>Month/Year</th>
                    <th>Payable</th>
                    <th>Paid</th>
                    <th>Waived</th>
                    <th>Balance</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {getHistory().map(h => (
                    <tr key={h.id} style={styles.tr}>
                      <td>{h.id.replace('_', ' ')}</td>
                      <td>{h.payable}</td>
                      <td style={{color: '#059669', fontWeight: 'bold'}}>{h.paid}</td>
                      <td>{h.waived}</td>
                      <td style={{color: h.balance > 0 ? 'red' : 'inherit'}}>{h.balance}</td>
                      <td>{h.balance <= 0 ? '✅ Clear' : '🔴 Unpaid'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <div style={styles.placeholder}>Select a student to view transaction history</div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

const styles = {
  container: { padding: '30px', background: '#f8fafc', minHeight: '100vh', fontFamily: 'system-ui' },
  header: { marginBottom: '25px', borderBottom: '2px solid #e2e8f0', paddingBottom: '15px' },
  layout: { display: 'grid', gridTemplateColumns: '380px 1fr', gap: '30px' },
  card: { background: '#fff', padding: '24px', borderRadius: '16px', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)' },
  sideCol: { display: 'flex', flexDirection: 'column', gap: '20px' },
  label: { fontSize: '13px', fontWeight: '600', color: '#475569', marginBottom: '5px', display: 'block' },
  input: { width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid #cbd5e1', marginBottom: '15px', boxSizing: 'border-box' },
  form: { display: 'flex', flexDirection: 'column' },
  row: { display: 'flex', gap: '15px' },
  dropdown: { position: 'absolute', top: '100%', left: 0, right: 0, background: '#fff', border: '1px solid #e2e8f0', borderRadius: '8px', zIndex: 10, boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)' },
  dropdownItem: { padding: '12px', cursor: 'pointer', borderBottom: '1px solid #f1f5f9', fontSize: '14px' },
  selectionInfo: { background: '#eef2ff', padding: '10px', borderRadius: '8px', color: '#4318ff', marginBottom: '15px', fontSize: '14px' },
  balanceSummary: { padding: '15px', background: '#f1f5f9', borderRadius: '8px', textAlign: 'center', fontWeight: 'bold', margin: '10px 0 20px 0' },
  btnPrimary: { background: '#4318ff', color: '#fff', padding: '14px', border: 'none', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer' },
  pendingCard: { background: '#fffbeb', padding: '24px', borderRadius: '16px', border: '1px solid #fef3c7', marginBottom: '30px' },
  table: { width: '100%', borderCollapse: 'collapse' },
  thRow: { textAlign: 'left', color: '#64748b', fontSize: '12px', textTransform: 'uppercase', borderBottom: '2px solid #f1f5f9' },
  tr: { borderBottom: '1px solid #f1f5f9', fontSize: '14px' },
  btnApprove: { background: '#10b981', color: '#fff', border: 'none', padding: '6px 12px', borderRadius: '6px', cursor: 'pointer', marginRight: '5px' },
  btnReject: { background: '#ef4444', color: '#fff', border: 'none', padding: '6px 12px', borderRadius: '6px', cursor: 'pointer' },
  placeholder: { textAlign: 'center', padding: '60px', color: '#94a3b8', border: '2px dashed #e2e8f0', borderRadius: '12px' }
};

// Injection of global padding
const globalStyles = `th, td { padding: 15px 10px; }`;
const styleTag = document.createElement("style");
styleTag.innerText = globalStyles;
document.head.appendChild(styleTag);

export default Fees;