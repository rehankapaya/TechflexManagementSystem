import { useSearchParams } from 'react-router-dom';
import React, { useState, useEffect } from 'react';
import { useData } from '../contexts/DataContext';
import { MONTHS_SHORT, normalizeMonth, normalizeMonthKey, resolveFeeRecord, getCanonicalShortMonth, getMonthIndex, parseEnrollmentMonthDate } from '../utils/monthUtils';
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
  Layers,
  X
} from 'lucide-react';

const FeeStatus = () => {
  const { students, feeTransactions: feesData, courses: coursesList } = useData();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCourseFilter, setSelectedCourseFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('active');
  const [showMobileFilterDrawer, setShowMobileFilterDrawer] = useState(false);
  const [searchParams] = useSearchParams();

  const currentMonthLabel = getCanonicalShortMonth();
  const currentYearLabel = new Date().getFullYear().toString();

  const [fromMonth, setFromMonth] = useState(currentMonthLabel);
  const [fromYear, setFromYear] = useState(currentYearLabel);
  const [toMonth, setToMonth] = useState(currentMonthLabel);
  const [toYear, setToYear] = useState(currentYearLabel);

  useEffect(() => {
    const q = searchParams.get('search') || searchParams.get('studentId') || searchParams.get('id');
    if (q) {
      setSearchTerm(q);
      setFromMonth('Jan');
    }
  }, [searchParams]);

  const monthsMap = { Jan: 0, Feb: 1, Mar: 2, Apr: 3, May: 4, Jun: 5, Jul: 6, Aug: 7, Sep: 8, Oct: 9, Nov: 10, Dec: 11 };

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

  // Helper: format dates consistently as dd-mm-yyyy
  const formatDateDMY = (dateVal) => {
    if (!dateVal) return null;
    if (typeof dateVal?.toDate === 'function') {
      dateVal = dateVal.toDate();
    }
    if (typeof dateVal === 'string') {
      const trimmed = dateVal.trim();
      if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
        const [y, m, d] = trimmed.split('-');
        return `${d}-${m}-${y}`;
      }
      if (/^\d{2}[-/]\d{2}[-/]\d{4}$/.test(trimmed)) {
        return trimmed.replace(/\//g, '-');
      }
    }
    const d = new Date(dateVal);
    if (isNaN(d.getTime())) return null;
    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const year = d.getFullYear();
    return `${day}-${month}-${year}`;
  };

  const getSingleMonthStatus = (studentId, courseId, monthKey, agreedFee) => {
    const record = resolveFeeRecord(studentId, courseId, monthKey, feesData);
    if (!record) {
      return { label: 'Unpaid', statusType: 'unpaid', paid: 0, waived: 0, balance: Number(agreedFee || 0), payDate: null };
    }

    const paid = Number(record.paid ?? record.amount_paid ?? record.amount ?? 0);
    const waived = Number(record.waived ?? record.discount ?? 0);
    const totalSettled = paid + waived;
    const feeAmount = Number(agreedFee || 0);
    const storedBalance = Number(record.balance ?? 0);
    const computedBalance = Number.isFinite(storedBalance) && storedBalance >= 0
      ? storedBalance
      : Math.max(0, feeAmount - totalSettled);

    const rawPayDate = record.pay_date 
      || record.payment_date 
      || (record.timestamp ? new Date(record.timestamp).toISOString().split('T')[0] : null);
    const payDate = formatDateDMY(rawPayDate);

    if (computedBalance <= 0 || totalSettled >= feeAmount) {
      return { label: 'Paid', statusType: 'paid', paid, waived, balance: 0, payDate };
    }
    if (totalSettled > 0) {
      return { label: 'Partial', statusType: 'partial', paid, waived, balance: computedBalance, payDate };
    }
    return { label: 'Unpaid', statusType: 'unpaid', paid: 0, waived: 0, balance: feeAmount, payDate: null };
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
        const enrollDate = parseEnrollmentMonthDate(courseInfo.enrolledAt || student.createdAt || student.joined_date);
        if (!enrollDate) return;

        const endDateRaw = courseInfo.course_status_date ? new Date(courseInfo.course_status_date) : new Date();
        const endDate = isNaN(endDateRaw.getTime()) ? new Date() : endDateRaw;
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
          const status = getSingleMonthStatus(student.id, courseId, rangeObj.key, courseInfo.agreed_monthly_fee);
          const hasPayment = (status.paid > 0 || status.waived > 0);

          if ((currentMonthDate >= startBoundary && currentMonthDate <= endBoundary) || hasPayment) {
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
    const headers = ["ID", "Student Name", "Status", "Course", "Month", "Year", "Pay Date", "Monthly Fee", "Paid", "Waived", "Balance", "Fee Status"];
    const rows = finalDisplayList.map(item => [
      item.studentId,
      `"${item.name}"`,
      item.studentStatus,
      `"${item.courseName}"`,
      item.month,
      item.year,
      item.payDate || "—",
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
      {/* MOBILE COMPACT HEADER (< md) */}
      <div className="flex md:hidden items-center justify-between gap-2 pb-2 border-b border-slate-200/80">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl bg-blue-600 flex items-center justify-center text-white shadow-xs shrink-0">
            <BadgeDollarSign size={18} />
          </div>
          <div>
            <h1 className="text-base font-extrabold text-slate-900 tracking-tight leading-none">Fee Ledger</h1>
            <span className="text-[11px] font-semibold text-slate-400">
              {finalDisplayList.length} records
            </span>
          </div>
        </div>
        <div className="flex items-center gap-1.5">
          <button
            onClick={handleReset}
            className="p-2 rounded-xl bg-white hover:bg-slate-50 border border-slate-200 text-slate-600 transition-colors cursor-pointer"
            title="Reset Filters"
          >
            <RotateCcw size={15} />
          </button>
          <button
            onClick={exportToExcel}
            className="flex items-center gap-1 px-3 py-2 rounded-xl bg-emerald-600 text-white font-bold text-xs shadow-xs active:scale-95 transition-transform cursor-pointer"
          >
            <Download size={14} />
            <span>CSV</span>
          </button>
        </div>
      </div>

      {/* DESKTOP HEADER (>= md) */}
      <header className="hidden md:flex flex-row items-center justify-between gap-4 pb-2 border-b border-slate-200/80">
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
            className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 text-xs font-bold transition-all shadow-xs cursor-pointer"
          >
            <RotateCcw size={14} className="text-slate-400" />
            <span>Reset Filters</span>
          </button>
          <button
            onClick={exportToExcel}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition-all shadow-xs cursor-pointer"
          >
            <Download size={14} />
            <span>Export CSV</span>
          </button>
        </div>
      </header>

      {/* FILTER CONTROLS BAR */}
      <div className="bg-white p-3.5 sm:p-5 rounded-2xl border border-slate-200/80 shadow-xs space-y-3">
        {/* MOBILE FILTER BAR (< md) */}
        <div className="block md:hidden space-y-2">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={15} />
            <input
              type="text"
              placeholder="Search student name or ID..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-8 py-2 rounded-xl border border-slate-200 bg-slate-50 text-xs font-medium focus:bg-white focus:outline-none"
            />
            {searchTerm && (
              <button
                onClick={() => setSearchTerm('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5 cursor-pointer"
              >
                <X size={14} />
              </button>
            )}
          </div>

          <div className="flex items-center gap-1.5 overflow-x-auto pb-0.5 custom-scrollbar">
            <button
              onClick={() => setStatusFilter('active')}
              className={`px-3 py-1 rounded-full text-[11px] font-bold shrink-0 transition-all cursor-pointer ${
                statusFilter === 'active'
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'bg-slate-100 text-slate-600'
              }`}
            >
              Active
            </button>
            <button
              onClick={() => setStatusFilter('all')}
              className={`px-3 py-1 rounded-full text-[11px] font-bold shrink-0 transition-all cursor-pointer ${
                statusFilter === 'all'
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'bg-slate-100 text-slate-600'
              }`}
            >
              All Statuses
            </button>

            <button
              onClick={() => setShowMobileFilterDrawer(!showMobileFilterDrawer)}
              className={`flex items-center gap-1 px-3 py-1 rounded-full text-[11px] font-bold shrink-0 transition-all border cursor-pointer ${
                showMobileFilterDrawer || selectedCourseFilter
                  ? 'bg-blue-50 text-blue-700 border-blue-200'
                  : 'bg-slate-100 text-slate-600 border-slate-200'
              }`}
            >
              <Filter size={11} />
              <span>Range & Course</span>
              {selectedCourseFilter ? (
                <span className="w-1.5 h-1.5 rounded-full bg-blue-600"></span>
              ) : null}
            </button>
          </div>

          {showMobileFilterDrawer && (
            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200/80 space-y-3 animate-in fade-in slide-in-from-top-1">
              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Course</label>
                <select
                  value={selectedCourseFilter}
                  onChange={(e) => setSelectedCourseFilter(e.target.value)}
                  className="w-full px-3 py-1.5 rounded-lg border border-slate-200 bg-white text-xs font-medium cursor-pointer"
                >
                  <option value="">All Courses</option>
                  {coursesList.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Month Range</label>
                <div className="flex items-center gap-1">
                  <select
                    value={fromMonth}
                    onChange={(e) => setFromMonth(e.target.value)}
                    className="px-2 py-1.5 rounded-lg border border-slate-200 bg-white text-xs font-medium flex-1 cursor-pointer"
                  >
                    {Object.keys(monthsMap).map(m => <option key={m} value={m}>{m}</option>)}
                  </select>
                  <input
                    type="number"
                    value={fromYear}
                    onChange={(e) => setFromYear(e.target.value)}
                    className="w-14 px-1 py-1.5 rounded-lg border border-slate-200 bg-white text-xs font-mono font-medium text-center"
                  />
                  <span className="text-slate-400 text-xs">to</span>
                  <select
                    value={toMonth}
                    onChange={(e) => setToMonth(e.target.value)}
                    className="px-2 py-1.5 rounded-lg border border-slate-200 bg-white text-xs font-medium flex-1 cursor-pointer"
                  >
                    {Object.keys(monthsMap).map(m => <option key={m} value={m}>{m}</option>)}
                  </select>
                  <input
                    type="number"
                    value={toYear}
                    onChange={(e) => setToYear(e.target.value)}
                    className="w-14 px-1 py-1.5 rounded-lg border border-slate-200 bg-white text-xs font-mono font-medium text-center"
                  />
                </div>
              </div>
            </div>
          )}
        </div>

        {/* DESKTOP FILTER BAR (>= md) */}
        <div className="hidden md:grid md:grid-cols-2 lg:grid-cols-4 gap-4">
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
      </div>

      {/* MOBILE CARDS VIEW (< md) */}
      <div className="block md:hidden space-y-3.5">
        {finalDisplayList.length > 0 ? (
          finalDisplayList.map((item, idx) => {
            const isPaid = item.statusType === 'paid';
            const isPartial = item.statusType === 'partial';

            return (
              <div
                key={`mob_${item.studentId}_${idx}`}
                className="p-4 space-y-3 bg-white rounded-2xl border border-slate-300 shadow-[0_2px_10px_rgba(15,23,42,0.06)] hover:shadow-md transition-shadow relative overflow-hidden"
              >
                {/* Status Indicator Left Accent */}
                <div className={`absolute top-0 left-0 bottom-0 w-1.5 ${
                  isPaid ? 'bg-emerald-500' : (isPartial ? 'bg-amber-500' : 'bg-rose-500')
                }`} />

                {/* Header */}
                <div className="flex items-start justify-between gap-2 pl-1">
                  <div>
                    <div className="font-extrabold text-slate-950 text-base leading-tight">{item.name}</div>
                    <span className="inline-block font-mono font-extrabold text-blue-900 bg-blue-100 px-2 py-0.5 rounded-md border border-blue-200 text-xs mt-1">
                      {item.studentId}
                    </span>
                  </div>
                  <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider shrink-0 shadow-2xs ${
                    isPaid
                      ? 'bg-emerald-600 text-white'
                      : (isPartial ? 'bg-amber-500 text-white' : 'bg-rose-600 text-white')
                  }`}>
                    {item.label}
                  </span>
                </div>

                {/* Course & Month Shaded Banner */}
                <div className="flex items-center justify-between text-xs bg-slate-50 p-2.5 rounded-xl border border-slate-200">
                  <span className="font-bold text-slate-900 truncate mr-2">{item.courseName}</span>
                  <span className="font-mono text-slate-800 font-extrabold shrink-0 bg-white px-2 py-0.5 rounded-lg border border-slate-300 shadow-2xs">
                    {item.month} {item.year}
                  </span>
                </div>

                {/* 3 High-Contrast Financial Metric Pods */}
                <div className="grid grid-cols-3 gap-2 text-center pt-0.5">
                  <div className="p-2.5 bg-slate-100 rounded-xl border border-slate-200">
                    <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Fee</div>
                    <div className="text-xs font-mono font-extrabold text-slate-900 mt-0.5">
                      PKR {Number(item.agreedFee).toLocaleString()}
                    </div>
                  </div>
                  <div className="p-2.5 bg-emerald-50 rounded-xl border border-emerald-200">
                    <div className="text-[10px] font-bold text-emerald-700 uppercase tracking-wider">Paid</div>
                    <div className="text-xs font-mono font-black text-emerald-800 mt-0.5">
                      {item.paid > 0 ? `PKR ${Number(item.paid).toLocaleString()}` : '0'}
                    </div>
                  </div>
                  <div className={`p-2.5 rounded-xl border ${item.balance > 0 ? 'bg-rose-50 border-2 border-rose-300 shadow-2xs' : 'bg-emerald-50 border border-emerald-200'}`}>
                    <div className={`text-[10px] font-bold uppercase tracking-wider ${item.balance > 0 ? 'text-rose-700' : 'text-emerald-700'}`}>
                      Balance
                    </div>
                    <div className={`text-xs font-mono font-black mt-0.5 ${item.balance > 0 ? 'text-rose-700 text-sm' : 'text-emerald-800'}`}>
                      {item.balance > 0 ? `PKR ${Number(item.balance).toLocaleString()}` : 'Cleared'}
                    </div>
                  </div>
                </div>

                {item.payDate && (
                  <div className="text-xs text-slate-500 text-right pt-1 border-t border-slate-100">
                    Payment Date: <span className="font-mono text-slate-900 font-bold">{item.payDate}</span>
                  </div>
                )}
              </div>
            );
          })
        ) : (
          <div className="p-8 text-center text-slate-500 bg-white rounded-2xl border border-slate-300/80 shadow-xs">
            No fee records found matching your filters.
          </div>
        )}
      </div>

      {/* DESKTOP TABLE CARD (>= md) */}
      <div className="hidden md:block bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
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
                        <div>{item.month} {item.year}</div>
                        {item.payDate && (
                          <div className="text-[10px] text-slate-400 font-sans font-normal">
                            Paid: <span className="font-mono text-slate-600">{item.payDate}</span>
                          </div>
                        )}
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
