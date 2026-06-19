import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { db } from '../firebase';
import { ref, get } from 'firebase/database';
import { useNavigate } from 'react-router-dom';

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
  // Generate an array of years from 2023 up to the current year
  const yearsList = Array.from({ length: currentYear - 2023 + 1 }, (_, i) => 2023 + i);
  const monthsFull = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

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

        // Create a template object for initializing stats dynamically
        const initialYearObj = {};
        yearsList.forEach(y => initialYearObj[y] = 0);

        const monthYear = {};
        monthsFull.forEach(m => { monthYear[m] = { ...initialYearObj }; });
        
        const genderYear = { "Male": { ...initialYearObj }, "Female": { ...initialYearObj } };
        const laptopYear = { "Has Laptop": { ...initialYearObj }, "No Laptop": { ...initialYearObj }, "Provided By Ins.": { ...initialYearObj } };
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

  const StatCard = ({ title, value, icon, color, description }) => (
    <div style={styles.card}>
      <div style={{ ...styles.iconWrapper, backgroundColor: `${color}15`, color: color }}>
        {icon}
      </div>
      <div style={styles.cardText}>
        <span style={styles.cardLabel}>{title}</span>
        <h2 style={styles.cardValue}>{loading ? '...' : value.toLocaleString()}</h2>
        <span style={styles.cardDesc}>{description}</span>
      </div>
    </div>
  );

  const AnalyticsTable = ({ title, columns, data, rowLabelKey, rowKeys }) => {
    return (
      <div style={styles.tableCard}>
        <h3 style={styles.tableTitle}>{title}</h3>
        <table style={styles.dataTable}>
          <thead>
            <tr>
              <th style={styles.thMain}>{rowLabelKey}</th>
              {columns.map(c => <th key={c} style={styles.th}>{c}</th>)}
            </tr>
          </thead>
          <tbody>
            {rowKeys.map(rk => (
              <tr key={rk} style={styles.tr}>
                <td style={styles.tdMain}>{rk}</td>
                {columns.map(c => (
                  <td key={c} style={styles.td}>{data[rk] ? data[rk][c] : 0}</td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  };

  return (
    <div style={styles.container}>
      <header style={styles.header}>
        <div style={styles.headerText}>
          <h1 style={styles.welcome}>Welcome back, {currentUser?.name || 'Admin'} 👋</h1>
          <p style={styles.subtitle}>System performance and summary for today.</p>
        </div>
        <div style={styles.dateDisplay}>
          {new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
        </div>
      </header>

      <div style={styles.statsGrid}>
        <StatCard title="Total Staff" value={stats.totalUsers} icon="👥" color="#4318ff" description="Registered team members" />
        <StatCard title="Total Students" value={stats.students} icon="🎓" color="#3b82f6" description="All registrations" />
        <StatCard title="Active Students" value={stats.activeStudents} icon="✅" color="#10b981" description="Approved & Active" />
        <StatCard title="Teachers" value={stats.teachers} icon="📚" color="#8b5cf6" description="Faculty members" />
        <StatCard title="Cashiers" value={stats.cashiers} icon="💰" color="#ff9900" description="Financial nodes" />
      </div>

      <div style={styles.contentRow}>
        <div style={styles.mainBox}>
          <div style={styles.boxHeader}>
            <h3 style={styles.boxTitle}>System Health & Activity</h3>
            <span style={styles.livePulse}>Live Status</span>
          </div>
          <div style={styles.activityFeed}>
            <div style={styles.activityItem}>
              <div style={styles.activityIcon}>⚡</div>
              <div style={styles.activityContent}>
                <strong style={styles.activityContent_h4}>Session Active</strong>
                <p style={styles.activityContent_p}>New session started by {currentUser?.name}</p>
                <span style={styles.activityContent_span}>{new Date().toLocaleTimeString()}</span>
              </div>
            </div>
            <div style={styles.activityItem}>
              <div style={styles.activityIcon}>🛡️</div>
              <div style={styles.activityContent}>
                <strong style={styles.activityContent_h4}>Security Guard</strong>
                <p style={styles.activityContent_p}>Realtime Database connection is stable.</p>
                <span style={styles.activityContent_span}>Encryption Active</span>
              </div>
            </div>
          </div>
        </div>
        
        <div style={styles.sideBox}>
          <h3 style={styles.boxTitle}>Quick Controls</h3>
          <div style={styles.actionStack}>
            {isAdmin && (
              <button style={styles.primaryBtn} onClick={() => navigate('/dashboard/users')}>
                Register Staff
              </button>
            )}
            <button style={styles.secondaryBtn} onClick={() => navigate('/dashboard/students')}>
              Student Records
            </button>
            <button style={styles.outlineBtn}>
              System Logs
            </button>
          </div>
        </div>
      </div>

      {/* Advanced Analytics Grid */}
      <div style={styles.advancedGrid}>
        <AnalyticsTable title="Student Count By Month and Year" columns={yearsList} data={advancedStats.monthYear} rowLabelKey="Month" rowKeys={monthsFull} />
        <AnalyticsTable title="Student Count By Gender and Year" columns={yearsList} data={advancedStats.genderYear} rowLabelKey="Gender" rowKeys={["Male", "Female"]} />
        <AnalyticsTable title="Student Count By Laptop Status and Year" columns={yearsList} data={advancedStats.laptopYear} rowLabelKey="Laptop" rowKeys={["Has Laptop", "No Laptop", "Provided By Ins."]} />
        <AnalyticsTable title="Student Count By Student Status" columns={yearsList} data={advancedStats.statusYear} rowLabelKey="Student Status" rowKeys={["dropout", "coursecomplete", "active"]} />
        
        <div style={styles.tableCard}>
           <h3 style={styles.tableTitle}>Status Totals</h3>
           <table style={styles.dataTable}>
              <thead><tr>
                 <th style={styles.thMain}>Active Enrollments</th>
                 <th style={styles.thMain}>Completed Enrollments</th>
                 <th style={styles.thMain}>Dropped Enrollments</th>
              </tr></thead>
              <tbody><tr>
                 <td style={styles.tdCenter}>{advancedStats.totalsByStatus.active}</td>
                 <td style={styles.tdCenter}>{advancedStats.totalsByStatus.coursecomplete}</td>
                 <td style={styles.tdCenter}>{advancedStats.totalsByStatus.dropout}</td>
              </tr></tbody>
           </table>
        </div>

        <AnalyticsTable title="Student Count By Course" columns={yearsList} data={advancedStats.courseYear} rowLabelKey="Course" rowKeys={Object.keys(advancedStats.courseYear)} />
      </div>

    </div>
  );
};

const styles = {
  container: { animation: 'fadeIn 0.6s ease-out' },
  header: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '35px', flexWrap: 'wrap', gap: '20px' },
  headerText: { display: 'flex', flexDirection: 'column' },
  welcome: { fontSize: '26px', fontWeight: '800', color: '#1b2559', margin: 0 },
  subtitle: { color: '#707eae', fontSize: '15px', marginTop: '4px' },
  dateDisplay: { background: '#fff', padding: '10px 18px', borderRadius: '12px', fontSize: '14px', color: '#4318ff', fontWeight: '600', border: '1px solid #e0e5f2' },
  
  statsGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '25px', marginBottom: '35px' },
  card: { background: '#fff', padding: '25px', borderRadius: '20px', display: 'flex', alignItems: 'center', gap: '20px', boxShadow: '0 10px 30px rgba(0,0,0,0.02)', border: '1px solid #f0f3f9' },
  iconWrapper: { width: '56px', height: '56px', borderRadius: '16px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '24px' },
  cardText: { display: 'flex', flexDirection: 'column' },
  cardLabel: { color: '#a3aed0', fontSize: '13px', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.5px' },
  cardValue: { color: '#1b2559', margin: '2px 0', fontSize: '24px', fontWeight: '800' },
  cardDesc: { color: '#707eae', fontSize: '11px' },

  contentRow: { display: 'grid', gridTemplateColumns: '1fr 320px', gap: '25px' },
  mainBox: { background: '#fff', padding: '30px', borderRadius: '24px', border: '1px solid #f0f3f9' },
  boxHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '25px' },
  boxTitle: { margin: 0, fontSize: '18px', fontWeight: '700', color: '#1b2559' },
  livePulse: { fontSize: '10px', fontWeight: '800', color: '#10b981', textTransform: 'uppercase', padding: '4px 10px', background: '#ecfdf5', borderRadius: '20px' },
  
  activityFeed: { display: 'flex', flexDirection: 'column', gap: '20px' },
  activityItem: { display: 'flex', gap: '15px' },
  activityIcon: { width: '40px', height: '40px', background: '#f4f7fe', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '18px' },
  activityContent: { flex: 1 },
  activityContent_h4: { margin: 0, fontSize: '14px', color: '#1b2559' },
  activityContent_p: { margin: '2px 0', fontSize: '13px', color: '#707eae' },
  activityContent_span: { fontSize: '11px', color: '#a3aed0' },

  sideBox: { background: '#fff', padding: '30px', borderRadius: '24px', border: '1px solid #f0f3f9', height: 'fit-content' },
  actionStack: { display: 'flex', flexDirection: 'column', gap: '12px', marginTop: '20px' },
  primaryBtn: { padding: '14px', borderRadius: '14px', border: 'none', background: '#4318ff', color: '#fff', fontWeight: '700', cursor: 'pointer', boxShadow: '0 4px 15px rgba(67, 24, 255, 0.2)' },
  secondaryBtn: { padding: '14px', borderRadius: '14px', border: 'none', background: '#f4f7fe', color: '#4318ff', fontWeight: '700', cursor: 'pointer' },
  outlineBtn: { padding: '14px', borderRadius: '14px', border: '1px solid #e0e5f2', background: 'transparent', color: '#1b2559', fontWeight: '700', cursor: 'pointer' },

  advancedGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: '25px', marginTop: '30px' },
  tableCard: { background: '#fff', padding: '20px', borderRadius: '16px', border: '1px solid #f0f3f9', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)', overflowX: 'auto' },
  tableTitle: { margin: '0 0 15px 0', fontSize: '15px', fontWeight: '700', color: '#1b2559' },
  dataTable: { width: '100%', borderCollapse: 'collapse', fontSize: '13px' },
  thMain: { background: '#115e59', color: '#fff', padding: '10px 15px', textAlign: 'left', fontWeight: '600', border: '1px solid #0f766e' },
  th: { background: '#115e59', color: '#fff', padding: '10px 15px', textAlign: 'right', fontWeight: '600', border: '1px solid #0f766e' },
  tdMain: { padding: '10px 15px', borderBottom: '1px solid #e2e8f0', color: '#1e293b', fontWeight: '600', borderRight: '1px solid #e2e8f0' },
  td: { padding: '10px 15px', borderBottom: '1px solid #e2e8f0', textAlign: 'right', color: '#475569', borderRight: '1px solid #e2e8f0' },
  tdCenter: { padding: '10px 15px', borderBottom: '1px solid #e2e8f0', textAlign: 'center', color: '#475569', borderRight: '1px solid #e2e8f0', fontSize: '18px', fontWeight: 'bold' },
  tr: { ':hover': { backgroundColor: '#f8fafc' } },

  '@media (max-width: 1024px)': {
    contentRow: { gridTemplateColumns: '1fr' }
  }
};

export default Overview;