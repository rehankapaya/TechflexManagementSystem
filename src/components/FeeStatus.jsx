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
      return { label: 'Unpaid', color: '#EF4444', bg: '#FEF2F2', paid: 0, balance: agreedFee };
    }

    if (record.balance <= 0) {
      return { label: 'Paid', color: '#10B981', bg: '#DCFCE7', paid: record.paid, balance: 0 };
    } else {
      return { label: 'Partial', color: '#F59E0B', bg: '#FFFBEB', paid: record.paid, balance: record.balance };
    }
  };

  const flattenedStatusList = [];

  students.forEach(student => {
    if (student.status === 'inactive') return;
    const courses = student.enrolled_courses || {};
    
    Object.keys(courses).forEach(courseId => {
      const courseInfo = courses[courseId];
      const isCourseActive = courseInfo.course_status === 'active';
      const matchesSearch = student.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                            student.student_id?.toLowerCase().includes(searchTerm.toLowerCase());
      
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
          <h2 style={styles.title}>Fee Status Tracking 📊</h2>
          <p style={styles.subtitle}>Showing active enrollments for <strong>{filterMonth} {filterYear}</strong></p>
        </div>

        <div style={styles.filterBar}>
          <div style={styles.searchWrapper}>
            <span style={styles.searchIcon}>🔍</span>
            <input 
              type="text" 
              placeholder="Search student or ID..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              style={styles.searchInput}
            />
          </div>
          <select value={filterMonth} onChange={(e) => setFilterMonth(e.target.value)} style={styles.select}>
            {Object.keys(monthsMap).map(m => <option key={m} value={m}>{m}</option>)}
          </select>
          <input 
            type="number" 
            value={filterYear} 
            onChange={(e) => setFilterYear(e.target.value)} 
            style={styles.yearInput} 
          />
        </div>
      </header>

      <div style={styles.card}>
        <div style={styles.tableWrapper}>
          <table style={styles.table}>
            <thead>
              <tr style={styles.thRow}>
                <th style={styles.th}>ID</th>
                <th style={styles.th}>Student Name</th>
                <th style={styles.th}>Course</th>
                <th style={styles.th}>Enrolled</th>
                <th style={styles.th}>Fee</th>
                <th style={styles.th}>Status</th>
                <th style={styles.th}>Paid</th>
                <th style={styles.th}>Balance</th>
              </tr>
            </thead>
            <tbody>
              {flattenedStatusList.length > 0 ? flattenedStatusList.map((item) => {
                const payment = getCourseStatus(item.studentKey, item.courseId, item.agreedFee);

                return (
                  <tr key={`${item.studentKey}_${item.courseId}`} style={styles.tr}>
                    <td style={styles.idCell}>{item.studentId}</td>
                    <td style={styles.nameCell}>{item.name}</td>
                    <td style={styles.courseCell}>{item.courseName}</td>
                    <td style={styles.dateCell}>
                      {item.enrolledAt ? new Date(item.enrolledAt).toLocaleDateString('en-GB', { month: 'short', year: 'numeric'}) : 'N/A'}
                    </td>
                    <td style={styles.feeCell}>PKR {item.agreedFee.toLocaleString()}</td>
                    <td>
                      <span style={{...styles.badge, backgroundColor: payment.bg, color: payment.color}}>
                        {payment.label}
                      </span>
                    </td>
                    <td style={styles.paidCell}>{payment.paid > 0 ? `PKR ${payment.paid.toLocaleString()}` : '—'}</td>
                    <td style={{...styles.balanceCell, color: payment.balance > 0 ? '#EF4444' : '#10B981'}}>
                      {payment.balance > 0 ? `PKR ${payment.balance.toLocaleString()}` : 'Cleared'}
                    </td>
                  </tr>
                );
              }) : (
                <tr>
                  <td colSpan="8" style={styles.emptyState}>No records match your filters.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

const styles = {
  container: { maxWidth: '1200px', margin: '0 auto' },
  header: { 
    display: 'flex', 
    justifyContent: 'space-between', 
    alignItems: 'flex-end', 
    marginBottom: '30px',
    flexWrap: 'wrap',
    gap: '20px'
  },
  title: { fontSize: '24px', fontWeight: '700', color: '#1E293B', margin: 0 },
  subtitle: { color: '#64748B', fontSize: '14px', marginTop: '4px' },
  
  filterBar: { display: 'flex', gap: '12px', alignItems: 'center' },
  searchWrapper: { position: 'relative' },
  searchIcon: { position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', opacity: 0.4, fontSize: '14px' },
  searchInput: { padding: '10px 12px 10px 35px', borderRadius: '10px', border: '1px solid #E2E8F0', width: '220px', outline: 'none', backgroundColor: '#fff' },
  select: { padding: '10px', borderRadius: '10px', border: '1px solid #E2E8F0', background: '#fff', cursor: 'pointer', outline: 'none' },
  yearInput: { padding: '10px', borderRadius: '10px', border: '1px solid #E2E8F0', background: '#fff', width: '80px', outline: 'none' },
  
  card: { background: '#fff', borderRadius: '16px', border: '1px solid #E2E8F0', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)', overflow: 'hidden' },
  tableWrapper: { overflowX: 'auto' },
  table: { width: '100%', borderCollapse: 'collapse', textAlign: 'left', minWidth: '900px' },
  thRow: { background: '#F8FAFC', borderBottom: '1px solid #E2E8F0' },
  th: { padding: '14px 20px', color: '#64748B', fontSize: '11px', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.05em' },
  tr: { borderBottom: '1px solid #F1F5F9', transition: '0.2s hover', backgroundColor: '#fff' },
  
  idCell: { padding: '16px 20px', fontWeight: '700', color: '#3B82F6', fontSize: '13px' },
  nameCell: { padding: '16px 20px', fontWeight: '600', color: '#1E293B', fontSize: '14px' },
  courseCell: { padding: '16px 20px', color: '#475569', fontSize: '14px' },
  dateCell: { padding: '16px 20px', color: '#94A3B8', fontSize: '12px' },
  feeCell: { padding: '16px 20px', color: '#1E293B', fontSize: '14px', fontWeight: '500' },
  paidCell: { padding: '16px 20px', color: '#10B981', fontWeight: '600', fontSize: '14px' },
  balanceCell: { padding: '16px 20px', fontWeight: '700', fontSize: '14px' },
  
  badge: { padding: '6px 12px', borderRadius: '20px', fontSize: '11px', fontWeight: '700', display: 'inline-block' },
  emptyState: { textAlign: 'center', padding: '60px', color: '#94A3B8', fontSize: '15px' }
};

export default FeeStatus;