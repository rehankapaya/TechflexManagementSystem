import React, { useState, useMemo } from 'react';
import { useData } from '../contexts/DataContext';
import {
  GraduationCap,
  Users,
  Search,
  Filter,
  ArrowRight,
  Calendar,
  DollarSign,
  CheckCircle2,
  Clock,
  Sparkles,
  BookOpen,
  History,
  UserCheck,
  ChevronRight,
  AlertCircle,
  X,
  ExternalLink
} from 'lucide-react';
import CoachingReenrollModal from './CoachingReenrollModal';
import {
  DEFAULT_ACADEMIC_SESSIONS,
  getCurrentAcademicSession,
  getNextAcademicSession,
  getNextGradeSuggestion,
  formatSessionDisplay,
  isSessionMatch,
  normalizeAcademicSession
} from '../utils/sessionUtils';
import { COACHING_GRADES } from '../utils/admissionFormOcrParser';

const CoachingReenrollment = () => {
  const { coachingStudents = [] } = useData();

  const [searchTerm, setSearchTerm] = useState('');
  const [selectedGrade, setSelectedGrade] = useState('ALL');
  const [activeTab, setActiveTab] = useState('pending'); // 'pending' | 'all' | 'enrolled_2025' | 'multi'
  const [selectedStudentForModal, setSelectedStudentForModal] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [quickSearchTerm, setQuickSearchTerm] = useState('');
  const [quickSelectedStudent, setQuickSelectedStudent] = useState(null);
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [historyStudent, setHistoryStudent] = useState(null);

  // Current and Next session references
  const currentSessionName = '2024-2025';
  const nextSessionName = '2025-2026';

  // Metrics computation
  const metrics = useMemo(() => {
    let in2024 = 0;
    let in2025 = 0;
    let multiSession = 0;
    let pendingPromotion = 0;

    coachingStudents.forEach((student) => {
      const sessKeys = student.sessions ? Object.keys(student.sessions) : [];
      const has2024 = sessKeys.some((s) => isSessionMatch(s, '2024-2025')) ||
        isSessionMatch(student.current_session || student.session, '2024-2025');
      const has2025 = sessKeys.some((s) => isSessionMatch(s, '2025-2026')) ||
        isSessionMatch(student.current_session || student.session, '2025-2026');

      if (has2024) in2024++;
      if (has2025) in2025++;
      if (sessKeys.length > 1) multiSession++;
      if (has2024 && !has2025) pendingPromotion++;
    });

    return {
      total: coachingStudents.length,
      in2024,
      in2025,
      multiSession,
      pendingPromotion
    };
  }, [coachingStudents]);

  // Filtered students for table
  const filteredStudents = useMemo(() => {
    return coachingStudents.filter((student) => {
      const q = searchTerm.toLowerCase();
      const matchSearch =
        !searchTerm ||
        (student.name && student.name.toLowerCase().includes(q)) ||
        (student.roll_no && student.roll_no.toLowerCase().includes(q)) ||
        (student.contact && student.contact.includes(q)) ||
        (student.contact_number && student.contact_number.includes(q));

      const matchGrade = selectedGrade === 'ALL' || student.grade === selectedGrade;

      const sessKeys = student.sessions ? Object.keys(student.sessions) : [];
      const has2024 = sessKeys.some((s) => isSessionMatch(s, '2024-2025')) ||
        isSessionMatch(student.current_session || student.session, '2024-2025');
      const has2025 = sessKeys.some((s) => isSessionMatch(s, '2025-2026')) ||
        isSessionMatch(student.current_session || student.session, '2025-2026');

      let matchTab = true;
      if (activeTab === 'pending') {
        // Enrolled in 2024-2025 but NOT yet enrolled in 2025-2026
        matchTab = has2024 && !has2025;
      } else if (activeTab === 'enrolled_2025') {
        matchTab = has2025;
      } else if (activeTab === 'multi') {
        matchTab = sessKeys.length > 1;
      }

      return matchSearch && matchGrade && matchTab;
    });
  }, [coachingStudents, searchTerm, selectedGrade, activeTab]);

  // Quick search candidates
  const quickSearchCandidates = useMemo(() => {
    if (!quickSearchTerm.trim()) return [];
    const q = quickSearchTerm.toLowerCase();
    return coachingStudents
      .filter((s) => {
        return (
          (s.name && s.name.toLowerCase().includes(q)) ||
          (s.roll_no && s.roll_no.toLowerCase().includes(q)) ||
          (s.contact && s.contact.includes(q))
        );
      })
      .slice(0, 6);
  }, [coachingStudents, quickSearchTerm]);

  const handleOpenReenroll = (student) => {
    setSelectedStudentForModal(student);
    setIsModalOpen(true);
  };

  const handleOpenHistory = (student) => {
    setHistoryStudent(student);
    setShowHistoryModal(true);
  };

  return (
    <div className="space-y-6 font-sans animate-fade-in pb-12">
      {/* HEADER SECTION */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-200/80">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-indigo-600 to-indigo-700 flex items-center justify-center text-white shadow-md shadow-indigo-600/20 shrink-0">
            <GraduationCap size={22} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight">
                Coaching Re-enrollment
              </h1>
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-indigo-100 text-indigo-700 uppercase tracking-wide border border-indigo-200">
                Session Promotion
              </span>
            </div>
            <p className="text-xs text-slate-500 font-medium">
              Promote students to new academic sessions with upgraded classes and adjusted fee structures without duplicating records.
            </p>
          </div>
        </div>

        <button
          onClick={() => {
            if (filteredStudents.length > 0) {
              handleOpenReenroll(filteredStudents[0]);
            } else if (coachingStudents.length > 0) {
              handleOpenReenroll(coachingStudents[0]);
            }
          }}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 active:scale-95 text-white text-xs font-bold transition-all shadow-sm shadow-indigo-600/20"
        >
          <Sparkles size={15} />
          <span>Quick Promote</span>
        </button>
      </div>

      {/* KPI METRIC CARDS */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5">
        <div className="p-4 rounded-2xl bg-white border border-slate-300 md:border-slate-200/80 shadow-[0_2px_10px_rgba(15,23,42,0.06)] md:shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
              Pending Promotion
            </span>
            <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse"></span>
          </div>
          <div className="text-2xl font-extrabold text-amber-600 font-mono mt-1">
            {metrics.pendingPromotion}
          </div>
          <p className="text-[11px] text-slate-400 mt-0.5">
            In 2024-25, not yet in 2025-26
          </p>
        </div>

        <div className="p-4 rounded-2xl bg-white border border-slate-300 md:border-slate-200/80 shadow-[0_2px_10px_rgba(15,23,42,0.06)] md:shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
              Session 2024-25
            </span>
            <Users size={15} className="text-slate-500" />
          </div>
          <div className="text-2xl font-extrabold text-slate-800 font-mono mt-1">
            {metrics.in2024}
          </div>
          <p className="text-[11px] text-slate-400 mt-0.5">
            May 2024 – April 2025 cohort
          </p>
        </div>

        <div className="p-4 rounded-2xl bg-white border border-slate-300 md:border-slate-200/80 shadow-[0_2px_10px_rgba(15,23,42,0.06)] md:shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-emerald-600 uppercase tracking-wider">
              Session 2025-26
            </span>
            <CheckCircle2 size={15} className="text-emerald-600" />
          </div>
          <div className="text-2xl font-extrabold text-emerald-700 font-mono mt-1">
            {metrics.in2025}
          </div>
          <p className="text-[11px] text-slate-400 mt-0.5">
            May 2025 – April 2026 cohort
          </p>
        </div>

        <div className="p-4 rounded-2xl bg-white border border-slate-300 md:border-slate-200/80 shadow-[0_2px_10px_rgba(15,23,42,0.06)] md:shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-indigo-600 uppercase tracking-wider">
              Multi-Session Students
            </span>
            <History size={15} className="text-indigo-600" />
          </div>
          <div className="text-2xl font-extrabold text-indigo-700 font-mono mt-1">
            {metrics.multiSession}
          </div>
          <p className="text-[11px] text-slate-400 mt-0.5">
            Active in 2+ consecutive sessions
          </p>
        </div>
      </div>

      {/* QUICK RE-ENROLLMENT SEARCH BAR & INTERACTIVE WIDGET */}
      <div className="bg-gradient-to-br from-indigo-50/70 via-white to-slate-50 p-5 rounded-2xl border border-indigo-100 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h2 className="text-sm font-bold text-slate-800 flex items-center gap-2">
              <Sparkles size={16} className="text-indigo-600" />
              <span>Select Student to Re-enroll / Promote</span>
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Quickly find any student by Roll No (TFC-001), name, or phone number to start promotion.
            </p>
          </div>
        </div>

        <div className="relative">
          <div className="relative">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
            <input
              type="text"
              placeholder="Search student to promote (e.g. Raheed, TFC-001, Hamza)..."
              value={quickSearchTerm}
              onChange={(e) => setQuickSearchTerm(e.target.value)}
              className="w-full pl-10 pr-10 py-2.5 rounded-xl border border-slate-200 bg-white text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 transition-all shadow-2xs"
            />
            {quickSearchTerm && (
              <button
                onClick={() => setQuickSearchTerm('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              >
                <X size={15} />
              </button>
            )}
          </div>

          {/* Quick Search Dropdown Results */}
          {quickSearchCandidates.length > 0 && (
            <div className="absolute z-20 left-0 right-0 mt-2 bg-white rounded-2xl border border-slate-200 shadow-xl overflow-hidden divide-y divide-slate-100">
              {quickSearchCandidates.map((cand) => {
                const currentSess = cand.current_session || cand.session || '2024-2025';
                const nextSess = getNextAcademicSession(currentSess);
                const nextG = getNextGradeSuggestion(cand.grade || '');

                return (
                  <div
                    key={cand.id || cand.roll_no}
                    onClick={() => {
                      setQuickSelectedStudent(cand);
                      setQuickSearchTerm('');
                    }}
                    className="p-3.5 hover:bg-indigo-50/60 cursor-pointer transition-colors flex items-center justify-between gap-3"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-xl bg-indigo-100 text-indigo-700 flex items-center justify-center font-bold text-xs shrink-0">
                        {cand.roll_no?.replace('TFC-', '') || '#'}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold text-slate-800">{cand.name}</span>
                          <span className="font-mono text-[10px] font-bold text-indigo-600 bg-indigo-50 px-1.5 py-0.5 rounded border border-indigo-100">
                            {cand.roll_no}
                          </span>
                        </div>
                        <div className="text-[11px] text-slate-500 flex items-center gap-2 mt-0.5">
                          <span>{cand.grade || '—'}</span>
                          <span>•</span>
                          <span>Current Session: {currentSess}</span>
                          <span>•</span>
                          <span>PKR {Number(cand.monthly_fee || 0).toLocaleString()}</span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <span className="text-[11px] font-bold text-indigo-600 bg-indigo-50 px-2.5 py-1 rounded-lg border border-indigo-100 flex items-center gap-1">
                        <span>Select</span>
                        <ChevronRight size={13} />
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Selected Student Promotion Preview Card */}
        {quickSelectedStudent && (
          <div className="bg-white rounded-xl p-4 border border-indigo-200 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4 animate-scale-in">
            <div className="flex items-center gap-3.5">
              <div className="w-12 h-12 rounded-2xl bg-indigo-600 text-white flex items-center justify-center font-black text-sm shadow-md shadow-indigo-600/20 shrink-0">
                {quickSelectedStudent.roll_no?.replace('TFC-', '') || '#'}
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-sm font-extrabold text-slate-900">
                    {quickSelectedStudent.name}
                  </h3>
                  <span className="px-2 py-0.5 bg-slate-100 text-slate-700 font-mono text-[10px] font-bold rounded border border-slate-200">
                    {quickSelectedStudent.roll_no}
                  </span>
                </div>
                <div className="flex flex-wrap items-center gap-2 mt-1 text-xs">
                  <span className="text-slate-500">
                    Current: <strong className="text-slate-800">{quickSelectedStudent.grade}</strong> (Session {quickSelectedStudent.current_session || '2024-2025'})
                  </span>
                  <span className="text-slate-300">•</span>
                  <span className="text-slate-500">
                    Monthly Fee: <strong className="text-emerald-700 font-mono">PKR {Number(quickSelectedStudent.monthly_fee || 0).toLocaleString()}</strong>
                  </span>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => setQuickSelectedStudent(null)}
                className="px-3 py-2 text-xs font-semibold text-slate-500 hover:text-slate-700 hover:bg-slate-100 rounded-xl transition-colors"
              >
                Clear
              </button>
              <button
                onClick={() => handleOpenReenroll(quickSelectedStudent)}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 active:scale-95 text-white text-xs font-bold transition-all shadow-sm shadow-indigo-600/20"
              >
                <GraduationCap size={15} />
                <span>Re-enroll to Next Session</span>
                <ArrowRight size={14} />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* FILTER TABS & TOOLBAR */}
      <div className="bg-white p-4 rounded-2xl border border-slate-300 md:border-slate-200/80 shadow-xs space-y-3">
        {/* TAB BUTTONS */}
        <div className="flex items-center gap-2 border-b border-slate-100 pb-3 overflow-x-auto">
          <button
            onClick={() => setActiveTab('pending')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all shrink-0 flex items-center gap-1.5 ${
              activeTab === 'pending'
                ? 'bg-amber-500 text-white shadow-sm shadow-amber-500/20'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            <span>Eligible for Promotion</span>
            <span className={`px-1.5 py-0.2 rounded-full text-[10px] ${
              activeTab === 'pending' ? 'bg-amber-600 text-white' : 'bg-slate-200 text-slate-700'
            }`}>
              {metrics.pendingPromotion}
            </span>
          </button>

          <button
            onClick={() => setActiveTab('enrolled_2025')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all shrink-0 flex items-center gap-1.5 ${
              activeTab === 'enrolled_2025'
                ? 'bg-emerald-600 text-white shadow-sm shadow-emerald-600/20'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            <span>Enrolled in 2025-26</span>
            <span className={`px-1.5 py-0.2 rounded-full text-[10px] ${
              activeTab === 'enrolled_2025' ? 'bg-emerald-700 text-white' : 'bg-slate-200 text-slate-700'
            }`}>
              {metrics.in2025}
            </span>
          </button>

          <button
            onClick={() => setActiveTab('multi')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all shrink-0 flex items-center gap-1.5 ${
              activeTab === 'multi'
                ? 'bg-indigo-600 text-white shadow-sm shadow-indigo-600/20'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            <span>Multi-Session Students</span>
            <span className={`px-1.5 py-0.2 rounded-full text-[10px] ${
              activeTab === 'multi' ? 'bg-indigo-700 text-white' : 'bg-slate-200 text-slate-700'
            }`}>
              {metrics.multiSession}
            </span>
          </button>

          <button
            onClick={() => setActiveTab('all')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all shrink-0 flex items-center gap-1.5 ${
              activeTab === 'all'
                ? 'bg-slate-800 text-white'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            <span>All Coaching Students</span>
            <span className={`px-1.5 py-0.2 rounded-full text-[10px] ${
              activeTab === 'all' ? 'bg-slate-700 text-white' : 'bg-slate-200 text-slate-700'
            }`}>
              {metrics.total}
            </span>
          </button>
        </div>

        {/* SEARCH & GRADE SELECTOR */}
        <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between">
          <div className="relative flex-1">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={15} />
            <input
              type="text"
              placeholder="Filter by student name, roll number (TFC-001)..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-4 py-2 rounded-xl border border-slate-200 bg-slate-50 text-xs font-medium focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
            />
          </div>

          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1.5 px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl">
              <Filter size={13} className="text-slate-400" />
              <select
                value={selectedGrade}
                onChange={(e) => setSelectedGrade(e.target.value)}
                className="bg-transparent text-xs font-bold text-slate-700 outline-none cursor-pointer"
              >
                <option value="ALL">All Classes / Grades</option>
                {COACHING_GRADES.map((g) => (
                  <option key={g} value={g}>
                    {g}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* STUDENTS LIST TABLE */}
      <div className="bg-white rounded-2xl border border-slate-300 md:border-slate-200/80 shadow-xs overflow-hidden">
        <div className="px-5 py-3.5 bg-slate-50/80 border-b border-slate-200 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Users size={16} className="text-slate-500" />
            <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
              Students ({filteredStudents.length})
            </h3>
          </div>
          <span className="text-[11px] text-slate-400 font-medium">
            Academic Sessions run May to May
          </span>
        </div>

        {filteredStudents.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50/50 text-slate-500 font-bold uppercase tracking-wider text-[10px]">
                  <th className="py-3 px-4">Student</th>
                  <th className="py-3 px-4">Current Session</th>
                  <th className="py-3 px-4">Class & Field</th>
                  <th className="py-3 px-4">Active Fee</th>
                  <th className="py-3 px-4">Enrolled Sessions</th>
                  <th className="py-3 px-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                {filteredStudents.map((student) => {
                  const roll = student.roll_no || student.rollNo || '—';
                  const currentSess = student.current_session || student.session || '2024-2025';
                  const sessKeys = student.sessions ? Object.keys(student.sessions) : [currentSess];
                  const has2025 = sessKeys.some((s) => isSessionMatch(s, '2025-2026'));

                  return (
                    <tr key={student.id || roll} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-xl bg-slate-100 text-slate-700 flex items-center justify-center font-bold text-xs shrink-0 border border-slate-200">
                            {roll.replace('TFC-', '')}
                          </div>
                          <div>
                            <div className="font-bold text-slate-900">{student.name}</div>
                            <div className="font-mono text-[11px] text-indigo-600 font-semibold">{roll}</div>
                          </div>
                        </div>
                      </td>

                      <td className="py-3 px-4">
                        <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold border ${
                          isSessionMatch(currentSess, '2025-2026')
                            ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                            : 'bg-indigo-50 text-indigo-700 border-indigo-200'
                        }`}>
                          <span>Session {currentSess}</span>
                        </span>
                      </td>

                      <td className="py-3 px-4">
                        <div className="font-bold text-slate-800">{student.grade || '—'}</div>
                        {student.field && (
                          <div className="text-[10px] text-slate-400 font-medium">{student.field}</div>
                        )}
                      </td>

                      <td className="py-3 px-4">
                        <div className="font-bold text-slate-900 font-mono">
                          PKR {Number(student.monthly_fee || 0).toLocaleString()}
                        </div>
                        <div className="text-[10px] text-slate-400">Monthly</div>
                      </td>

                      <td className="py-3 px-4">
                        <div className="flex flex-wrap items-center gap-1.5">
                          {sessKeys.map((sessKey) => (
                            <span
                              key={sessKey}
                              className={`px-2 py-0.5 rounded text-[10px] font-bold font-mono border ${
                                isSessionMatch(sessKey, '2025-2026')
                                  ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                  : 'bg-slate-100 text-slate-700 border-slate-200'
                              }`}
                            >
                              {sessKey}
                            </span>
                          ))}
                        </div>
                      </td>

                      <td className="py-3 px-4 text-right">
                        <div className="inline-flex items-center gap-1.5">
                          {student.sessions && Object.keys(student.sessions).length > 1 && (
                            <button
                              onClick={() => handleOpenHistory(student)}
                              title="View Session History"
                              className="p-1.5 rounded-lg text-slate-500 hover:text-slate-800 hover:bg-slate-100 transition-colors"
                            >
                              <History size={15} />
                            </button>
                          )}

                          <button
                            onClick={() => handleOpenReenroll(student)}
                            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all shadow-xs ${
                              has2025
                                ? 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                                : 'bg-indigo-600 hover:bg-indigo-700 text-white shadow-indigo-600/20 active:scale-95'
                            }`}
                          >
                            <GraduationCap size={14} />
                            <span>{has2025 ? 'Re-enroll / Update' : 'Promote / Re-enroll'}</span>
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="text-center py-12 px-4">
            <div className="w-12 h-12 rounded-2xl bg-slate-100 text-slate-400 flex items-center justify-center mx-auto mb-3">
              <UserCheck size={24} />
            </div>
            <h4 className="text-sm font-bold text-slate-700">No Students Found</h4>
            <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
              {activeTab === 'pending'
                ? 'All students in this filter are already re-enrolled into the 2025-2026 session!'
                : 'No students match your active filter criteria.'}
            </p>
          </div>
        )}
      </div>

      {/* RE-ENROLLMENT MODAL COMPONENT */}
      {isModalOpen && selectedStudentForModal && (
        <CoachingReenrollModal
          isOpen={isModalOpen}
          onClose={() => {
            setIsModalOpen(false);
            setSelectedStudentForModal(null);
          }}
          student={selectedStudentForModal}
          onSuccess={() => {
            setIsModalOpen(false);
            setSelectedStudentForModal(null);
            setQuickSelectedStudent(null);
          }}
        />
      )}

      {/* SESSION HISTORY TIMELINE MODAL */}
      {showHistoryModal && historyStudent && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 animate-fade-in">
          <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full overflow-hidden border border-slate-200 animate-scale-in">
            <div className="px-5 py-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-indigo-100 text-indigo-700 flex items-center justify-center font-bold text-xs">
                  <History size={16} />
                </div>
                <div>
                  <h3 className="text-sm font-extrabold text-slate-900">
                    {historyStudent.name}
                  </h3>
                  <p className="text-[11px] text-slate-500 font-mono">
                    {historyStudent.roll_no} • Academic Sessions Timeline
                  </p>
                </div>
              </div>
              <button
                onClick={() => {
                  setShowHistoryModal(false);
                  setHistoryStudent(null);
                }}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
              >
                <X size={18} />
              </button>
            </div>

            <div className="p-5 max-h-[60vh] overflow-y-auto space-y-4">
              {historyStudent.sessions && Object.entries(historyStudent.sessions).map(([sessKey, sess]) => (
                <div key={sessKey} className="p-4 rounded-xl border border-slate-200 bg-slate-50/60 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-xs font-bold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded border border-indigo-100">
                      Session {sessKey}
                    </span>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-100">
                      {sess.status || 'Active'}
                    </span>
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-xs pt-1">
                    <div>
                      <span className="text-slate-400 block text-[10px]">Class / Grade</span>
                      <strong className="text-slate-800">{sess.grade || historyStudent.grade}</strong>
                    </div>
                    <div>
                      <span className="text-slate-400 block text-[10px]">Monthly Fee</span>
                      <strong className="text-slate-900 font-mono">
                        PKR {Number(sess.monthly_fee || historyStudent.monthly_fee || 0).toLocaleString()}
                      </strong>
                    </div>
                  </div>
                  <div className="text-[10px] text-slate-400 pt-1 border-t border-slate-200/60 flex items-center justify-between">
                    <span>Effective: {sess.start_date || historyStudent.joined_date || '—'}</span>
                    {sess.end_date && <span>Ended: {sess.end_date}</span>}
                  </div>
                </div>
              ))}
            </div>

            <div className="p-4 bg-slate-50 border-t border-slate-200 flex justify-end">
              <button
                onClick={() => {
                  setShowHistoryModal(false);
                  setHistoryStudent(null);
                }}
                className="px-4 py-2 rounded-xl bg-slate-800 text-white text-xs font-bold hover:bg-slate-900 transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CoachingReenrollment;
