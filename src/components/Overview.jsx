import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { db } from '../firebase';
import { ref, get } from 'firebase/database';

const Overview = () => {
  const { currentUser, isAdmin } = useAuth();
  const [stats, setStats] = useState({
    totalUsers: 0,
    teachers: 0,
    students: 0, // Assuming you'll add students later
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const usersRef = ref(db, 'users');
        const snapshot = await get(usersRef);
        
        if (snapshot.exists()) {
          const data = snapshot.val();
          const userList = Object.values(data);
          
          setStats({
            totalUsers: userList.length,
            teachers: userList.filter(u => u.role === 'teacher').length,
            cashiers: userList.filter(u => u.role === 'feescashier').length,
          });
        }
      } catch (error) {
        console.error("Error fetching stats:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
  }, []);

  const StatCard = ({ title, value, icon, color }) => (
    <div style={{ ...styles.card, borderLeft: `6px solid ${color}` }}>
      <div style={styles.cardIcon}>{icon}</div>
      <div style={styles.cardContent}>
        <p style={styles.cardTitle}>{title}</p>
        <h2 style={styles.cardValue}>{loading ? '...' : value}</h2>
      </div>
    </div>
  );

  return (
    <div style={styles.container}>
      <header style={styles.header}>
        <h1 style={styles.welcome}>Welcome back, {currentUser?.name} 👋</h1>
        <p style={styles.subtitle}>Here is what's happening in your system today.</p>
      </header>

      <div style={styles.statsGrid}>
        <StatCard 
          title="Total Staff" 
          value={stats.totalUsers} 
          icon="👥" 
          color="#4318ff" 
        />
        <StatCard 
          title="Teachers" 
          value={stats.teachers} 
          icon="📚" 
          color="#3b82f6" 
        />
        <StatCard 
          title="Cashiers" 
          value={stats.cashiers} 
          icon="💰" 
          color="#10b981" 
        />
      </div>

      <div style={styles.contentRow}>
        <div style={styles.mainBox}>
          <h3>Recent System Activity</h3>
          <ul style={styles.activityList}>
            <li style={styles.activityItem}>
              <span style={styles.dot}></span>
              New {currentUser?.role} session started at {new Date().toLocaleTimeString()}
            </li>
            <li style={styles.activityItem}>
              <span style={styles.dot}></span>
              Database connection established.
            </li>
          </ul>
        </div>
        
        {isAdmin && (
          <div style={styles.sideBox}>
            <h3>Admin Quick Actions</h3>
            <button style={styles.actionBtn} onClick={() => window.location.href='/dashboard/users'}>
              + Register New Staff
            </button>
            <button style={{...styles.actionBtn, background: '#f4f7fe', color: '#4318ff'}}>
              Download Reports
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

const styles = {
  container: { animation: 'fadeIn 0.5s ease-in' },
  header: { marginBottom: '30px' },
  welcome: { fontSize: '28px', color: '#1b2559', margin: '0 0 5px 0' },
  subtitle: { color: '#a3aed0', margin: 0 },
  statsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
    gap: '20px',
    marginBottom: '30px'
  },
  card: {
    background: '#fff',
    padding: '20px',
    borderRadius: '15px',
    display: 'flex',
    alignItems: 'center',
    boxShadow: '0 4px 12px rgba(0,0,0,0.03)',
  },
  cardIcon: { fontSize: '30px', marginRight: '20px' },
  cardTitle: { color: '#a3aed0', fontSize: '14px', margin: '0 0 5px 0', fontWeight: '600' },
  cardValue: { color: '#1b2559', margin: 0, fontSize: '24px' },
  contentRow: { display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '20px' },
  mainBox: { background: '#fff', padding: '25px', borderRadius: '20px', minHeight: '300px' },
  sideBox: { background: '#fff', padding: '25px', borderRadius: '20px', display: 'flex', flexDirection: 'column', gap: '15px' },
  activityList: { listStyle: 'none', padding: 0, marginTop: '20px' },
  activityItem: { display: 'flex', alignItems: 'center', gap: '10px', padding: '12px 0', borderBottom: '1px solid #f4f7fe', fontSize: '14px', color: '#444' },
  dot: { width: '8px', height: '8px', borderRadius: '50%', background: '#4318ff' },
  actionBtn: { 
    padding: '12px', 
    borderRadius: '12px', 
    border: 'none', 
    background: '#4318ff', 
    color: '#fff', 
    fontWeight: '600', 
    cursor: 'pointer' 
  }
};

export default Overview;