import React, { useState } from 'react';
import { db } from '../firebase';
import { ref, get } from 'firebase/database';
import * as XLSX from 'xlsx';

const GlobalExport = () => {
  const [loading, setLoading] = useState(false);
  const [filter, setFilter] = useState({ status: 'all', year: 'all', month: 'all' });

  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  const years = ["2024", "2025", "2026"];

  const handleExport = async () => {
    setLoading(true);
    try {
      const [studentsSnap, coursesSnap, feesSnap] = await Promise.all([
        get(ref(db, 'students')),
        get(ref(db, 'courses')),
        get(ref(db, 'fee_transactions'))
      ]);

      const students = studentsSnap.val() || {};
      const courses = coursesSnap.val() || {};
      const fees = feesSnap.val() || {};
      const exportData = [];

      Object.keys(students).forEach(studentId => {
        const student = students[studentId];
        if (filter.status !== 'all' && student.status !== filter.status) return;

        if (student.enrolled_courses) {
          Object.keys(student.enrolled_courses).forEach(courseId => {
            const courseInfo = student.enrolled_courses[courseId];
            const courseName = courses[courseId]?.name || "Unknown Course";
            const feeHistory = fees[studentId]?.[courseId] || {};

            if (filter.month === 'all' && filter.year === 'all') {
              Object.keys(feeHistory).forEach(monthKey => {
                exportData.push(createRow(student, courseName, courseInfo, monthKey, feeHistory[monthKey]));
              });
              if (Object.keys(feeHistory).length === 0) {
                exportData.push(createRow(student, courseName, courseInfo, "N/A_N/A", {}));
              }
            } else {
              const specificKey = `${filter.month}_${filter.year}`;
              exportData.push(createRow(student, courseName, courseInfo, specificKey, feeHistory[specificKey] || {}));
            }
          });
        }
      });

      const worksheet = XLSX.utils.json_to_sheet(exportData);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, "System Report");
      XLSX.writeFile(workbook, `Fee_Report_${Date.now()}.xlsx`);

    } catch (error) {
      alert("Export failed");
    } finally {
      setLoading(false);
    }
  };

  const createRow = (student, courseName, courseInfo, dateKey, record) => {
    const parts = dateKey.split('_');
    return {
      "Student Name": student.name,
      "Phone": student.phone || "N/A",
      "Status": student.status.toUpperCase(),
      "Course": courseName,
      "Agreed Monthly Fee": courseInfo.agreed_fee || 0,
      "Month": parts[0] || "N/A",
      "Year": parts[1] || "N/A",
      "Amount Paid": record.paid || 0,
      "Balance Remaining": record.balance || 0,
      "Waived Amount": record.waived || 0,
      "Payment Date": record.date || "N/A"
    };
  };

  return (
    <div style={{ padding: '40px', maxWidth: '600px', margin: '0 auto', background: '#fff', borderRadius: '15px', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}>
      <h3>Export Fees Record</h3>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '15px', marginTop: '20px' }}>
        <select onChange={(e) => setFilter({...filter, status: e.target.value})} style={selectStyle}>
          <option value="all">All Status</option>
          <option value="active">Active Only</option>
          <option value="pending">Pending Only</option>
        </select>
        <select onChange={(e) => setFilter({...filter, month: e.target.value})} style={selectStyle}>
          <option value="all">All Months</option>
          {months.map(m => <option key={m} value={m}>{m}</option>)}
        </select>
        <select onChange={(e) => setFilter({...filter, year: e.target.value})} style={selectStyle}>
          <option value="all">All Years</option>
          {years.map(y => <option key={y} value={y}>{y}</option>)}
        </select>
        <button onClick={handleExport} disabled={loading} style={btnStyle}>
          {loading ? "Exporting..." : "Download Excel"}
        </button>
      </div>
    </div>
  );
};

const selectStyle = { padding: '10px', borderRadius: '8px', border: '1px solid #ddd' };
const btnStyle = { padding: '12px', background: '#4318ff', color: '#fff', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold' };

export default GlobalExport;