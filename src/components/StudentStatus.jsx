import React, { useState, useEffect } from 'react';
import { db } from '../firebase.js';
import { ref, onValue, update } from 'firebase/database';
import * as XLSX from 'xlsx';
import toast from 'react-hot-toast';
import { parseLocalDateMidday } from '../utils/monthUtils';
import {
  UserCheck,
  Search,
  Download,
  RefreshCw,
  Calendar,
  Filter,
  ArrowUpDown,
  CheckCircle2,
  Clock,
  BookOpen
} from 'lucide-react';

const StudentStatus = () => {
  const [students, setStudents] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(false);
  const [selectedCourseStatus, setSelectedCourseStatus] = useState({});
  const [selectedCustomDates, setSelectedCustomDates] = useState({});
  const [selectedStartDates, setSelectedStartDates] = useState({});
  const [status, setStatus] = useState({ type: '', msg: '' });
  const [selectedCourseFilter, setSelectedCourseFilter] = useState('');
  const [selectedStatusFilter, setSelectedStatusFilter] = useState('');
  const [selectedMonthFilter, setSelectedMonthFilter] = useState('');
  const [sortOrder, setSortOrder] = useState('asc');

  const months = [
    { val: '01', label: 'January' }, { val: '02', label: 'February' },
    { val: '03', label: 'March' }, { val: '04', label: 'April' },
    { val: '05', label: 'May' }, { val: '06', label: 'June' },
    { val: '07', label: 'July' }, { val: '08', label: 'August' },
    { val: '09', label: 'September' }, { val: '10', label: 'October' },
    { val: '11', label: 'November' }, { val: '12', label: 'December' }
  ];

  const allUniqueCourses = Array.from(new Set(
    students.flatMap(s => Object.values(s.enrolled_courses || {}).map(c => c.course_name))
  )).sort();

  useEffect(() => {
    const studentsRef = ref(db, 'students');
    const unsubscribe = onValue(studentsRef, (snap) => {
      const data = snap.val();
      setStudents(data ? Object.keys(data).map(id => ({ id, ...data[id] })) : []);
    });
    return () => unsubscribe();
  }, []);

  const formatDate = (dateString) => {
    if (!dateString) return null;
    return new Date(dateString).toLocaleDateString('en-GB', {
      day: '2-digit', month: 'short', year: 'numeric', timeZone: 'UTC'
    });
  };

  const downloadExcel = () => {
    const excelData = [];

    filteredStudents.forEach(s => {
      s.filteredCourses.forEach(([cId, cData]) => {
        excelData.push({
          "Student ID": s.student_id,
          "Name": s.name,
          "Account Status": s.status?.toUpperCase(),
          "Course Name": cData.course_name,
          "Course Status": cData.course_status,
          "Start Date": formatDate(cData.enrolledAt) || "N/A",
          "Status Date": cData.course_status === 'active' ? 'In Progress' : formatDate(cData.course_status_date),
          "Contact": s.contact || "N/A"
        });
      });
    });

    const worksheet = XLSX.utils.json_to_sheet(excelData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Student Records");
    XLSX.writeFile(workbook, `Student_Status_Report_${new Date().toLocaleDateString()}.xlsx`);
  };

  const handleStatusUpdate = async (studentId, courseId) => {
    const newCourseStatus = selectedCourseStatus[`${studentId}_${courseId}`];
    const customStatusDate = selectedCustomDates[`${studentId}_${courseId}`];
    const customStartDate = selectedStartDates[`${studentId}_${courseId}`];

    if (!newCourseStatus && !customStartDate) {
      toast.error("Please select a new status or change start date first.");
      return;
    }

    const parseLocalDate = (dateStr) => parseLocalDateMidday(dateStr);

    setLoading(true);
    try {
      const student = students.find(s => s.id === studentId);
      const updateDate = customStatusDate ? parseLocalDate(customStatusDate).toISOString() : new Date().toISOString();
      const currentCourseData = student.enrolled_courses[courseId];

      const masterUpdate = {
        [`students/${studentId}/statusUpdatedAt`]: new Date().toISOString()
      };

      if (newCourseStatus) {
        masterUpdate[`students/${studentId}/enrolled_courses/${courseId}/course_status`] = newCourseStatus;
        masterUpdate[`students/${studentId}/enrolled_courses/${courseId}/course_status_date`] = updateDate;

        const updatedEnrolledCourses = {
          ...student.enrolled_courses,
          [courseId]: { ...currentCourseData, course_status: newCourseStatus }
        };
        const allFinished = Object.values(updatedEnrolledCourses).every(
          c => c.course_status === 'coursecomplete' || c.course_status === 'dropout'
        );
        masterUpdate[`students/${studentId}/status`] = allFinished ? 'inactive' : 'active';
      }

      if (customStartDate) {
        masterUpdate[`students/${studentId}/enrolled_courses/${courseId}/enrolledAt`] = parseLocalDate(customStartDate).toISOString();
      }

      await update(ref(db), masterUpdate);
      toast.success(`Records updated successfully!`);
      setSelectedStartDates(prev => { delete prev[`${studentId}_${courseId}`]; return { ...prev }; });
    } catch (err) {
      toast.error("Update failed: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  const filteredStudents = students.map(s => {
    const hasActiveCourse = Object.values(s.enrolled_courses || {}).some(c => c.course_status === 'active');
    const computedStatus = hasActiveCourse ? 'active' : s.status;

    const matchesSearch = s.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      s.student_id?.toLowerCase().includes(searchTerm.toLowerCase());

    const filteredEnrolledCourses = Object.entries(s.enrolled_courses || {}).filter(([cId, cData]) => {
      const matchesCourseFilter = selectedCourseFilter === '' || cData.course_name === selectedCourseFilter;
      const matchesStatusFilter = selectedStatusFilter === '' || cData.course_status === selectedStatusFilter;
      let matchesMonthFilter = true;
      if (selectedMonthFilter !== '' && cData.enrolledAt) {
        const d = new Date(cData.enrolledAt);
        if (!isNaN(d.getTime())) {
          const monthNumStr = String(d.getMonth() + 1).padStart(2, '0');
          matchesMonthFilter = monthNumStr === selectedMonthFilter;
        } else {
          matchesMonthFilter = false;
        }
      }
      return matchesCourseFilter && matchesStatusFilter && matchesMonthFilter;
    });

    return {
      ...s,
      status: computedStatus,
      matchesSearch,
      filteredCourses: filteredEnrolledCourses
    };
  }).filter(s => s.matchesSearch && s.filteredCourses.length > 0)
    .sort((a, b) => {
      if (!a.student_id || !b.student_id) return 0;
      return sortOrder === 'asc'
        ? a.student_id.localeCompare(b.student_id, undefined, { numeric: true })
        : b.student_id.localeCompare(a.student_id, undefined, { numeric: true });
    });

  return (
    <div className="space-y-6 font-sans animate-fade-in">
      {/* HEADER */}
      <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-200/80">
        <div>
          <div className="flex items-center gap-2">
            <UserCheck className="text-blue-600" size={24} />
            <h1 className="text-2xl md:text-3xl font-extrabold text-slate-900 tracking-tight">Student Status Lifecycle</h1>
          </div>
          <p className="text-sm text-slate-500 mt-1 font-medium">Course graduation, dropouts, enrollment start dates & sync</p>
        </div>
        <button
          onClick={downloadExcel}
          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition-all shadow-xs w-fit"
        >
          <Download size={14} />
          <span>Export Excel</span>
        </button>
      </header>

      {/* FILTER CONTROLS */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3.5">
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

        {/* Course Filter */}
        <div>
          <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">
            Course
          </label>
          <select
            value={selectedCourseFilter}
            onChange={(e) => setSelectedCourseFilter(e.target.value)}
            className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-slate-50 text-xs font-medium focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
          >
            <option value="">All Courses</option>
            {allUniqueCourses.map(cName => <option key={cName} value={cName}>{cName}</option>)}
          </select>
        </div>

        {/* Status Filter */}
        <div>
          <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">
            Course Status
          </label>
          <select
            value={selectedStatusFilter}
            onChange={(e) => setSelectedStatusFilter(e.target.value)}
            className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-slate-50 text-xs font-medium focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
          >
            <option value="">All Statuses</option>
            <option value="active">Active Only</option>
            <option value="coursecomplete">Graduated Only</option>
            <option value="dropout">Dropout Only</option>
          </select>
        </div>

        {/* Month Filter */}
        <div>
          <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">
            Enrollment Month
          </label>
          <select
            value={selectedMonthFilter}
            onChange={(e) => setSelectedMonthFilter(e.target.value)}
            className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-slate-50 text-xs font-medium focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
          >
            <option value="">All Months</option>
            {months.map(m => <option key={m.val} value={m.val}>{m.label}</option>)}
          </select>
        </div>

        {/* Sort Order */}
        <div>
          <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">
            Sort ID
          </label>
          <select
            value={sortOrder}
            onChange={(e) => setSortOrder(e.target.value)}
            className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-slate-50 text-xs font-medium focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
          >
            <option value="asc">ID Ascending</option>
            <option value="desc">ID Descending</option>
          </select>
        </div>
      </div>

      {/* TABLE CARD */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
        <div className="p-4 bg-slate-50/70 border-b border-slate-200/80 flex items-center justify-between text-xs font-bold text-slate-600">
          <span>Student Cohorts ({filteredStudents.length})</span>
          <span className="text-slate-400 font-normal">Realtime sync enabled</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 uppercase font-bold tracking-wider text-[11px]">
                <th className="py-3 px-4 w-48">Student Identity</th>
                <th className="py-3 px-4 w-28 text-center">Account</th>
                <th className="py-3 px-4">Enrollment & Status Controls</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredStudents.length > 0 ? (
                filteredStudents.map(s => (
                  <tr key={s.id} className="hover:bg-slate-50/50 transition-colors">
                    {/* Student Identity */}
                    <td className="py-4 px-4 align-top">
                      <div className="flex items-start gap-2.5">
                        {s.profile_image ? (
                          <img
                            src={s.profile_image}
                            alt={s.name}
                            className="w-8 h-8 rounded-lg object-cover border border-slate-200 shrink-0 mt-0.5 shadow-2xs"
                          />
                        ) : (
                          <div className="w-8 h-8 rounded-lg bg-slate-100 text-slate-600 flex items-center justify-center font-bold text-xs shrink-0 mt-0.5">
                            {s.name?.charAt(0) || '?'}
                          </div>
                        )}
                        <div className="min-w-0">
                          <div className="font-mono text-blue-600 font-bold text-xs">{s.student_id}</div>
                          <div className="font-bold text-slate-900 text-sm">{s.name}</div>
                          {s.contact && (
                            <div className="text-[11px] text-slate-500 font-mono">{s.contact}</div>
                          )}
                          {s.secondary_contact && (
                            <div className="text-[10px] text-slate-400 font-mono">Parent: {s.secondary_contact}</div>
                          )}
                        </div>
                      </div>
                    </td>

                    {/* Account Status */}
                    <td className="py-4 px-4 align-top text-center">
                      <span className={`inline-block px-2.5 py-1 rounded-full text-[10px] font-bold border uppercase tracking-wider ${
                        s.status === 'active'
                          ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                          : 'bg-slate-100 text-slate-600 border-slate-200'
                      }`}>
                        {s.status?.toUpperCase() || 'ACTIVE'}
                      </span>
                    </td>

                    {/* Courses Sub-rows */}
                    <td className="py-3 px-4">
                      <div className="divide-y divide-slate-100">
                        {s.filteredCourses.map(([cId, cData]) => {
                          const isActive = cData.course_status === 'active';
                          return (
                            <div key={cId} className="py-3 first:pt-0 last:pb-0 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                              <div className="space-y-1">
                                <div className="flex items-center gap-2">
                                  <span className="font-bold text-slate-900 text-sm">{cData.course_name}</span>
                                  <span className={`inline-flex items-center gap-1 text-[11px] font-bold ${
                                    isActive ? 'text-emerald-600' : 'text-rose-600'
                                  }`}>
                                    <span className={`w-1.5 h-1.5 rounded-full ${isActive ? 'bg-emerald-500' : 'bg-rose-500'}`}></span>
                                    {cData.course_status}
                                  </span>
                                </div>
                                <div className="flex items-center gap-4 text-[11px] text-slate-500 font-medium">
                                  <span className="flex items-center gap-1">
                                    <Calendar size={12} className="text-slate-400" />
                                    <span>Start: <b>{formatDate(cData.enrolledAt) || "N/A"}</b></span>
                                  </span>
                                  <span className="flex items-center gap-1">
                                    <Clock size={12} className="text-slate-400" />
                                    <span>
                                      End: {isActive ? (
                                        <span className="text-blue-600 font-bold">In Progress</span>
                                      ) : (
                                        <b>{formatDate(cData.course_status_date)}</b>
                                      )}
                                    </span>
                                  </span>
                                </div>
                              </div>

                              {/* Controls */}
                              <div className="flex items-center gap-2 flex-wrap">
                                <div>
                                  <label className="block text-[9px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                                    Start Date
                                  </label>
                                  <input
                                    type="date"
                                    onChange={(e) => setSelectedStartDates(prev => ({ ...prev, [`${s.id}_${cId}`]: e.target.value }))}
                                    className="px-2 py-1 rounded-lg border border-slate-200 bg-slate-50 text-[11px] font-medium"
                                  />
                                </div>

                                <div>
                                  <label className="block text-[9px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                                    Status Date
                                  </label>
                                  <input
                                    type="date"
                                    onChange={(e) => setSelectedCustomDates(prev => ({ ...prev, [`${s.id}_${cId}`]: e.target.value }))}
                                    className="px-2 py-1 rounded-lg border border-slate-200 bg-slate-50 text-[11px] font-medium"
                                  />
                                </div>

                                <div>
                                  <label className="block text-[9px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                                    New Status
                                  </label>
                                  <select
                                    onChange={(e) => setSelectedCourseStatus(prev => ({ ...prev, [`${s.id}_${cId}`]: e.target.value }))}
                                    className="px-2.5 py-1.5 rounded-lg border border-slate-200 bg-slate-50 text-xs font-medium"
                                  >
                                    <option value="">No Change</option>
                                    <option value="active">Active</option>
                                    <option value="coursecomplete">Graduated</option>
                                    <option value="dropout">Dropout</option>
                                  </select>
                                </div>

                                <button
                                  onClick={() => handleStatusUpdate(s.id, cId)}
                                  disabled={loading}
                                  className="mt-4 px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-xs transition-all flex items-center gap-1.5 disabled:opacity-60"
                                >
                                  <RefreshCw size={12} className={loading ? "animate-spin" : ""} />
                                  <span>Sync</span>
                                </button>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="3" className="py-12 text-center text-slate-400 text-xs">
                    No matching student records found.
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

export default StudentStatus;
