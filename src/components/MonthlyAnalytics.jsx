import React, { useState, useEffect, useMemo } from 'react';
import { useData } from '../contexts/DataContext';
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
  BarChart2,
  Building2,
  Monitor,
  GraduationCap
} from 'lucide-react';
import { MONTHS_SHORT, normalizeMonth, normalizeMonthKey, getCanonicalShortMonth } from '../utils/monthUtils';

const MonthlyAnalytics = () => {
  const {
    courses = [],
    feeTransactions = {},
    expensesRaw = {},
    staffSalary = {},
    studentsRaw = {},
    coachingFeeTransactions = {},
    coachingStudentsRaw = {}
  } = useData();

  const [analyticsScope, setAnalyticsScope] = useState('combined'); // 'combined' | 'computer' | 'coaching'
  const [month, setMonth] = useState(getCanonicalShortMonth());
  const [year, setYear] = useState(new Date().getFullYear().toString());

  // Computer Institute State
  const [compFeeData, setCompFeeData] = useState([]);
  const [compStats, setCompStats] = useState({ totalPaid: 0, totalPending: 0 });
  const [compYearlyComparison, setCompYearlyComparison] = useState([]);
  const [compAllTimeIncome, setCompAllTimeIncome] = useState(0);
  const [compTotalAdmissionFees, setCompTotalAdmissionFees] = useState(0);
  const [compAllTimeAdmissionFees, setCompAllTimeAdmissionFees] = useState(0);

  // Coaching Center State
  const [coachingFeeData, setCoachingFeeData] = useState([]);
  const [coachingStats, setCoachingStats] = useState({ totalPaid: 0, totalPending: 0 });
  const [coachingYearlyComparison, setCoachingYearlyComparison] = useState([]);
  const [coachingAllTimeIncome, setCoachingAllTimeIncome] = useState(0);
  const [coachingTotalAdmissionFees, setCoachingTotalAdmissionFees] = useState(0);
  const [coachingAllTimeAdmissionFees, setCoachingAllTimeAdmissionFees] = useState(0);

  // Shared Expenses & Salaries
  const [totalExpenses, setTotalExpenses] = useState(0);
  const [allTimeExpenses, setAllTimeExpenses] = useState(0);
  const [totalSalaries, setTotalSalaries] = useState(0);
  const [allTimeSalaries, setAllTimeSalaries] = useState(0);

  const months = MONTHS_SHORT;
  const currentYear = new Date().getFullYear();
  const years = Array.from({ length: Math.max(5, currentYear - 2024 + 5) }, (_, i) => (2024 + i).toString());

  // Course Names Mapping for Computer Institute
  const courseNames = useMemo(() => {
    const mapping = {};
    if (courses && Array.isArray(courses)) {
      courses.forEach(c => {
        mapping[c.id] = c.name;
      });
    }
    return mapping;
  }, [courses]);

  // 1. Compute Computer Institute Course Fees & Trends
  useEffect(() => {
    const selectedKey = `${month}_${year}`;
    const report = {};
    const monthlyTotals = months.map(m => ({ month: m, total: 0 }));
    let paidSum = 0, pendingSum = 0;
    let totalAllTime = 0;

    if (feeTransactions) {
      for (let studentId in feeTransactions) {
        for (let courseId in feeTransactions[studentId]) {
          const coursesInFees = feeTransactions[studentId][courseId];

          for (let tKey in coursesInFees) {
            totalAllTime += Number(coursesInFees[tKey].paid || 0);
          }

          // Calculate Yearly Trend
          months.forEach((m, index) => {
            const targetKey = `${m}_${year}`;
            for (let tKey in coursesInFees) {
              if (normalizeMonthKey(tKey) === targetKey) {
                monthlyTotals[index].total += Number(coursesInFees[tKey].paid || 0);
              }
            }
          });

          // Calculate Monthly Breakdown
          for (let tKey in coursesInFees) {
            if (normalizeMonthKey(tKey) === selectedKey) {
              const record = coursesInFees[tKey];
              paidSum += Number(record.paid || 0);
              pendingSum += Number(record.balance || 0);

              if (!report[courseId]) {
                report[courseId] = {
                  unit: 'Computer',
                  name: courseNames[courseId] || courseId,
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

    setCompFeeData(Object.values(report));
    setCompStats({ totalPaid: paidSum, totalPending: pendingSum });
    setCompYearlyComparison(monthlyTotals);
    setCompAllTimeIncome(totalAllTime);
  }, [month, year, courseNames, feeTransactions, months]);

  // 2. Compute Computer Institute Admission Fees
  useEffect(() => {
    let currentMonthAdm = 0;
    let totalAllTimeAdm = 0;

    if (studentsRaw) {
      Object.values(studentsRaw).forEach(student => {
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

    setCompTotalAdmissionFees(currentMonthAdm);
    setCompAllTimeAdmissionFees(totalAllTimeAdm);
  }, [month, year, studentsRaw, months]);

  // 3. Compute Coaching Center Fees & Trends
  useEffect(() => {
    const selectedKey = `${month}_${year}`;
    const gradeReport = {};
    const monthlyTotals = months.map(m => ({ month: m, total: 0 }));
    let paidSum = 0, pendingSum = 0;
    let totalAllTime = 0;

    if (coachingFeeTransactions) {
      for (let studentId in coachingFeeTransactions) {
        for (let tKey in coachingFeeTransactions[studentId]) {
          const record = coachingFeeTransactions[studentId][tKey];
          const recordPaid = Number(record.paid || 0);
          const recordBal = Number(record.balance || 0);
          const recordGrade = record.grade || 'General Coaching';

          totalAllTime += recordPaid;

          // Yearly trend
          const parts = tKey.split('_');
          if (parts.length >= 2) {
            const mStr = normalizeMonth(parts[0]);
            const yStr = parts[parts.length - 1];

            if (yStr === year) {
              const mIndex = months.indexOf(mStr);
              if (mIndex !== -1) {
                monthlyTotals[mIndex].total += recordPaid;
              }
            }

            // Monthly Breakdown
            if (mStr === month && yStr === year) {
              paidSum += recordPaid;
              pendingSum += recordBal;

              if (!gradeReport[recordGrade]) {
                gradeReport[recordGrade] = {
                  unit: 'Coaching',
                  name: recordGrade,
                  paid: 0,
                  pending: 0
                };
              }
              gradeReport[recordGrade].paid += recordPaid;
              gradeReport[recordGrade].pending += recordBal;
            }
          }
        }
      }
    }

    setCoachingFeeData(Object.values(gradeReport));
    setCoachingStats({ totalPaid: paidSum, totalPending: pendingSum });
    setCoachingYearlyComparison(monthlyTotals);
    setCoachingAllTimeIncome(totalAllTime);
  }, [month, year, coachingFeeTransactions, months]);

  // 4. Compute Coaching Center Admission Fees
  useEffect(() => {
    let currentMonthAdm = 0;
    let totalAllTimeAdm = 0;

    if (coachingStudentsRaw) {
      Object.values(coachingStudentsRaw).forEach(student => {
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

    setCoachingTotalAdmissionFees(currentMonthAdm);
    setCoachingAllTimeAdmissionFees(totalAllTimeAdm);
  }, [month, year, coachingStudentsRaw, months]);

  // 5. Compute Shared Operational Expenses & Salaries
  useEffect(() => {
    let currentMonthExpenses = 0;
    let totalAllTime = 0;

    if (expensesRaw) {
      Object.values(expensesRaw).forEach(exp => {
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

    let currentMonthSalaries = 0;
    let totalAllTimeSal = 0;

    if (staffSalary) {
      Object.values(staffSalary).forEach(salary => {
        totalAllTimeSal += Number(salary.amount || 0);
        if (salary.salaryYear && salary.salaryMonth) {
          const salMonth = normalizeMonth(salary.salaryMonth);
          if (salary.salaryYear.toString() === year && salMonth === month) {
            currentMonthSalaries += Number(salary.amount || 0);
          }
        }
      });
    }
    setTotalSalaries(currentMonthSalaries);
    setAllTimeSalaries(totalAllTimeSal);
  }, [month, year, expensesRaw, staffSalary, months]);

  // Combined Gross and Outflows
  const compMonthGross = compStats.totalPaid + compTotalAdmissionFees;
  const coachingMonthGross = coachingStats.totalPaid + coachingTotalAdmissionFees;
  const combinedMonthGross = compMonthGross + coachingMonthGross;

  const totalMonthlyOutflow = totalExpenses + totalSalaries;
  const totalAllTimeOutflow = allTimeExpenses + allTimeSalaries;

  const compLifetimeInflow = compAllTimeIncome + compAllTimeAdmissionFees;
  const coachingLifetimeInflow = coachingAllTimeIncome + coachingAllTimeAdmissionFees;
  const combinedLifetimeInflow = compLifetimeInflow + coachingLifetimeInflow;

  // Active Scope Metrics
  const activeMonthGross =
    analyticsScope === 'computer' ? compMonthGross : analyticsScope === 'coaching' ? coachingMonthGross : combinedMonthGross;

  const activeAdmissionFees =
    analyticsScope === 'computer'
      ? compTotalAdmissionFees
      : analyticsScope === 'coaching'
      ? coachingTotalAdmissionFees
      : compTotalAdmissionFees + coachingTotalAdmissionFees;

  const activeFeePaid =
    analyticsScope === 'computer' ? compStats.totalPaid : analyticsScope === 'coaching' ? coachingStats.totalPaid : compStats.totalPaid + coachingStats.totalPaid;

  const activePending =
    analyticsScope === 'computer'
      ? compStats.totalPending
      : analyticsScope === 'coaching'
      ? coachingStats.totalPending
      : compStats.totalPending + coachingStats.totalPending;

  const activeMonthNet = activeMonthGross - totalMonthlyOutflow;

  const activeLifetimeInflow =
    analyticsScope === 'computer' ? compLifetimeInflow : analyticsScope === 'coaching' ? coachingLifetimeInflow : combinedLifetimeInflow;

  const activeLifetimeNet = activeLifetimeInflow - totalAllTimeOutflow;
  const isProfitable = activeLifetimeNet >= 0;

  // Active Yearly Chart Series
  const activeYearlyComparison = months.map((m, idx) => {
    const compVal = compYearlyComparison[idx]?.total || 0;
    const coachVal = coachingYearlyComparison[idx]?.total || 0;
    if (analyticsScope === 'computer') return { month: m, total: compVal };
    if (analyticsScope === 'coaching') return { month: m, total: coachVal };
    return { month: m, total: compVal + coachVal };
  });

  const maxChartVal = Math.max(...activeYearlyComparison.map(m => m.total), 1);

  // Active Table Data
  const activeTableData = useMemo(() => {
    if (analyticsScope === 'computer') return compFeeData;
    if (analyticsScope === 'coaching') return coachingFeeData;
    return [...compFeeData, ...coachingFeeData];
  }, [analyticsScope, compFeeData, coachingFeeData]);

  // Export functions
  const exportMonthly = () => {
    if (activeTableData.length === 0) {
      toast.error("No data to export for this period");
      return;
    }
    const worksheet = XLSX.utils.json_to_sheet(
      activeTableData.map(f => ({
        "Unit / Institute": f.unit,
        "Stream / Course / Grade": f.name,
        "Paid (PKR)": f.paid,
        "Pending (PKR)": f.pending
      }))
    );
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, `${analyticsScope}_Monthly`);
    XLSX.writeFile(workbook, `Report_${analyticsScope}_${month}_${year}.xlsx`);
    toast.success(`Exported ${analyticsScope} report for ${month} ${year}`);
  };

  const exportYearly = () => {
    const exportData = activeYearlyComparison.map(item => ({
      Month: item.month,
      Year: year,
      "Realized Tuition": item.total
    }));

    const ws = XLSX.utils.json_to_sheet(exportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Yearly Trend");
    XLSX.writeFile(wb, `Yearly_Trend_${analyticsScope}_${year}.xlsx`);
    toast.success(`Exported yearly trends for ${year}`);
  };

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
            <p className="text-sm text-slate-500">Gross inflows, shared overhead, staff salaries & net profit</p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {/* INSTITUTE SCOPE SELECTOR */}
          <div className="flex items-center bg-slate-100 p-1 rounded-xl border border-slate-200/90 shadow-2xs">
            <button
              onClick={() => setAnalyticsScope('combined')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                analyticsScope === 'combined'
                  ? 'bg-white text-blue-700 shadow-xs ring-1 ring-black/5'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              <Building2 size={13} />
              <span>Combined Total</span>
            </button>
            <button
              onClick={() => setAnalyticsScope('computer')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                analyticsScope === 'computer'
                  ? 'bg-white text-blue-700 shadow-xs ring-1 ring-black/5'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              <Monitor size={13} />
              <span>Computer Institute</span>
            </button>
            <button
              onClick={() => setAnalyticsScope('coaching')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                analyticsScope === 'coaching'
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              <GraduationCap size={13} />
              <span>Coaching Center</span>
            </button>
          </div>

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

      {/* DUAL INSTITUTE REVENUE COMPARISON STRIP */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5">
        {/* Computer Institute Card */}
        <div
          onClick={() => setAnalyticsScope('computer')}
          className={`p-4 rounded-2xl border transition-all cursor-pointer ${
            analyticsScope === 'computer'
              ? 'bg-blue-50/90 border-blue-400 shadow-sm ring-1 ring-blue-300'
              : 'bg-white border-slate-200/80 hover:border-slate-300 shadow-2xs'
          }`}
        >
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-blue-100 text-blue-700 flex items-center justify-center">
                <Monitor size={15} />
              </div>
              <span className="font-extrabold text-xs text-slate-800">Computer Institute</span>
            </div>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-100 text-blue-700">
              {month} {year}
            </span>
          </div>
          <div className="text-xl font-extrabold text-blue-900 font-mono">
            PKR {compMonthGross.toLocaleString()}
          </div>
          <div className="flex items-center justify-between text-[11px] text-slate-500 mt-2 pt-2 border-t border-slate-100">
            <span>Course Fees: PKR {compStats.totalPaid.toLocaleString()}</span>
            <span>Admissions: PKR {compTotalAdmissionFees.toLocaleString()}</span>
          </div>
        </div>

        {/* Coaching Center Card */}
        <div
          onClick={() => setAnalyticsScope('coaching')}
          className={`p-4 rounded-2xl border transition-all cursor-pointer ${
            analyticsScope === 'coaching'
              ? 'bg-emerald-50/90 border-emerald-400 shadow-sm ring-1 ring-emerald-300'
              : 'bg-white border-slate-200/80 hover:border-slate-300 shadow-2xs'
          }`}
        >
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center">
                <GraduationCap size={15} />
              </div>
              <span className="font-extrabold text-xs text-slate-800">Coaching Center</span>
            </div>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700">
              {month} {year}
            </span>
          </div>
          <div className="text-xl font-extrabold text-emerald-900 font-mono">
            PKR {coachingMonthGross.toLocaleString()}
          </div>
          <div className="flex items-center justify-between text-[11px] text-slate-500 mt-2 pt-2 border-t border-slate-100">
            <span>Monthly Tuition: PKR {coachingStats.totalPaid.toLocaleString()}</span>
            <span>Admissions: PKR {coachingTotalAdmissionFees.toLocaleString()}</span>
          </div>
        </div>

        {/* Combined Unit Total Card */}
        <div
          onClick={() => setAnalyticsScope('combined')}
          className={`p-4 rounded-2xl border transition-all cursor-pointer ${
            analyticsScope === 'combined'
              ? 'bg-slate-900 text-white border-slate-800 shadow-md ring-1 ring-blue-500/50'
              : 'bg-white border-slate-200/80 hover:border-slate-300 shadow-2xs'
          }`}
        >
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <div className={`w-7 h-7 rounded-lg flex items-center justify-center ${
                analyticsScope === 'combined' ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-700'
              }`}>
                <Building2 size={15} />
              </div>
              <span className={`font-extrabold text-xs ${analyticsScope === 'combined' ? 'text-white' : 'text-slate-800'}`}>
                Combined Institute Total
              </span>
            </div>
            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
              analyticsScope === 'combined' ? 'bg-white/20 text-blue-200' : 'bg-slate-100 text-slate-600'
            }`}>
              Consolidated
            </span>
          </div>
          <div className={`text-xl font-extrabold font-mono ${analyticsScope === 'combined' ? 'text-blue-300' : 'text-slate-900'}`}>
            PKR {combinedMonthGross.toLocaleString()}
          </div>
          <div className={`flex items-center justify-between text-[11px] mt-2 pt-2 border-t ${
            analyticsScope === 'combined' ? 'border-white/10 text-slate-300' : 'border-slate-100 text-slate-500'
          }`}>
            <span>Total Inflow (Both Branches)</span>
            <span className="font-semibold">Pending: PKR {(compStats.totalPending + coachingStats.totalPending).toLocaleString()}</span>
          </div>
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
                  <span>
                    {analyticsScope === 'combined' ? 'Consolidated All-Time Net Profit' : `${analyticsScope === 'computer' ? 'Computer Institute' : 'Coaching Center'} All-Time Profit`}
                  </span>
                </>
              ) : (
                <>
                  <TrendingDown size={14} className="text-rose-300" />
                  <span>All-Time Net Deficit</span>
                </>
              )}
            </div>
            <h2 className="text-sm font-medium text-white/80">
              {analyticsScope === 'combined' ? 'Consolidated Lifetime Cumulative Balance' : `${analyticsScope === 'computer' ? 'Computer Institute' : 'Coaching Center'} Cumulative Balance`}
            </h2>
            <div className="text-3xl sm:text-4xl font-extrabold tracking-tight mt-1">
              PKR {activeLifetimeNet.toLocaleString()}
            </div>
            <p className="text-xs text-white/70 mt-2 max-w-xl">
              Gross Receipts ({analyticsScope === 'combined' ? 'Computer Course Fees + Coaching Monthly Fees + Admissions' : analyticsScope === 'computer' ? 'Course Fees + Admissions' : 'Coaching Fees + Admissions'}) minus Total Shared Operating Expenses and Staff Salaries.
            </p>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 bg-black/20 backdrop-blur-sm p-4 rounded-xl border border-white/10 text-xs">
            <div>
              <p className="text-white/60">Gross Inflow ({analyticsScope})</p>
              <p className="font-bold text-white text-sm mt-0.5">PKR {activeLifetimeInflow.toLocaleString()}</p>
            </div>
            <div>
              <p className="text-white/60">Shared Expenses</p>
              <p className="font-bold text-rose-200 text-sm mt-0.5">PKR {allTimeExpenses.toLocaleString()}</p>
            </div>
            <div>
              <p className="text-white/60">Shared Salaries</p>
              <p className="font-bold text-purple-200 text-sm mt-0.5">PKR {allTimeSalaries.toLocaleString()}</p>
            </div>
          </div>
        </div>
      </div>

      {/* MONTHLY 5-KPI METRIC CARDS */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3.5">
        <div className="bg-white border border-slate-200/80 rounded-2xl p-4 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Gross Inflow ({month})</span>
            <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <TrendingUp size={16} />
            </div>
          </div>
          <div className="text-xl font-bold text-slate-900 mt-2 font-mono">
            PKR {activeMonthGross.toLocaleString()}
          </div>
          <p className="text-[11px] text-slate-400 mt-1 truncate">
            Adm: {activeAdmissionFees.toLocaleString()} | Fee: {activeFeePaid.toLocaleString()}
          </p>
        </div>

        <div className="bg-white border border-slate-200/80 rounded-2xl p-4 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Expenses ({month})</span>
            <div className="w-8 h-8 rounded-lg bg-rose-50 text-rose-600 flex items-center justify-center">
              <Receipt size={16} />
            </div>
          </div>
          <div className="text-xl font-bold text-slate-900 mt-2 font-mono">
            PKR {totalExpenses.toLocaleString()}
          </div>
          <p className="text-[11px] text-rose-500 mt-1">Shared operating costs</p>
        </div>

        <div className="bg-white border border-slate-200/80 rounded-2xl p-4 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Staff Salaries ({month})</span>
            <div className="w-8 h-8 rounded-lg bg-purple-50 text-purple-600 flex items-center justify-center">
              <Users size={16} />
            </div>
          </div>
          <div className="text-xl font-bold text-slate-900 mt-2 font-mono">
            PKR {totalSalaries.toLocaleString()}
          </div>
          <p className="text-[11px] text-purple-500 mt-1">Shared payroll disbursement</p>
        </div>

        <div className="bg-white border border-slate-200/80 rounded-2xl p-4 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Net Profit ({month})</span>
            <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
              activeMonthNet >= 0 ? 'bg-blue-50 text-blue-600' : 'bg-red-50 text-red-600'
            }`}>
              <DollarSign size={16} />
            </div>
          </div>
          <div className={`text-xl font-bold mt-2 font-mono ${activeMonthNet >= 0 ? 'text-blue-600' : 'text-red-600'}`}>
            PKR {activeMonthNet.toLocaleString()}
          </div>
          <p className="text-[11px] text-slate-400 mt-1">After all shared outflows</p>
        </div>

        <div className="bg-white border border-slate-200/80 rounded-2xl p-4 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Pending Dues ({month})</span>
            <div className="w-8 h-8 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center">
              <Clock size={16} />
            </div>
          </div>
          <div className="text-xl font-bold text-amber-600 mt-2 font-mono">
            PKR {activePending.toLocaleString()}
          </div>
          <p className="text-[11px] text-amber-500 mt-1">Receivables remaining</p>
        </div>
      </div>

      {/* ANNUAL REVENUE TREND BAR GRAPH */}
      <div className="bg-white border border-slate-200/80 rounded-2xl p-5 shadow-sm">
        <div className="flex items-center justify-between mb-6 pb-3 border-b border-slate-100">
          <div>
            <h3 className="font-bold text-slate-800 text-sm">
              {year} Monthly Revenue Velocity ({analyticsScope === 'combined' ? 'Combined Units' : analyticsScope === 'computer' ? 'Computer Institute' : 'Coaching Center'})
            </h3>
            <p className="text-xs text-slate-400">Total fees realized across all 12 calendar months</p>
          </div>
          <span className="text-xs font-semibold px-2.5 py-1 bg-slate-100 text-slate-600 rounded-lg">
            Active: {month} {year}
          </span>
        </div>

        <div className="h-44 flex items-end gap-2 sm:gap-4 pt-4">
          {activeYearlyComparison.map((item, idx) => {
            const isSelected = item.month === month;
            const heightPercent = Math.max((item.total / maxChartVal) * 100, 4);

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
                        ? analyticsScope === 'coaching'
                          ? 'bg-emerald-600 shadow-md shadow-emerald-500/30'
                          : 'bg-blue-600 shadow-md shadow-blue-500/30'
                        : 'bg-slate-300 group-hover:bg-slate-400'
                    }`}
                  />
                </div>
                <span className={`text-[11px] font-semibold mt-2 ${
                  isSelected ? (analyticsScope === 'coaching' ? 'text-emerald-600 font-bold' : 'text-blue-600 font-bold') : 'text-slate-400'
                }`}>
                  {item.month}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* PERFORMANCE BREAKDOWN TABLE */}
      <div className="bg-white border border-slate-200/80 rounded-2xl shadow-sm overflow-hidden">
        <div className="p-4 border-b border-slate-100 flex items-center justify-between">
          <div>
            <h3 className="font-bold text-slate-800 text-sm">
              Collection Breakdown ({month} {year}) - {analyticsScope === 'combined' ? 'All Institutes' : analyticsScope === 'computer' ? 'Computer Courses' : 'Coaching Classes'}
            </h3>
            <p className="text-xs text-slate-400">Streamwise breakdown of realized fees and pending receivables</p>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50/80 text-slate-500 text-xs font-semibold uppercase tracking-wider border-b border-slate-200">
              <tr>
                <th className="px-5 py-3.5">Stream / Course / Grade</th>
                <th className="px-4 py-3.5">Institute Unit</th>
                <th className="px-5 py-3.5">Collected (PKR)</th>
                <th className="px-5 py-3.5">Pending (PKR)</th>
                <th className="px-5 py-3.5">Realization Rate</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {activeTableData.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-5 py-8 text-center text-slate-400 text-sm">
                    No fee records found for {month} {year}
                  </td>
                </tr>
              ) : (
                activeTableData.map((f, i) => {
                  const total = f.paid + f.pending;
                  const rate = total > 0 ? Math.round((f.paid / total) * 100) : 100;

                  return (
                    <tr key={i} className="hover:bg-slate-50/60 transition-colors">
                      <td className="px-5 py-3.5 font-semibold text-slate-800">{f.name}</td>
                      <td className="px-4 py-3.5">
                        <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                          f.unit === 'Coaching'
                            ? 'bg-emerald-100 text-emerald-700 border border-emerald-200'
                            : 'bg-blue-100 text-blue-700 border border-blue-200'
                        }`}>
                          {f.unit === 'Coaching' ? <GraduationCap size={10} /> : <Monitor size={10} />}
                          <span>{f.unit}</span>
                        </span>
                      </td>
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

      {/* EMBEDDED ANNUAL BALANCE SHEET */}
      <BalanceSheet />
    </div>
  );
};

export default MonthlyAnalytics;
