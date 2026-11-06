import React, { useState, useEffect } from 'react';
import { db } from '../firebase.js';
import { ref, onValue } from 'firebase/database';
import { MONTHS_SHORT, normalizeMonth, normalizeMonthKey, resolveFeeRecord, getCanonicalShortMonth, getMonthIndex } from '../utils/monthUtils';
import {
  BadgeDollarSign,
  Search,
  Filter,
  RotateCcw,
  Download,
  Calendar,
  CheckCircle2,
  AlertCircle,
  Clock,
  Layers
} from 'lucide-react';

const FeeStatus = () => {
  const [students, setStudents] = useState([]);
  const [feesData, setFeesData] = useState({});
  const [coursesList, setCoursesList] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCourseFilter, setSelectedCourseFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('active');

  const currentMonthLabel = getCanonicalShortMonth();
  const currentYearLabel = new Date().getFullYear().toString();

  const [fromMonth, setFromMonth] = useState(currentMonthLabel);
  const [fromYear, setFromYear] = useState(currentYearLabel);
  const [toMonth, setToMonth] = useState(currentMonthLabel);
  const [toYear, setToYear] = useState(currentYearLabel);

  const monthsMap = { Jan: 0, Feb: 1, Mar: 2, Apr: 3, May: 4, Jun: 5, Jul: 6, Aug: 7, Sep: 8, Oct: 9, Nov: 10, Dec: 11 };

  useEffect(() => {
    const unsubStudents = onValue(ref(db, 'students'), (snap) => {
      const data = snap.val();
      setStudents(data ? Object.keys(data).map(id => ({ id, ...data[id] })) : []);
    });
    const unsubFees = onValue(ref(db, 'fee_transactions'), (snap) => setFeesData(snap.val() || {}));
    const unsubCourses = onValue(ref(db, 'courses'), (snap) => {
      const data = snap.val();
      setCoursesList(data ? Object.keys(data).map(id => ({ id, ...data[id] })) : []);
    });

    return () => {
      unsubStudents();
      unsubFees();
      unsubCourses();
    };
  }, []);

  const handleReset = () => {
    setSearchTerm('');
    setSelectedCourseFilter('');
    setStatusFilter('active');
    setFromMonth(currentMonthLabel);
    setFromYear(currentYearLabel);
    setToMonth(currentMonthLabel);
    setToYear(currentYearLabel);
  };

  const getMonthRange = () => {
    const start = new Date(parseInt(fromYear), getMonthIndex(fromMonth), 1);
    const end = new Date(parseInt(toYear), getMonthIndex(toMonth), 1);
    const range = [];
    let current = new Date(start);
    while (current <= end) {
      const m = getCanonicalShortMonth(current);
      const y = current.getFullYear();
      range.push({ m, y, key: `${m}_${y}`, sortValue: current.getTime() });
      current.setMonth(current.getMonth() + 1);
    }
    return range;
  };

  const getSingleMonthStatus = (studentId, courseId, monthKey, agreedFee) => {
    const record = resolveFeeRecord(studentId, courseId, monthKey, feesData);
    if (!record) {
      return { label: 'Unpaid', statusType: 'unpaid', paid: 0, waived: 0, balance: Number(agreedFee || 0) };
    }

    const paid = Number(record.paid ?? record.amount_paid ?? record.amount ?? 0);
    const waived = Number(record.waived ?? record.discount ?? 0);
    const totalSettled = paid + waived;
    const feeAmount = Number(agreedFee || 0);
    const storedBalance = Number(record.balance ?? 0);
    const computedBalance = Number.isFinite(storedBalance) && storedBalance >= 0
      ? storedBalance
      : Math.max(0, feeAmount - totalSettled);

    if (computedBalance <= 0 || totalSettled >= feeAmount) {
      return { label: 'Paid', statusType: 'paid', paid, waived, balance: 0 };
    }
    if (totalSettled > 0) {
      return { label: 'Partial', statusType: 'partial', paid, waived, balance: computedBalance };
    }
    return { label: 'Unpaid', statusType: 'unpaid', paid: 0, waived: 0, balance: feeAmount };
  };

  let finalDisplayList = [];
  const selectedRange = getMonthRange();

  students.forEach(student => {
    if (statusFilter !== 'all' && student.status !== statusFilter) return;
    const courses = student.enrolled_courses || {};
    Object.keys(courses).forEach(courseId => {
      const courseInfo = courses[courseId];
      const matchesSearch = student.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        student.student_id?.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesCourse = selectedCourseFilter === '' || courseId === selectedCourseFilter;

      if (matchesSearch && matchesCourse) {
        const enrollDate = new Date(courseInfo.enrolledAt);
        const endDate = courseInfo.course_status_date ? new Date(courseInfo.course_status_date) : new Date();
        const startBoundary = new Date(enrollDate.getFullYear(), enrollDate.getMonth(), 1);

        let endBoundary = new Date(endDate.getFullYear(), endDate.getMonth(), 1);
        const cycleStartThisMonth = new Date(endDate.getFullYear(), endDate.getMonth(), enrollDate.getDate());

        if (endDate <= cycleStartThisMonth) {
          endBoundary.setMonth(endBoundary.getMonth() - 1);
        }

        if (endBoundary < startBoundary) {
          endBoundary = new Date(startBoundary);
        }

        const isActive = (!courseInfo.course_status || courseInfo.course_status === 'active') && student.status === 'active';
        if (isActive) {
          let duration = 1;
          const matchedCourse = coursesList.find(c => c.id === courseId);
          if (matchedCourse && matchedCourse.duration) {
            duration = parseInt(matchedCourse.duration) || 1;
          }
          const durationEndBoundary = new Date(enrollDate.getFullYear(), enrollDate.getMonth() + duration - 1, 1);

          if (endBoundary < durationEndBoundary) {
            endBoundary = new Date(durationEndBoundary);
          }
        }

        selectedRange.forEach(rangeObj => {
          const currentMonthDate = new Date(rangeObj.y, getMonthIndex(rangeObj.m), 1);
          if (currentMonthDate >= startBoundary && currentMonthDate <= endBoundary) {
            const status = getSingleMonthStatus(student.id, courseId, rangeObj.key, courseInfo.agreed_monthly_fee);
            finalDisplayList.push({
              studentId: student.student_id,
              name: student.name,
              studentStatus: student.status,
              courseName: courseInfo.course_name,
              month: rangeObj.m,
              year: rangeObj.y,
              agreedFee: courseInfo.agreed_monthly_fee,
              sortValue: rangeObj.sortValue,
              ...status
            });
          }
        });
      }
    });
  });

  finalDisplayList.sort((a, b) => b.sortValue - a.sortValue);

  const exportToExcel = () => {
    const headers = ["ID", "Student Name", "Status", "Course", "Month", "Year", "Monthly Fee", "Paid", "Waived", "Balance", "Fee Status"];
    const rows = finalDisplayList.map(item => [
      item.studentId,
      `"${item.name}"`,
      item.studentStatus,
      `"${item.courseName}"`,
      item.month,
      item.year,
      item.agreedFee,
      item.paid,
      item.waived,
      item.balance,
      item.label
    ]);
    const csvContent = [headers, ...rows].map(e => e.join(",")).join("\n");
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `Fee_Report_${new Date().toLocaleDateString()}.csv`;
    link.click();
  };

  return (
    <div className="space-y-6 font-sans animate-fade-in">
      {/* HEADER */}
      <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-200/80">
        <div>
          <div className="flex items-center gap-2">
            <BadgeDollarSign className="text-blue-600" size={24} />
            <h1 className="text-2xl md:text-3xl font-extrabold text-slate-900 tracking-tight">Student Fee Ledger</h1>
          </div>
          <p className="text-sm text-slate-500 mt-1 font-medium">Historical billing cycle audit from enrollment to graduation</p>
        </div>
        <div className="flex items-center gap-2.5">
          <button
            onClick={handleReset}
            className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 text-xs font-bold transition-all shadow-xs"
          >
            <RotateCcw size={14} className="text-slate-400" />
            <span>Reset Filters</span>
          </button>
          <button
            onClick={exportToExcel}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition-all shadow-xs"
          >
            <Download size={14} />
            <span>Export CSV</span>
          </button>
        </div>
      </header>

      {/* FILTER CONTROLS BAR */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Search */}
        <div>
          <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">
            Search Student
          </label>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={15} />
            <input
              type="text"
              placeholder="Name or ID..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-3.5 py-2 rounded-xl border border-slate-200 bg-slate-50 text-xs font-medium focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
            />
          </div>
        </div>

        {/* Enrollment Status */}
        <div>
          <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">
            Student Status
          </label>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-slate-50 text-xs font-medium focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
          >
            <option value="active">Active Only</option>
            <option value="inactive">Inactive Only</option>
            <option value="all">All Statuses</option>
          </select>
        </div>

        {/* Course Filter */}
        <div>
          <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">
            Filter Course
          </label>
          <select
            value={selectedCourseFilter}
            onChange={(e) => setSelectedCourseFilter(e.target.value)}
            className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-slate-50 text-xs font-medium focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
          >
            <option value="">All Courses</option>
            {coursesList.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </div>

        {/* Date Range: From / To */}
        <div>
          <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">
            Billing Month Range
          </label>
          <div className="flex items-center gap-1.5">
            <select
              value={fromMonth}
              onChange={(e) => setFromMonth(e.target.value)}
              className="px-2 py-2 rounded-xl border border-slate-200 bg-slate-50 text-xs font-medium flex-1"
            >
              {Object.keys(monthsMap).map(m => <option key={m} value={m}>{m}</option>)}
            </select>
            <input
              type="number"
              value={fromYear}
              onChange={(e) => setFromYear(e.target.value)}
              className="w-16 px-1.5 py-2 rounded-xl border border-slate-200 bg-slate-50 text-xs font-mono font-medium text-center"
            />
            <span className="text-slate-400 text-xs font-bold">to</span>
            <select
              value={toMonth}
              onChange={(e) => setToMonth(e.target.value)}
              className="px-2 py-2 rounded-xl border border-slate-200 bg-slate-50 text-xs font-medium flex-1"
            >
              {Object.keys(monthsMap).map(m => <option key={m} value={m}>{m}</option>)}
            </select>
            <input
              type="number"
              value={toYear}
              onChange={(e) => setToYear(e.target.value)}
              className="w-16 px-1.5 py-2 rounded-xl border border-slate-200 bg-slate-50 text-xs font-mono font-medium text-center"
            />
          </div>
        </div>
      </div>

      {/* TABLE CARD */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
        <div className="p-4 bg-slate-50/70 border-b border-slate-200/80 flex items-center justify-between text-xs font-bold text-slate-600">
          <span>Billing Records ({finalDisplayList.length})</span>
          <span className="text-slate-400 font-normal">Sorted newest first</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 uppercase font-bold tracking-wider text-[11px]">
                <th className="py-3 px-4">Student</th>
                <th className="py-3 px-4">Course</th>
                <th className="py-3 px-4">Billing Month</th>
                <th className="py-3 px-4 text-right">Fee</th>
                <th className="py-3 px-4 text-right">Paid</th>
                <th className="py-3 px-4 text-right">Waived</th>
                <th className="py-3 px-4 text-right">Balance</th>
                <th className="py-3 px-4 text-center">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {finalDisplayList.length > 0 ? (
                finalDisplayList.map((item, idx) => {
                  let badgeClass = "bg-rose-50 text-rose-700 border-rose-200";
                  if (item.statusType === 'paid') badgeClass = "bg-emerald-50 text-emerald-700 border-emerald-200";
                  else if (item.statusType === 'partial') badgeClass = "bg-amber-50 text-amber-700 border-amber-200";

                  return (
                    <tr key={`${item.studentId}_${idx}`} className="hover:bg-slate-50/70 transition-colors">
                      <td className="py-3.5 px-4">
                        <div className="font-bold text-slate-900">{item.name}</div>
                        <div className="text-[11px] font-mono text-blue-600 font-medium">{item.studentId}</div>
                      </td>
                      <td className="py-3.5 px-4 font-medium text-slate-700">{item.courseName}</td>
                      <td className="py-3.5 px-4 font-mono font-semibold text-slate-800">
                        {item.month} {item.year}
                      </td>
                      <td className="py-3.5 px-4 text-right font-mono text-slate-600">
                        PKR {Number(item.agreedFee).toLocaleString()}
                      </td>
                      <td className="py-3.5 px-4 text-right font-mono font-bold text-emerald-700">
                        {item.paid > 0 ? `PKR ${Number(item.paid).toLocaleString()}` : '—'}
                      </td>
                      <td className="py-3.5 px-4 text-right font-mono text-slate-400">
                        {item.waived > 0 ? `PKR ${Number(item.waived).toLocaleString()}` : '—'}
                      </td>
                      <td className={`py-3.5 px-4 text-right font-mono font-black ${
                        item.balance > 0 ? 'text-rose-600' : 'text-emerald-700'
                      }`}>
                        {item.balance > 0 ? `PKR ${Number(item.balance).toLocaleString()}` : 'Cleared'}
                      </td>
                      <td className="py-3.5 px-4 text-center">
                        <span className={`inline-block px-2.5 py-1 rounded-full text-[10px] font-bold border uppercase tracking-wider ${badgeClass}`}>
                          {item.label}
                        </span>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan="8" className="py-12 text-center text-slate-400 text-xs">
                    No fee records found matching your filters.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default FeeStatus;
