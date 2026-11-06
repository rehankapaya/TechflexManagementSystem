import React, { useState } from 'react';
import { db } from '../firebase';
import { ref, get } from 'firebase/database';
import { generateTechflexRecord } from '../utils/exportExcel';
import toast from 'react-hot-toast';
import { FileSpreadsheet, Download, Calendar, CheckCircle2, Sparkles } from 'lucide-react';

const GlobalExport = () => {
  const [loading, setLoading] = useState(false);
  const [filter, setFilter] = useState({ year: new Date().getFullYear().toString() });

  const currentYear = new Date().getFullYear();
  const years = Array.from({ length: Math.max(5, currentYear - 2024 + 5) }, (_, i) => (2024 + i).toString());

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
      toast.success("Excel workbook generated successfully!");
    } catch (error) {
      console.error(error);
      toast.error("Export failed: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-xl mx-auto space-y-6 font-sans animate-fade-in pt-6">
      <div className="bg-white p-8 rounded-2xl border border-slate-200/80 shadow-xs space-y-6">
        <div className="flex items-center gap-3 pb-4 border-b border-slate-100">
          <div className="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0 border border-emerald-100">
            <FileSpreadsheet size={24} />
          </div>
          <div>
            <h2 className="text-lg font-bold text-slate-900 tracking-tight">Export Master Institute Record</h2>
            <p className="text-xs text-slate-500 mt-0.5">Automated multi-sheet Excel compilation with formula calculations</p>
          </div>
        </div>

        <p className="text-xs text-slate-600 leading-relaxed">
          Generates a comprehensive multi-sheet Excel workbook mirroring the master institute reporting template. Compiles live metrics for Dashboard executive summaries, Admissions, Individual Courses, Multi-Month Fee Ledgers, and Itemized Expenses with dynamic SUM formulas.
        </p>

        <div className="space-y-4 pt-2">
          <div>
            <label className="block text-xs font-bold text-slate-600 mb-1.5 uppercase tracking-wider">
              Filter by Academic Year
            </label>
            <div className="relative">
              <Calendar className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
              <select
                value={filter.year}
                onChange={(e) => setFilter({ ...filter, year: e.target.value })}
                className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 bg-slate-50 text-xs font-mono font-medium focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
              >
                <option value="all">All Available Years</option>
                {years.map(y => <option key={y} value={y}>{y}</option>)}
              </select>
            </div>
          </div>

          <button
            onClick={handleExport}
            disabled={loading}
            className="w-full py-3.5 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition-all shadow-xs flex items-center justify-center gap-2 disabled:opacity-60"
          >
            {loading ? (
              <span>Generating Excel Workbook...</span>
            ) : (
              <>
                <Download size={16} />
                <span>Download Master Workbook (.xlsx)</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default GlobalExport;
