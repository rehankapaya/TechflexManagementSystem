import React, { useState, useEffect } from 'react';
import { db } from '../firebase';
import { ref, onValue, get } from 'firebase/database';
import * as XLSX from 'xlsx';
import toast from 'react-hot-toast';
import BalanceSheet from './BalanceSheet';
import {
  TrendingUp,
  TrendingDown,
  Download,
  Calendar,
  DollarSign,
  Receipt,
  Users,
  PieChart,
  Clock,
  ArrowUpRight,
  Sparkles,
  BarChart2
} from 'lucide-react';
import { MONTHS_SHORT, normalizeMonth, normalizeMonthKey, getCanonicalShortMonth } from '../utils/monthUtils';

const MonthlyAnalytics = () => {
  const [month, setMonth] = useState(getCanonicalShortMonth());
  const [year, setYear] = useState(new Date().getFullYear().toString());
  const [feeData, setFeeData] = useState([]);
  const [courseNames, setCourseNames] = useState({});
  const [rawFeeData, setRawFeeData] = useState(null);
  const [stats, setStats] = useState({ totalPaid: 0, totalPending: 0 });
  const [yearlyComparison, setYearlyComparison] = useState([]);
  const [totalExpenses, setTotalExpenses] = useState(0);
  const [totalSalaries, setTotalSalaries] = useState(0);

  const [allTimeIncome, setAllTimeIncome] = useState(0);
  const [allTimeExpenses, setAllTimeExpenses] = useState(0);
  const [allTimeSalaries, setAllTimeSalaries] = useState(0);

  const [totalAdmissionFees, setTotalAdmissionFees] = useState(0);
  const [allTimeAdmissionFees, setAllTimeAdmissionFees] = useState(0);

  const months = MONTHS_SHORT;
  const currentYear = new Date().getFullYear();
  const years = Array.from({ length: Math.max(5, currentYear - 2024 + 5) }, (_, i) => (2024 + i).toString());

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
      let totalAllTimePaid = 0;

      if (data) {
        for (let studentId in data) {
          for (let courseId in data[studentId]) {
            const coursesInFees = data[studentId][courseId];
            
            for (let tKey in coursesInFees) {
              totalAllTimePaid += Number(coursesInFees[tKey].paid || 0);
            }

            // Calculate Yearly Trend (for Chart)
            months.forEach((m, index) => {
              const targetKey = `${m}_${year}`;
              for (let tKey in coursesInFees) {
                if (normalizeMonthKey(tKey) === targetKey) {
                  monthlyTotals[index].total += Number(coursesInFees[tKey].paid || 0);
                }
              }
            });

            // Calculate Monthly Breakdown (for Table)
            for (let tKey in coursesInFees) {
              if (normalizeMonthKey(tKey) === selectedKey) {
                const record = coursesInFees[tKey];
                paidSum += Number(record.paid || 0);
                pendingSum += Number(record.balance || 0);

                if (!report[courseId]) {
                  report[courseId] = { 
                    courseName: courseNames[courseId] || courseId, 
                    paid: 0, 
                    pending: 0 
                  };
                }
                report[courseId].paid += Number(record.paid || 0);
                report[courseId].pending += Number(record.balance || 0);
              }
            }
          }
        }
      }
      setFeeData(Object.values(report));
      setStats({ totalPaid: paidSum, totalPending: pendingSum });
      setYearlyComparison(monthlyTotals);
      setAllTimeIncome(totalAllTimePaid);
    });

    return () => unsubscribe();
  }, [month, year, courseNames]);

  // --- Expenses & Salaries Data Fetching Logic ---
  useEffect(() => {
    const expensesRef = ref(db, 'expenses');
    const salaryRef = ref(db, 'staff_salary');

    const unsubExpenses = onValue(expensesRef, (snapshot) => {
      const data = snapshot.val();
      let currentMonthExpenses = 0;
      let totalAllTime = 0;

      if (data) {
        Object.values(data).forEach(exp => {
          totalAllTime += Number(exp.amount || 0);
          if (exp.date) {
            const expDate = new Date(exp.date);
            if (!isNaN(expDate.getTime())) {
              const expMonth = months[expDate.getMonth()];
              const expYear = expDate.getFullYear().toString();

              if (expYear === year && expMonth === month) {
                currentMonthExpenses += Number(exp.amount || 0);
              }
            }
          }
        });
      }
      setTotalExpenses(currentMonthExpenses);
      setAllTimeExpenses(totalAllTime);
    });

    const unsubSalary = onValue(salaryRef, (snapshot) => {
      const data = snapshot.val();
      let currentMonthSalaries = 0;
      let totalAllTime = 0;

      if (data) {
        Object.values(data).forEach(salary => {
          totalAllTime += Number(salary.amount || 0);
          if (salary.salaryYear && salary.salaryMonth) {
            const salMonth = normalizeMonth(salary.salaryMonth);
            if (salary.salaryYear.toString() === year && salMonth === month) {
              currentMonthSalaries += Number(salary.amount || 0);
            }
          }
        });
      }
      setTotalSalaries(currentMonthSalaries);
      setAllTimeSalaries(totalAllTime);
    });

    return () => {
      unsubExpenses();
      unsubSalary();
    };
  }, [month, year]);

  // --- Admissions Fetching Logic ---
  useEffect(() => {
    const studentsRef = ref(db, 'students');
    const unsubStudents = onValue(studentsRef, (snapshot) => {
      const data = snapshot.val();
      let currentMonthAdm = 0;
      let totalAllTimeAdm = 0;

      if (data) {
        Object.values(data).forEach(student => {
          const admFee = Number(student.admission_fee || 0);
          totalAllTimeAdm += admFee;

          if (student.createdAt) {
            const admDate = new Date(student.createdAt);
            if (!isNaN(admDate.getTime())) {
              const admMonth = months[admDate.getMonth()];
              const admYear = admDate.getFullYear().toString();

              if (admYear === year && admMonth === month) {
                currentMonthAdm += admFee;
              }
            }
          }
        });
      }
      setTotalAdmissionFees(currentMonthAdm);
      setAllTimeAdmissionFees(totalAllTimeAdm);
    });

    return () => unsubStudents();
  }, [month, year]);

  // --- Export Functions ---
  const exportMonthly = () => {
    if (feeData.length === 0) {
      toast.error("No data to export");
      return;
    }
    const worksheet = XLSX.utils.json_to_sheet(feeData.map(f => ({
      "Course Name": f.courseName,
      "Paid (RS)": f.paid,
      "Pending (RS)": f.pending
    })));
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Monthly");
    XLSX.writeFile(workbook, `Report_${month}_${year}.xlsx`);
    toast.success(`Exported ${month} ${year}`);
  };

  const exportYearly = () => {
    if (!rawFeeData) {
      toast.error("No data found");
      return;
    }
    const yearlyReport = Object.keys(courseNames).map(courseId => {
      const row = { "Course Name": courseNames[courseId] };
      months.forEach(m => {
        let total = 0;
        const targetKey = `${m}_${year}`;
        for (let sId in rawFeeData) {
          const studentCourses = rawFeeData[sId]?.[courseId];
          if (studentCourses) {
            for (let tKey in studentCourses) {
              if (normalizeMonthKey(tKey) === targetKey) {
                total += Number(studentCourses[tKey].paid || 0);
              }
            }
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
    toast.success(`Exported Year ${year}`);
  };

  const lifetimeNet = allTimeIncome + allTimeAdmissionFees - allTimeExpenses - allTimeSalaries;
  const isProfitable = lifetimeNet >= 0;

  const monthGross = stats.totalPaid + totalAdmissionFees;
  const monthNet = monthGross - totalExpenses - totalSalaries;
  const maxVal = Math.max(...yearlyComparison.map(m => m.total), 1);

  return (
    <div className="space-y-6">
      {/* HEADER SECTION */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-2 border-b border-slate-200/80">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-600 to-blue-600 flex items-center justify-center text-white shadow-md shadow-indigo-500/20">
            <BarChart2 size={22} />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Financial Analytics</h1>
            <p className="text-sm text-slate-500">Revenue, operational outflow, salary expenses & net profit</p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {/* MONTH & YEAR PICKER */}
          <div className="flex items-center bg-white border border-slate-200 rounded-xl p-1 shadow-sm">
            <div className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-500">
              <Calendar size={14} className="text-blue-600" />
              <span>Period:</span>
            </div>
            <select
              value={month}
              onChange={(e) => setMonth(e.target.value)}
              className="px-2.5 py-1 text-xs font-bold text-slate-800 bg-slate-50 hover:bg-slate-100 rounded-lg outline-none cursor-pointer transition-colors"
            >
              {months.map(m => <option key={m} value={m}>{m}</option>)}
            </select>
            <select
              value={year}
              onChange={(e) => setYear(e.target.value)}
              className="px-2.5 py-1 text-xs font-bold text-slate-800 bg-slate-50 hover:bg-slate-100 rounded-lg outline-none cursor-pointer transition-colors"
            >
              {years.map(y => <option key={y} value={y}>{y}</option>)}
            </select>
          </div>

          <button
            onClick={exportMonthly}
            className="flex items-center gap-2 px-3.5 py-2 bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 rounded-xl text-xs font-semibold transition-all shadow-sm cursor-pointer"
          >
            <Download size={14} className="text-emerald-600" />
            <span>Export {month}</span>
          </button>

          <button
            onClick={exportYearly}
            className="flex items-center gap-2 px-3.5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-semibold transition-all shadow-sm shadow-blue-500/20 cursor-pointer"
          >
            <Download size={14} />
            <span>Export {year}</span>
          </button>
        </div>
      </div>

      {/* LIFETIME BALANCE HERO CARD */}
      <div className={`rounded-2xl p-6 text-white shadow-xl transition-all relative overflow-hidden ${
        isProfitable
          ? 'bg-gradient-to-br from-emerald-600 via-teal-700 to-slate-900 shadow-emerald-900/10'
          : 'bg-gradient-to-br from-rose-600 via-red-700 to-slate-900 shadow-rose-900/10'
      }`}>
        <div className="absolute right-0 top-0 translate-x-10 -translate-y-10 w-64 h-64 bg-white/5 rounded-full blur-2xl pointer-events-none" />
        
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 relative z-10">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 backdrop-blur-md text-xs font-semibold mb-3">
              {isProfitable ? (
                <>
                  <TrendingUp size={14} className="text-emerald-300" />
                  <span>All-Time Net Profit</span>
                </>
              ) : (
                <>
                  <TrendingDown size={14} className="text-rose-300" />
                  <span>All-Time Net Deficit</span>
                </>
              )}
            </div>
            <h2 className="text-sm font-medium text-white/80">Lifetime Cumulative Balance</h2>
            <div className="text-3xl sm:text-4xl font-extrabold tracking-tight mt-1">
              PKR {lifetimeNet.toLocaleString()}
            </div>
            <p className="text-xs text-white/70 mt-2 max-w-xl">
              Gross Receipts (Course Fees + Admissions) minus Total Operating Expenses and Staff Salaries across all recorded academic cycles.
            </p>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 bg-black/20 backdrop-blur-sm p-4 rounded-xl border border-white/10 text-xs">
            <div>
              <p className="text-white/60">Gross Inflow</p>
              <p className="font-bold text-white text-sm mt-0.5">PKR {(allTimeIncome + allTimeAdmissionFees).toLocaleString()}</p>
            </div>
            <div>
              <p className="text-white/60">Total Expenses</p>
              <p className="font-bold text-rose-200 text-sm mt-0.5">PKR {allTimeExpenses.toLocaleString()}</p>
            </div>
            <div>
              <p className="text-white/60">Total Salaries</p>
              <p className="font-bold text-purple-200 text-sm mt-0.5">PKR {allTimeSalaries.toLocaleString()}</p>
            </div>
          </div>
        </div>
      </div>

      {/* MONTHLY 5-KPI METRIC CARDS */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3.5">
        <div className="bg-white border border-slate-200/80 rounded-2xl p-4 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Gross Income ({month})</span>
            <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <TrendingUp size={16} />
            </div>
          </div>
          <div className="text-xl font-bold text-slate-900 mt-2">
            PKR {monthGross.toLocaleString()}
          </div>
          <p className="text-[11px] text-slate-400 mt-1 truncate">
            Adm: {totalAdmissionFees.toLocaleString()} | Fee: {stats.totalPaid.toLocaleString()}
          </p>
        </div>

        <div className="bg-white border border-slate-200/80 rounded-2xl p-4 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Expenses ({month})</span>
            <div className="w-8 h-8 rounded-lg bg-rose-50 text-rose-600 flex items-center justify-center">
              <Receipt size={16} />
            </div>
          </div>
          <div className="text-xl font-bold text-slate-900 mt-2">
            PKR {totalExpenses.toLocaleString()}
          </div>
          <p className="text-[11px] text-rose-500 mt-1">Operational costs</p>
        </div>

        <div className="bg-white border border-slate-200/80 rounded-2xl p-4 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Staff Salaries ({month})</span>
            <div className="w-8 h-8 rounded-lg bg-purple-50 text-purple-600 flex items-center justify-center">
              <Users size={16} />
            </div>
          </div>
          <div className="text-xl font-bold text-slate-900 mt-2">
            PKR {totalSalaries.toLocaleString()}
          </div>
          <p className="text-[11px] text-purple-500 mt-1">Payroll disbursement</p>
        </div>

        <div className="bg-white border border-slate-200/80 rounded-2xl p-4 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Net Profit ({month})</span>
            <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
              monthNet >= 0 ? 'bg-blue-50 text-blue-600' : 'bg-red-50 text-red-600'
            }`}>
              <DollarSign size={16} />
            </div>
          </div>
          <div className={`text-xl font-bold mt-2 ${monthNet >= 0 ? 'text-blue-600' : 'text-red-600'}`}>
            PKR {monthNet.toLocaleString()}
          </div>
          <p className="text-[11px] text-slate-400 mt-1">After all outflows</p>
        </div>

        <div className="bg-white border border-slate-200/80 rounded-2xl p-4 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Pending ({month})</span>
            <div className="w-8 h-8 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center">
              <Clock size={16} />
            </div>
          </div>
          <div className="text-xl font-bold text-amber-600 mt-2">
            PKR {stats.totalPending.toLocaleString()}
          </div>
          <p className="text-[11px] text-amber-500 mt-1">Receivables remaining</p>
        </div>
      </div>

      {/* ANNUAL REVENUE TREND BAR GRAPH */}
      <div className="bg-white border border-slate-200/80 rounded-2xl p-5 shadow-sm">
        <div className="flex items-center justify-between mb-6 pb-3 border-b border-slate-100">
          <div>
            <h3 className="font-bold text-slate-800 text-sm">{year} Monthly Revenue Velocity</h3>
            <p className="text-xs text-slate-400">Total fees realized across all 12 months</p>
          </div>
          <span className="text-xs font-semibold px-2.5 py-1 bg-slate-100 text-slate-600 rounded-lg">
            Active: {month} {year}
          </span>
        </div>

        <div className="h-44 flex items-end gap-2 sm:gap-4 pt-4">
          {yearlyComparison.map((item, idx) => {
            const isSelected = item.month === month;
            const heightPercent = Math.max((item.total / maxVal) * 100, 4);

            return (
              <div
                key={idx}
                onClick={() => setMonth(item.month)}
                className="flex-1 flex flex-col items-center h-full justify-end group cursor-pointer"
                title={`${item.month} ${year}: PKR ${item.total.toLocaleString()}`}
              >
                <div className="text-[10px] font-bold text-slate-600 opacity-0 group-hover:opacity-100 transition-opacity mb-1">
                  {(item.total / 1000).toFixed(0)}k
                </div>
                <div className="w-full bg-slate-100 rounded-t-lg h-full flex items-end overflow-hidden">
                  <div
                    style={{ height: `${heightPercent}%` }}
                    className={`w-full transition-all duration-300 rounded-t-lg ${
                      isSelected
                        ? 'bg-blue-600 shadow-md shadow-blue-500/30'
                        : 'bg-slate-300 group-hover:bg-slate-400'
                    }`}
                  />
                </div>
                <span className={`text-[11px] font-semibold mt-2 ${
                  isSelected ? 'text-blue-600 font-bold' : 'text-slate-400'
                }`}>
                  {item.month}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* COURSE BREAKDOWN TABLE */}
      <div className="bg-white border border-slate-200/80 rounded-2xl shadow-sm overflow-hidden">
        <div className="p-4 border-b border-slate-100 flex items-center justify-between">
          <div>
            <h3 className="font-bold text-slate-800 text-sm">Course Fee Performance ({month} {year})</h3>
            <p className="text-xs text-slate-400">Breakdown of collections and outstanding dues per course</p>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50/80 text-slate-500 text-xs font-semibold uppercase tracking-wider border-b border-slate-200">
              <tr>
                <th className="px-5 py-3.5">Course Name</th>
                <th className="px-5 py-3.5">Collected (PKR)</th>
                <th className="px-5 py-3.5">Pending (PKR)</th>
                <th className="px-5 py-3.5">Collection Rate</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {feeData.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-5 py-8 text-center text-slate-400 text-sm">
                    No fee records found for {month} {year}
                  </td>
                </tr>
              ) : (
                feeData.map((f, i) => {
                  const total = f.paid + f.pending;
                  const rate = total > 0 ? Math.round((f.paid / total) * 100) : 100;

                  return (
                    <tr key={i} className="hover:bg-slate-50/60 transition-colors">
                      <td className="px-5 py-3.5 font-semibold text-slate-800">{f.courseName}</td>
                      <td className="px-5 py-3.5 font-mono font-bold text-emerald-600">
                        PKR {f.paid.toLocaleString()}
                      </td>
                      <td className="px-5 py-3.5 font-mono font-medium text-rose-500">
                        PKR {f.pending.toLocaleString()}
                      </td>
                      <td className="px-5 py-3.5">
                        <div className="flex items-center gap-3">
                          <div className="flex-1 max-w-[120px] bg-slate-100 rounded-full h-2 overflow-hidden">
                            <div
                              style={{ width: `${rate}%` }}
                              className={`h-full rounded-full transition-all ${
                                rate >= 80 ? 'bg-emerald-500' : rate >= 50 ? 'bg-amber-500' : 'bg-rose-500'
                              }`}
                            />
                          </div>
                          <span className="text-xs font-bold text-slate-600">{rate}%</span>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* EMBEDDED BALANCE SHEET COMPONENT */}
      <BalanceSheet />
    </div>
  );
};

export default MonthlyAnalytics;
