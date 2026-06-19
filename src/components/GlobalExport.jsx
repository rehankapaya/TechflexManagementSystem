import React, { useState } from 'react';
import { db } from '../firebase';
import { ref, get } from 'firebase/database';
import { generateTechflexRecord } from '../utils/exportExcel';

const GlobalExport = () => {
  const [loading, setLoading] = useState(false);
  const [filter, setFilter] = useState({ year: new Date().getFullYear().toString() });

  const currentYear = new Date().getFullYear();
  const years = Array.from({length: 6}, (_, i) => (currentYear - 2 + i).toString());

  const handleExport = async () => {
    setLoading(true);
    try {
      const [studentsSnap, coursesSnap, feesSnap, expensesSnap] = await Promise.all([
        get(ref(db, 'students')),
        get(ref(db, 'courses')),
        get(ref(db, 'fee_transactions')),
        get(ref(db, 'expenses'))
      ]);

      const students = studentsSnap.val() || {};
      const courses = coursesSnap.val() || {};
      const fees = feesSnap.val() || {};
      const expenses = expensesSnap.val() || {};

      await generateTechflexRecord(students, courses, fees, expenses, filter.year);

    } catch (error) {
      console.error(error);
      alert("Export failed: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ padding: '40px', maxWidth: '600px', margin: '0 auto', background: '#fff', borderRadius: '20px', boxShadow: '0 4px 12px rgba(0,0,0,0.05)', border: '1px solid #E2E8F0' }}>
      <h3 style={{ margin: '0 0 10px 0', fontSize: '20px', color: '#1E293B' }}>Export Advanced Record 📊</h3>
      <p style={{ color: '#64748B', fontSize: '14px', marginBottom: '20px', lineHeight: '1.5' }}>
        Generates a master multi-sheet Excel workbook exactly mirroring the TECHFLEX RECORD template. It calculates live data for Dashboard summaries, Admissions, Individual Courses, Fees, and your recorded Expenses with SUM formulas.
      </p>
      
      <div style={{ display: 'flex', flexDirection: 'column', gap: '15px', marginTop: '20px' }}>
        <div>
          <label style={{ display: 'block', marginBottom: '6px', fontSize: '12px', fontWeight: 'bold', color: '#64748B' }}>Filter By Year</label>
          <select value={filter.year} onChange={(e) => setFilter({...filter, year: e.target.value})} style={selectStyle}>
            <option value="all">All Years</option>
            {years.map(y => <option key={y} value={y}>{y}</option>)}
          </select>
        </div>
        
        <button onClick={handleExport} disabled={loading} style={btnStyle}>
          {loading ? "Generating Excel Workbook..." : "Download Excel Workbook"}
        </button>
      </div>
    </div>
  );
};

const selectStyle = { padding: '12px', borderRadius: '10px', border: '1px solid #E2E8F0', width: '100%', fontSize: '14px', outline: 'none' };
const btnStyle = { padding: '14px', background: '#3B82F6', color: '#fff', border: 'none', borderRadius: '10px', cursor: 'pointer', fontWeight: 'bold', transition: 'background 0.2s', marginTop: '10px' };

export default GlobalExport;