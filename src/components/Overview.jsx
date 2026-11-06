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
  BarChart3
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

  const AnalyticsTable = ({ title, columns, data, rowLabelKey, rowKeys, icon: Icon = BarChart3 }) => {
    return (
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs p-5 transition-all hover:shadow-md">
        <div className="flex items-center gap-2 mb-4">
          <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
            <Icon size={16} />
          </div>
          <h3 className="text-sm font-bold text-slate-800 tracking-tight">{title}</h3>
        </div>
        <div className="overflow-x-auto rounded-xl border border-slate-100">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50/80 border-b border-slate-200 text-slate-600 uppercase font-bold tracking-wider">
                <th className="py-2.5 px-3.5 text-slate-700">{rowLabelKey}</th>
                {columns.map(c => (
                  <th key={c} className="py-2.5 px-3.5 text-right font-mono text-slate-700">{c}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {rowKeys.map(rk => (
                <tr key={rk} className="hover:bg-slate-50/60 transition-colors">
                  <td className="py-2.5 px-3.5 font-semibold text-slate-800">{rk}</td>
                  {columns.map(c => {
                    const val = data[rk] ? data[rk][c] : 0;
                    return (
                      <td key={c} className={`py-2.5 px-3.5 text-right font-mono font-medium ${val > 0 ? 'text-slate-900 font-semibold' : 'text-slate-400'}`}>
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
    <div className="space-y-8 animate-fade-in font-sans">
      {/* HEADER */}
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-2">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl md:text-3xl font-extrabold text-slate-900 tracking-tight">
              Welcome back, {currentUser?.name || 'Admin'}
            </h1>
            <span className="inline-block animate-pulse text-2xl">👋</span>
          </div>
          <p className="text-sm text-slate-500 mt-1 font-medium">
            System performance and operational summary for today.
          </p>
        </div>
        <div className="flex items-center gap-2.5 px-4 py-2 bg-white rounded-xl border border-slate-200/80 shadow-xs text-xs font-semibold text-slate-700 w-fit">
          <Calendar size={15} className="text-blue-600" />
          <span>
            {new Date().toLocaleDateString('en-US', { weekday: 'short', year: 'numeric', month: 'short', day: 'numeric' })}
          </span>
        </div>
      </header>

      {/* KPI METRIC CARDS */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        {statCards.map((card, idx) => {
          const Icon = card.icon;
          return (
            <div
              key={idx}
              className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs hover:shadow-md transition-all flex items-center gap-4"
            >
              <div className={`w-12 h-12 rounded-xl border flex items-center justify-center shrink-0 ${card.color}`}>
                <Icon size={22} />
              </div>
              <div className="min-w-0">
                <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block truncate">
                  {card.title}
                </span>
                <h2 className="text-2xl font-black text-slate-900 font-mono tracking-tight my-0.5">
                  {loading ? '...' : card.value.toLocaleString()}
                </h2>
                <span className="text-[11px] text-slate-500 font-medium block truncate">
                  {card.desc}
                </span>
              </div>
            </div>
          );
        })}
      </div>

      {/* SYSTEM HEALTH & QUICK ACTIONS */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-white p-6 rounded-2xl border border-slate-200/80 shadow-xs">
          <div className="flex items-center justify-between mb-5 pb-3 border-b border-slate-100">
            <div className="flex items-center gap-2.5">
              <Activity size={18} className="text-blue-600" />
              <h3 className="text-base font-bold text-slate-900 tracking-tight">System Health & Live Status</h3>
            </div>
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200/60 uppercase tracking-wider">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping"></span>
              Live Status
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="flex items-start gap-3.5 p-4 rounded-xl bg-slate-50 border border-slate-100">
              <div className="w-10 h-10 rounded-xl bg-blue-100 text-blue-600 flex items-center justify-center shrink-0">
                <Zap size={18} />
              </div>
              <div>
                <strong className="text-sm font-bold text-slate-800 block">Session Active</strong>
                <p className="text-xs text-slate-500 mt-0.5 leading-relaxed">
                  Authenticated session for {currentUser?.name || 'Administrator'}
                </p>
                <span className="inline-block mt-2 text-[10px] font-mono font-medium text-slate-400">
                  {new Date().toLocaleTimeString()}
                </span>
              </div>
            </div>

            <div className="flex items-start gap-3.5 p-4 rounded-xl bg-slate-50 border border-slate-100">
              <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-600 flex items-center justify-center shrink-0">
                <ShieldCheck size={18} />
              </div>
              <div>
                <strong className="text-sm font-bold text-slate-800 block">Security Guard</strong>
                <p className="text-xs text-slate-500 mt-0.5 leading-relaxed">
                  Firebase Realtime Database synchronization is encrypted and active.
                </p>
                <span className="inline-block mt-2 text-[10px] font-bold text-emerald-600">
                  SSL / TLS Encrypted
                </span>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-2 mb-4 pb-3 border-b border-slate-100">
              <Sparkles size={18} className="text-blue-600" />
              <h3 className="text-base font-bold text-slate-900 tracking-tight">Quick Navigation</h3>
            </div>
            <p className="text-xs text-slate-500 mb-4 leading-relaxed">
              Fast shortcuts to primary administrative functions and logs.
            </p>
          </div>

          <div className="flex flex-col gap-2.5">
            {isAdmin && (
              <button
                onClick={() => navigate('/dashboard/users')}
                className="w-full flex items-center justify-between px-4 py-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold transition-all shadow-xs"
              >
                <span>Register Staff Member</span>
                <ArrowRight size={14} />
              </button>
            )}
            <button
              onClick={() => navigate('/dashboard/students')}
              className="w-full flex items-center justify-between px-4 py-3 rounded-xl bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-700 text-xs font-bold transition-all"
            >
              <span>Student Records</span>
              <ArrowRight size={14} className="text-slate-400" />
            </button>
            <button
              onClick={() => navigate('/dashboard/analytics')}
              className="w-full flex items-center justify-between px-4 py-3 rounded-xl bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-700 text-xs font-bold transition-all"
            >
              <span>Revenue Analytics</span>
              <ArrowRight size={14} className="text-slate-400" />
            </button>
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
          <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs p-5 transition-all hover:shadow-md">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
                <UserCheck size={16} />
              </div>
              <h3 className="text-sm font-bold text-slate-800 tracking-tight">Enrollment Status Totals</h3>
            </div>
            <div className="grid grid-cols-3 gap-3 text-center">
              <div className="p-3.5 rounded-xl bg-emerald-50/60 border border-emerald-100">
                <span className="text-[10px] uppercase font-bold text-emerald-700 tracking-wider block">Active</span>
                <span className="text-2xl font-black font-mono text-emerald-800 mt-1 block">
                  {advancedStats.totalsByStatus.active}
                </span>
              </div>
              <div className="p-3.5 rounded-xl bg-blue-50/60 border border-blue-100">
                <span className="text-[10px] uppercase font-bold text-blue-700 tracking-wider block">Completed</span>
                <span className="text-2xl font-black font-mono text-blue-800 mt-1 block">
                  {advancedStats.totalsByStatus.coursecomplete}
                </span>
              </div>
              <div className="p-3.5 rounded-xl bg-rose-50/60 border border-rose-100">
                <span className="text-[10px] uppercase font-bold text-rose-700 tracking-wider block">Dropped</span>
                <span className="text-2xl font-black font-mono text-rose-800 mt-1 block">
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
