import React, { useState, useEffect } from 'react';
import { db } from '../firebase.js';
import { ref, onValue } from 'firebase/database';

const FeeStatus = () => {
  const [students, setStudents] = useState([]);
  const [feesData, setFeesData] = useState({});
  const [searchTerm, setSearchTerm] = useState('');
  
  // Default to current month/year
  const [filterMonth, setFilterMonth] = useState(new Date().toLocaleString('default', { month: 'short' }));
  const [filterYear, setFilterYear] = useState(new Date().getFullYear().toString());

  const monthsMap = {
    Jan: 0, Feb: 1, Mar: 2, Apr: 3, May: 4, Jun: 5,
    Jul: 6, Aug: 7, Sep: 8, Oct: 9, Nov: 10, Dec: 11
  };

  useEffect(() => {
    onValue(ref(db, 'students'), (snap) => {
      const data = snap.val();
      setStudents(data ? Object.keys(data).map(id => ({ id, ...data[id] })) : []);
    });

    onValue(ref(db, 'fee_transactions'), (snap) => {
      setFeesData(snap.val() || {});
    });
  }, []);

  // --- LOGIC: Check if student had joined by the filter date ---
  const isJoinedByFilterDate = (studentCreatedAt) => {
    const joinDate = new Date(studentCreatedAt);
    const joinMonth = joinDate.getMonth();
    const joinYear = joinDate.getFullYear();

    const selectedMonth = monthsMap[filterMonth];
    const selectedYear = parseInt(filterYear);

    // Rule: Don't display if student joined AFTER the selected month/year
    if (joinYear > selectedYear) return false;
    if (joinYear === selectedYear && joinMonth > selectedMonth) return false;

    return true;
  };

  const getStudentStatus = (studentId, studentCourseId) => {
    const monthKey = `${filterMonth}_${filterYear}`;
    
    if (!feesData[studentId] || !feesData[studentId][studentCourseId] || !feesData[studentId][studentCourseId][monthKey]) {
      return { label: 'Unpaid', color: '#ef4444', bg: '#fee2e2', paid: 0, balance: 'Full' };
    }

    const record = feesData[studentId][studentCourseId][monthKey];
    if (record.balance <= 0) {
      return { label: 'Paid', color: '#10b981', bg: '#dcfce7', paid: record.paid, balance: 0 };
    } else {
      return { label: 'Partial', color: '#f59e0b', bg: '#fef3c7', paid: record.paid, balance: record.balance };
    }
  };

  // --- Filtered List with Enrollment Check ---
  const filteredList = students.filter(s => {
    const matchesSearch = s.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          s.student_id?.toLowerCase().includes(searchTerm.toLowerCase());
    
    // Check if the student was actually enrolled in the selected period
    const wasEnrolled = isJoinedByFilterDate(s.createdAt);

    return matchesSearch && wasEnrolled;
  });

  return (
    <div style={styles.container}>
      <header style={styles.header}>
        <div style={styles.titleArea}>
          <h2 style={{margin: 0}}>Monthly Fee Status 📊</h2>
          <p style={{color: '#64748b'}}>Report for: {filterMonth} {filterYear}</p>
        </div>

        <div style={styles.filterBar}>
          <input 
            type="text" 
            placeholder="Search Name or ID..." 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={styles.searchInput}
          />
          <select value={filterMonth} onChange={(e) => setFilterMonth(e.target.value)} style={styles.select}>
            {Object.keys(monthsMap).map(m => <option key={m} value={m}>{m}</option>)}
          </select>
          <input 
            type="number" 
            value={filterYear} 
            onChange={(e) => setFilterYear(e.target.value)} 
            style={{...styles.select, width: '100px'}} 
          />
        </div>
      </header>

      <div style={styles.card}>
        <table style={styles.table}>
          <thead>
            <tr style={styles.thRow}>
              <th>Student ID</th>
              <th>Full Name</th>
              <th>Joining Date</th>
              <th>Course</th>
              <th>Status</th>
              <th>Paid</th>
              <th>Balance</th>
            </tr>
          </thead>
          <tbody>
            {filteredList.map(s => {
              const courseKey = s.courseId || Object.keys(s.enrolled_courses)[0];
              const courseInfo = s.enrolled_courses[courseKey];
              const status = getStudentStatus(s.id, courseKey);

              return (
                <tr key={s.id} style={styles.tr}>
                  <td style={{fontWeight: 'bold', color: '#4318ff'}}>{s.student_id}</td>
                  <td>{s.name}</td>
                  <td style={{fontSize: '13px', color: '#64748b'}}>
                    {new Date(s.createdAt).toLocaleDateString('en-GB', { month: 'short', year: 'numeric'})}
                  </td>
                  <td>{courseInfo.course_name}</td>
                  <td>
                    <span style={{...styles.badge, backgroundColor: status.bg, color: status.color}}>
                      {status.label}
                    </span>
                  </td>
                  <td>{status.paid}</td>
                  <td style={{color: status.balance > 0 || status.balance === 'Full' ? '#ef4444' : '#10b981'}}>
                    {status.balance === 'Full' ? courseInfo.agreed_monthly_fee : status.balance}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {filteredList.length === 0 && (
          <div style={styles.emptyState}>No students were enrolled during this period.</div>
        )}
      </div>
    </div>
  );
};

const styles = {
  container: { padding: '30px', background: '#f8fafc', minHeight: '100vh', fontFamily: 'system-ui' },
  header: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '25px' },
  filterBar: { display: 'flex', gap: '12px' },
  searchInput: { padding: '10px 15px', borderRadius: '10px', border: '1px solid #e2e8f0', width: '220px', outline: 'none' },
  select: { padding: '10px', borderRadius: '10px', border: '1px solid #e2e8f0', background: '#fff' },
  card: { background: '#fff', borderRadius: '16px', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)', overflow: 'hidden' },
  table: { width: '100%', borderCollapse: 'collapse' },
  thRow: { textAlign: 'left', background: '#f1f5f9', color: '#64748b', fontSize: '12px', textTransform: 'uppercase' },
  tr: { borderBottom: '1px solid #f1f5f9' },
  badge: { padding: '4px 10px', borderRadius: '20px', fontSize: '11px', fontWeight: 'bold' },
  emptyState: { textAlign: 'center', padding: '40px', color: '#94a3b8' }
};

export default FeeStatus;