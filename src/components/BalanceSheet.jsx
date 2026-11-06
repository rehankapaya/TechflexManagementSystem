import React, { useState, useEffect, useMemo } from 'react';
import { db } from '../firebase';
import { ref, onValue } from 'firebase/database';
import * as XLSX from 'xlsx';
import { MONTHS_SHORT, normalizeMonth } from '../utils/monthUtils';
import {
  FileSpreadsheet,
  Download,
  ChevronDown,
  ChevronRight,
  TrendingUp,
  TrendingDown,
  DollarSign
} from 'lucide-react';

const BalanceSheet = () => {
  const [fees, setFees] = useState({});
  const [students, setStudents] = useState({});
  const [expenses, setExpenses] = useState({});
  const [salaries, setSalaries] = useState({});
  const [loading, setLoading] = useState(true);
  const [expandedYears, setExpandedYears] = useState({});

  const monthsFull = MONTHS_SHORT;

  useEffect(() => {
    const unsubFees = onValue(ref(db, 'fee_transactions'), snap => setFees(snap.val() || {}));
    const unsubStudents = onValue(ref(db, 'students'), snap => setStudents(snap.val() || {}));
    const unsubExpenses = onValue(ref(db, 'expenses'), snap => setExpenses(snap.val() || {}));
    const unsubSalaries = onValue(ref(db, 'staff_salary'), snap => setSalaries(snap.val() || {}));
    
    const timer = setTimeout(() => setLoading(false), 600);

    return () => {
      clearTimeout(timer);
      unsubFees(); unsubStudents(); unsubExpenses(); unsubSalaries();
    };
  }, []);

  const aggregatedData = useMemo(() => {
    const result = {};

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
          if (parts.length >= 2) {
            const mStr = normalizeMonth(parts[0]);
            const yStr = parts[parts.length - 1];
            if (mStr && yStr) {
              initYear(yStr);
              if (result[yStr][mStr]) {
                result[yStr][mStr].courseFees += Number(fees[sId][cId][tKey].paid || 0);
              }
            }
          }
        }
      }
    }

    // 2. Process Admission Fees
    Object.values(students).forEach(student => {
      if (student.createdAt && student.admission_fee) {
        const d = new Date(student.createdAt);
        if (!isNaN(d.getTime())) {
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
        if (!isNaN(d.getTime())) {
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
        const mStr = normalizeMonth(sal.salaryMonth);
        const yStr = sal.salaryYear.toString();
        if (mStr) {
          initYear(yStr);
          if (result[yStr][mStr]) {
            result[yStr][mStr].salaries += Number(sal.amount || 0);
          }
        }
      }
    });

    return result;
  }, [fees, students, expenses, salaries, monthsFull]);

  if (loading) {
    return (
      <div className="bg-white border border-slate-200/80 rounded-2xl p-8 text-center text-slate-400 text-sm">
        Loading Annual Balance Sheet Data...
      </div>
    );
  }

  const sortedYears = Object.keys(aggregatedData).sort((a, b) => b - a);

  if (sortedYears.length === 0) {
    return (
      <div className="bg-white border border-slate-200/80 rounded-2xl p-8 text-center text-slate-400 text-sm">
        No balance sheet data available yet.
      </div>
    );
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
      
      exportData.push({});
    });

    if (exportData.length === 0) return;

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
    <div className="bg-white border border-slate-200/80 rounded-2xl shadow-sm overflow-hidden">
      <div className="p-5 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
            <FileSpreadsheet size={20} />
          </div>
          <div>
            <h3 className="font-bold text-slate-800 text-base">Annual Balance Sheet</h3>
            <p className="text-xs text-slate-400">Multi-year audit of fee collections, expenses & net margin</p>
          </div>
        </div>

        <button
          onClick={exportBalanceSheet}
          className="flex items-center gap-2 px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold transition-colors cursor-pointer self-start sm:self-auto"
        >
          <Download size={14} className="text-blue-600" />
          <span>Export Balance Sheet</span>
        </button>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead className="bg-slate-50/80 text-slate-500 text-xs font-semibold uppercase tracking-wider border-b border-slate-200">
            <tr>
              <th className="px-5 py-3.5">Month / Year</th>
              <th className="px-4 py-3.5 text-right">Course Fees</th>
              <th className="px-4 py-3.5 text-right">Admission Fees</th>
              <th className="px-4 py-3.5 text-right text-emerald-600 font-bold">Total Inflows</th>
              <th className="px-4 py-3.5 text-right">Salaries</th>
              <th className="px-4 py-3.5 text-right">Expenses</th>
              <th className="px-4 py-3.5 text-right text-rose-600 font-bold">Total Outflows</th>
              <th className="px-5 py-3.5 text-right bg-slate-100/70 border-l border-slate-200 text-slate-800 font-bold">Net Balance</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {sortedYears.map(year => {
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
              const isExpanded = expandedYears[year] !== false;

              return (
                <React.Fragment key={year}>
                  {/* YEAR ACCORDION HEADER ROW */}
                  <tr
                    onClick={() => toggleYear(year)}
                    className="bg-slate-50/90 hover:bg-slate-100/90 transition-colors cursor-pointer border-t-2 border-slate-200 font-bold text-slate-800"
                    title="Click to toggle monthly rows"
                  >
                    <td className="px-5 py-3.5 flex items-center gap-2">
                      <span className="text-slate-400">
                        {isExpanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                      </span>
                      <span>Fiscal Year {year}</span>
                    </td>
                    <td className="px-4 py-3.5 text-right font-mono text-slate-700">
                      PKR {yearTotalCourse.toLocaleString()}
                    </td>
                    <td className="px-4 py-3.5 text-right font-mono text-slate-700">
                      PKR {yearTotalAdm.toLocaleString()}
                    </td>
                    <td className="px-4 py-3.5 text-right font-mono text-emerald-700">
                      PKR {yearTotalIncome.toLocaleString()}
                    </td>
                    <td className="px-4 py-3.5 text-right font-mono text-slate-700">
                      PKR {yearTotalSal.toLocaleString()}
                    </td>
                    <td className="px-4 py-3.5 text-right font-mono text-slate-700">
                      PKR {yearTotalExp.toLocaleString()}
                    </td>
                    <td className="px-4 py-3.5 text-right font-mono text-rose-700">
                      PKR {yearTotalCost.toLocaleString()}
                    </td>
                    <td className={`px-5 py-3.5 text-right font-mono border-l border-slate-200 ${
                      yearNet >= 0 ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-700'
                    }`}>
                      PKR {yearNet.toLocaleString()}
                    </td>
                  </tr>

                  {/* MONTH DETAIL ROWS */}
                  {isExpanded && monthsFull.map(m => {
                    const inc = yearData[m].courseFees + yearData[m].admFees;
                    const out = yearData[m].salaries + yearData[m].expenses;
                    const net = inc - out;

                    return (
                      <tr key={m} className="hover:bg-slate-50/50 transition-colors text-xs text-slate-600">
                        <td className="px-5 py-2.5 pl-11 font-medium text-slate-700">{m}</td>
                        <td className="px-4 py-2.5 text-right font-mono">{yearData[m].courseFees.toLocaleString()}</td>
                        <td className="px-4 py-2.5 text-right font-mono">{yearData[m].admFees.toLocaleString()}</td>
                        <td className="px-4 py-2.5 text-right font-mono font-semibold text-emerald-600">{inc.toLocaleString()}</td>
                        <td className="px-4 py-2.5 text-right font-mono">{yearData[m].salaries.toLocaleString()}</td>
                        <td className="px-4 py-2.5 text-right font-mono">{yearData[m].expenses.toLocaleString()}</td>
                        <td className="px-4 py-2.5 text-right font-mono font-semibold text-rose-600">{out.toLocaleString()}</td>
                        <td className={`px-5 py-2.5 text-right font-mono font-bold border-l border-slate-200 ${
                          net >= 0 ? 'text-emerald-600' : 'text-rose-600'
                        }`}>
                          {net.toLocaleString()}
                        </td>
                      </tr>
                    );
                  })}
                </React.Fragment>
              );
            })}

            {/* ALL-TIME GRAND TOTAL ROW */}
            <tr className="bg-slate-900 text-white font-bold border-t-2 border-slate-900">
              <td className="px-5 py-4 text-sm tracking-wide">ALL-TIME GRAND TOTAL</td>
              <td className="px-4 py-4 text-right font-mono text-xs text-slate-300">
                PKR {grandTotalCourse.toLocaleString()}
              </td>
              <td className="px-4 py-4 text-right font-mono text-xs text-slate-300">
                PKR {grandTotalAdm.toLocaleString()}
              </td>
              <td className="px-4 py-4 text-right font-mono text-sm text-emerald-400">
                PKR {grandTotalIncome.toLocaleString()}
              </td>
              <td className="px-4 py-4 text-right font-mono text-xs text-slate-300">
                PKR {grandTotalSal.toLocaleString()}
              </td>
              <td className="px-4 py-4 text-right font-mono text-xs text-slate-300">
                PKR {grandTotalExp.toLocaleString()}
              </td>
              <td className="px-4 py-4 text-right font-mono text-sm text-rose-400">
                PKR {grandTotalCost.toLocaleString()}
              </td>
              <td className={`px-5 py-4 text-right font-mono text-base border-l border-slate-800 ${
                grandNet >= 0 ? 'text-emerald-400 bg-slate-950' : 'text-rose-400 bg-slate-950'
              }`}>
                PKR {grandNet.toLocaleString()}
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default BalanceSheet;
