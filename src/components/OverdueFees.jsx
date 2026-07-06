import React, { useState, useEffect } from 'react';
import { db } from '../firebase.js';
import { ref, onValue } from 'firebase/database';
import { Phone, MessageCircle } from 'lucide-react';

const OverdueFees = () => {
  const [students, setStudents] = useState([]);
  const [feesData, setFeesData] = useState({});
  const [coursesList, setCoursesList] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    onValue(ref(db, 'students'), (snap) => {
      const data = snap.val();
      setStudents(data ? Object.keys(data).map(id => ({ id, ...data[id] })) : []);
    });
    onValue(ref(db, 'fee_transactions'), (snap) => setFeesData(snap.val() || {}));
    onValue(ref(db, 'courses'), (snap) => {
      const data = snap.val();
      setCoursesList(data ? Object.keys(data).map(id => ({ id, ...data[id] })) : []);
    });
  }, []);

  const handleReset = () => {
    setSearchTerm('');
  };

  const getSingleMonthStatus = (studentId, courseId, monthKey, agreedFee) => {
    const record = feesData[studentId]?.[courseId]?.[monthKey];
    if (!record) return { label: 'Unpaid', color: '#EF4444', bg: '#FEF2F2', paid: 0, waived: 0, balance: agreedFee };

    const paid = Number(record.paid || 0);
    const waived = Number(record.waived || 0);
    const totalSettled = paid + waived;
    const balance = agreedFee - totalSettled;

    if (balance <= 0) return { label: 'Paid', color: '#10B981', bg: '#DCFCE7', paid, waived, balance: 0 };
    if (totalSettled > 0) return { label: 'Partial', color: '#F59E0B', bg: '#FFFBEB', paid, waived, balance };
    return { label: 'Unpaid', color: '#EF4444', bg: '#FEF2F2', paid: 0, waived: 0, balance: agreedFee };
  };

  let rawList = [];
  const today = new Date();

  students.forEach(student => {
    if (student.status === 'inactive') return; // Only track active students
    
    const courses = student.enrolled_courses || {};
    Object.keys(courses).forEach(courseId => {
      const courseInfo = courses[courseId];
      const matchesSearch = student.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        student.student_id?.toLowerCase().includes(searchTerm.toLowerCase());

      if (matchesSearch) {
        if (!courseInfo.enrolledAt) return;
        if (courseInfo.course_status !== 'active') return;

        const enrollDate = new Date(courseInfo.enrolledAt);
        const endDate = courseInfo.course_status_date ? new Date(courseInfo.course_status_date) : today;
        
        const startBoundary = new Date(enrollDate.getFullYear(), enrollDate.getMonth(), 1);
        const endBoundary = new Date(endDate.getFullYear(), endDate.getMonth(), 1);

        // Limit the end boundary to the current month to avoid future overdue items 
        // that haven't occurred yet.
        const currentMonthBoundary = new Date(today.getFullYear(), today.getMonth(), 1);
        const actualEndBoundary = endBoundary > currentMonthBoundary ? currentMonthBoundary : endBoundary;

        let current = new Date(startBoundary);
        
        while (current <= actualEndBoundary) {
          const mLabel = current.toLocaleString('default', { month: 'short' });
          const yLabel = current.getFullYear();
          const monthKey = `${mLabel}_${yLabel}`;

          const status = getSingleMonthStatus(student.id, courseId, monthKey, courseInfo.agreed_monthly_fee);

          // Only consider unpaid or partial payments
          if (status.balance > 0) {
            // Calculate due date
            // Due date is 10 days after the enrollment date day of the month for that specific billing month
            const enrollmentDay = enrollDate.getDate();
            const dueDateDay = enrollmentDay + 10;
            
            // Note: If enrollmentDay is 25, dueDateDay is 35. Date constructor handles overflow automatically
            const dueDate = new Date(current.getFullYear(), current.getMonth(), dueDateDay);
            
            // Remove time component for accurate comparison
            dueDate.setHours(0,0,0,0);
            const todayDate = new Date();
            todayDate.setHours(0,0,0,0);

            if (todayDate > dueDate) {
               // Calculate how many days overdue
               const timeDiff = todayDate.getTime() - dueDate.getTime();
               const daysOverdue = Math.ceil(timeDiff / (1000 * 3600 * 24));

               rawList.push({
                 studentId: student.student_id,
                 name: student.name,
                 phone: student.contact || '',
                 studentStatus: student.status,
                 courseName: courseInfo.course_name,
                 monthStr: `${mLabel} ${yLabel}`,
                 agreedFee: courseInfo.agreed_monthly_fee,
                 dueDateStr: dueDate.toLocaleDateString('en-GB'),
                 daysOverdue: daysOverdue,
                 sortValue: dueDate.getTime(), // Sort by oldest due date
                 balance: status.balance,
                 paid: status.paid,
                 waived: status.waived,
                 label: status.label
               });
            }
          }

          current.setMonth(current.getMonth() + 1);
        }
      }
    });
  });

  const grouped = {};
  rawList.forEach(item => {
    const key = `${item.studentId}_${item.courseName}`;
    if (!grouped[key]) {
      grouped[key] = {
        ...item,
        monthsList: [item.monthStr],
        totalBalance: item.balance,
      };
    } else {
      grouped[key].monthsList.push(item.monthStr);
      grouped[key].totalBalance += item.balance;
      // keep the oldest due date
      if (item.sortValue < grouped[key].sortValue) {
        grouped[key].sortValue = item.sortValue;
        grouped[key].dueDateStr = item.dueDateStr;
        grouped[key].daysOverdue = item.daysOverdue;
      }
    }
  });

  const finalDisplayList = Object.values(grouped);

  // Sort by oldest due date first (most urgent)
  finalDisplayList.sort((a, b) => a.sortValue - b.sortValue);

  const exportToExcel = () => {
    const headers = ["ID", "Student Name", "Phone", "Course", "Billing Months", "Oldest Due Date", "Days Overdue", "Total Balance"];
    const rows = finalDisplayList.map(item => [
      item.studentId,
      `"${item.name}"`,
      `"${item.phone}"`,
      `"${item.courseName}"`,
      `"${item.monthsList.join(', ')}"`,
      item.dueDateStr,
      item.daysOverdue,
      item.totalBalance
    ]);
    const csvContent = [headers, ...rows].map(e => e.join(",")).join("\n");
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `Overdue_Fees_Report_${new Date().toLocaleDateString()}.csv`;
    link.click();
  };

  const handleWhatsApp = (phone, name, monthsStr, balance, dueDateStr) => {
    if (!phone) return alert("No phone number found for this student.");
    const cleanPhone = phone.replace(/[^0-9]/g, '');
    const message = `Hello ${name}, this is a gentle reminder that your fee of PKR ${balance} for the month(s) of ${monthsStr} was due on ${dueDateStr}. Kindly clear it at your earliest convenience. Thank you.`;
    window.open(`https://wa.me/${cleanPhone}?text=${encodeURIComponent(message)}`, '_blank');
  };

  const totalOverdueAmount = finalDisplayList.reduce((sum, item) => sum + item.totalBalance, 0);

  return (
    <div style={styles.container}>
      <header style={styles.header}>
        <div style={styles.titleArea}>
          <h2 style={styles.title}>Overdue Fees Alert 🚨</h2>
          <p style={styles.subtitle}>Students whose payment deadline (Enrollment Date + 10 days) has passed</p>
        </div>
        <div style={styles.headerActions}>
          <button onClick={handleReset} style={styles.btnReset}>🔄 Reset Search</button>
          <button onClick={exportToExcel} style={styles.btnExport}>📥 Export CSV</button>
        </div>
      </header>

      <div style={styles.summaryCards}>
        <div style={{ ...styles.summaryCard, background: '#FEF2F2', border: '1px solid #FECACA' }}>
          <h3 style={{ margin: 0, color: '#DC2626', fontSize: '14px' }}>Total Overdue Students</h3>
          <p style={{ margin: '5px 0 0 0', fontSize: '24px', fontWeight: 'bold', color: '#991B1B' }}>
            {new Set(finalDisplayList.map(i => i.studentId)).size}
          </p>
        </div>
        <div style={{ ...styles.summaryCard, background: '#FFFBEB', border: '1px solid #FDE68A' }}>
          <h3 style={{ margin: 0, color: '#D97706', fontSize: '14px' }}>Total Overdue Invoices</h3>
          <p style={{ margin: '5px 0 0 0', fontSize: '24px', fontWeight: 'bold', color: '#B45309' }}>
            {finalDisplayList.length}
          </p>
        </div>
        <div style={{ ...styles.summaryCard, background: '#F0FDF4', border: '1px solid #BBF7D0' }}>
          <h3 style={{ margin: 0, color: '#16A34A', fontSize: '14px' }}>Total Overdue Amount</h3>
          <p style={{ margin: '5px 0 0 0', fontSize: '24px', fontWeight: 'bold', color: '#14532D' }}>
            PKR {totalOverdueAmount.toLocaleString()}
          </p>
        </div>
      </div>

      <div style={styles.filterSection}>
        <div style={styles.searchWrapper}>
          <label style={styles.miniLabel}>Search Student</label>
          <input type="text" placeholder="Name or ID..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} style={styles.searchInput} />
        </div>
      </div>

      <div style={styles.card}>
        <div style={styles.tableWrapper}>
          <table style={styles.table}>
            <thead>
              <tr style={styles.thRow}>
                <th style={styles.th}>ID</th>
                <th style={styles.th}>Student Name</th>
                <th style={styles.th}>Course</th>
                <th style={styles.th}>Billing Month</th>
                <th style={styles.th}>Due Date</th>
                <th style={styles.th}>Overdue By</th>
                <th style={styles.th}>Balance</th>
                <th style={styles.th}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {finalDisplayList.length > 0 ? finalDisplayList.map((item, idx) => (
                <tr key={`${item.studentId}_${idx}`} style={styles.tr}>
                  <td style={styles.idCell}>{item.studentId}</td>
                  <td style={styles.nameCell}>
                    <div>{item.name}</div>
                    <div style={{ fontSize: '11px', color: '#64748b', marginTop: '2px' }}>{item.phone || 'No Phone'}</div>
                  </td>
                  <td style={styles.courseCell}>{item.courseName}</td>
                  <td style={styles.dateCell}>
                    <div style={styles.monthsWrapper}>
                      {item.monthsList.map((m, i) => (
                        <span key={i} style={styles.monthBadge}>{m}</span>
                      ))}
                    </div>
                  </td>
                  <td style={styles.dateCell}>{item.dueDateStr}</td>
                  <td style={styles.dangerCell}>{item.daysOverdue} Days</td>
                  <td style={{ ...styles.balanceCell, color: '#EF4444' }}>
                    PKR {item.totalBalance.toLocaleString()}
                  </td>
                  <td style={styles.actionCell}>
                    <button 
                      onClick={() => handleWhatsApp(item.phone, item.name, item.monthsList.join(', '), item.totalBalance, item.dueDateStr)}
                      style={styles.actionBtnWA}
                      title="Send WhatsApp Reminder"
                    >
                      <MessageCircle size={16} /> WA Reminder
                    </button>
                    {item.phone && (
                      <a href={`tel:${item.phone}`} style={styles.actionBtnCall} title="Call Student">
                        <Phone size={16} /> Call
                      </a>
                    )}
                  </td>
                </tr>
              )) : (
                <tr><td colSpan="8" style={styles.empty}>No overdue records found. 🎉</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

const styles = {
  container: { fontFamily: 'Inter, sans-serif', width: '100%' },
  header: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' },
  headerActions: { display: 'flex', gap: '10px' },
  title: { fontSize: '24px', fontWeight: '800', color: '#0f172a' },
  subtitle: { color: '#64748b', fontSize: '13px' },
  summaryCards: { display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '20px', marginBottom: '20px' },
  summaryCard: { padding: '20px', borderRadius: '12px' },
  btnExport: { backgroundColor: '#10b981', color: '#fff', border: 'none', padding: '10px 18px', borderRadius: '10px', fontWeight: '700', cursor: 'pointer' },
  btnReset: { backgroundColor: '#f1f5f9', color: '#475569', border: '1px solid #e2e8f0', padding: '10px 18px', borderRadius: '10px', fontWeight: '600', cursor: 'pointer' },
  filterSection: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', backgroundColor: '#fff', padding: '16px', borderRadius: '14px', border: '1px solid #e2e8f0', marginBottom: '20px', flexWrap: 'wrap', gap: '20px' },
  miniLabel: { display: 'block', fontSize: '11px', fontWeight: '800', color: '#94a3b8', textTransform: 'uppercase', marginBottom: '6px' },
  searchInput: { padding: '10px 14px', borderRadius: '8px', border: '1px solid #cbd5e1', width: '250px', outline: 'none', fontSize: '14px' },
  card: { background: '#fff', borderRadius: '16px', border: '1px solid #e2e8f0', overflow: 'hidden', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)' },
  tableWrapper: { overflowX: 'auto' },
  table: { width: '100%', borderCollapse: 'collapse', textAlign: 'left' },
  thRow: { background: '#f8fafc', borderBottom: '1px solid #e2e8f0' },
  th: { padding: '14px 20px', color: '#64748b', fontSize: '11px', fontWeight: '800', textTransform: 'uppercase' },
  tr: { borderBottom: '1px solid #f1f5f9' },
  idCell: { padding: '16px 20px', color: '#3b82f6', fontWeight: '700', fontSize: '13px' },
  nameCell: { padding: '12px 20px', fontWeight: '600', color: '#1e293b', fontSize: '14px' },
  courseCell: { padding: '16px 20px', color: '#475569', fontSize: '13px' },
  dateCell: { padding: '16px 20px', color: '#0f172a', fontWeight: '600', fontSize: '13px' },
  dangerCell: { padding: '16px 20px', color: '#DC2626', fontWeight: '800', fontSize: '13px' },
  balanceCell: { padding: '16px 20px', fontWeight: '800', fontSize: '14px' },
  actionCell: { padding: '12px 20px', display: 'flex', gap: '8px' },
  actionBtnWA: { display: 'flex', alignItems: 'center', gap: '5px', backgroundColor: '#22c55e', color: '#fff', border: 'none', padding: '6px 12px', borderRadius: '6px', fontSize: '12px', fontWeight: '600', cursor: 'pointer' },
  actionBtnCall: { display: 'flex', alignItems: 'center', gap: '5px', backgroundColor: '#3b82f6', color: '#fff', border: 'none', padding: '6px 12px', borderRadius: '6px', fontSize: '12px', fontWeight: '600', cursor: 'pointer', textDecoration: 'none' },
  monthsWrapper: { display: 'flex', flexWrap: 'wrap', gap: '4px', maxWidth: '180px' },
  monthBadge: { backgroundColor: '#f1f5f9', color: '#475569', fontSize: '11px', padding: '4px 8px', borderRadius: '4px', border: '1px solid #e2e8f0', whiteSpace: 'nowrap' },
  empty: { textAlign: 'center', padding: '50px', color: '#94a3b8' }
};

export default OverdueFees;
