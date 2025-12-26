import React, { useState, useEffect } from 'react';
import { db } from '../firebase.js';
import { ref, onValue } from 'firebase/database';

const FeeStatus = () => {
  const [students, setStudents] = useState([]);
  const [feesData, setFeesData] = useState({});
  const [searchTerm, setSearchTerm] = useState('');
  
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

  const isEnrolledInCourseByDate = (enrolledAt) => {
    if (!enrolledAt) return true; 
    const joinDate = new Date(enrolledAt);
    const joinMonth = joinDate.getMonth();
    const joinYear = joinDate.getFullYear();

    const selectedMonth = monthsMap[filterMonth];
    const selectedYear = parseInt(filterYear);

    if (joinYear > selectedYear) return false;
    if (joinYear === selectedYear && joinMonth > selectedMonth) return false;

    return true;
  };

  const getCourseStatus = (studentId, courseId, agreedFee) => {
    const monthKey = `${filterMonth}_${filterYear}`;
    const record = feesData[studentId]?.[courseId]?.[monthKey];
    
    if (!record) {
      return { label: 'Unpaid', color: '#ef4444', bg: '#fee2e2', paid: 0, balance: agreedFee };
    }

    if (record.balance <= 0) {
      return { label: 'Paid', color: '#10b981', bg: '#dcfce7', paid: record.paid, balance: 0 };
    } else {
      return { label: 'Partial', color: '#f59e0b', bg: '#fef3c7', paid: record.paid, balance: record.balance };
    }
  };

  // --- UPDATED LOGIC: Filter out Completed/Dropout ---
  const flattenedStatusList = [];

  students.forEach(student => {
    // Skip if main student status is not active (optional safety)
    if (student.status === 'inactive') return;

    const courses = student.enrolled_courses || {};
    
    Object.keys(courses).forEach(courseId => {
      const courseInfo = courses[courseId];
      
      // 1. RULE: Only include 'active' courses
      const isCourseActive = courseInfo.course_status === 'active';
      
      // 2. Filter logic: Search Term
      const matchesSearch = student.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                            student.student_id?.toLowerCase().includes(searchTerm.toLowerCase());
      
      // 3. Filter logic: Date Enrollment Check
      const wasEnrolledInThisCourse = isEnrolledInCourseByDate(courseInfo.enrolledAt);

      if (isCourseActive && matchesSearch && wasEnrolledInThisCourse) {
        flattenedStatusList.push({
          studentKey: student.id,
          studentId: student.student_id,
          name: student.name,
          courseId: courseId,
          courseName: courseInfo.course_name,
          agreedFee: courseInfo.agreed_monthly_fee,
          enrolledAt: courseInfo.enrolledAt,
          courseStatus: courseInfo.course_status
        });
      }
    });
  });

  return (
    <div style={styles.container}>
      <header style={styles.header}>
        <div style={styles.titleArea}>
          <h2 style={{margin: 0}}>Active Monthly Fee Status 📊</h2>
          <p style={{color: '#64748b'}}>Tracking active enrollments for {filterMonth} {filterYear}</p>
        </div>

        <div style={styles.filterBar}>
          <input 
            type="text" 
            placeholder="Search Active Students..." 
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
            style={{...styles.select, width: '90px'}} 
          />
        </div>
      </header>

      <div style={styles.card}>
        <table style={styles.table}>
          <thead>
            <tr style={styles.thRow}>
              <th>Student ID</th>
              <th>Student Name</th>
              <th>Course</th>
              <th>Enrolled Date</th>
              <th>Monthly Fee</th>
              <th>Status</th>
              <th>Paid</th>
              <th>Balance</th>
            </tr>
          </thead>
          <tbody>
            {flattenedStatusList.length > 0 ? flattenedStatusList.map((item) => {
              const payment = getCourseStatus(item.studentKey, item.courseId, item.agreedFee);

              return (
                <tr key={`${item.studentKey}_${item.courseId}`} style={styles.tr}>
                  <td style={{fontWeight: 'bold', color: '#4318ff'}}>{item.studentId}</td>
                  <td>{item.name}</td>
                  <td style={{fontWeight: '500'}}>{item.courseName}</td>
                  <td style={{fontSize: '12px', color: '#64748b'}}>
                    {item.enrolledAt ? new Date(item.enrolledAt).toLocaleDateString('en-GB', { month: 'short', year: 'numeric'}) : 'N/A'}
                  </td>
                  <td>PKR {item.agreedFee}</td>
                  <td>
                    <span style={{...styles.badge, backgroundColor: payment.bg, color: payment.color}}>
                      {payment.label}
                    </span>
                  </td>
                  <td style={{fontWeight: '600', color: '#059669'}}>{payment.paid}</td>
                  <td style={{color: payment.balance > 0 ? '#ef4444' : '#10b981', fontWeight: 'bold'}}>
                    {payment.balance}
                  </td>
                </tr>
              );
            }) : (
              <tr>
                <td colSpan="8" style={styles.emptyState}>No active enrollments found for this search.</td>
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
  header: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '25px' },
  filterBar: { display: 'flex', gap: '12px' },
  searchInput: { padding: '10px 15px', borderRadius: '10px', border: '1px solid #e2e8f0', width: '220px', outline: 'none' },
  select: { padding: '10px', borderRadius: '10px', border: '1px solid #e2e8f0', background: '#fff' },
  card: { background: '#fff', borderRadius: '16px', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)', overflow: 'hidden' },
  table: { width: '100%', borderCollapse: 'collapse' },
  thRow: { textAlign: 'left', background: '#f1f5f9', color: '#64748b', fontSize: '11px', textTransform: 'uppercase' },
  tr: { borderBottom: '1px solid #f1f5f9', transition: '0.2s' },
  badge: { padding: '4px 10px', borderRadius: '20px', fontSize: '10px', fontWeight: 'bold' },
  emptyState: { textAlign: 'center', padding: '40px', color: '#94a3b8' }
};

export default FeeStatus;