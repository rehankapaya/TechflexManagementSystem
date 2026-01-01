import React, { useState, useEffect } from 'react';
import { db } from '../firebase.js';
import { ref, onValue } from 'firebase/database';

const FeeStatus = () => {
  const [students, setStudents] = useState([]);
  const [feesData, setFeesData] = useState({});
  const [coursesList, setCoursesList] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCourseFilter, setSelectedCourseFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('active'); // 'active', 'inactive', or 'all'

  // Default Reference
  const currentMonthLabel = new Date().toLocaleString('default', { month: 'short' });
  const currentYearLabel = new Date().getFullYear().toString();

  const [fromMonth, setFromMonth] = useState(currentMonthLabel);
  const [fromYear, setFromYear] = useState(currentYearLabel);
  const [toMonth, setToMonth] = useState(currentMonthLabel);
  const [toYear, setToYear] = useState(currentYearLabel);

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

    onValue(ref(db, 'courses'), (snap) => {
      const data = snap.val();
      setCoursesList(data ? Object.keys(data).map(id => ({ id, ...data[id] })) : []);
    });
  }, []);

  const handleReset = () => {
    setSearchTerm('');
    setSelectedCourseFilter('');
    setStatusFilter('active');
    setFromMonth(currentMonthLabel);
    setFromYear(currentYearLabel);
    setToMonth(currentMonthLabel);
    setToYear(currentYearLabel);
  };

  const getMonthRange = () => {
    const start = new Date(parseInt(fromYear), monthsMap[fromMonth], 1);
    const end = new Date(parseInt(toYear), monthsMap[toMonth], 1);
    const range = [];

    let current = new Date(start);
    while (current <= end) {
      const m = current.toLocaleString('default', { month: 'short' });
      const y = current.getFullYear();
      range.push({ m, y, key: `${m}_${y}`, sortValue: current.getTime() });
      current.setMonth(current.getMonth() + 1);
    }
    return range;
  };

  const getSingleMonthStatus = (studentId, courseId, monthKey, agreedFee) => {
    const record = feesData[studentId]?.[courseId]?.[monthKey];
    if (!record) return { label: 'Unpaid', color: '#EF4444', bg: '#FEF2F2', paid: 0, balance: agreedFee };

    const paid = record.paid || 0;
    const balance = agreedFee - paid;
    if (balance <= 0) return { label: 'Paid', color: '#10B981', bg: '#DCFCE7', paid, balance: 0 };
    if (paid > 0) return { label: 'Partial', color: '#F59E0B', bg: '#FFFBEB', paid, balance };
    return { label: 'Unpaid', color: '#EF4444', bg: '#FEF2F2', paid: 0, balance: agreedFee };
  };

  let finalDisplayList = [];
  const selectedRange = getMonthRange();

  students.forEach(student => {
    // 1. Filter by Student Status
    if (statusFilter !== 'all' && student.status !== statusFilter) return;

    const courses = student.enrolled_courses || {};
    
    Object.keys(courses).forEach(courseId => {
      const courseInfo = courses[courseId];
      const matchesSearch = student.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                            student.student_id?.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesCourse = selectedCourseFilter === '' || courseId === selectedCourseFilter;
      
      if (matchesSearch && matchesCourse) {
        // 2. Define Time Boundaries for the specific Course
        const enrollDate = new Date(courseInfo.enrolledAt);
        // If inactive/ended, use course_status_date. If active, use "now" as boundary.
        const endDate = courseInfo.course_status_date ? new Date(courseInfo.course_status_date) : new Date();

        // Normalize to the first of the month for comparison
        const startBoundary = new Date(enrollDate.getFullYear(), enrollDate.getMonth(), 1);
        const endBoundary = new Date(endDate.getFullYear(), endDate.getMonth(), 1);

        selectedRange.forEach(rangeObj => {
          const currentMonthDate = new Date(rangeObj.y, monthsMap[rangeObj.m], 1);

          // 3. Only display if month is within Enrollment -> End Date
          if (currentMonthDate >= startBoundary && currentMonthDate <= endBoundary) {
            const status = getSingleMonthStatus(student.id, courseId, rangeObj.key, courseInfo.agreed_monthly_fee);
            finalDisplayList.push({
              studentKey: student.id,
              studentId: student.student_id,
              name: student.name,
              studentStatus: student.status,
              courseName: courseInfo.course_name,
              month: rangeObj.m,
              year: rangeObj.y,
              agreedFee: courseInfo.agreed_monthly_fee,
              sortValue: rangeObj.sortValue,
              ...status
            });
          }
        });
      }
    });
  });

  finalDisplayList.sort((a, b) => b.sortValue - a.sortValue);

  const exportToExcel = () => {
    const headers = ["ID", "Student Name", "Status", "Course", "Month", "Year", "Monthly Fee", "Paid", "Balance", "Status"];
    const rows = finalDisplayList.map(item => [item.studentId, `"${item.name}"`, item.studentStatus, `"${item.courseName}"`, item.month, item.year, item.agreedFee, item.paid, item.balance, item.label]);
    const csvContent = [headers, ...rows].map(e => e.join(",")).join("\n");
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `Fee_Report_${new Date().toLocaleDateString()}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div style={styles.container}>
      <header style={styles.header}>
        <div style={styles.titleArea}>
          <h2 style={styles.title}>Student Fee Ledger 📂</h2>
          <p style={styles.subtitle}>History from Enrollment to Termination</p>
        </div>
        <div style={styles.headerActions}>
           <button onClick={handleReset} style={styles.btnReset}>🔄 Reset</button>
           <button onClick={exportToExcel} style={styles.btnExport}>📥 Export CSV</button>
        </div>
      </header>

      <div style={styles.filterSection}>
        <div style={styles.searchWrapper}>
          <label style={styles.miniLabel}>Search Student</label>
          <input type="text" placeholder="Name or ID..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} style={styles.searchInput} />
        </div>

        <div style={styles.searchWrapper}>
          <label style={styles.miniLabel}>Enrollment Status</label>
          <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} style={styles.select}>
            <option value="active">Active Only</option>
            <option value="inactive">Inactive Only</option>
            <option value="all">All Students</option>
          </select>
        </div>

        <div style={styles.searchWrapper}>
          <label style={styles.miniLabel}>Filter Course</label>
          <select value={selectedCourseFilter} onChange={(e) => setSelectedCourseFilter(e.target.value)} style={styles.select}>
            <option value="">All Courses</option>
            {coursesList.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </div>

        <div style={styles.rangePickers}>
          <div style={styles.pickerGroup}>
            <span style={styles.rangeLabel}>From:</span>
            <select value={fromMonth} onChange={(e) => setFromMonth(e.target.value)} style={styles.select}>
              {Object.keys(monthsMap).map(m => <option key={m} value={m}>{m}</option>)}
            </select>
            <input type="number" value={fromYear} onChange={(e) => setFromYear(e.target.value)} style={styles.yearInput} />
          </div>
          <div style={styles.pickerGroup}>
            <span style={styles.rangeLabel}>To:</span>
            <select value={toMonth} onChange={(e) => setToMonth(e.target.value)} style={styles.select}>
              {Object.keys(monthsMap).map(m => <option key={m} value={m}>{m}</option>)}
            </select>
            <input type="number" value={toYear} onChange={(e) => setToYear(e.target.value)} style={styles.yearInput} />
          </div>
        </div>
      </div>

      <div style={styles.card}>
        <div style={styles.tableWrapper}>
          <table style={styles.table}>
            <thead>
              <tr style={styles.thRow}>
                <th style={styles.th}>ID</th>
                <th style={styles.th}>Student Name</th>
                <th style={styles.th}>Type</th>
                <th style={styles.th}>Course</th>
                <th style={styles.th}>Billing Month</th>
                <th style={styles.th}>Fee</th>
                <th style={styles.th}>Paid</th>
                <th style={styles.th}>Balance</th>
                <th style={styles.th}>Status</th>
              </tr>
            </thead>
            <tbody>
              {finalDisplayList.length > 0 ? finalDisplayList.map((item, idx) => (
                <tr key={`${item.studentId}_${idx}`} style={styles.tr}>
                  <td style={styles.idCell}>{item.studentId}</td>
                  <td style={styles.nameCell}>{item.name}</td>
                  <td style={styles.courseCell}>
                    <span style={{ 
                        color: item.studentStatus === 'active' ? '#10B981' : '#94a3b8',
                        fontSize: '10px', fontWeight: 'bold' 
                    }}>
                        {item.studentStatus?.toUpperCase()}
                    </span>
                  </td>
                  <td style={styles.courseCell}>{item.courseName}</td>
                  <td style={styles.dateCell}>{item.month} {item.year}</td>
                  <td style={styles.feeCell}>PKR {item.agreedFee.toLocaleString()}</td>
                  <td style={styles.paidCell}>{item.paid > 0 ? `PKR ${item.paid.toLocaleString()}` : '—'}</td>
                  <td style={{...styles.balanceCell, color: item.balance > 0 ? '#EF4444' : '#10B981'}}>
                    {item.balance > 0 ? `PKR ${item.balance.toLocaleString()}` : 'Cleared'}
                  </td>
                  <td>
                    <span style={{...styles.badge, backgroundColor: item.bg, color: item.color}}>
                      {item.label}
                    </span>
                  </td>
                </tr>
              )) : (
                <tr><td colSpan="9" style={styles.empty}>No records found for the selected criteria.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

// ... Styles remain the same as your original provided code ...
const styles = {
  container: { maxWidth: '1250px', margin: '0 auto', padding: '20px', fontFamily: 'Inter, sans-serif' },
  header: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' },
  headerActions: { display: 'flex', gap: '10px' },
  title: { fontSize: '24px', fontWeight: '800', color: '#0f172a' },
  subtitle: { color: '#64748b', fontSize: '13px' },
  btnExport: { backgroundColor: '#10b981', color: '#fff', border: 'none', padding: '10px 18px', borderRadius: '10px', fontWeight: '700', cursor: 'pointer' },
  btnReset: { backgroundColor: '#f1f5f9', color: '#475569', border: '1px solid #e2e8f0', padding: '10px 18px', borderRadius: '10px', fontWeight: '600', cursor: 'pointer' },
  filterSection: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', backgroundColor: '#fff', padding: '16px', borderRadius: '14px', border: '1px solid #e2e8f0', marginBottom: '20px', flexWrap: 'wrap', gap: '20px' },
  miniLabel: { display: 'block', fontSize: '11px', fontWeight: '800', color: '#94a3b8', textTransform: 'uppercase', marginBottom: '6px' },
  searchInput: { padding: '10px 14px', borderRadius: '8px', border: '1px solid #cbd5e1', width: '180px', outline: 'none', fontSize: '14px' },
  rangePickers: { display: 'flex', gap: '24px', flexWrap: 'wrap' },
  pickerGroup: { display: 'flex', gap: '8px', alignItems: 'center' },
  rangeLabel: { fontSize: '12px', fontWeight: '700', color: '#475569' },
  select: { padding: '10px', borderRadius: '8px', border: '1px solid #cbd5e1', backgroundColor: '#f8fafc', fontSize: '14px', outline: 'none', minWidth: '120px' },
  yearInput: { padding: '10px', borderRadius: '8px', border: '1px solid #cbd5e1', width: '80px', textAlign: 'center', fontSize: '14px', outline: 'none' },
  card: { background: '#fff', borderRadius: '16px', border: '1px solid #e2e8f0', overflow: 'hidden', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)' },
  tableWrapper: { overflowX: 'auto' },
  table: { width: '100%', borderCollapse: 'collapse', textAlign: 'left' },
  thRow: { background: '#f8fafc', borderBottom: '1px solid #e2e8f0' },
  th: { padding: '14px 20px', color: '#64748b', fontSize: '11px', fontWeight: '800', textTransform: 'uppercase' },
  tr: { borderBottom: '1px solid #f1f5f9' },
  idCell: { padding: '16px 20px', color: '#3b82f6', fontWeight: '700', fontSize: '13px' },
  nameCell: { padding: '16px 20px', fontWeight: '600', color: '#1e293b', fontSize: '14px' },
  courseCell: { padding: '16px 20px', color: '#475569', fontSize: '13px' },
  dateCell: { padding: '16px 20px', color: '#0f172a', fontWeight: '700', fontSize: '13px' },
  feeCell: { padding: '16px 20px', fontSize: '14px' },
  paidCell: { padding: '16px 20px', color: '#10b981', fontWeight: '700', fontSize: '14px' },
  balanceCell: { padding: '16px 20px', fontWeight: '800', fontSize: '14px' },
  badge: { padding: '5px 12px', borderRadius: '20px', fontSize: '10px', fontWeight: '800', display: 'inline-block' },
  empty: { textAlign: 'center', padding: '50px', color: '#94a3b8' }
};

export default FeeStatus;