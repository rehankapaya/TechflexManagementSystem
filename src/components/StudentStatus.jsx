import React, { useState, useEffect } from 'react';
import { db } from '../firebase.js';
import { ref, onValue, update } from 'firebase/database';

const StudentStatus = () => {
  const [students, setStudents] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(false);
  const [selectedStatus, setSelectedStatus] = useState({});

  useEffect(() => {
    onValue(ref(db, 'students'), (snap) => {
      const data = snap.val();
      setStudents(data ? Object.keys(data).map(id => ({ id, ...data[id] })) : []);
    });
  }, []);

  const handleDropdownChange = (studentId, value) => {
    setSelectedStatus(prev => ({ ...prev, [studentId]: value }));
  };

  const commitStatusChange = async (studentId) => {
    const newStatus = selectedStatus[studentId];
    if (!newStatus) return alert("Please select a new status first.");
    
    if (!window.confirm(`Confirm changing status to ${newStatus.toUpperCase()}?`)) return;
    
    setLoading(true);
    try {
      await update(ref(db, `students/${studentId}`), { 
        status: newStatus,
        statusUpdatedAt: new Date().toISOString()
      });
      alert("Status updated successfully!");
      setSelectedStatus(prev => {
        const newState = { ...prev };
        delete newState[studentId];
        return newState;
      });
    } catch (err) {
      alert("Error: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  // --- LOGIC: Search works on ALL students regardless of status ---
  const filteredStudents = students.filter(s => {
    const matchesSearch = s.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          s.student_id?.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesSearch;
  });

  // Helper for status badge styling
  const getStatusStyle = (status) => {
    switch (status) {
      case 'active': return { bg: '#dcfce7', text: '#15803d' };
      case 'coursecomplete': return { bg: '#dbeafe', text: '#1e40af' };
      case 'dropout': return { bg: '#fee2e2', text: '#b91c1c' };
      default: return { bg: '#f1f5f9', text: '#64748b' };
    }
  };

  return (
    <div style={styles.container}>
      <header style={styles.header}>
        <div>
          <h2 style={{margin: 0}}>Change Student Status ⚙️</h2>
          <p style={{color: '#64748b'}}>Update and manage lifecycle for all students</p>
        </div>
        <input 
          type="text" 
          placeholder="Search ID, Name, or Status..." 
          value={searchTerm} 
          onChange={(e) => setSearchTerm(e.target.value)}
          style={styles.searchInput}
        />
      </header>

      <div style={styles.card}>
        <table style={styles.table}>
          <thead>
            <tr style={styles.thRow}>
              <th>S.ID</th>
              <th>Name</th>
              <th>Current Status</th>
              <th>Set New Status</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            {filteredStudents.length > 0 ? filteredStudents.map(s => {
              const badge = getStatusStyle(s.status);
              return (
                <tr key={s.id} style={styles.tr}>
                  <td style={{fontWeight: 'bold', color: '#4318ff'}}>{s.student_id}</td>
                  <td>
                    <div>{s.name}</div>
                    <div style={{fontSize: '11px', color: '#94a3b8'}}>{Object.values(s.enrolled_courses)[0]?.course_name}</div>
                  </td>
                  <td>
                    <span style={{
                      ...styles.badge, 
                      backgroundColor: badge.bg, 
                      color: badge.text
                    }}>
                      {s.status || 'Active'}
                    </span>
                  </td>
                  <td>
                    <select 
                      value={selectedStatus[s.id] || ""} 
                      onChange={(e) => handleDropdownChange(s.id, e.target.value)}
                      style={styles.select}
                    >
                      <option value="" disabled>-- Change To --</option>
                      <option value="active">Active</option>
                      <option value="coursecomplete">Course Completed</option>
                      <option value="dropout">Dropout</option>
                    </select>
                  </td>
                  <td>
                    <button 
                      onClick={() => commitStatusChange(s.id)}
                      style={styles.btnChange}
                      disabled={loading || !selectedStatus[s.id] || selectedStatus[s.id] === s.status}
                    >
                      {loading ? "..." : "Update"}
                    </button>
                  </td>
                </tr>
              );
            }) : (
              <tr>
                <td colSpan="5" style={styles.emptyState}>No students found.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

const styles = {
  container: { padding: '30px', background: '#f8fafc', minHeight: '100vh', fontFamily: 'system-ui' },
  header: { display: 'flex', justifyContent: 'space-between', marginBottom: '25px', alignItems: 'center' },
  searchInput: { padding: '12px', borderRadius: '10px', border: '1px solid #e2e8f0', width: '280px', outline: 'none' },
  card: { background: '#fff', borderRadius: '16px', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)', overflow: 'hidden' },
  table: { width: '100%', borderCollapse: 'collapse' },
  thRow: { textAlign: 'left', background: '#f1f5f9', color: '#64748b', fontSize: '13px', textTransform: 'uppercase' },
  tr: { borderBottom: '1px solid #f1f5f9' },
  badge: { padding: '4px 10px', borderRadius: '20px', fontSize: '11px', fontWeight: 'bold', textTransform: 'capitalize' },
  select: { padding: '8px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '13px', width: '100%', cursor: 'pointer' },
  btnChange: { 
    background: '#4318ff', 
    color: '#fff', 
    border: 'none', 
    padding: '8px 16px', 
    borderRadius: '6px', 
    fontWeight: 'bold', 
    cursor: 'pointer',
    fontSize: '12px'
  },
  emptyState: { textAlign: 'center', padding: '40px', color: '#94a3b8' }
};

const globalStyles = `th, td { padding: 16px 20px; }`;
const styleTag = document.createElement("style");
styleTag.innerText = globalStyles;
document.head.appendChild(styleTag);

export default StudentStatus;