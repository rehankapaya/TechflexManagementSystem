import React, { useState, useEffect } from 'react';
import { db } from '../firebase'; // Ensure your firebase config path is correct
import { ref, onValue, get } from 'firebase/database';
import * as XLSX from 'xlsx';

const MonthlyAnalytics = () => {
  // --- States ---
  const [month, setMonth] = useState(new Intl.DateTimeFormat('en-US', { month: 'short' }).format(new Date()));
  const [year, setYear] = useState(new Date().getFullYear().toString());
  const [feeData, setFeeData] = useState([]);
  const [courseNames, setCourseNames] = useState({});
  const [rawFeeData, setRawFeeData] = useState(null);
  const [stats, setStats] = useState({ totalPaid: 0, totalPending: 0 });
  const [yearlyComparison, setYearlyComparison] = useState([]);

  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  const currentYear = new Date().getFullYear();
  const years = Array.from({ length: 7 }, (_, i) => (currentYear - 3 + i).toString());

  // --- Fetch Course Names Mapping ---
  useEffect(() => {
    const coursesRef = ref(db, 'courses');
    get(coursesRef).then((snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.val();
        const mapping = {};
        for (let id in data) mapping[id] = data[id].name;
        setCourseNames(mapping);
      }
    });
  }, []);

  // --- Main Data Fetching Logic ---
  useEffect(() => {
    const selectedKey = `${month}_${year}`;
    const feeRef = ref(db, 'fee_transactions');

    const unsubscribe = onValue(feeRef, (snapshot) => {
      const data = snapshot.val();
      setRawFeeData(data);
      const report = {};
      const monthlyTotals = months.map(m => ({ month: m, total: 0 }));
      let paidSum = 0, pendingSum = 0;

      if (data) {
        for (let studentId in data) {
          for (let courseId in data[studentId]) {
            const coursesInFees = data[studentId][courseId];

            // Calculate Yearly Trend (for Chart)
            months.forEach((m, index) => {
              const key = `${m}_${year}`;
              if (coursesInFees[key]) {
                monthlyTotals[index].total += Number(coursesInFees[key].paid || 0);
              }
            });

            // Calculate Monthly Breakdown (for Table)
            const record = coursesInFees[selectedKey];
            if (record) {
              paidSum += Number(record.paid || 0);
              pendingSum += Number(record.balance || 0);

              if (!report[courseId]) {
                report[courseId] = { 
                  courseName: courseNames[courseId] || courseId, 
                  paid: 0, 
                  pending: 0 
                };
              }
              report[courseId].paid += Number(record.paid);
              report[courseId].pending += Number(record.balance);
            }
          }
        }
      }
      setFeeData(Object.values(report));
      setStats({ totalPaid: paidSum, totalPending: pendingSum });
      setYearlyComparison(monthlyTotals);
    });

    return () => unsubscribe();
  }, [month, year, courseNames]);

  // --- Export Functions ---
  const exportMonthly = () => {
    if (feeData.length === 0) return alert("No data to export");
    const worksheet = XLSX.utils.json_to_sheet(feeData.map(f => ({
        "Course Name": f.courseName,
        "Paid (RS)": f.paid,
        "Pending (RS)": f.pending
    })));
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Monthly");
    XLSX.writeFile(workbook, `Report_${month}_${year}.xlsx`);
  };

  const exportYearly = () => {
    if (!rawFeeData) return alert("No data found");
    const yearlyReport = Object.keys(courseNames).map(courseId => {
      const row = { "Course Name": courseNames[courseId] };
      months.forEach(m => {
        let total = 0;
        for (let sId in rawFeeData) {
          if (rawFeeData[sId][courseId]?.[`${m}_${year}`]) {
            total += Number(rawFeeData[sId][courseId][`${m}_${year}`].paid || 0);
          }
        }
        row[m] = total;
      });
      return row;
    }).filter(row => Object.values(row).some(val => typeof val === 'number' && val > 0));

    const ws = XLSX.utils.json_to_sheet(yearlyReport);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Yearly");
    XLSX.writeFile(wb, `Yearly_Report_${year}.xlsx`);
  };

  const maxVal = Math.max(...yearlyComparison.map(m => m.total), 1);

  return (
    <div style={styles.page}>
      <header style={styles.header}>
        <h2>Financial Analytics</h2>
        <div style={{ display: 'flex', gap: '10px' }}>
          <button onClick={exportMonthly} style={styles.btnMonthly}>Export {month}</button>
          <button onClick={exportYearly} style={styles.btnYearly}>Export Year {year}</button>
        </div>
      </header>

      <div style={styles.filterRow}>
        <select value={month} onChange={(e) => setMonth(e.target.value)} style={styles.select}>
          {months.map(m => <option key={m} value={m}>{m}</option>)}
        </select>
        <select value={year} onChange={(e) => setYear(e.target.value)} style={styles.select}>
          {years.map(y => <option key={y} value={y}>{y}</option>)}
        </select>
      </div>

      {/* Chart Section */}
      <div style={styles.card}>
        <h4 style={{ marginBottom: '20px' }}>{year} Revenue Trend</h4>
        <div style={styles.chartContainer}>
          {yearlyComparison.map((item, idx) => (
            <div key={idx} style={styles.barWrapper}>
              <div 
                style={{ 
                  ...styles.bar, 
                  height: `${(item.total / maxVal) * 100}%`,
                  backgroundColor: item.month === month ? '#4A90E2' : '#E2E8F0'
                }} 
                title={`Rs. ${item.total}`}
              />
              <span style={styles.barLabel}>{item.month}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Stats Cards */}
      <div style={styles.statsRow}>
        <div style={{ ...styles.statCard, borderLeft: '5px solid #48BB78' }}>
          <small>Total Collected ({month})</small>
          <h3>RS. {stats.totalPaid.toLocaleString()}</h3>
        </div>
        <div style={{ ...styles.statCard, borderLeft: '5px solid #F56565' }}>
          <small>Total Pending ({month})</small>
          <h3>RS. {stats.totalPending.toLocaleString()}</h3>
        </div>
      </div>

      {/* Table Section */}
      <div style={styles.card}>
        <table style={styles.table}>
          <thead>
            <tr style={{ textAlign: 'left', backgroundColor: '#F7FAFC' }}>
              <th style={styles.th}>Course Name</th>
              <th style={styles.th}>Paid (RS)</th>
              <th style={styles.th}>Pending (RS)</th>
            </tr>
          </thead>
          <tbody>
            {feeData.map((f, i) => (
              <tr key={i} style={{ borderTop: '1px solid #EDF2F7' }}>
                <td style={styles.td}>{f.courseName}</td>
                <td style={{ ...styles.td, color: '#2F855A', fontWeight: 'bold' }}>{f.paid.toLocaleString()}</td>
                <td style={{ ...styles.td, color: '#C53030' }}>{f.pending.toLocaleString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

// --- Styles Object ---
const styles = {
  page: { padding: '30px', backgroundColor: '#F3F4F6', minHeight: '100vh', fontFamily: 'Inter, sans-serif' },
  header: { display: 'flex', justifyContent: 'space-between', marginBottom: '20px' },
  filterRow: { display: 'flex', gap: '10px', marginBottom: '25px' },
  select: { padding: '8px 12px', borderRadius: '6px', border: '1px solid #D1D5DB' },
  card: { backgroundColor: 'white', padding: '20px', borderRadius: '12px', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)' },
  chartContainer: { display: 'flex', alignItems: 'flex-end', height: '150px', gap: '10px', paddingBottom: '10px' },
  barWrapper: { flex: 1, display: 'flex', flexDirection: 'column', height: '100%', justifyContent: 'flex-end' },
  bar: { width: '100%', borderRadius: '4px 4px 0 0', transition: 'height 0.4s ease' },
  barLabel: { fontSize: '11px', marginTop: '8px', textAlign: 'center', color: '#6B7280' },
  statsRow: { display: 'flex', gap: '20px', marginBottom: '25px' },
  statCard: { flex: 1, backgroundColor: 'white', padding: '20px', borderRadius: '10px', boxShadow: '0 2px 4px rgba(0,0,0,0.05)' },
  table: { width: '100%', borderCollapse: 'collapse' },
  th: { padding: '12px', color: '#4A5568' },
  td: { padding: '12px' },
  btnMonthly: { backgroundColor: '#48BB78', color: 'white', border: 'none', padding: '10px 15px', borderRadius: '6px', cursor: 'pointer' },
  btnYearly: { backgroundColor: '#4A90E2', color: 'white', border: 'none', padding: '10px 15px', borderRadius: '6px', cursor: 'pointer' }
};

export default MonthlyAnalytics;