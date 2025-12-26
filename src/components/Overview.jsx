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
  });
  const [loading, setLoading] = useState(true);

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

        let studentCount = 0;
        if (studentSnap.exists()) {
          studentCount = Object.keys(studentSnap.val()).length;
        }
        
        setStats({
          totalUsers: userList.length,
          teachers: userList.filter(u => u.role === 'teacher').length,
          cashiers: userList.filter(u => u.role === 'feescashier').length,
          students: studentCount,
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
        <StatCard title="Total Students" value={stats.students} icon="🎓" color="#3b82f6" description="Active enrollments" />
        <StatCard title="Teachers" value={stats.teachers} icon="📚" color="#8b5cf6" description="Faculty members" />
        <StatCard title="Revenue Nodes" value={stats.cashiers} icon="💰" color="#10b981" description="Financial cashiers" />
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
                <strong>Session Active</strong>
                <p>New {currentUser?.role} session started by {currentUser?.name}</p>
                <span>{new Date().toLocaleTimeString()}</span>
              </div>
            </div>
            <div style={styles.activityItem}>
              <div style={styles.activityIcon}>🛡️</div>
              <div style={styles.activityContent}>
                <strong>Security Guard</strong>
                <p>Database connection encrypted and verified.</p>
                <span>System Protocol v2.1</span>
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

  // Responsive logic for small monitors
  '@media (max-width: 1024px)': {
    contentRow: { gridTemplateColumns: '1fr' }
  }
};

export default Overview;