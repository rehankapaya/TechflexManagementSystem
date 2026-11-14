import React, { useState, useEffect } from 'react';
import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard,
  Users,
  UserCheck,
  BookOpen,
  ChartBar,
  PenSquare,
  CreditCard,
  BadgeDollarSign,
  UserCog,
  Settings,
  LogOut,
  ChevronLeft,
  ChevronRight,
  Search,
  Bell,
  HelpCircle,
  ChevronDown,
  GraduationCap,
  AlertCircle,
  X,
  Award,
  FileText,
  BarChart3,
  Receipt,
  Banknote,
  BrainCircuit,
  Megaphone,
  Clock,
  Menu,
  Download,
  Grid,
  Layers,
  Sparkles,
  Smartphone
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

const Dashboard = () => {
  const { currentUser, logout, isAdmin } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  const [sidebarCollapsed, setSidebarCollapsed] = useState(() => {
    return typeof window !== 'undefined' ? window.innerWidth < 768 : false;
  });
  const [mobileHubOpen, setMobileHubOpen] = useState(false);
  const [showProfileDropdown, setShowProfileDropdown] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [error, setError] = useState(null);
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [canInstall, setCanInstall] = useState(false);

  useEffect(() => {
    // Automatically close mobile hub drawer when route changes
    setMobileHubOpen(false);
  }, [location.pathname]);

  const getCurrentPageTitle = (path) => {
    if (path === '/dashboard') return 'Overview';
    if (path.startsWith('/dashboard/students')) return 'Students';
    if (path.startsWith('/dashboard/fees')) return 'Fee Entry';
    if (path.startsWith('/dashboard/feestatus')) return 'Fee Status';
    if (path.startsWith('/dashboard/overdue')) return 'Overdue';
    if (path.startsWith('/dashboard/expenses')) return 'Expenses';
    if (path.startsWith('/dashboard/courses')) return 'Courses';
    if (path.startsWith('/dashboard/courseenrollment')) return 'Enrollment';
    if (path.startsWith('/dashboard/timeslot-analytics')) return 'Timeslots';
    if (path.startsWith('/dashboard/studentstatus')) return 'Student Status';
    if (path.startsWith('/dashboard/users')) return 'Users';
    if (path.startsWith('/dashboard/analytics') || path.startsWith('/dashboard/analtyics')) return 'Analytics';
    if (path.startsWith('/dashboard/record')) return 'Records';
    if (path.startsWith('/dashboard/certificate')) return 'Certificates';
    if (path.startsWith('/dashboard/salary')) return 'Staff Salary';
    if (path.startsWith('/dashboard/iic/marketing')) return 'Marketing AI';
    if (path.startsWith('/dashboard/iic')) return 'IIC AI Hub';
    return 'Dashboard';
  };

  useEffect(() => {
    const handleCollapse = () => {
      if (window.innerWidth < 768) setSidebarCollapsed(true);
    };
    window.addEventListener('collapse-sidebar', handleCollapse);
    return () => window.removeEventListener('collapse-sidebar', handleCollapse);
  }, []);

  useEffect(() => {
    const handleBeforeInstall = (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setCanInstall(true);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstall);
    return () => window.removeEventListener('beforeinstallprompt', handleBeforeInstall);
  }, []);

  const handleInstallClick = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') {
      setCanInstall(false);
    }
    setDeferredPrompt(null);
  };

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
    <div className="flex h-screen bg-slate-50 overflow-hidden font-sans">
      {/* DESKTOP SIDEBAR (>= md) */}
      <aside
        className={`hidden md:flex bg-[#0F172A] text-slate-300 flex-col transition-all duration-300 ease-in-out z-30 shadow-xl relative inset-y-0 left-0 ${
          sidebarCollapsed ? 'w-20' : 'w-64'
        }`}
      >
        <div className="p-6 flex items-center gap-3 border-b border-slate-800/50">
          <div className="w-10 h-10 rounded-xl overflow-hidden shadow-lg shadow-blue-500/20 bg-slate-900 flex items-center justify-center border border-slate-700/50 shrink-0">
            <img src="/official-logo.jpg" alt="TechFlex Logo" className="w-full h-full object-cover" />
          </div>
          {!sidebarCollapsed && (
            <span className="text-white font-bold text-xl tracking-tight">TechFlex</span>
          )}
        </div>

        <nav className="flex-1 py-6 overflow-y-auto overflow-x-hidden custom-scrollbar">
          <div className="px-4 mb-6">
            {!sidebarCollapsed && <p className="text-[10px] font-bold text-slate-500 tracking-widest mb-4 px-2">GENERAL</p>}
            <SidebarLink
              to="/dashboard"
              icon={<LayoutDashboard size={20} />}
              label="Overview"
              collapsed={sidebarCollapsed}
              active={location.pathname === '/dashboard'}
            />
            <SidebarLink
              to="/dashboard/students"
              icon={<Users size={20} />}
              label="Students"
              collapsed={sidebarCollapsed}
              active={isActive('/dashboard/students')}
            />
            <SidebarLink
              to="/dashboard/studentstatus"
              icon={<UserCheck size={20} />}
              label="Student Status"
              collapsed={sidebarCollapsed}
              active={isActive('/dashboard/studentstatus')}
            />
          </div>

          <div className="px-4 mb-6">
            {!sidebarCollapsed && <p className="text-[10px] font-bold text-slate-500 tracking-widest mb-4 px-2">ACADEMICS</p>}
            {isAdmin && (
              <>
                <SidebarLink to="/dashboard/courses" icon={<BookOpen size={20} />} label="Courses" collapsed={sidebarCollapsed} active={isActive('/dashboard/courses')} />
                <SidebarLink to="/dashboard/courseenrollment" icon={<PenSquare size={20} />} label="Enrollment" collapsed={sidebarCollapsed} active={isActive('/dashboard/courseenrollment')} />
              </>
            )}
            <SidebarLink to="/dashboard/timeslot-analytics" icon={<Clock size={20} />} label="Timeslots" collapsed={sidebarCollapsed} active={isActive('/dashboard/timeslot-analytics')} />
          </div>

          <div className="px-4 mb-6">
            {!sidebarCollapsed && <p className="text-[10px] font-bold text-slate-500 tracking-widest mb-4 px-2">FINANCE</p>}
            <SidebarLink to="/dashboard/fees" icon={<CreditCard size={20} />} label="Fee Entry" collapsed={sidebarCollapsed} active={isActive('/dashboard/fees')} />
            <SidebarLink to="/dashboard/feestatus" icon={<BadgeDollarSign size={20} />} label="Fee Status" collapsed={sidebarCollapsed} active={isActive('/dashboard/feestatus')} />
            <SidebarLink to="/dashboard/overdue" icon={<AlertCircle size={20} />} label="Overdue Fees" collapsed={sidebarCollapsed} active={isActive('/dashboard/overdue')} />
            <SidebarLink to="/dashboard/expenses" icon={<Receipt size={20} />} label="Expenses" collapsed={sidebarCollapsed} active={isActive('/dashboard/expenses')} />
            {isAdmin && (
              <SidebarLink to="/dashboard/salary" icon={<Banknote size={20} />} label="Staff Salary" collapsed={sidebarCollapsed} active={isActive('/dashboard/salary')} />
            )}
          </div>

          {isAdmin && (
            <div className="px-4 mb-6">
              {!sidebarCollapsed && <p className="text-[10px] font-bold text-slate-500 tracking-widest mb-4 px-2">ADMIN</p>}
              <SidebarLink
                to="/dashboard/users"
                icon={<UserCog size={20} />}
                label="User Management"
                collapsed={sidebarCollapsed}
                active={isActive('/dashboard/users')}
              />

              <SidebarLink
                to="/dashboard/analytics"
                icon={<BarChart3 size={20} />}
                label="Analytics"
                collapsed={sidebarCollapsed}
                active={isActive('/dashboard/analytics') || isActive('/dashboard/analtyics')}
              />

              <SidebarLink
                to="/dashboard/record"
                icon={<FileText size={20} />}
                label="Record"
                collapsed={sidebarCollapsed}
                active={isActive('/dashboard/record')}
              />

              <SidebarLink
                to="/dashboard/certificate"
                icon={<Award size={20} />}
                label="Certificate"
                collapsed={sidebarCollapsed}
                active={isActive('/dashboard/certificate')}
              />
            </div>
          )}

          {isAdmin && (
            <div className="px-4 mb-6">
              {!sidebarCollapsed && <p className="text-[10px] font-bold text-slate-500 tracking-widest mb-4 px-2">INTELLIGENCE</p>}
              <SidebarLink
                to="/dashboard/iic"
                icon={<BrainCircuit size={20} />}
                label="IIC AI Hub"
                collapsed={sidebarCollapsed}
                active={location.pathname === '/dashboard/iic'}
              />
              <SidebarLink
                to="/dashboard/iic/marketing"
                icon={<Megaphone size={20} />}
                label="Marketing AI"
                collapsed={sidebarCollapsed}
                active={isActive('/dashboard/iic/marketing')}
              />
            </div>
          )}
        </nav>

        <button
          onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
          className="absolute bottom-6 -right-3 w-6 h-6 rounded-full bg-[#3B82F6] text-white flex items-center justify-center hover:bg-blue-600 transition-colors shadow-lg z-50 cursor-pointer"
        >
          {sidebarCollapsed ? <ChevronRight size={14} /> : <ChevronLeft size={14} />}
        </button>
      </aside>

      {/* MAIN CONTENT AREA */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* MOBILE TOP APP BAR (< md) */}
        <header className="flex md:hidden h-14 bg-white/95 backdrop-blur-md border-b border-slate-200/80 items-center justify-between px-3.5 sticky top-0 z-20 shadow-2xs">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-8 h-8 rounded-xl overflow-hidden shadow-xs flex items-center justify-center bg-slate-900 border border-slate-200 shrink-0">
              <img src="/official-logo.jpg" alt="TechFlex Logo" className="w-full h-full object-cover" />
            </div>
            <div className="flex items-center gap-1.5 min-w-0">
              <span className="text-slate-900 font-extrabold text-base tracking-tight shrink-0">TechFlex</span>
              <span className="text-slate-300 shrink-0">•</span>
              <span className="text-xs font-bold text-blue-600 truncate bg-blue-50/80 px-2 py-0.5 rounded-md border border-blue-100">
                {getCurrentPageTitle(location.pathname)}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {canInstall && (
              <button
                onClick={handleInstallClick}
                className="flex items-center gap-1 px-2.5 py-1 bg-blue-600 active:bg-blue-700 text-white rounded-lg text-[11px] font-bold shadow-xs transition-transform active:scale-95 cursor-pointer"
                title="Install TechFlex App"
              >
                <Download size={13} />
                <span>Install</span>
              </button>
            )}

            <button
              onClick={() => setMobileHubOpen(true)}
              className="flex items-center gap-1 p-1 rounded-xl bg-slate-100 hover:bg-slate-200 active:scale-95 transition-all cursor-pointer border border-slate-200/60"
              title="Open TechFlex App Hub"
            >
              <div className="w-7 h-7 rounded-lg bg-[#3B82F6] flex items-center justify-center text-white font-bold text-xs shadow-2xs">
                {getInitials(currentUser?.name)}
              </div>
              <div className="w-2 h-2 rounded-full bg-emerald-500 mr-0.5 animate-pulse"></div>
            </button>
          </div>
        </header>

        {/* DESKTOP HEADER (>= md) */}
        <header className="hidden md:flex h-16 sm:h-20 bg-white border-b border-slate-200 items-center justify-between px-8 z-10">
          <div className="flex items-center gap-3">
            <span className="text-xl font-extrabold text-slate-800 tracking-tight">
              {getCurrentPageTitle(location.pathname)}
            </span>
          </div>

          <div className="flex items-center gap-6">
            {canInstall && (
              <button
                onClick={handleInstallClick}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold shadow-sm transition-all cursor-pointer"
                title="Install TechFlex as an app"
              >
                <Download size={14} />
                <span>Install App</span>
              </button>
            )}

            <div className="h-8 w-[1px] bg-slate-200"></div>

            <div className="relative">
              <button
                onClick={() => setShowProfileDropdown(!showProfileDropdown)}
                className="flex items-center gap-3 p-1.5 hover:bg-slate-50 rounded-xl transition-all cursor-pointer"
              >
                <div className="w-10 h-10 rounded-full bg-[#3B82F6] flex items-center justify-center text-white font-bold text-sm shadow-inner">
                  {getInitials(currentUser?.name)}
                </div>
                <div className="flex flex-col text-left">
                  <span className="text-sm font-semibold text-slate-800 leading-tight">{currentUser?.name || "User"}</span>
                  <span className="text-[11px] text-slate-500 font-medium uppercase tracking-wider">{isAdmin ? "Administrator" : "Staff"}</span>
                </div>
                <ChevronDown size={14} className={`text-slate-400 transition-transform ${showProfileDropdown ? 'rotate-180' : ''}`} />
              </button>

              {showProfileDropdown && (
                <div className="absolute top-full right-0 mt-2 w-56 bg-white rounded-xl shadow-2xl border border-slate-100 p-2 z-50 animate-in fade-in slide-in-from-top-2">
                  <div className="px-3 py-2 mb-2">
                    <p className="text-[11px] text-slate-400 uppercase font-bold tracking-wider">Signed in as</p>
                    <p className="text-sm font-medium text-slate-700 truncate">{currentUser?.email}</p>
                  </div>
                  <div className="h-[1px] bg-slate-100 my-1"></div>
                  <button
                    onClick={handleLogout}
                    className="w-full flex items-center gap-2 px-3 py-2 text-sm text-red-600 hover:bg-red-50 rounded-lg transition-colors font-medium mt-1 cursor-pointer"
                  >
                    <LogOut size={16} /> Logout
                  </button>
                </div>
              )}
            </div>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto p-3 sm:p-6 pb-24 md:pb-6 custom-scrollbar">
          {error && (
            <div className="mb-6 flex items-center justify-between p-4 bg-red-50 border border-red-100 text-red-700 rounded-xl animate-bounce-short">
              <div className="flex items-center gap-3">
                <AlertCircle size={20} />
                <p className="text-sm font-medium">{error}</p>
              </div>
              <button onClick={() => setError(null)} className="text-red-400 hover:text-red-600 cursor-pointer">
                <X size={20} />
              </button>
            </div>
          )}

          <Outlet context={{ searchTerm }} />
        </main>

        <footer className="hidden md:flex px-8 py-4 bg-white border-t border-slate-200 justify-between items-center text-xs text-slate-400 font-medium">
          <span>© 2025 TechFlex Management System • v2.0.4</span>
          <div className="flex gap-4">
            <a href="#support" className="hover:text-[#3B82F6] transition-colors">Support</a>
            <a href="#privacy" className="hover:text-[#3B82F6] transition-colors">Privacy Policy</a>
          </div>
        </footer>

        {/* MOBILE BOTTOM NAVIGATION BAR (< md) */}
        <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-xl border-t border-slate-200/80 px-2 py-1.5 shadow-[0_-4px_24px_rgba(0,0,0,0.08)] flex items-center justify-around pb-[max(0.6rem,env(safe-area-inset-bottom))]">
          <BottomNavLink
            to="/dashboard"
            icon={<LayoutDashboard size={20} />}
            label="Home"
            active={location.pathname === '/dashboard'}
          />
          <BottomNavLink
            to="/dashboard/students"
            icon={<Users size={20} />}
            label="Students"
            active={isActive('/dashboard/students')}
          />
          <BottomNavLink
            to="/dashboard/fees"
            icon={<CreditCard size={20} />}
            label="Fees"
            active={isActive('/dashboard/fees')}
          />
          <BottomNavLink
            to="/dashboard/feestatus"
            icon={<BadgeDollarSign size={20} />}
            label="Status"
            active={isActive('/dashboard/feestatus')}
          />
          <button
            onClick={() => setMobileHubOpen(true)}
            className={`flex flex-col items-center justify-center py-1 px-3 rounded-xl transition-all cursor-pointer active:scale-95 ${
              mobileHubOpen ? 'text-blue-600 font-bold' : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            <div className={`p-1.5 rounded-xl transition-all ${mobileHubOpen ? 'bg-blue-600 text-white shadow-md shadow-blue-500/25 scale-105' : 'bg-slate-100 text-slate-600'}`}>
              <Grid size={18} />
            </div>
            <span className="text-[10px] tracking-tight mt-0.5 font-medium">App Hub</span>
          </button>
        </nav>

        {/* NATIVE MOBILE APP HUB SHEET (< md) */}
        {mobileHubOpen && (
          <div className="fixed inset-0 z-50 md:hidden flex flex-col justify-end">
            {/* Backdrop */}
            <div
              onClick={() => setMobileHubOpen(false)}
              className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs transition-opacity animate-in fade-in"
            />

            {/* Bottom Sheet Drawer */}
            <div className="relative w-full max-h-[88vh] bg-white rounded-t-[28px] shadow-2xl flex flex-col overflow-hidden animate-in slide-in-from-bottom duration-300 border-t border-slate-100 z-10">
              {/* Drag Indicator & Header */}
              <div className="pt-3 pb-2.5 px-5 flex flex-col items-center border-b border-slate-100 shrink-0">
                <div className="w-12 h-1.5 bg-slate-200 rounded-full mb-3" />
                <div className="w-full flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className="w-7 h-7 rounded-lg overflow-hidden bg-slate-900 border border-slate-200 shadow-2xs">
                      <img src="/official-logo.jpg" alt="Logo" className="w-full h-full object-cover" />
                    </div>
                    <div>
                      <h2 className="text-base font-extrabold text-slate-900 tracking-tight leading-none">TechFlex App Hub</h2>
                      <span className="text-[10px] text-slate-400 font-medium">Native Navigation Center</span>
                    </div>
                  </div>
                  <button
                    onClick={() => setMobileHubOpen(false)}
                    className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 flex items-center justify-center transition-colors cursor-pointer"
                  >
                    <X size={16} />
                  </button>
                </div>
              </div>

              {/* Sheet Content (Scrollable) */}
              <div className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar pb-[max(2.5rem,env(safe-area-inset-bottom))]">
                {/* User Identity Card */}
                <div className="p-3.5 rounded-2xl bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 text-white shadow-md flex items-center justify-between">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-11 h-11 rounded-2xl bg-blue-600 flex items-center justify-center font-bold text-base text-white shadow-inner shrink-0">
                      {getInitials(currentUser?.name)}
                    </div>
                    <div className="min-w-0">
                      <div className="font-bold text-sm text-white truncate leading-tight">{currentUser?.name || 'User'}</div>
                      <div className="text-[11px] text-slate-300 truncate">{currentUser?.email}</div>
                      <span className="inline-block mt-1 text-[9px] font-bold px-2 py-0.5 rounded-full bg-white/15 text-blue-200 uppercase tracking-wider">
                        {isAdmin ? 'Administrator' : 'Staff Member'}
                      </span>
                    </div>
                  </div>
                  <button
                    onClick={handleLogout}
                    className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 text-xs font-bold transition-colors cursor-pointer shrink-0 ml-2"
                  >
                    <LogOut size={14} />
                    <span>Logout</span>
                  </button>
                </div>

                {/* PWA Install Promo if available */}
                {canInstall && (
                  <button
                    onClick={handleInstallClick}
                    className="w-full p-3 rounded-2xl bg-blue-50 border border-blue-200/80 text-blue-900 flex items-center justify-between transition-all active:scale-[0.98] cursor-pointer"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-xl bg-blue-600 text-white flex items-center justify-center shadow-xs">
                        <Download size={18} />
                      </div>
                      <div className="text-left">
                        <div className="text-xs font-bold">Install Mobile App</div>
                        <div className="text-[11px] text-blue-600 font-medium">Add TechFlex to your home screen</div>
                      </div>
                    </div>
                    <span className="text-xs font-bold bg-blue-600 text-white px-3 py-1.5 rounded-xl shadow-xs">
                      Install
                    </span>
                  </button>
                )}

                {/* Categorized App Hub Tiles */}
                <div className="space-y-4">
                  {/* Finance Section */}
                  <div>
                    <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-2 px-1 flex items-center gap-1.5">
                      <CreditCard size={12} className="text-blue-600" />
                      <span>Finance & Accounts</span>
                    </div>
                    <div className="grid grid-cols-2 gap-2.5">
                      <MobileHubTile
                        to="/dashboard/fees"
                        icon={<CreditCard size={18} className="text-blue-600" />}
                        bg="bg-blue-50"
                        title="Fee Entry"
                        subtitle="Collect tuition"
                        active={isActive('/dashboard/fees')}
                        onClick={() => setMobileHubOpen(false)}
                      />
                      <MobileHubTile
                        to="/dashboard/feestatus"
                        icon={<BadgeDollarSign size={18} className="text-emerald-600" />}
                        bg="bg-emerald-50"
                        title="Fee Status"
                        subtitle="Ledger & balances"
                        active={isActive('/dashboard/feestatus')}
                        onClick={() => setMobileHubOpen(false)}
                      />
                      <MobileHubTile
                        to="/dashboard/overdue"
                        icon={<AlertCircle size={18} className="text-rose-600" />}
                        bg="bg-rose-50"
                        title="Overdue Fees"
                        subtitle="Reminders & calls"
                        active={isActive('/dashboard/overdue')}
                        onClick={() => setMobileHubOpen(false)}
                      />
                      <MobileHubTile
                        to="/dashboard/expenses"
                        icon={<Receipt size={18} className="text-amber-600" />}
                        bg="bg-amber-50"
                        title="Expenses"
                        subtitle="Tracking & ledger"
                        active={isActive('/dashboard/expenses')}
                        onClick={() => setMobileHubOpen(false)}
                      />
                      {isAdmin && (
                        <MobileHubTile
                          to="/dashboard/salary"
                          icon={<Banknote size={18} className="text-teal-600" />}
                          bg="bg-teal-50"
                          title="Staff Salary"
                          subtitle="Payroll & slips"
                          active={isActive('/dashboard/salary')}
                          onClick={() => setMobileHubOpen(false)}
                        />
                      )}
                    </div>
                  </div>

                  {/* Academics Section */}
                  <div>
                    <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-2 px-1 flex items-center gap-1.5">
                      <GraduationCap size={12} className="text-indigo-600" />
                      <span>Academics & Students</span>
                    </div>
                    <div className="grid grid-cols-2 gap-2.5">
                      <MobileHubTile
                        to="/dashboard/students"
                        icon={<Users size={18} className="text-indigo-600" />}
                        bg="bg-indigo-50"
                        title="Students"
                        subtitle="Profiles & photos"
                        active={isActive('/dashboard/students')}
                        onClick={() => setMobileHubOpen(false)}
                      />
                      <MobileHubTile
                        to="/dashboard/studentstatus"
                        icon={<UserCheck size={18} className="text-emerald-600" />}
                        bg="bg-emerald-50"
                        title="Student Status"
                        subtitle="Active & completed"
                        active={isActive('/dashboard/studentstatus')}
                        onClick={() => setMobileHubOpen(false)}
                      />
                      {isAdmin && (
                        <>
                          <MobileHubTile
                            to="/dashboard/courses"
                            icon={<BookOpen size={18} className="text-purple-600" />}
                            bg="bg-purple-50"
                            title="Courses"
                            subtitle="Curriculum fees"
                            active={isActive('/dashboard/courses')}
                            onClick={() => setMobileHubOpen(false)}
                          />
                          <MobileHubTile
                            to="/dashboard/courseenrollment"
                            icon={<PenSquare size={18} className="text-sky-600" />}
                            bg="bg-sky-50"
                            title="Enrollment"
                            subtitle="Course batching"
                            active={isActive('/dashboard/courseenrollment')}
                            onClick={() => setMobileHubOpen(false)}
                          />
                        </>
                      )}
                      <MobileHubTile
                        to="/dashboard/timeslot-analytics"
                        icon={<Clock size={18} className="text-cyan-600" />}
                        bg="bg-cyan-50"
                        title="Timeslots"
                        subtitle="Room schedules"
                        active={isActive('/dashboard/timeslot-analytics')}
                        onClick={() => setMobileHubOpen(false)}
                      />
                    </div>
                  </div>

                  {/* Intelligence & AI */}
                  {isAdmin && (
                    <div>
                      <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-2 px-1 flex items-center gap-1.5">
                        <Sparkles size={11} className="text-purple-600" />
                        <span>Intelligence & AI</span>
                      </div>
                      <div className="grid grid-cols-2 gap-2.5">
                        <MobileHubTile
                          to="/dashboard/iic"
                          icon={<BrainCircuit size={18} className="text-purple-600" />}
                          bg="bg-purple-50"
                          title="IIC AI Hub"
                          subtitle="Risk & analytics"
                          active={location.pathname === '/dashboard/iic'}
                          onClick={() => setMobileHubOpen(false)}
                        />
                        <MobileHubTile
                          to="/dashboard/iic/marketing"
                          icon={<Megaphone size={18} className="text-pink-600" />}
                          bg="bg-pink-50"
                          title="Marketing AI"
                          subtitle="Campaigns & ads"
                          active={isActive('/dashboard/iic/marketing')}
                          onClick={() => setMobileHubOpen(false)}
                        />
                      </div>
                    </div>
                  )}

                  {/* Administration Section */}
                  {isAdmin && (
                    <div>
                      <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-2 px-1 flex items-center gap-1.5">
                        <UserCog size={12} className="text-slate-600" />
                        <span>Administration</span>
                      </div>
                      <div className="grid grid-cols-2 gap-2.5">
                        <MobileHubTile
                          to="/dashboard/users"
                          icon={<UserCog size={18} className="text-slate-700" />}
                          bg="bg-slate-100"
                          title="Users"
                          subtitle="Role management"
                          active={isActive('/dashboard/users')}
                          onClick={() => setMobileHubOpen(false)}
                        />
                        <MobileHubTile
                          to="/dashboard/analytics"
                          icon={<BarChart3 size={18} className="text-blue-600" />}
                          bg="bg-blue-50"
                          title="Analytics"
                          subtitle="Revenue reports"
                          active={isActive('/dashboard/analytics') || isActive('/dashboard/analtyics')}
                          onClick={() => setMobileHubOpen(false)}
                        />
                        <MobileHubTile
                          to="/dashboard/record"
                          icon={<FileText size={18} className="text-emerald-600" />}
                          bg="bg-emerald-50"
                          title="Records"
                          subtitle="Global Excel export"
                          active={isActive('/dashboard/record')}
                          onClick={() => setMobileHubOpen(false)}
                        />
                        <MobileHubTile
                          to="/dashboard/certificate"
                          icon={<Award size={18} className="text-amber-600" />}
                          bg="bg-amber-50"
                          title="Certificates"
                          subtitle="Generate diplomas"
                          active={isActive('/dashboard/certificate')}
                          onClick={() => setMobileHubOpen(false)}
                        />
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

const SidebarLink = ({ to, icon, label, collapsed, active, onClick }) => (
  <Link
    to={to}
    onClick={(e) => {
      if (onClick) onClick(e);
      if (typeof window !== 'undefined' && window.innerWidth < 768) {
        window.dispatchEvent(new CustomEvent('collapse-sidebar'));
      }
    }}
    className={`flex items-center gap-4 px-4 py-3 rounded-xl transition-all duration-200 group mb-1 ${active
      ? 'bg-[#3B82F6] text-white shadow-lg shadow-blue-500/30'
      : 'hover:bg-slate-800/50 text-slate-400 hover:text-white'
      }`}
  >
    <div className={`transition-transform duration-200 ${active ? 'scale-110' : 'group-hover:scale-110'}`}>
      {icon}
    </div>
    {!collapsed && <span className="text-sm font-medium tracking-wide">{label}</span>}
    {active && !collapsed && <div className="ml-auto w-1.5 h-1.5 rounded-full bg-white opacity-50"></div>}
  </Link>
);

const BottomNavLink = ({ to, icon, label, active }) => (
  <Link
    to={to}
    className={`flex flex-col items-center justify-center py-1 px-3 rounded-xl transition-all active:scale-95 ${
      active
        ? 'text-blue-600 font-bold'
        : 'text-slate-400 hover:text-slate-600'
    }`}
  >
    <div className={`p-1.5 rounded-xl transition-all ${active ? 'bg-blue-50 text-blue-600 scale-105' : ''}`}>
      {icon}
    </div>
    <span className="text-[10px] tracking-tight mt-0.5">{label}</span>
  </Link>
);

const MobileHubTile = ({ to, icon, bg, title, subtitle, active, onClick }) => (
  <Link
    to={to}
    onClick={onClick}
    className={`flex items-center gap-3 p-3 rounded-2xl border transition-all active:scale-98 ${
      active
        ? 'bg-blue-50/70 border-blue-200 shadow-xs'
        : 'bg-white hover:bg-slate-50/80 border-slate-200/80'
    }`}
  >
    <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${bg}`}>
      {icon}
    </div>
    <div className="min-w-0">
      <div className={`text-xs font-bold truncate leading-tight ${active ? 'text-blue-700' : 'text-slate-900'}`}>
        {title}
      </div>
      <div className="text-[10px] text-slate-400 truncate mt-0.5">{subtitle}</div>
    </div>
  </Link>
);

export default Dashboard;