import React, { useState, useMemo } from 'react';
import { useData } from '../contexts/DataContext';
import * as XLSX from 'xlsx';
import { MONTHS_SHORT, normalizeMonth } from '../utils/monthUtils';
import {
  FileSpreadsheet,
  Download,
  ChevronDown,
  ChevronRight,
  TrendingUp,
  TrendingDown,
  DollarSign,
  Building2,
  Monitor,
  GraduationCap
} from 'lucide-react';

const BalanceSheet = () => {
  const {
    feeTransactions: fees = {},
    studentsRaw: students = {},
    coachingFeeTransactions: coachingFees = {},
    coachingStudentsRaw: coachingStudents = {},
    expensesRaw: expenses = {},
    staffSalary: salaries = {},
    isInitialLoading: loading
  } = useData();

  const [expandedYears, setExpandedYears] = useState({});
  const [balanceView, setBalanceView] = useState('combined'); // 'combined' | 'computer' | 'coaching'

  const monthsFull = MONTHS_SHORT;

  const aggregatedData = useMemo(() => {
    const result = {};

    const initYear = (y) => {
      if (!result[y]) {
        result[y] = {};
        monthsFull.forEach(m => {
          result[y][m] = {
            compCourseFees: 0,
            compAdmFees: 0,
            coachingFees: 0,
            coachingAdmFees: 0,
            expenses: 0,
            salaries: 0
          };
        });
      }
    };

    // 1. Process Computer Institute Course Fees
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
                result[yStr][mStr].compCourseFees += Number(fees[sId][cId][tKey].paid || 0);
              }
            }
          }
        }
      }
    }

    // 2. Process Computer Institute Admission Fees
    Object.values(students).forEach(student => {
      if (student.createdAt && student.admission_fee) {
        const d = new Date(student.createdAt);
        if (!isNaN(d.getTime())) {
          const mStr = monthsFull[d.getMonth()];
          const yStr = d.getFullYear().toString();
          initYear(yStr);
          if (result[yStr] && result[yStr][mStr]) {
            result[yStr][mStr].compAdmFees += Number(student.admission_fee || 0);
          }
        }
      }
    });

    // 3. Process Coaching Center Monthly Fees
    for (let sId in coachingFees) {
      for (let tKey in coachingFees[sId]) {
        const record = coachingFees[sId][tKey];
        const parts = tKey.split('_');
        if (parts.length >= 2) {
          const mStr = normalizeMonth(parts[0]);
          const yStr = parts[parts.length - 1];
          if (mStr && yStr) {
            initYear(yStr);
            if (result[yStr] && result[yStr][mStr]) {
              result[yStr][mStr].coachingFees += Number(record.paid || 0);
            }
          }
        }
      }
    }

    // 4. Process Coaching Center Admission Fees
    Object.values(coachingStudents).forEach(student => {
      if (student.createdAt && student.admission_fee) {
        const d = new Date(student.createdAt);
        if (!isNaN(d.getTime())) {
          const mStr = monthsFull[d.getMonth()];
          const yStr = d.getFullYear().toString();
          initYear(yStr);
          if (result[yStr] && result[yStr][mStr]) {
            result[yStr][mStr].coachingAdmFees += Number(student.admission_fee || 0);
          }
        }
      }
    });

    // 5. Process Shared Operational Expenses
    Object.values(expenses).forEach(exp => {
      if (exp.date) {
        const d = new Date(exp.date);
        if (!isNaN(d.getTime())) {
          const mStr = monthsFull[d.getMonth()];
          const yStr = d.getFullYear().toString();
          initYear(yStr);
          if (result[yStr] && result[yStr][mStr]) {
            result[yStr][mStr].expenses += Number(exp.amount || 0);
          }
        }
      }
    });

    // 6. Process Shared Staff Salaries
    Object.values(salaries).forEach(sal => {
      if (sal.salaryYear && sal.salaryMonth) {
        const mStr = normalizeMonth(sal.salaryMonth);
        const yStr = sal.salaryYear.toString();
        if (mStr) {
          initYear(yStr);
          if (result[yStr] && result[yStr][mStr]) {
            result[yStr][mStr].salaries += Number(sal.amount || 0);
          }
        }
      }
    });

    return result;
  }, [fees, students, coachingFees, coachingStudents, expenses, salaries, monthsFull]);

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

  // Grand totals across all years
  let grandCompCourse = 0;
  let grandCompAdm = 0;
  let grandCoachingFee = 0;
  let grandCoachingAdm = 0;
  let grandExp = 0;
  let grandSal = 0;

  sortedYears.forEach(year => {
    const yearData = aggregatedData[year];
    monthsFull.forEach(m => {
      grandCompCourse += yearData[m].compCourseFees;
      grandCompAdm += yearData[m].compAdmFees;
      grandCoachingFee += yearData[m].coachingFees;
      grandCoachingAdm += yearData[m].coachingAdmFees;
      grandExp += yearData[m].expenses;
      grandSal += yearData[m].salaries;
    });
  });

  const grandCompInflow = grandCompCourse + grandCompAdm;
  const grandCoachingInflow = grandCoachingFee + grandCoachingAdm;
  const grandTotalInflow = grandCompInflow + grandCoachingInflow;
  const grandTotalCost = grandExp + grandSal;

  const currentGrandInflow = balanceView === 'computer' ? grandCompInflow : balanceView === 'coaching' ? grandCoachingInflow : grandTotalInflow;
  const currentGrandNet = currentGrandInflow - grandTotalCost;

  const exportBalanceSheet = () => {
    const exportData = [];

    sortedYears.forEach(year => {
      const yearData = aggregatedData[year];
      let yCompCourse = 0, yCompAdm = 0, yCoachingFee = 0, yCoachingAdm = 0, yExp = 0, ySal = 0;

      monthsFull.forEach(m => {
        yCompCourse += yearData[m].compCourseFees;
        yCompAdm += yearData[m].compAdmFees;
        yCoachingFee += yearData[m].coachingFees;
        yCoachingAdm += yearData[m].coachingAdmFees;
        yExp += yearData[m].expenses;
        ySal += yearData[m].salaries;
      });

      const yCompInflow = yCompCourse + yCompAdm;
      const yCoachingInflow = yCoachingFee + yCoachingAdm;
      const yTotalInflow = yCompInflow + yCoachingInflow;
      const yTotalOutflow = yExp + ySal;

      const yActiveInflow = balanceView === 'computer' ? yCompInflow : balanceView === 'coaching' ? yCoachingInflow : yTotalInflow;
      const yActiveNet = yActiveInflow - yTotalOutflow;

      if (balanceView === 'combined') {
        exportData.push({
          "Month / Year": `Fiscal Year ${year} TOTAL`,
          "Computer Inflow": yCompInflow,
          "Coaching Inflow": yCoachingInflow,
          "Total Combined Inflow": yTotalInflow,
          "Staff Salaries": ySal,
          "Operating Expenses": yExp,
          "Total Outflows": yTotalOutflow,
          "Net Balance": yActiveNet
        });

        monthsFull.forEach(m => {
          const compInf = yearData[m].compCourseFees + yearData[m].compAdmFees;
          const coachInf = yearData[m].coachingFees + yearData[m].coachingAdmFees;
          const totInf = compInf + coachInf;
          const out = yearData[m].salaries + yearData[m].expenses;
          exportData.push({
            "Month / Year": `${m} ${year}`,
            "Computer Inflow": compInf,
            "Coaching Inflow": coachInf,
            "Total Combined Inflow": totInf,
            "Staff Salaries": yearData[m].salaries,
            "Operating Expenses": yearData[m].expenses,
            "Total Outflows": out,
            "Net Balance": totInf - out
          });
        });
      } else if (balanceView === 'computer') {
        exportData.push({
          "Month / Year": `Fiscal Year ${year} TOTAL`,
          "Course Fees": yCompCourse,
          "Admission Fees": yCompAdm,
          "Computer Inflow": yCompInflow,
          "Staff Salaries": ySal,
          "Operating Expenses": yExp,
          "Total Outflows": yTotalOutflow,
          "Net Balance": yActiveNet
        });

        monthsFull.forEach(m => {
          const inf = yearData[m].compCourseFees + yearData[m].compAdmFees;
          const out = yearData[m].salaries + yearData[m].expenses;
          exportData.push({
            "Month / Year": `${m} ${year}`,
            "Course Fees": yearData[m].compCourseFees,
            "Admission Fees": yearData[m].compAdmFees,
            "Computer Inflow": inf,
            "Staff Salaries": yearData[m].salaries,
            "Operating Expenses": yearData[m].expenses,
            "Total Outflows": out,
            "Net Balance": inf - out
          });
        });
      } else {
        exportData.push({
          "Month / Year": `Fiscal Year ${year} TOTAL`,
          "Coaching Fees": yCoachingFee,
          "Admission Fees": yCoachingAdm,
          "Coaching Inflow": yCoachingInflow,
          "Staff Salaries": ySal,
          "Operating Expenses": yExp,
          "Total Outflows": yTotalOutflow,
          "Net Balance": yActiveNet
        });

        monthsFull.forEach(m => {
          const inf = yearData[m].coachingFees + yearData[m].coachingAdmFees;
          const out = yearData[m].salaries + yearData[m].expenses;
          exportData.push({
            "Month / Year": `${m} ${year}`,
            "Coaching Fees": yearData[m].coachingFees,
            "Admission Fees": yearData[m].coachingAdmFees,
            "Coaching Inflow": inf,
            "Staff Salaries": yearData[m].salaries,
            "Operating Expenses": yearData[m].expenses,
            "Total Outflows": out,
            "Net Balance": inf - out
          });
        });
      }

      exportData.push({});
    });

    const filename = `Balance_Sheet_${balanceView}_${new Date().toISOString().slice(0, 10)}.xlsx`;
    const ws = XLSX.utils.json_to_sheet(exportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Balance Sheet");
    XLSX.writeFile(wb, filename);
  };

  return (
    <div className="bg-white border border-slate-200/80 rounded-2xl shadow-sm overflow-hidden">
      {/* HEADER SECTION WITH FILTER */}
      <div className="p-5 border-b border-slate-100 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
            <FileSpreadsheet size={20} />
          </div>
          <div>
            <h3 className="font-bold text-slate-800 text-base">Annual Balance Sheet</h3>
            <p className="text-xs text-slate-400">Multi-year audit of receipts, shared expenses & net margin</p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {/* BALANCE SHEET VIEW FILTER PILLS */}
          <div className="flex items-center bg-slate-100 p-1 rounded-xl border border-slate-200/90 shadow-2xs">
            <button
              onClick={() => setBalanceView('combined')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                balanceView === 'combined'
                  ? 'bg-white text-blue-700 shadow-xs'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              <Building2 size={13} />
              <span>Combined Total</span>
            </button>
            <button
              onClick={() => setBalanceView('computer')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                balanceView === 'computer'
                  ? 'bg-white text-blue-700 shadow-xs'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              <Monitor size={13} />
              <span>Computer Institute</span>
            </button>
            <button
              onClick={() => setBalanceView('coaching')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                balanceView === 'coaching'
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              <GraduationCap size={13} />
              <span>Coaching Center</span>
            </button>
          </div>

          <button
            onClick={exportBalanceSheet}
            className="flex items-center gap-2 px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold transition-colors cursor-pointer"
          >
            <Download size={14} className="text-blue-600" />
            <span>Export Balance Sheet</span>
          </button>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead className="bg-slate-50/80 text-slate-500 text-xs font-semibold uppercase tracking-wider border-b border-slate-200">
            {balanceView === 'combined' ? (
              <tr>
                <th className="px-5 py-3.5">Month / Year</th>
                <th className="px-4 py-3.5 text-right text-blue-600">Computer Inflow</th>
                <th className="px-4 py-3.5 text-right text-emerald-600">Coaching Inflow</th>
                <th className="px-4 py-3.5 text-right text-indigo-700 font-extrabold">Total Inflows</th>
                <th className="px-4 py-3.5 text-right">Salaries</th>
                <th className="px-4 py-3.5 text-right">Expenses</th>
                <th className="px-4 py-3.5 text-right text-rose-600 font-bold">Total Outflows</th>
                <th className="px-5 py-3.5 text-right bg-slate-100/70 border-l border-slate-200 text-slate-800 font-bold">Net Balance</th>
              </tr>
            ) : balanceView === 'computer' ? (
              <tr>
                <th className="px-5 py-3.5">Month / Year</th>
                <th className="px-4 py-3.5 text-right">Course Fees</th>
                <th className="px-4 py-3.5 text-right">Admission Fees</th>
                <th className="px-4 py-3.5 text-right text-blue-700 font-bold">Computer Inflow</th>
                <th className="px-4 py-3.5 text-right">Salaries</th>
                <th className="px-4 py-3.5 text-right">Expenses</th>
                <th className="px-4 py-3.5 text-right text-rose-600 font-bold">Total Outflows</th>
                <th className="px-5 py-3.5 text-right bg-slate-100/70 border-l border-slate-200 text-slate-800 font-bold">Net Balance</th>
              </tr>
            ) : (
              <tr>
                <th className="px-5 py-3.5">Month / Year</th>
                <th className="px-4 py-3.5 text-right">Coaching Fees</th>
                <th className="px-4 py-3.5 text-right">Admission Fees</th>
                <th className="px-4 py-3.5 text-right text-emerald-700 font-bold">Coaching Inflow</th>
                <th className="px-4 py-3.5 text-right">Salaries</th>
                <th className="px-4 py-3.5 text-right">Expenses</th>
                <th className="px-4 py-3.5 text-right text-rose-600 font-bold">Total Outflows</th>
                <th className="px-5 py-3.5 text-right bg-slate-100/70 border-l border-slate-200 text-slate-800 font-bold">Net Balance</th>
              </tr>
            )}
          </thead>
          <tbody className="divide-y divide-slate-100">
            {sortedYears.map(year => {
              const yearData = aggregatedData[year];
              let yCompCourse = 0, yCompAdm = 0, yCoachingFee = 0, yCoachingAdm = 0, yExp = 0, ySal = 0;

              monthsFull.forEach(m => {
                yCompCourse += yearData[m].compCourseFees;
                yCompAdm += yearData[m].compAdmFees;
                yCoachingFee += yearData[m].coachingFees;
                yCoachingAdm += yearData[m].coachingAdmFees;
                yExp += yearData[m].expenses;
                ySal += yearData[m].salaries;
              });

              const yCompInflow = yCompCourse + yCompAdm;
              const yCoachingInflow = yCoachingFee + yCoachingAdm;
              const yTotalInflow = yCompInflow + yCoachingInflow;
              const yTotalOutflow = yExp + ySal;

              const activeYearInflow = balanceView === 'computer' ? yCompInflow : balanceView === 'coaching' ? yCoachingInflow : yTotalInflow;
              const activeYearNet = activeYearInflow - yTotalOutflow;
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

                    {balanceView === 'combined' ? (
                      <>
                        <td className="px-4 py-3.5 text-right font-mono text-blue-700">
                          PKR {yCompInflow.toLocaleString()}
                        </td>
                        <td className="px-4 py-3.5 text-right font-mono text-emerald-700">
                          PKR {yCoachingInflow.toLocaleString()}
                        </td>
                        <td className="px-4 py-3.5 text-right font-mono text-indigo-700 font-extrabold">
                          PKR {yTotalInflow.toLocaleString()}
                        </td>
                      </>
                    ) : balanceView === 'computer' ? (
                      <>
                        <td className="px-4 py-3.5 text-right font-mono text-slate-700">
                          PKR {yCompCourse.toLocaleString()}
                        </td>
                        <td className="px-4 py-3.5 text-right font-mono text-slate-700">
                          PKR {yCompAdm.toLocaleString()}
                        </td>
                        <td className="px-4 py-3.5 text-right font-mono text-blue-700 font-extrabold">
                          PKR {yCompInflow.toLocaleString()}
                        </td>
                      </>
                    ) : (
                      <>
                        <td className="px-4 py-3.5 text-right font-mono text-slate-700">
                          PKR {yCoachingFee.toLocaleString()}
                        </td>
                        <td className="px-4 py-3.5 text-right font-mono text-slate-700">
                          PKR {yCoachingAdm.toLocaleString()}
                        </td>
                        <td className="px-4 py-3.5 text-right font-mono text-emerald-700 font-extrabold">
                          PKR {yCoachingInflow.toLocaleString()}
                        </td>
                      </>
                    )}

                    <td className="px-4 py-3.5 text-right font-mono text-slate-700">
                      PKR {ySal.toLocaleString()}
                    </td>
                    <td className="px-4 py-3.5 text-right font-mono text-slate-700">
                      PKR {yExp.toLocaleString()}
                    </td>
                    <td className="px-4 py-3.5 text-right font-mono text-rose-700">
                      PKR {yTotalOutflow.toLocaleString()}
                    </td>
                    <td className={`px-5 py-3.5 text-right font-mono border-l border-slate-200 ${
                      activeYearNet >= 0 ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-700'
                    }`}>
                      PKR {activeYearNet.toLocaleString()}
                    </td>
                  </tr>

                  {/* MONTH DETAIL ROWS */}
                  {isExpanded && monthsFull.map(m => {
                    const rowData = yearData[m];
                    const compInf = rowData.compCourseFees + rowData.compAdmFees;
                    const coachInf = rowData.coachingFees + rowData.coachingAdmFees;
                    const totInf = compInf + coachInf;
                    const out = rowData.salaries + rowData.expenses;
                    const activeInf = balanceView === 'computer' ? compInf : balanceView === 'coaching' ? coachInf : totInf;
                    const net = activeInf - out;

                    return (
                      <tr key={m} className="hover:bg-slate-50/50 transition-colors text-xs text-slate-600">
                        <td className="px-5 py-2.5 pl-11 font-medium text-slate-700">{m}</td>

                        {balanceView === 'combined' ? (
                          <>
                            <td className="px-4 py-2.5 text-right font-mono text-blue-600">{compInf.toLocaleString()}</td>
                            <td className="px-4 py-2.5 text-right font-mono text-emerald-600">{coachInf.toLocaleString()}</td>
                            <td className="px-4 py-2.5 text-right font-mono font-bold text-indigo-600">{totInf.toLocaleString()}</td>
                          </>
                        ) : balanceView === 'computer' ? (
                          <>
                            <td className="px-4 py-2.5 text-right font-mono">{rowData.compCourseFees.toLocaleString()}</td>
                            <td className="px-4 py-2.5 text-right font-mono">{rowData.compAdmFees.toLocaleString()}</td>
                            <td className="px-4 py-2.5 text-right font-mono font-bold text-blue-600">{compInf.toLocaleString()}</td>
                          </>
                        ) : (
                          <>
                            <td className="px-4 py-2.5 text-right font-mono">{rowData.coachingFees.toLocaleString()}</td>
                            <td className="px-4 py-2.5 text-right font-mono">{rowData.coachingAdmFees.toLocaleString()}</td>
                            <td className="px-4 py-2.5 text-right font-mono font-bold text-emerald-600">{coachInf.toLocaleString()}</td>
                          </>
                        )}

                        <td className="px-4 py-2.5 text-right font-mono">{rowData.salaries.toLocaleString()}</td>
                        <td className="px-4 py-2.5 text-right font-mono">{rowData.expenses.toLocaleString()}</td>
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

              {balanceView === 'combined' ? (
                <>
                  <td className="px-4 py-4 text-right font-mono text-xs text-blue-300">
                    PKR {grandCompInflow.toLocaleString()}
                  </td>
                  <td className="px-4 py-4 text-right font-mono text-xs text-emerald-300">
                    PKR {grandCoachingInflow.toLocaleString()}
                  </td>
                  <td className="px-4 py-4 text-right font-mono text-sm text-indigo-300 font-extrabold">
                    PKR {grandTotalInflow.toLocaleString()}
                  </td>
                </>
              ) : balanceView === 'computer' ? (
                <>
                  <td className="px-4 py-4 text-right font-mono text-xs text-slate-300">
                    PKR {grandCompCourse.toLocaleString()}
                  </td>
                  <td className="px-4 py-4 text-right font-mono text-xs text-slate-300">
                    PKR {grandCompAdm.toLocaleString()}
                  </td>
                  <td className="px-4 py-4 text-right font-mono text-sm text-blue-400 font-extrabold">
                    PKR {grandCompInflow.toLocaleString()}
                  </td>
                </>
              ) : (
                <>
                  <td className="px-4 py-4 text-right font-mono text-xs text-slate-300">
                    PKR {grandCoachingFee.toLocaleString()}
                  </td>
                  <td className="px-4 py-4 text-right font-mono text-xs text-slate-300">
                    PKR {grandCoachingAdm.toLocaleString()}
                  </td>
                  <td className="px-4 py-4 text-right font-mono text-sm text-emerald-400 font-extrabold">
                    PKR {grandCoachingInflow.toLocaleString()}
                  </td>
                </>
              )}

              <td className="px-4 py-4 text-right font-mono text-xs text-slate-300">
                PKR {grandSal.toLocaleString()}
              </td>
              <td className="px-4 py-4 text-right font-mono text-xs text-slate-300">
                PKR {grandExp.toLocaleString()}
              </td>
              <td className="px-4 py-4 text-right font-mono text-sm text-rose-400">
                PKR {grandTotalCost.toLocaleString()}
              </td>
              <td className={`px-5 py-4 text-right font-mono text-base border-l border-slate-800 ${
                currentGrandNet >= 0 ? 'text-emerald-400 bg-slate-950' : 'text-rose-400 bg-slate-950'
              }`}>
                PKR {currentGrandNet.toLocaleString()}
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default BalanceSheet;
