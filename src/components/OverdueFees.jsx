import React, { useState, useEffect } from 'react';
import { db } from '../firebase.js';
import { ref, onValue } from 'firebase/database';
import { Phone, MessageCircle, AlertCircle, Search, RotateCcw, Download, Calendar, Users, FileText } from 'lucide-react';
import { MONTHS_SHORT, normalizeMonth, normalizeMonthKey, resolveFeeRecord, getCanonicalShortMonth } from '../utils/monthUtils';

const OverdueFees = () => {
  const [students, setStudents] = useState([]);
  const [feesData, setFeesData] = useState({});
  const [coursesList, setCoursesList] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');

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
  };

  const getSingleMonthStatus = (studentId, courseId, monthKey, agreedFee) => {
    const record = resolveFeeRecord(studentId, courseId, monthKey, feesData);
    if (!record) {
      return { label: 'Unpaid', paid: 0, waived: 0, balance: Number(agreedFee || 0) };
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
      return { label: 'Paid', paid, waived, balance: 0 };
    }

    if (totalSettled > 0) {
      return { label: 'Partial', paid, waived, balance: computedBalance };
    }

    return { label: 'Unpaid', paid: 0, waived: 0, balance: feeAmount };
  };

  let rawList = [];
  const today = new Date();

  students.forEach(student => {
    if (student.status === 'inactive') return;

    const courses = student.enrolled_courses || {};
    Object.keys(courses).forEach(courseId => {
      const courseInfo = courses[courseId];
      const matchesSearch = student.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        student.student_id?.toLowerCase().includes(searchTerm.toLowerCase());

      if (matchesSearch) {
        if (!courseInfo.enrolledAt) return;
        if (courseInfo.course_status !== 'active') return;

        const enrollDate = new Date(courseInfo.enrolledAt);
        const endDate = courseInfo.course_status_date ? new Date(courseInfo.course_status_date) : today;

        const startBoundary = new Date(enrollDate.getFullYear(), enrollDate.getMonth(), 1);
        let endBoundary = new Date(endDate.getFullYear(), endDate.getMonth(), 1);
        const cycleStartThisMonth = new Date(endDate.getFullYear(), endDate.getMonth(), enrollDate.getDate());

        if (endDate <= cycleStartThisMonth) {
          endBoundary.setMonth(endBoundary.getMonth() - 1);
        }

        if (endBoundary < startBoundary) {
          endBoundary = new Date(startBoundary);
        }

        const currentMonthBoundary = new Date(today.getFullYear(), today.getMonth(), 1);
        const actualEndBoundary = endBoundary > currentMonthBoundary ? currentMonthBoundary : endBoundary;

        let current = new Date(startBoundary);

        while (current <= actualEndBoundary) {
          const mLabel = getCanonicalShortMonth(current);
          const yLabel = current.getFullYear();
          const monthKey = `${mLabel}_${yLabel}`;

          const status = getSingleMonthStatus(student.id, courseId, monthKey, courseInfo.agreed_monthly_fee);

          if (status.balance > 0) {
            const enrollmentDay = enrollDate.getDate();
            const daysInMonth = new Date(current.getFullYear(), current.getMonth() + 1, 0).getDate();
            const dueDateDay = Math.min(enrollmentDay + 10, daysInMonth);
            const dueDate = new Date(current.getFullYear(), current.getMonth(), dueDateDay);
            dueDate.setHours(0, 0, 0, 0);

            const todayDate = new Date();
            todayDate.setHours(0, 0, 0, 0);

            if (todayDate > dueDate) {
              const timeDiff = todayDate.getTime() - dueDate.getTime();
              const daysOverdue = Math.ceil(timeDiff / (1000 * 3600 * 24));

              rawList.push({
                studentId: student.student_id,
                name: student.name,
                phone: student.contact || '',
                studentStatus: student.status,
                courseName: courseInfo.course_name,
                monthStr: `${mLabel} ${yLabel}`,
                agreedFee: courseInfo.agreed_monthly_fee,
                dueDateStr: dueDate.toLocaleDateString('en-GB'),
                daysOverdue: daysOverdue,
                sortValue: dueDate.getTime(),
                balance: status.balance,
                paid: status.paid,
                waived: status.waived,
                label: status.label
              });
            }
          }

          current.setMonth(current.getMonth() + 1);
        }
      }
    });
  });

  const grouped = {};
  rawList.forEach(item => {
    const key = `${item.studentId}_${item.courseName}`;
    if (!grouped[key]) {
      grouped[key] = {
        ...item,
        monthsList: [item.monthStr],
        totalBalance: item.balance
      };
    } else {
      grouped[key].monthsList.push(item.monthStr);
      grouped[key].totalBalance += item.balance;
      if (item.daysOverdue > grouped[key].daysOverdue) {
        grouped[key].daysOverdue = item.daysOverdue;
        grouped[key].dueDateStr = item.dueDateStr;
        grouped[key].sortValue = item.sortValue;
      }
    }
  });

  let finalDisplayList = Object.values(grouped);
  finalDisplayList.sort((a, b) => b.daysOverdue - a.daysOverdue);

  const totalOverdueAmount = finalDisplayList.reduce((acc, curr) => acc + curr.totalBalance, 0);

  const handleWhatsApp = (phone, name, months, balance, dueDate) => {
    if (!phone) {
      alert("No phone number available for this student.");
      return;
    }

    let cleanPhone = phone.replace(/[^0-9]/g, '');
    if (cleanPhone.startsWith('0')) {
      cleanPhone = '92' + cleanPhone.slice(1);
    } else if (!cleanPhone.startsWith('92')) {
      cleanPhone = '92' + cleanPhone;
    }

    const message = `Dear ${name}, this is an urgent reminder from Techflex Management that your tuition fee for (${months}) amounting to PKR ${balance.toLocaleString()} was due on ${dueDate}. Please clear your dues at your earliest convenience to avoid any disruption to your classes. Thank you.`;

    const encodedMessage = encodeURIComponent(message);
    const url = `https://api.whatsapp.com/send?phone=${cleanPhone}&text=${encodedMessage}`;
    window.open(url, '_blank');
  };

  const exportToExcel = () => {
    const headers = ["Student ID", "Student Name", "Phone", "Course", "Overdue Months", "Due Date", "Days Overdue", "Total Balance"];
    const rows = finalDisplayList.map(item => [
      item.studentId,
      `"${item.name}"`,
      `"${item.phone}"`,
      `"${item.courseName}"`,
      `"${item.monthsList.join(', ')}"`,
      item.dueDateStr,
      item.daysOverdue,
      item.totalBalance
    ]);
    const csvContent = [headers, ...rows].map(e => e.join(",")).join("\n");
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `Overdue_Fees_Report_${new Date().toLocaleDateString()}.csv`;
    link.click();
  };

  return (
    <div className="space-y-6 font-sans animate-fade-in">
      {/* HEADER */}
      <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-200/80">
        <div>
          <div className="flex items-center gap-2">
            <AlertCircle className="text-rose-600" size={24} />
            <h1 className="text-2xl md:text-3xl font-extrabold text-slate-900 tracking-tight">Overdue Tuition Fees</h1>
          </div>
          <p className="text-sm text-slate-500 mt-1 font-medium">Delinquency tracking, aging reports & WhatsApp reminders</p>
        </div>
        <div className="flex items-center gap-2.5">
          <button
            onClick={handleReset}
            className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 text-xs font-bold transition-all shadow-xs"
          >
            <RotateCcw size={14} className="text-slate-400" />
            <span>Reset Search</span>
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

      {/* SUMMARY METRIC CARDS */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-rose-50/60 p-5 rounded-2xl border border-rose-200/80 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-rose-700 uppercase tracking-wider">Overdue Students</span>
            <Users size={18} className="text-rose-500" />
          </div>
          <p className="text-2xl font-black font-mono text-rose-900 mt-2">
            {new Set(finalDisplayList.map(i => i.studentId)).size}
          </p>
        </div>

        <div className="bg-amber-50/60 p-5 rounded-2xl border border-amber-200/80 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-amber-700 uppercase tracking-wider">Overdue Invoices</span>
            <FileText size={18} className="text-amber-500" />
          </div>
          <p className="text-2xl font-black font-mono text-amber-900 mt-2">
            {finalDisplayList.length}
          </p>
        </div>

        <div className="bg-emerald-50/60 p-5 rounded-2xl border border-emerald-200/80 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-emerald-700 uppercase tracking-wider">Total Outstanding</span>
            <AlertCircle size={18} className="text-emerald-500" />
          </div>
          <p className="text-2xl font-black font-mono text-emerald-900 mt-2">
            PKR {totalOverdueAmount.toLocaleString()}
          </p>
        </div>
      </div>

      {/* FILTER SEARCH BAR */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs">
        <div className="relative max-w-md">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
          <input
            type="text"
            placeholder="Search overdue students by name or ID..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 rounded-xl border border-slate-200 bg-slate-50 text-xs font-medium focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
          />
        </div>
      </div>

      {/* TABLE CARD */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
        <div className="p-4 bg-slate-50/70 border-b border-slate-200/80 flex items-center justify-between text-xs font-bold text-slate-600">
          <span>Delinquent Accounts ({finalDisplayList.length})</span>
          <span className="text-slate-400 font-normal">Sorted by highest overdue days</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 uppercase font-bold tracking-wider text-[11px]">
                <th className="py-3 px-4">Student</th>
                <th className="py-3 px-4">Course</th>
                <th className="py-3 px-4">Billing Months</th>
                <th className="py-3 px-4">Due Date</th>
                <th className="py-3 px-4 text-center">Overdue</th>
                <th className="py-3 px-4 text-right">Balance</th>
                <th className="py-3 px-4 text-center">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {finalDisplayList.length > 0 ? (
                finalDisplayList.map((item, idx) => (
                  <tr key={`${item.studentId}_${idx}`} className="hover:bg-slate-50/70 transition-colors">
                    <td className="py-3.5 px-4">
                      <div className="font-bold text-slate-900">{item.name}</div>
                      <div className="text-[11px] font-mono text-slate-500 flex items-center gap-2 mt-0.5">
                        <span className="text-blue-600 font-semibold">{item.studentId}</span>
                        {item.phone && <span>• {item.phone}</span>}
                      </div>
                    </td>
                    <td className="py-3.5 px-4 font-medium text-slate-700">{item.courseName}</td>
                    <td className="py-3.5 px-4">
                      <div className="flex flex-wrap gap-1 max-w-[200px]">
                        {item.monthsList.map((m, i) => (
                          <span
                            key={i}
                            className="bg-slate-100 text-slate-700 font-mono text-[10px] px-2 py-0.5 rounded-md border border-slate-200"
                          >
                            {m}
                          </span>
                        ))}
                      </div>
                    </td>
                    <td className="py-3.5 px-4 font-mono font-medium text-slate-700">{item.dueDateStr}</td>
                    <td className="py-3.5 px-4 text-center">
                      <span className="inline-block px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold bg-rose-50 text-rose-700 border border-rose-200">
                        {item.daysOverdue} Days
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-right font-mono font-black text-rose-600 text-sm">
                      PKR {item.totalBalance.toLocaleString()}
                    </td>
                    <td className="py-3.5 px-4 text-center">
                      <div className="inline-flex items-center gap-1.5 whitespace-nowrap">
                        <button
                          onClick={() => handleWhatsApp(item.phone, item.name, item.monthsList.join(', '), item.totalBalance, item.dueDateStr)}
                          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-[11px] shadow-xs transition-colors"
                          title="Send WhatsApp Reminder"
                        >
                          <MessageCircle size={13} />
                          <span>Reminder</span>
                        </button>
                        {item.phone && (
                          <a
                            href={`tel:${item.phone}`}
                            className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-[11px] transition-colors"
                            title="Call Student"
                          >
                            <Phone size={12} />
                            <span>Call</span>
                          </a>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="7" className="py-12 text-center text-slate-400 text-xs">
                    No overdue fee records found. All accounts are up to date! 🎉
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

export default OverdueFees;
