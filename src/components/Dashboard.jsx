import React, { useState, useEffect } from 'react';
import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

const Dashboard = () => {
  const { currentUser, logout, isAdmin } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  // UI State
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [showProfileDropdown, setShowProfileDropdown] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [error, setError] = useState(null);

  // Auto-clear errors after 5 seconds
  useEffect(() => {
    if (error) {
      const timer = setTimeout(() => setError(null), 5000);
      return () => clearTimeout(timer);
    }
  }, [error]);

  const handleLogout = async () => {
    try {
      await logout();
      navigate('/login');
    } catch (err) {
      setError("Failed to logout. Please try again.");
    }
  };

  const getInitials = (name) => {
    if (!name) return '??';
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  };

  const isActive = (path) => location.pathname === path || location.pathname.startsWith(path + '/');

  return (
    <div style={styles.dashboardWrapper}>
      {/* SIDEBAR */}
      <aside style={{ ...styles.sidebar, width: sidebarCollapsed ? '80px' : '260px' }}>
        <div style={styles.sidebarHeader}>
          <div style={styles.logoBox}>🎓</div>
          {!sidebarCollapsed && <span style={styles.logoText}>EduAdmin</span>}
        </div>

        <nav style={styles.navContainer}>
          <div style={styles.navGroup}>
            {!sidebarCollapsed && <span style={styles.groupLabel}>GENERAL</span>}
            <SidebarLink to="/dashboard" icon="🏠" label="Overview" collapsed={sidebarCollapsed} active={location.pathname === '/dashboard'} />
            <SidebarLink to="/dashboard/students" icon="👨‍🎓" label="Students" collapsed={sidebarCollapsed} active={isActive('/dashboard/students')} />
            <SidebarLink to="/dashboard/studentstatus" icon="👨‍🎓" label="Student Status" collapsed={sidebarCollapsed} active={isActive('/dashboard/studentstatus')} />
          </div>

          <div style={styles.navGroup}>
            {!sidebarCollapsed && <span style={styles.groupLabel}>ACADEMICS</span>}
            <SidebarLink to="/dashboard/courses" icon="📖" label="Courses" collapsed={sidebarCollapsed} active={isActive('/dashboard/courses')} />
            <SidebarLink to="/dashboard/courseenrollment" icon="📝" label="Enrollment" collapsed={sidebarCollapsed} active={isActive('/dashboard/courseenrollment')} />
          </div>

          <div style={styles.navGroup}>
            {!sidebarCollapsed && <span style={styles.groupLabel}>FINANCE</span>}
            <SidebarLink to="/dashboard/fees" icon="💳" label="Fee Entry" collapsed={sidebarCollapsed} active={isActive('/dashboard/fees')} />
            <SidebarLink to="/dashboard/feestatus" icon="💰" label="Fee Status" collapsed={sidebarCollapsed} active={isActive('/dashboard/feestatus')} />
          </div>

          {isAdmin && (
            <div style={styles.navGroup}>
              {!sidebarCollapsed && <span style={styles.groupLabel}>ADMIN</span>}
              <SidebarLink to="/dashboard/users" icon="👤" label="User Management" collapsed={sidebarCollapsed} active={isActive('/dashboard/users')} />
              <SidebarLink to="/dashboard/settings" icon="⚙️" label="Settings" collapsed={sidebarCollapsed} active={isActive('/dashboard/settings')} />
            </div>
          )}
        </nav>

        <button onClick={() => setSidebarCollapsed(!sidebarCollapsed)} style={styles.collapseToggle}>
          {sidebarCollapsed ? '→' : '←'}
        </button>
      </aside>

      {/* MAIN CONTENT AREA */}
      <div style={styles.mainContent}>
        
        {/* TOP NAVBAR */}
        <header style={styles.navbar}>
          <div style={styles.navLeft}>
            <div style={styles.searchWrapper}>
              <span style={styles.searchIcon}>🔍</span>
              <input 
                type="text" 
                placeholder="Search everything..." 
                style={styles.navInput} 
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </div>

          <div style={styles.navRight}>
            <div style={styles.iconActions}>
              <div style={styles.notifIcon}>🔔<span style={styles.notifBadge}>3</span></div>
              <div style={styles.helpIcon}>❓</div>
            </div>

            <div style={styles.vDivider} />

            <div style={styles.profileTrigger} onClick={() => setShowProfileDropdown(!showProfileDropdown)}>
              <div style={styles.navAvatar}>{getInitials(currentUser?.name)}</div>
              <div style={styles.navUserInfo}>
                <span style={styles.navName}>{currentUser?.name || "User"}</span>
                <span style={styles.navRole}>{isAdmin ? "Administrator" : "Staff"}</span>
              </div>
              <span style={styles.chevron}>▼</span>

              {showProfileDropdown && (
                <div style={styles.profileDropdown}>
                  <div style={styles.dropdownInfo}>
                    <strong>{currentUser?.email}</strong>
                  </div>
                  <div style={styles.dropdownDivider} />
                  <Link to="/dashboard/profile" style={styles.dropdownLink}>My Profile</Link>
                  <button onClick={handleLogout} style={styles.logoutAction}>Logout</button>
                </div>
              )}
            </div>
          </div>
        </header>

        {/* PAGE BODY */}
        <main style={styles.pageBody}>
          {error && (
            <div style={styles.errorAlert}>
              <span>⚠️ <strong>Error:</strong> {error}</span>
              <button onClick={() => setError(null)} style={styles.errorClose}>×</button>
            </div>
          )}
          
          <div style={styles.contentCard}>
            <Outlet context={{ searchTerm }} />
          </div>
        </main>

        <footer style={styles.footer}>
          <span>© 2025 EduAdmin System v2.0</span>
          <div style={styles.footerLinks}>
            <a href="#support" style={styles.fLink}>Support</a>
            <a href="#privacy" style={styles.fLink}>Privacy</a>
          </div>
        </footer>
      </div>
    </div>
  );
};

// Sub-component for Sidebar Links
const SidebarLink = ({ to, icon, label, collapsed, active }) => (
  <Link to={to} style={{
    ...styles.sidebarLink,
    backgroundColor: active ? 'rgba(59, 130, 246, 0.15)' : 'transparent',
    color: active ? '#60A5FA' : '#94A3B8',
    borderLeft: active ? '4px solid #3B82F6' : '4px solid transparent'
  }}>
    <span style={styles.linkIcon}>{icon}</span>
    {!collapsed && <span style={styles.linkText}>{label}</span>}
  </Link>
);

const styles = {
  dashboardWrapper: { display: 'flex', height: '100vh', backgroundColor: '#F1F5F9', overflow: 'hidden', fontFamily: 'Inter, sans-serif' },
  
  // Sidebar
  sidebar: { backgroundColor: '#0F172A', color: '#fff', display: 'flex', flexDirection: 'column', transition: 'width 0.3s ease', position: 'relative', zIndex: 10 },
  sidebarHeader: { padding: '25px 20px', display: 'flex', alignItems: 'center', gap: '12px', borderBottom: '1px solid rgba(255,255,255,0.05)' },
  logoBox: { width: '35px', height: '35px', backgroundColor: '#3B82F6', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '20px' },
  logoText: { fontSize: '18px', fontWeight: 'bold', letterSpacing: '0.5px' },
  navContainer: { flex: 1, padding: '20px 0', overflowY: 'auto' },
  navGroup: { marginBottom: '25px' },
  groupLabel: { fontSize: '10px', color: '#475569', fontWeight: 'bold', padding: '0 24px', marginBottom: '10px', display: 'block', letterSpacing: '1px' },
  sidebarLink: { display: 'flex', alignItems: 'center', padding: '12px 20px', textDecoration: 'none', transition: '0.2s', gap: '15px' },
  linkIcon: { fontSize: '18px', width: '20px', textAlign: 'center' },
  linkText: { fontSize: '14px', fontWeight: '500' },
  collapseToggle: { position: 'absolute', bottom: '20px', right: '-12px', width: '24px', height: '24px', borderRadius: '50%', backgroundColor: '#3B82F6', border: 'none', color: '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' },

  // Main & Navbar
  mainContent: { flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' },
  navbar: { height: '70px', backgroundColor: '#fff', borderBottom: '1px solid #E2E8F0', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 30px' },
  navLeft: { flex: 1 },
  searchWrapper: { position: 'relative', maxWidth: '400px' },
  searchIcon: { position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', opacity: 0.4 },
  navInput: { width: '100%', padding: '10px 15px 10px 40px', borderRadius: '10px', border: '1px solid #E2E8F0', backgroundColor: '#F8FAFC' },
  
  navRight: { display: 'flex', alignItems: 'center', gap: '25px' },
  iconActions: { display: 'flex', gap: '15px', color: '#64748B', fontSize: '18px' },
  notifIcon: { position: 'relative', cursor: 'pointer' },
  notifBadge: { position: 'absolute', top: '-5px', right: '-5px', backgroundColor: '#EF4444', color: '#fff', fontSize: '9px', padding: '2px 5px', borderRadius: '10px' },
  vDivider: { width: '1px', height: '24px', backgroundColor: '#E2E8F0' },
  
  // Profile
  profileTrigger: { display: 'flex', alignItems: 'center', gap: '12px', cursor: 'pointer', position: 'relative' },
  navAvatar: { width: '38px', height: '38px', borderRadius: '50%', backgroundColor: '#3B82F6', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold' },
  navUserInfo: { display: 'flex', flexDirection: 'column' },
  navName: { fontSize: '14px', fontWeight: '600', color: '#1E293B' },
  navRole: { fontSize: '11px', color: '#64748B' },
  chevron: { fontSize: '9px', color: '#94A3B8' },
  profileDropdown: { position: 'absolute', top: '50px', right: 0, width: '200px', backgroundColor: '#fff', borderRadius: '12px', boxShadow: '0 10px 25px rgba(0,0,0,0.1)', border: '1px solid #E2E8F0', padding: '10px', zIndex: 100 },
  dropdownInfo: { padding: '10px', fontSize: '12px', color: '#64748B', overflow: 'hidden', textOverflow: 'ellipsis' },
  dropdownDivider: { height: '1px', backgroundColor: '#E2E8F0', margin: '5px 0' },
  dropdownLink: { display: 'block', padding: '10px', textDecoration: 'none', color: '#1E293B', fontSize: '13px', borderRadius: '6px' },
  logoutAction: { width: '100%', textAlign: 'left', padding: '10px', border: 'none', background: 'none', color: '#EF4444', cursor: 'pointer', fontSize: '13px', fontWeight: '600' },

  // Body
  pageBody: { flex: 1, padding: '30px', overflowY: 'auto' },
  errorAlert: { backgroundColor: '#FEF2F2', border: '1px solid #FCA5A5', color: '#B91C1C', padding: '15px 20px', borderRadius: '10px', marginBottom: '20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' },
  errorClose: { background: 'none', border: 'none', fontSize: '20px', cursor: 'pointer', color: '#B91C1C' },
  contentCard: { backgroundColor: '#fff', borderRadius: '16px', padding: '25px', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)', minHeight: '100%' },
  
  footer: { padding: '20px 30px', display: 'flex', justifyContent: 'space-between', color: '#94A3B8', fontSize: '12px', borderTop: '1px solid #E2E8F0' },
  footerLinks: { display: 'flex', gap: '15px' },
  fLink: { color: '#64748B', textDecoration: 'none' }
};

export default Dashboard;