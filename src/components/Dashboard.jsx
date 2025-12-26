import React, { useState } from 'react';
import { Outlet, Link, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

const Dashboard = () => {
  const { currentUser, logout, isAdmin } = useAuth();
  const location = useLocation();
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  // Check if a link is active
  const isActiveLink = (path) => {
    if (path === '/dashboard') {
      return location.pathname === '/dashboard';
    }
    return location.pathname.startsWith(path);
  };

  // Get link styles based on active state
  const getLinkStyle = (path) => ({
    ...styles.navLink,
    backgroundColor: isActiveLink(path) ? 'rgba(255, 255, 255, 0.2)' : 'transparent',
    borderLeftColor: isActiveLink(path) ? '#fff' : 'transparent',
    transform: isActiveLink(path) ? 'translateX(5px)' : 'translateX(0)'
  });

  // Get user initials for avatar
  const getInitials = (name) => {
    if (!name) return '?';
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  };

  // Get role badge color
  const getRoleBadgeStyle = () => {
    if (isAdmin) return { backgroundColor: '#8B5CF6', color: '#fff' };
    return { backgroundColor: '#3B82F6', color: '#fff' };
  };

  return (
    <div style={styles.wrapper}>
      {/* Sidebar */}
      <aside style={{
        ...styles.sidebar,
        width: sidebarCollapsed ? '80px' : '280px'
      }}>
        {/* Logo Section */}
        <div style={styles.logoSection}>
          <div style={styles.logoContainer}>
            <span style={styles.logoIcon}>🎓</span>
          </div>
          {!sidebarCollapsed && (
            <div style={styles.logoText}>
              <h1 style={styles.logoTitle}>EduAdmin</h1>
              <span style={styles.logoSubtitle}>Management System</span>
            </div>
          )}
        </div>

        {/* Navigation */}
        <nav style={styles.nav}>
          <div style={styles.navSection}>
            {!sidebarCollapsed && <span style={styles.navSectionTitle}>MAIN MENU</span>}
            
            <Link to="/dashboard" style={getLinkStyle('/dashboard')}>
              <span style={styles.navIcon}>🏠</span>
              {!sidebarCollapsed && <span style={styles.navText}>Dashboard</span>}
            </Link>

            {isAdmin && (
              <Link to="/dashboard/users" style={getLinkStyle('/dashboard/users')}>
                <span style={styles.navIcon}>➕</span>
                {!sidebarCollapsed && <span style={styles.navText}>Create User</span>}
              </Link>

              
            )}
              {isAdmin && (
              <Link to="/dashboard/courses" style={getLinkStyle('/dashboard/courses')}>
                <span style={styles.navIcon}>➕</span>
                {!sidebarCollapsed && <span style={styles.navText}>Courses</span>}
              </Link>

              
            )}

             <Link to="/dashboard/courseenrollment" style={getLinkStyle('/dashboard/courseenrollment')}>
                <span style={styles.navIcon}>➕</span>
                {!sidebarCollapsed && <span style={styles.navText}>Course Enrollment</span>}
              </Link>
            <Link to="/dashboard/students" style={getLinkStyle('/dashboard/students')}>
              <span style={styles.navIcon}>👨‍🎓</span>
              {!sidebarCollapsed && <span style={styles.navText}>Students</span>}
            </Link>
               <Link to="/dashboard/studentstatus" style={getLinkStyle('/dashboard/studentstatus')}>
              <span style={styles.navIcon}>👨‍🎓</span>
              {!sidebarCollapsed && <span style={styles.navText}>Students Status</span>}
            </Link>

            <Link to="/dashboard/classes" style={getLinkStyle('/dashboard/classes')}>
              <span style={styles.navIcon}>📚</span>
              {!sidebarCollapsed && <span style={styles.navText}>Classes</span>}
            </Link>

            <Link to="/dashboard/fees" style={getLinkStyle('/dashboard/fees')}>
              <span style={styles.navIcon}>➕</span>
              {!sidebarCollapsed && <span style={styles.navText}>Fees</span>}
            </Link>

             <Link to="/dashboard/feestatus" style={getLinkStyle('/dashboard/feestatus')}>
              <span style={styles.navIcon}>💰</span>
              {!sidebarCollapsed && <span style={styles.navText}>Fee Status</span>}
            </Link>
          </div>

          {!sidebarCollapsed && (
            <div style={styles.navSection}>
              <span style={styles.navSectionTitle}>SETTINGS</span>
              
              <Link to="/dashboard/settings" style={getLinkStyle('/dashboard/settings')}>
                <span style={styles.navIcon}>⚙️</span>
                <span style={styles.navText}>Settings</span>
              </Link>

              <Link to="/dashboard/help" style={getLinkStyle('/dashboard/help')}>
                <span style={styles.navIcon}>❓</span>
                <span style={styles.navText}>Help Center</span>
              </Link>
            </div>
          )}
        </nav>

        {/* User Profile Section */}
        <div style={styles.profileSection}>
          <div style={styles.profileCard}>
            <div style={styles.avatar}>
              {getInitials(currentUser?.name)}
            </div>
            {!sidebarCollapsed && (
              <div style={styles.profileInfo}>
                <span style={styles.profileName}>{currentUser?.name || 'User'}</span>
                <span style={{...styles.roleBadge, ...getRoleBadgeStyle()}}>
                  {isAdmin ? '👑 Admin' : '📚 Teacher'}
                </span>
              </div>
            )}
          </div>
          
          <button onClick={logout} style={styles.logoutBtn}>
            <span style={styles.logoutIcon}>🚪</span>
            {!sidebarCollapsed && <span>Logout</span>}
          </button>
        </div>

        {/* Collapse Toggle */}
        <button 
          onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
          style={styles.collapseBtn}
        >
          {sidebarCollapsed ? '→' : '←'}
        </button>
      </aside>

      {/* Main Content Area */}
      <main style={styles.main}>
        {/* Header */}
        <header style={styles.header}>
          <div style={styles.headerLeft}>
            <h2 style={styles.pageTitle}>
              {location.pathname === '/dashboard' && '📊 Dashboard Overview'}
              {location.pathname === '/dashboard/users' && '➕ Create New User'}
              {location.pathname === '/dashboard/courses' && '➕ Courses'}
              {location.pathname === '/dashboard/courseenrollment' && '➕ Course Enrollment'}
              {location.pathname === '/dashboard/students' && '👨‍🎓 Student Management'}
              {location.pathname === '/dashboard/studentstatus' && '👨‍🎓 Student Status'}
              {location.pathname === '/dashboard/classes' && '📚 Class Management'}
              {location.pathname === '/dashboard/fees' && '➕ Add Fee '}
              {location.pathname === '/dashboard/feestatus' && '💰 Fee Management'}
              {location.pathname === '/dashboard/settings' && '⚙️ Settings'}
            </h2>
            <p style={styles.breadcrumb}>
              Home {location.pathname !== '/dashboard' && `/ ${location.pathname.split('/').pop().replace('-', ' ')}`}
            </p>
          </div>

          <div style={styles.headerRight}>
            {/* Search Bar */}
            <div style={styles.searchContainer}>
              <span style={styles.searchIcon}>🔍</span>
              <input 
                type="text" 
                placeholder="Search..." 
                style={styles.searchInput}
              />
            </div>

            {/* Notifications */}
            <button style={styles.iconButton}>
              <span>🔔</span>
              <span style={styles.notificationBadge}>3</span>
            </button>

            {/* User Quick Access */}
            <div style={styles.headerProfile}>
              <div style={styles.headerAvatar}>
                {getInitials(currentUser?.name)}
              </div>
              <div style={styles.headerUserInfo}>
                <span style={styles.headerUserName}>{currentUser?.name}</span>
                <span style={styles.headerUserRole}>{currentUser?.role}</span>
              </div>
            </div>
          </div>
        </header>

        {/* Content Area */}
        <div style={styles.contentWrapper}>
          <div style={styles.contentArea}>
            <Outlet />
          </div>
        </div>

        {/* Footer */}
        <footer style={styles.footer}>
          <span>© 2024 EduAdmin. All rights reserved.</span>
          <span style={styles.footerLinks}>
            <a href="#" style={styles.footerLink}>Privacy Policy</a>
            <span style={styles.footerDivider}>•</span>
            <a href="#" style={styles.footerLink}>Terms of Service</a>
          </span>
        </footer>
      </main>

      <style>{`
        @keyframes slideIn {
          from { opacity: 0; transform: translateX(-20px); }
          to { opacity: 1; transform: translateX(0); }
        }
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        a:hover {
          background-color: rgba(255, 255, 255, 0.15) !important;
        }
      `}</style>
    </div>
  );
};

const styles = {
  wrapper: {
    display: 'flex',
    minHeight: '100vh',
    fontFamily: "'Segoe UI', Tahoma, Geneva, Verdana, sans-serif",
    backgroundColor: '#F3F4F6'
  },
  
  // Sidebar Styles
  sidebar: {
    background: 'linear-gradient(180deg, #667eea 0%, #764ba2 100%)',
    color: 'white',
    display: 'flex',
    flexDirection: 'column',
    position: 'relative',
    transition: 'width 0.3s ease',
    boxShadow: '4px 0 20px rgba(0, 0, 0, 0.1)'
  },
  logoSection: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    padding: '24px 20px',
    borderBottomWidth: '1px',
    borderBottomStyle: 'solid',
    borderBottomColor: 'rgba(255, 255, 255, 0.1)'
  },
  logoContainer: {
    width: '45px',
    height: '45px',
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: '12px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0
  },
  logoIcon: {
    fontSize: '24px'
  },
  logoText: {
    display: 'flex',
    flexDirection: 'column'
  },
  logoTitle: {
    fontSize: '20px',
    fontWeight: '700',
    margin: 0,
    letterSpacing: '-0.5px'
  },
  logoSubtitle: {
    fontSize: '11px',
    opacity: 0.8
  },
  
  // Navigation Styles
  nav: {
    flex: 1,
    padding: '20px 12px',
    display: 'flex',
    flexDirection: 'column',
    gap: '24px',
    overflowY: 'auto'
  },
  navSection: {
    display: 'flex',
    flexDirection: 'column',
    gap: '4px'
  },
  navSectionTitle: {
    fontSize: '11px',
    fontWeight: '600',
    opacity: 0.6,
    letterSpacing: '1px',
    padding: '0 12px',
    marginBottom: '8px'
  },
  navLink: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    padding: '12px 16px',
    color: 'white',
    textDecoration: 'none',
    borderRadius: '10px',
    transition: 'all 0.2s ease',
    borderLeftWidth: '3px',
    borderLeftStyle: 'solid',
    borderLeftColor: 'transparent',
    fontSize: '14px'
  },
  navIcon: {
    fontSize: '18px',
    width: '24px',
    textAlign: 'center'
  },
  navText: {
    fontWeight: '500'
  },
  
  // Profile Section
  profileSection: {
    padding: '20px',
    borderTopWidth: '1px',
    borderTopStyle: 'solid',
    borderTopColor: 'rgba(255, 255, 255, 0.1)',
    display: 'flex',
    flexDirection: 'column',
    gap: '12px'
  },
  profileCard: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    padding: '12px',
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: '12px'
  },
  avatar: {
    width: '40px',
    height: '40px',
    borderRadius: '10px',
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '14px',
    fontWeight: '700',
    flexShrink: 0
  },
  profileInfo: {
    display: 'flex',
    flexDirection: 'column',
    gap: '4px',
    overflow: 'hidden'
  },
  profileName: {
    fontSize: '14px',
    fontWeight: '600',
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis'
  },
  roleBadge: {
    fontSize: '10px',
    padding: '3px 8px',
    borderRadius: '20px',
    fontWeight: '600',
    width: 'fit-content'
  },
  logoutBtn: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '8px',
    padding: '12px',
    backgroundColor: 'rgba(239, 68, 68, 0.2)',
    borderWidth: '1px',
    borderStyle: 'solid',
    borderColor: 'rgba(239, 68, 68, 0.3)',
    color: '#FCA5A5',
    borderRadius: '10px',
    cursor: 'pointer',
    fontSize: '14px',
    fontWeight: '500',
    transition: 'all 0.2s ease'
  },
  logoutIcon: {
    fontSize: '16px'
  },
  collapseBtn: {
    position: 'absolute',
    right: '-12px',
    top: '50%',
    transform: 'translateY(-50%)',
    width: '24px',
    height: '24px',
    borderRadius: '50%',
    backgroundColor: '#667eea',
    borderWidth: '2px',
    borderStyle: 'solid',
    borderColor: '#fff',
    color: '#fff',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '12px',
    fontWeight: 'bold',
    boxShadow: '0 2px 10px rgba(0, 0, 0, 0.2)',
    zIndex: 10
  },
  
  // Main Content Styles
  main: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    minWidth: 0
  },
  
  // Header Styles
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '16px 32px',
    backgroundColor: '#fff',
    borderBottomWidth: '1px',
    borderBottomStyle: 'solid',
    borderBottomColor: '#E5E7EB',
    boxShadow: '0 1px 3px rgba(0, 0, 0, 0.05)'
  },
  headerLeft: {
    display: 'flex',
    flexDirection: 'column',
    gap: '4px'
  },
  pageTitle: {
    fontSize: '20px',
    fontWeight: '700',
    color: '#1F2937',
    margin: 0
  },
  breadcrumb: {
    fontSize: '13px',
    color: '#9CA3AF',
    margin: 0,
    textTransform: 'capitalize'
  },
  headerRight: {
    display: 'flex',
    alignItems: 'center',
    gap: '16px'
  },
  searchContainer: {
    position: 'relative',
    display: 'flex',
    alignItems: 'center'
  },
  searchIcon: {
    position: 'absolute',
    left: '12px',
    fontSize: '14px',
    opacity: 0.5
  },
  searchInput: {
    padding: '10px 16px 10px 40px',
    borderRadius: '10px',
    borderWidth: '1px',
    borderStyle: 'solid',
    borderColor: '#E5E7EB',
    backgroundColor: '#F9FAFB',
    fontSize: '14px',
    width: '250px',
    outline: 'none',
    transition: 'all 0.2s ease'
  },
  iconButton: {
    position: 'relative',
    width: '42px',
    height: '42px',
    borderRadius: '10px',
    backgroundColor: '#F3F4F6',
    border: 'none',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '18px',
    transition: 'all 0.2s ease'
  },
  notificationBadge: {
    position: 'absolute',
    top: '6px',
    right: '6px',
    width: '18px',
    height: '18px',
    borderRadius: '50%',
    backgroundColor: '#EF4444',
    color: '#fff',
    fontSize: '10px',
    fontWeight: '700',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center'
  },
  headerProfile: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    padding: '8px 16px 8px 8px',
    backgroundColor: '#F9FAFB',
    borderRadius: '12px',
    cursor: 'pointer'
  },
  headerAvatar: {
    width: '36px',
    height: '36px',
    borderRadius: '10px',
    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    color: '#fff',
    fontSize: '13px',
    fontWeight: '700'
  },
  headerUserInfo: {
    display: 'flex',
    flexDirection: 'column'
  },
  headerUserName: {
    fontSize: '13px',
    fontWeight: '600',
    color: '#1F2937'
  },
  headerUserRole: {
    fontSize: '11px',
    color: '#9CA3AF',
    textTransform: 'capitalize'
  },
  
  // Content Area Styles
  contentWrapper: {
    flex: 1,
    padding: '32px',
    overflowY: 'auto',
    backgroundColor: '#F3F4F6'
  },
  contentArea: {
    animation: 'fadeIn 0.3s ease'
  },
  
  // Footer Styles
  footer: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '16px 32px',
    backgroundColor: '#fff',
    borderTopWidth: '1px',
    borderTopStyle: 'solid',
    borderTopColor: '#E5E7EB',
    fontSize: '13px',
    color: '#9CA3AF'
  },
  footerLinks: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px'
  },
  footerLink: {
    color: '#6B7280',
    textDecoration: 'none'
  },
  footerDivider: {
    opacity: 0.5
  }
};

export default Dashboard;