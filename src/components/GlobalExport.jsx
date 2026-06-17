import React, { useState } from 'react';
import { db } from '../firebase';
import { ref, get } from 'firebase/database';
import * as XLSX from 'xlsx';

const GlobalExport = () => {
  const [loading, setLoading] = useState(false);
  const [filter, setFilter] = useState({ status: 'all', year: new Date().getFullYear().toString() });

  const currentYear = new Date().getFullYear();
  const years = Array.from({length: 6}, (_, i) => (currentYear - 2 + i).toString()); // e.g., 2024 to 2029

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

            const feesByYear = {};
            Object.keys(feeHistory).forEach(monthKey => {
              const [month, year] = monthKey.split('_');
              if (!feesByYear[year]) feesByYear[year] = {};
              feesByYear[year][month] = feeHistory[monthKey];
            });

            if (Object.keys(feesByYear).length === 0) {
              const yr = filter.year === 'all' ? currentYear.toString() : filter.year;
              exportData.push(createRow(student, courseName, courseInfo, yr, {}));
            } else {
              Object.keys(feesByYear).forEach(year => {
                if (filter.year === 'all' || filter.year === year) {
                  exportData.push(createRow(student, courseName, courseInfo, year, feesByYear[year]));
                }
              });
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

  const createRow = (student, courseName, courseInfo, year, yearFees) => {
    let totalPaid = 0;
    let totalBalance = 0;
    let totalWaived = 0;
    let lastPaymentDate = 0;

    const monthData = {};
    const monthsFull = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    const monthLabels = {
      "Jan": "Jan", "Feb": "Feb", "Mar": "Mar", "Apr": "Apr", "May": "May", "Jun": "June", 
      "Jul": "July", "Aug": "Aug", "Sep": "Sep", "Oct": "Oct", "Nov": "Nov", "Dec": "Dec"
    };
    
    monthsFull.forEach(m => {
      const record = yearFees[m];
      if (record) {
        monthData[m] = record.paid || 0;
        totalPaid += Number(record.paid || 0);
        totalBalance += Number(record.balance || 0);
        totalWaived += Number(record.waived || 0);
        if (record.timestamp && record.timestamp > lastPaymentDate) {
          lastPaymentDate = record.timestamp;
        }
      } else {
        monthData[m] = 0; // or leave empty string if preferred
      }
    });

    const formatDate = (dateStr) => {
      if (!dateStr) return "N/A";
      try {
        return new Date(dateStr).toISOString().split('T')[0];
      } catch (e) {
        return "N/A";
      }
    };

    const row = {
      "Student ID": student.student_id || "N/A",
      "Student Name": student.name,
      "Phone": student.contact || student.phone || "N/A",
      "Status": student.status?.toUpperCase() || "N/A",
      "Course": courseName,
      "Year": year,
      "Agreed Monthly Fee": courseInfo.agreed_monthly_fee || courseInfo.agreed_fee || 0,
    };

    monthsFull.forEach(m => {
      row[monthLabels[m]] = monthData[m];
    });

    row["Start Date"] = formatDate(courseInfo.enrolledAt);
    row["Status Date"] = formatDate(courseInfo.course_status_date);
    row["Amount Paid"] = totalPaid;
    row["Balance Remaining"] = totalBalance;
    row["Waived Amount"] = totalWaived;
    row["Payment Date"] = lastPaymentDate ? new Date(lastPaymentDate).toISOString().split('T')[0] : "N/A";

    return row;
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
        <select value={filter.year} onChange={(e) => setFilter({...filter, year: e.target.value})} style={selectStyle}>
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