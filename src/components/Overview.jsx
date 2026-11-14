import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { db } from '../firebase';
import { ref, get } from 'firebase/database';
import { MONTHS_FULL } from '../utils/monthUtils';
import { useNavigate } from 'react-router-dom';
import {
  Users,
  GraduationCap,
  UserCheck,
  BookOpen,
  Wallet,
  Zap,
  ShieldCheck,
  ArrowRight,
  Activity,
  Calendar,
  Layers,
  Sparkles,
  BarChart3,
  CreditCard,
  BadgeDollarSign,
  AlertCircle,
  Receipt,
  Banknote,
  PenSquare,
  Clock,
  Award,
  UserCog,
  FileText
} from 'lucide-react';

const Overview = () => {
  const { currentUser, isAdmin } = useAuth();
  const navigate = useNavigate();
  const [stats, setStats] = useState({
    totalUsers: 0,
    teachers: 0,
    cashiers: 0,
    students: 0,
    activeStudents: 0,
  });

  const [advancedStats, setAdvancedStats] = useState({
    monthYear: {},
    genderYear: {},
    laptopYear: {},
    statusYear: {},
    totalsByStatus: { active: 0, coursecomplete: 0, dropout: 0 },
    courseYear: {}
  });

  const [loading, setLoading] = useState(true);

  const currentYear = new Date().getFullYear();
  const yearsList = Array.from({ length: currentYear - 2023 + 1 }, (_, i) => 2023 + i);
  const monthsFull = MONTHS_FULL;

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const usersRef = ref(db, 'users');
        const studentsRef = ref(db, 'students');

        const [userSnap, studentSnap] = await Promise.all([
          get(usersRef),
          get(studentsRef)
        ]);

        let userList = [];
        if (userSnap.exists()) {
          userList = Object.values(userSnap.val());
        }

        let totalStudentCount = 0;
        let activeStudentCount = 0;

        const initialYearObj = {};
        yearsList.forEach(y => initialYearObj[y] = 0);

        const monthYear = {};
        monthsFull.forEach(m => { monthYear[m] = { ...initialYearObj }; });

        const genderYear = { "Male": { ...initialYearObj }, "Female": { ...initialYearObj } };
        const laptopYear = { "Has Laptop": { ...initialYearObj }, "No! Provided By ins": { ...initialYearObj } };
        const statusYear = { "dropout": { ...initialYearObj }, "coursecomplete": { ...initialYearObj }, "active": { ...initialYearObj } };
        const totalsByStatus = { active: 0, coursecomplete: 0, dropout: 0 };
        const courseYear = {};

        if (studentSnap.exists()) {
          const studentsData = studentSnap.val();
          const studentList = Object.values(studentsData);

          totalStudentCount = studentList.length;
          activeStudentCount = studentList.filter(s => s.status === 'active').length;

          studentList.forEach(s => {
            const dateStr = s.createdAt || "";
            let sYear = null;
            let sMonthName = null;
            if (dateStr) {
              const d = new Date(dateStr);
              sYear = d.getFullYear();
              if (yearsList.includes(sYear)) {
                sMonthName = monthsFull[d.getMonth()];
                if (monthYear[sMonthName]) {
                  monthYear[sMonthName][sYear] += 1;
                }
                if (s.gender && genderYear[s.gender]) {
                  genderYear[s.gender][sYear] += 1;
                }
                if (s.laptop_status && laptopYear[s.laptop_status]) {
                  laptopYear[s.laptop_status][sYear] += 1;
                }
              }
            }

            if (s.enrolled_courses) {
              Object.values(s.enrolled_courses).forEach(c => {
                const cDateStr = c.enrolledAt || s.createdAt;
                let cYear = null;
                if (cDateStr) {
                  cYear = new Date(cDateStr).getFullYear();
                }

                const st = c.course_status || "active";
                if (totalsByStatus[st] !== undefined) {
                  totalsByStatus[st] += 1;
                }

                if (cYear && yearsList.includes(cYear)) {
                  if (statusYear[st] !== undefined) {
                    statusYear[st][cYear] += 1;
                  }
                  const cName = c.course_name || "Unknown";
                  if (!courseYear[cName]) {
                    courseYear[cName] = { ...initialYearObj };
                  }
                  courseYear[cName][cYear] += 1;
                }
              });
            }
          });
        }

        setStats({
          totalUsers: userList.length,
          teachers: userList.filter(u => u.role === 'teacher').length,
          cashiers: userList.filter(u => u.role === 'feescashier').length,
          students: totalStudentCount,
          activeStudents: activeStudentCount,
        });

        setAdvancedStats({
          monthYear, genderYear, laptopYear, statusYear, totalsByStatus, courseYear
        });

      } catch (error) {
        console.error("Error fetching stats:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
  }, []);

  const statCards = [
    { title: "Total Staff", value: stats.totalUsers, icon: Users, color: "text-blue-600 bg-blue-50 border-blue-100", desc: "Registered team members" },
    { title: "Total Students", value: stats.students, icon: GraduationCap, color: "text-indigo-600 bg-indigo-50 border-indigo-100", desc: "All registrations" },
    { title: "Active Students", value: stats.activeStudents, icon: UserCheck, color: "text-emerald-600 bg-emerald-50 border-emerald-100", desc: "Approved & active" },
    { title: "Teachers", value: stats.teachers, icon: BookOpen, color: "text-purple-600 bg-purple-50 border-purple-100", desc: "Faculty members" },
    { title: "Cashiers", value: stats.cashiers, icon: Wallet, color: "text-amber-600 bg-amber-50 border-amber-100", desc: "Financial nodes" },
  ];

  const quickNavItems = [
    {
      id: 'fees',
      label: 'Fee Entry',
      to: '/dashboard/fees',
      icon: <CreditCard size={22} className="text-blue-600" />,
      bg: 'bg-blue-50/90',
      border: 'border-blue-200'
    },
    {
      id: 'status',
      label: 'Fee Status',
      to: '/dashboard/feestatus',
      icon: <BadgeDollarSign size={22} className="text-emerald-600" />,
      bg: 'bg-emerald-50/90',
      border: 'border-emerald-200'
    },
    {
      id: 'students',
      label: 'Students',
      to: '/dashboard/students',
      icon: <Users size={22} className="text-indigo-600" />,
      bg: 'bg-indigo-50/90',
      border: 'border-indigo-200'
    },
    {
      id: 'overdue',
      label: 'Overdue',
      to: '/dashboard/overdue',
      icon: <AlertCircle size={22} className="text-rose-600" />,
      bg: 'bg-rose-50/90',
      border: 'border-rose-200'
    },
    {
      id: 'expenses',
      label: 'Expenses',
      to: '/dashboard/expenses',
      icon: <Receipt size={22} className="text-amber-600" />,
      bg: 'bg-amber-50/90',
      border: 'border-amber-200'
    },
    {
      id: 'courses',
      label: 'Courses',
      to: '/dashboard/courses',
      icon: <BookOpen size={22} className="text-teal-600" />,
      bg: 'bg-teal-50/90',
      border: 'border-teal-200'
    },
    {
      id: 'studentstatus',
      label: 'Status',
      to: '/dashboard/studentstatus',
      icon: <UserCheck size={22} className="text-violet-600" />,
      bg: 'bg-violet-50/90',
      border: 'border-violet-200'
    },
    {
      id: 'enrollment',
      label: 'Enrollment',
      to: '/dashboard/courseenrollment',
      icon: <PenSquare size={22} className="text-sky-600" />,
      bg: 'bg-sky-50/90',
      border: 'border-sky-200'
    },
    {
      id: 'salary',
      label: 'Staff Salary',
      to: '/dashboard/salary',
      icon: <Banknote size={22} className="text-emerald-600" />,
      bg: 'bg-emerald-50/90',
      border: 'border-emerald-200',
      adminOnly: true
    },
    {
      id: 'timeslots',
      label: 'Timeslots',
      to: '/dashboard/timeslot-analytics',
      icon: <Clock size={22} className="text-cyan-600" />,
      bg: 'bg-cyan-50/90',
      border: 'border-cyan-200',
      hideIfAdmin: true
    },
    {
      id: 'analytics',
      label: 'Analytics',
      to: '/dashboard/analytics',
      icon: <BarChart3 size={22} className="text-blue-600" />,
      bg: 'bg-blue-50/90',
      border: 'border-blue-200'
    },
    {
      id: 'certificates',
      label: 'Certificates',
      to: '/dashboard/certificate',
      icon: <Award size={22} className="text-amber-600" />,
      bg: 'bg-amber-50/90',
      border: 'border-amber-200'
    },
    {
      id: 'users',
      label: 'Staff Roles',
      to: '/dashboard/users',
      icon: <UserCog size={22} className="text-slate-700" />,
      bg: 'bg-slate-100',
      border: 'border-slate-300',
      adminOnly: true
    },
    {
      id: 'record',
      label: 'Records',
      to: '/dashboard/record',
      icon: <FileText size={22} className="text-emerald-600" />,
      bg: 'bg-emerald-50/90',
      border: 'border-emerald-200',
      hideIfAdmin: true
    },
  ].filter(item => {
    if (item.adminOnly && !isAdmin) return false;
    if (item.hideIfAdmin && isAdmin) return false;
    return true;
  }).slice(0, 12);

  const AnalyticsTable = ({ title, columns, data, rowLabelKey, rowKeys, icon: Icon = BarChart3 }) => {
    return (
      <div className="bg-white rounded-2xl border border-slate-300 md:border-slate-200/80 shadow-[0_2px_10px_rgba(15,23,42,0.06)] md:shadow-xs p-4 sm:p-5 transition-all hover:shadow-md">
        <div className="flex items-center gap-2 mb-4">
          <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-700 flex items-center justify-center font-bold">
            <Icon size={16} />
          </div>
          <h3 className="text-sm font-extrabold text-slate-900 tracking-tight">{title}</h3>
        </div>
        <div className="overflow-x-auto rounded-xl border border-slate-300">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-100 border-b border-slate-300 text-slate-700 uppercase font-bold tracking-wider">
                <th className="py-2.5 px-3.5 text-slate-800">{rowLabelKey}</th>
                {columns.map(c => (
                  <th key={c} className="py-2.5 px-3.5 text-right font-mono text-slate-800">{c}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {rowKeys.map(rk => (
                <tr key={rk} className="hover:bg-slate-50 transition-colors">
                  <td className="py-2.5 px-3.5 font-bold text-slate-900">{rk}</td>
                  {columns.map(c => {
                    const val = data[rk] ? data[rk][c] : 0;
                    return (
                      <td key={c} className={`py-2.5 px-3.5 text-right font-mono font-medium ${val > 0 ? 'text-slate-950 font-bold' : 'text-slate-400'}`}>
                        {val}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-5 sm:space-y-8 animate-fade-in font-sans">
      {/* HEADER */}
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-3 pb-2 border-b border-slate-300/80 md:border-transparent">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl sm:text-2xl md:text-3xl font-extrabold text-slate-950 tracking-tight">
              Welcome back, {currentUser?.name || 'Admin'}
            </h1>
            <span className="inline-block animate-pulse text-xl sm:text-2xl">👋</span>
          </div>
          <p className="text-xs sm:text-sm text-slate-500 mt-0.5 sm:mt-1 font-medium">
            System performance and operational summary for today.
          </p>
        </div>
        <div className="flex items-center gap-2 px-3 py-1.5 sm:px-4 sm:py-2 bg-white rounded-xl border border-slate-300 md:border-slate-200/80 shadow-xs text-xs font-bold text-slate-800 w-fit">
          <Calendar size={14} className="text-blue-600" />
          <span>
            {new Date().toLocaleDateString('en-US', { weekday: 'short', year: 'numeric', month: 'short', day: 'numeric' })}
          </span>
        </div>
      </header>

      {/* MOBILE COMPACT LIVE STATUS PILL (< md) */}
      <div className="flex md:hidden items-center justify-between px-3.5 py-2.5 bg-white rounded-2xl border border-slate-300 shadow-xs">
        <div className="flex items-center gap-2">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
          </span>
          <span className="text-xs font-extrabold text-slate-900">System Live</span>
          <span className="text-slate-300">•</span>
          <span className="text-[11px] font-semibold text-slate-500">Encrypted DB Sync</span>
        </div>
        <span className="text-[10px] font-mono font-extrabold text-blue-700 bg-blue-50 px-2 py-0.5 rounded-md border border-blue-200 uppercase">
          {currentUser?.role || 'Admin'}
        </span>
      </div>

      {/* KPI METRIC CARDS */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3 sm:gap-4">
        {statCards.map((card, idx) => {
          const Icon = card.icon;
          return (
            <div
              key={idx}
              className={`bg-white p-3.5 sm:p-5 rounded-2xl border border-slate-300 md:border-slate-200/80 shadow-[0_2px_10px_rgba(15,23,42,0.06)] md:shadow-xs hover:shadow-md transition-all flex items-center gap-3 sm:gap-4 ${
                idx === 4 ? 'col-span-2 lg:col-span-1' : ''
              }`}
            >
              <div className={`w-10 h-10 sm:w-12 sm:h-12 rounded-xl border flex items-center justify-center shrink-0 ${card.color}`}>
                <Icon size={20} className="sm:w-[22px] sm:h-[22px]" />
              </div>
              <div className="min-w-0">
                <span className="text-[10px] sm:text-[11px] font-bold text-slate-500 uppercase tracking-wider block truncate">
                  {card.title}
                </span>
                <h2 className="text-xl sm:text-2xl font-black text-slate-950 font-mono tracking-tight my-0.5">
                  {loading ? '...' : card.value.toLocaleString()}
                </h2>
                <span className="text-[10px] sm:text-[11px] text-slate-500 font-medium block truncate">
                  {card.desc}
                </span>
              </div>
            </div>
          );
        })}
      </div>

      {/* MOBILE 4-COLUMN EASYPEISA-STYLE QUICK APP HUB (< md) */}
      <div className="block md:hidden bg-white p-4 rounded-3xl border border-slate-300 shadow-[0_2px_10px_rgba(15,23,42,0.06)] space-y-3.5">
        <div className="flex items-center justify-between pb-2.5 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
              <Sparkles size={16} />
            </div>
            <h3 className="text-sm font-extrabold text-slate-950 tracking-tight">App Hub Services</h3>
          </div>
          <span className="text-[10px] font-mono font-bold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-md border border-slate-200">
            {quickNavItems.length} Shortcuts
          </span>
        </div>

        {/* 4-COLUMN GRID */}
        <div className="grid grid-cols-4 gap-y-4 gap-x-2">
          {quickNavItems.map(item => (
            <button
              key={item.id}
              onClick={() => navigate(item.to)}
              className="flex flex-col items-center justify-start group cursor-pointer active:scale-90 transition-transform"
            >
              <div className={`w-12 h-12 rounded-2xl flex items-center justify-center border transition-all ${item.bg} ${item.border || 'border-slate-200'} shadow-2xs group-hover:scale-105`}>
                {item.icon}
              </div>
              <span className="text-[11px] font-extrabold text-slate-800 text-center tracking-tight leading-tight mt-1.5 line-clamp-2 px-0.5">
                {item.label}
              </span>
            </button>
          ))}
        </div>

        {/* PAGINATION DOT INDICATOR (MATCHING PHOTO) */}
        <div className="flex items-center justify-center gap-1.5 pt-1.5">
          <span className="w-3.5 h-1.5 rounded-full bg-emerald-600"></span>
          <span className="w-1.5 h-1.5 rounded-full bg-slate-300"></span>
        </div>
      </div>

      {/* DESKTOP ONLY: SYSTEM HEALTH & QUICK ACTIONS (>= md) */}
      <div className="hidden md:grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-white p-4 sm:p-6 rounded-2xl border border-slate-300 md:border-slate-200/80 shadow-[0_2px_10px_rgba(15,23,42,0.06)] md:shadow-xs">
          <div className="flex items-center justify-between mb-5 pb-3 border-b border-slate-100">
            <div className="flex items-center gap-2.5">
              <Activity size={18} className="text-blue-600" />
              <h3 className="text-base font-extrabold text-slate-950 tracking-tight">System Health & Live Status</h3>
            </div>
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-extrabold bg-emerald-100 text-emerald-800 border border-emerald-300 uppercase tracking-wider">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-600 animate-ping"></span>
              Live Status
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="flex items-start gap-3.5 p-4 rounded-xl bg-slate-100/80 border border-slate-200">
              <div className="w-10 h-10 rounded-xl bg-blue-100 text-blue-700 flex items-center justify-center shrink-0">
                <Zap size={18} />
              </div>
              <div>
                <strong className="text-sm font-bold text-slate-900 block">Session Active</strong>
                <p className="text-xs text-slate-600 mt-0.5 leading-relaxed">
                  Authenticated session for {currentUser?.name || 'Administrator'}
                </p>
                <span className="inline-block mt-2 text-[10px] font-mono font-bold text-slate-500">
                  {new Date().toLocaleTimeString()}
                </span>
              </div>
            </div>

            <div className="flex items-start gap-3.5 p-4 rounded-xl bg-slate-100/80 border border-slate-200">
              <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0">
                <ShieldCheck size={18} />
              </div>
              <div>
                <strong className="text-sm font-bold text-slate-900 block">Security Guard</strong>
                <p className="text-xs text-slate-600 mt-0.5 leading-relaxed">
                  Firebase Realtime Database synchronization is encrypted and active.
                </p>
                <span className="inline-block mt-2 text-[10px] font-bold text-emerald-700">
                  SSL / TLS Encrypted
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* DESKTOP APP HUB QUICK SERVICES CARD */}
        <div className="bg-white p-5 rounded-2xl border border-slate-300 md:border-slate-200/80 shadow-[0_2px_10px_rgba(15,23,42,0.06)] md:shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <Sparkles size={18} className="text-blue-600" />
                <h3 className="text-base font-extrabold text-slate-950 tracking-tight">App Hub Services</h3>
              </div>
              <span className="text-[10px] font-mono font-bold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-md border border-slate-200">
                {quickNavItems.length} Shortcuts
              </span>
            </div>

            <div className="grid grid-cols-4 gap-y-3 gap-x-2">
              {quickNavItems.map(item => (
                <button
                  key={`desk_${item.id}`}
                  onClick={() => navigate(item.to)}
                  className="flex flex-col items-center justify-start group cursor-pointer hover:scale-105 active:scale-95 transition-transform"
                >
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center border transition-all ${item.bg} ${item.border || 'border-slate-200'} shadow-2xs group-hover:border-slate-400`}>
                    {item.icon}
                  </div>
                  <span className="text-[10px] font-bold text-slate-700 text-center tracking-tight leading-tight mt-1 line-clamp-1 px-0.5">
                    {item.label}
                  </span>
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* ADVANCED ANALYTICS SECTION */}
      <div>
        <div className="flex items-center gap-2 mb-4">
          <Layers size={18} className="text-blue-600" />
          <h2 className="text-lg font-extrabold text-slate-900 tracking-tight">Multi-Year Academic Breakdown</h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <AnalyticsTable
            title="Student Admissions by Month & Year"
            columns={yearsList}
            data={advancedStats.monthYear}
            rowLabelKey="Month"
            rowKeys={monthsFull}
          />

          <AnalyticsTable
            title="Admissions by Gender"
            columns={yearsList}
            data={advancedStats.genderYear}
            rowLabelKey="Gender"
            rowKeys={["Male", "Female"]}
          />

          <AnalyticsTable
            title="Laptop Ownership Status"
            columns={yearsList}
            data={advancedStats.laptopYear}
            rowLabelKey="Hardware"
            rowKeys={["Has Laptop", "No! Provided By ins"]}
          />

          <AnalyticsTable
            title="Academic Progress Status"
            columns={yearsList}
            data={advancedStats.statusYear}
            rowLabelKey="Status"
            rowKeys={["dropout", "coursecomplete", "active"]}
          />

          {/* TOTAL STATUS SUMMARY CARD */}
          <div className="bg-white rounded-2xl border border-slate-300 md:border-slate-200/80 shadow-[0_2px_10px_rgba(15,23,42,0.06)] md:shadow-xs p-5 transition-all hover:shadow-md">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-700 flex items-center justify-center">
                <UserCheck size={16} />
              </div>
              <h3 className="text-sm font-extrabold text-slate-900 tracking-tight">Enrollment Status Totals</h3>
            </div>
            <div className="grid grid-cols-3 gap-3 text-center">
              <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200">
                <span className="text-[10px] uppercase font-bold text-emerald-800 tracking-wider block">Active</span>
                <span className="text-2xl font-black font-mono text-emerald-900 mt-1 block">
                  {advancedStats.totalsByStatus.active}
                </span>
              </div>
              <div className="p-3.5 rounded-xl bg-blue-50 border border-blue-200">
                <span className="text-[10px] uppercase font-bold text-blue-800 tracking-wider block">Completed</span>
                <span className="text-2xl font-black font-mono text-blue-900 mt-1 block">
                  {advancedStats.totalsByStatus.coursecomplete}
                </span>
              </div>
              <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200">
                <span className="text-[10px] uppercase font-bold text-rose-800 tracking-wider block">Dropped</span>
                <span className="text-2xl font-black font-mono text-rose-900 mt-1 block">
                  {advancedStats.totalsByStatus.dropout}
                </span>
              </div>
            </div>
          </div>

          <AnalyticsTable
            title="Enrollment Distribution by Course"
            columns={yearsList}
            data={advancedStats.courseYear}
            rowLabelKey="Course"
            rowKeys={Object.keys(advancedStats.courseYear)}
          />
        </div>
      </div>
    </div>
  );
};

export default Overview;
