import React, { useState, useEffect, useMemo } from 'react';
import { db } from '../firebase';
import { ref, onValue } from 'firebase/database';
import * as XLSX from 'xlsx';

const BalanceSheet = () => {
  const [fees, setFees] = useState({});
  const [students, setStudents] = useState({});
  const [expenses, setExpenses] = useState({});
  const [salaries, setSalaries] = useState({});
  const [loading, setLoading] = useState(true);
  const [expandedYears, setExpandedYears] = useState({});

  const monthsFull = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

  useEffect(() => {
    const unsubFees = onValue(ref(db, 'fee_transactions'), snap => setFees(snap.val() || {}));
    const unsubStudents = onValue(ref(db, 'students'), snap => setStudents(snap.val() || {}));
    const unsubExpenses = onValue(ref(db, 'expenses'), snap => setExpenses(snap.val() || {}));
    const unsubSalaries = onValue(ref(db, 'staff_salary'), snap => setSalaries(snap.val() || {}));
    
    // Simulate loading
    setTimeout(() => setLoading(false), 800);

    return () => {
      unsubFees(); unsubStudents(); unsubExpenses(); unsubSalaries();
    };
  }, []);

  const aggregatedData = useMemo(() => {
    const result = {}; // { '2024': { 'Jan': { courseFees: 0, admFees: 0, expenses: 0, salaries: 0 }, ... } }

    const initYear = (y) => {
      if (!result[y]) {
        result[y] = {};
        monthsFull.forEach(m => {
          result[y][m] = { courseFees: 0, admFees: 0, expenses: 0, salaries: 0 };
        });
      }
    };

    // 1. Process Course Fees
    for (let sId in fees) {
      for (let cId in fees[sId]) {
        for (let tKey in fees[sId][cId]) {
          const parts = tKey.split('_');
          if (parts.length === 2) {
            const mStr = parts[0];
            const yStr = parts[1];
            initYear(yStr);
            if (result[yStr][mStr]) {
              result[yStr][mStr].courseFees += Number(fees[sId][cId][tKey].paid || 0);
            }
          }
        }
      }
    }

    // 2. Process Admission Fees
    Object.values(students).forEach(student => {
      if (student.createdAt && student.admission_fee) {
        const d = new Date(student.createdAt);
        if (!isNaN(d)) {
          const mStr = monthsFull[d.getMonth()];
          const yStr = d.getFullYear().toString();
          initYear(yStr);
          result[yStr][mStr].admFees += Number(student.admission_fee || 0);
        }
      }
    });

    // 3. Process Expenses
    Object.values(expenses).forEach(exp => {
      if (exp.date) {
        const d = new Date(exp.date);
        if (!isNaN(d)) {
          const mStr = monthsFull[d.getMonth()];
          const yStr = d.getFullYear().toString();
          initYear(yStr);
          result[yStr][mStr].expenses += Number(exp.amount || 0);
        }
      }
    });

    // 4. Process Salaries
    Object.values(salaries).forEach(sal => {
      if (sal.salaryYear && sal.salaryMonth) {
        const mStr = monthsFull[Number(sal.salaryMonth) - 1];
        const yStr = sal.salaryYear.toString();
        if (mStr) {
          initYear(yStr);
          result[yStr][mStr].salaries += Number(sal.amount || 0);
        }
      }
    });

    return result;
  }, [fees, students, expenses, salaries, monthsFull]);

  if (loading) {
    return <div style={{ textAlign: 'center', padding: '40px', color: '#64748B' }}>Loading Balance Sheet Data...</div>;
  }

  const sortedYears = Object.keys(aggregatedData).sort((a, b) => b - a); // Newest year first

  if (sortedYears.length === 0) {
    return <div style={{ padding: '20px', background: '#fff', borderRadius: '15px' }}>No financial data available yet.</div>;
  }

  const toggleYear = (year) => {
    setExpandedYears(prev => ({ ...prev, [year]: prev[year] === false ? true : false }));
  };

  let grandTotalCourse = 0;
  let grandTotalAdm = 0;
  let grandTotalExp = 0;
  let grandTotalSal = 0;

  sortedYears.forEach(year => {
    const yearData = aggregatedData[year];
    monthsFull.forEach(m => {
      grandTotalCourse += yearData[m].courseFees;
      grandTotalAdm += yearData[m].admFees;
      grandTotalExp += yearData[m].expenses;
      grandTotalSal += yearData[m].salaries;
    });
  });

  const grandTotalIncome = grandTotalCourse + grandTotalAdm;
  const grandTotalCost = grandTotalExp + grandTotalSal;
  const grandNet = grandTotalIncome - grandTotalCost;

  const exportBalanceSheet = () => {
    const exportData = [];

    sortedYears.forEach(year => {
      const yearData = aggregatedData[year];
      let yearTotalCourse = 0, yearTotalAdm = 0, yearTotalExp = 0, yearTotalSal = 0;

      monthsFull.forEach(m => {
        yearTotalCourse += yearData[m].courseFees;
        yearTotalAdm += yearData[m].admFees;
        yearTotalExp += yearData[m].expenses;
        yearTotalSal += yearData[m].salaries;
      });

      const yearTotalIncome = yearTotalCourse + yearTotalAdm;
      const yearTotalCost = yearTotalExp + yearTotalSal;
      const yearNet = yearTotalIncome - yearTotalCost;

      // Add Year Total Row
      exportData.push({
        "Month / Year": `Fiscal Year ${year} TOTAL`,
        "Course Fees": yearTotalCourse,
        "Admission Fees": yearTotalAdm,
        "Total Inflows": yearTotalIncome,
        "Staff Salaries": yearTotalSal,
        "Other Expenses": yearTotalExp,
        "Total Outflows": yearTotalCost,
        "Net Balance": yearNet
      });

      // Add Monthly Rows
      monthsFull.forEach(m => {
        const inc = yearData[m].courseFees + yearData[m].admFees;
        const out = yearData[m].salaries + yearData[m].expenses;
        exportData.push({
          "Month / Year": `${m} ${year}`,
          "Course Fees": yearData[m].courseFees,
          "Admission Fees": yearData[m].admFees,
          "Total Inflows": inc,
          "Staff Salaries": yearData[m].salaries,
          "Other Expenses": yearData[m].expenses,
          "Total Outflows": out,
          "Net Balance": inc - out
        });
      });
      
      // Empty row for spacing
      exportData.push({});
    });

    if (exportData.length === 0) return;

    // Add All-Time Grand Total Row
    exportData.push({
      "Month / Year": `ALL-TIME GRAND TOTAL`,
      "Course Fees": grandTotalCourse,
      "Admission Fees": grandTotalAdm,
      "Total Inflows": grandTotalIncome,
      "Staff Salaries": grandTotalSal,
      "Other Expenses": grandTotalExp,
      "Total Outflows": grandTotalCost,
      "Net Balance": grandNet
    });

    const ws = XLSX.utils.json_to_sheet(exportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Balance Sheet");
    XLSX.writeFile(wb, "Annual_Balance_Sheet.xlsx");
  };

  return (
    <div style={{ marginTop: '40px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', borderBottom: '2px solid #E2E8F0', paddingBottom: '10px' }}>
        <h2 style={{ color: '#1E293B', margin: 0 }}>
          Annual Balance Sheet 📑
        </h2>
        <button 
          onClick={exportBalanceSheet}
          style={{ background: '#4A90E2', color: 'white', border: 'none', padding: '8px 16px', borderRadius: '5px', cursor: 'pointer', fontWeight: 'bold' }}
        >
          Export Balance Sheet
        </button>
      </div>

      <div style={{ background: '#fff', borderRadius: '15px', boxShadow: '0 4px 12px rgba(0,0,0,0.05)', border: '1px solid #E2E8F0', marginBottom: '30px', overflow: 'hidden' }}>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '14px' }}>
            <thead>
              <tr style={{ background: '#F1F5F9', borderBottom: '2px solid #CBD5E1' }}>
                <th style={{ ...thStyle, textAlign: 'left' }}>Month / Year</th>
                <th style={thStyle}>Course Fees</th>
                <th style={thStyle}>Admission Fees</th>
                <th style={{ ...thStyle, color: '#10B981' }}>Total Inflows</th>
                <th style={thStyle}>Staff Salaries</th>
                <th style={thStyle}>Other Expenses</th>
                <th style={{ ...thStyle, color: '#EF4444' }}>Total Outflows</th>
                <th style={{ ...thStyle, borderLeft: '2px solid #E2E8F0', background: '#E2E8F0', color: '#1E293B' }}>Net Balance</th>
              </tr>
            </thead>
            <tbody>
              {sortedYears.map(year => {
        const yearData = aggregatedData[year];
        let yearTotalCourse = 0, yearTotalAdm = 0, yearTotalExp = 0, yearTotalSal = 0;

        // Calculate Year Totals
        monthsFull.forEach(m => {
          yearTotalCourse += yearData[m].courseFees;
          yearTotalAdm += yearData[m].admFees;
          yearTotalExp += yearData[m].expenses;
          yearTotalSal += yearData[m].salaries;
        });

        const yearTotalIncome = yearTotalCourse + yearTotalAdm;
        const yearTotalCost = yearTotalExp + yearTotalSal;
        const yearNet = yearTotalIncome - yearTotalCost;

        const isExpanded = expandedYears[year] !== false;

        return (
          <React.Fragment key={year}>
            {/* YEAR TOTAL ROW (ACCORDION HEADER) */}
            <tr 
              onClick={() => toggleYear(year)}
              style={{ background: '#F8FAFC', cursor: 'pointer', borderTop: '2px solid #CBD5E1', borderBottom: isExpanded ? '1px solid #E2E8F0' : '2px solid #CBD5E1', transition: 'background 0.2s' }}
              title="Click to expand/collapse months"
              onMouseEnter={(e) => e.currentTarget.style.background = '#F1F5F9'}
              onMouseLeave={(e) => e.currentTarget.style.background = '#F8FAFC'}
            >
              <td style={{ ...tdLabelStyle, color: '#0F172A', fontWeight: 'bold' }}>
                <span style={{ display: 'inline-block', width: '20px', fontSize: '10px' }}>{isExpanded ? '▼' : '▶'}</span>
                Fiscal Year {year}
              </td>
              <td style={{ ...tdStyle, fontWeight: 'bold' }}>{yearTotalCourse.toLocaleString()}</td>
              <td style={{ ...tdStyle, fontWeight: 'bold' }}>{yearTotalAdm.toLocaleString()}</td>
              <td style={{ ...tdStyle, color: '#10B981', fontWeight: 'bold' }}>{yearTotalIncome.toLocaleString()}</td>
              <td style={{ ...tdStyle, fontWeight: 'bold' }}>{yearTotalSal.toLocaleString()}</td>
              <td style={{ ...tdStyle, fontWeight: 'bold' }}>{yearTotalExp.toLocaleString()}</td>
              <td style={{ ...tdStyle, color: '#EF4444', fontWeight: 'bold' }}>{yearTotalCost.toLocaleString()}</td>
              <td style={{ ...tdTotalStyle, background: '#DBEAFE', color: yearNet >= 0 ? '#059669' : '#DC2626' }}>{yearNet.toLocaleString()}</td>
            </tr>

            {/* MONTH ROWS */}
            {isExpanded && monthsFull.map(m => {
                    const inc = yearData[m].courseFees + yearData[m].admFees;
                    const out = yearData[m].salaries + yearData[m].expenses;
                    const net = inc - out;
                    return (
                      <tr key={m} style={{ borderBottom: '1px solid #F1F5F9' }}>
                        <td style={tdLabelStyle}>{m}</td>
                        <td style={tdStyle}>{yearData[m].courseFees.toLocaleString()}</td>
                        <td style={tdStyle}>{yearData[m].admFees.toLocaleString()}</td>
                        <td style={{ ...tdStyle, color: '#10B981', fontWeight: '500' }}>{inc.toLocaleString()}</td>
                        <td style={tdStyle}>{yearData[m].salaries.toLocaleString()}</td>
                        <td style={tdStyle}>{yearData[m].expenses.toLocaleString()}</td>
                        <td style={{ ...tdStyle, color: '#EF4444', fontWeight: '500' }}>{out.toLocaleString()}</td>
                        <td style={{ ...tdTotalStyle, color: net >= 0 ? '#059669' : '#DC2626', background: 'transparent' }}>{net.toLocaleString()}</td>
                      </tr>
                    );
                  })}
          </React.Fragment>
        );
      })}
              {/* GRAND TOTAL ROW */}
              <tr style={{ background: '#1E293B', color: 'white', borderTop: '4px solid #0F172A' }}>
                <td style={{ ...tdLabelStyle, color: 'white', fontWeight: 'bold', fontSize: '15px' }}>ALL-TIME GRAND TOTAL</td>
                <td style={{ ...tdStyle, color: 'white', fontWeight: 'bold' }}>{grandTotalCourse.toLocaleString()}</td>
                <td style={{ ...tdStyle, color: 'white', fontWeight: 'bold' }}>{grandTotalAdm.toLocaleString()}</td>
                <td style={{ ...tdStyle, color: '#34D399', fontWeight: 'bold' }}>{grandTotalIncome.toLocaleString()}</td>
                <td style={{ ...tdStyle, color: 'white', fontWeight: 'bold' }}>{grandTotalSal.toLocaleString()}</td>
                <td style={{ ...tdStyle, color: 'white', fontWeight: 'bold' }}>{grandTotalExp.toLocaleString()}</td>
                <td style={{ ...tdStyle, color: '#F87171', fontWeight: 'bold' }}>{grandTotalCost.toLocaleString()}</td>
                <td style={{ ...tdTotalStyle, background: '#0F172A', color: grandNet >= 0 ? '#10B981' : '#EF4444', fontSize: '16px' }}>{grandNet.toLocaleString()}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

const thStyle = { padding: '12px', textAlign: 'right', color: '#475569', fontWeight: 'bold', fontSize: '13px' };
const tdStyle = { padding: '12px', textAlign: 'right', color: '#64748B', whiteSpace: 'nowrap' };
const tdLabelStyle = { padding: '12px 20px', textAlign: 'left', color: '#475569', fontWeight: '500' };
const tdTotalStyle = { padding: '12px', textAlign: 'right', borderLeft: '2px solid #E2E8F0', background: '#F8FAFC', fontWeight: 'bold', color: '#1E293B', whiteSpace: 'nowrap' };
const sectionHeaderStyle = { background: '#F1F5F9', padding: '8px 20px', fontWeight: 'bold', color: '#64748B', fontSize: '12px', letterSpacing: '1px' };

export default BalanceSheet;
