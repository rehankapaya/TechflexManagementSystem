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
  Download
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

const Dashboard = () => {
  const { currentUser, logout, isAdmin } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  const [sidebarCollapsed, setSidebarCollapsed] = useState(() => {
    return typeof window !== 'undefined' ? window.innerWidth < 768 : false;
  });
  const [showProfileDropdown, setShowProfileDropdown] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [error, setError] = useState(null);
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [canInstall, setCanInstall] = useState(false);

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
      {/* Mobile backdrop */}
      {!sidebarCollapsed && (
        <div
          onClick={() => setSidebarCollapsed(true)}
          className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-20 md:hidden"
        />
      )}

      {/* SIDEBAR */}
      <aside
        className={`bg-[#0F172A] text-slate-300 flex flex-col transition-all duration-300 ease-in-out z-30 shadow-xl ${
          sidebarCollapsed
            ? 'w-0 -translate-x-full md:translate-x-0 md:w-20 overflow-hidden'
            : 'fixed md:relative inset-y-0 left-0 w-64'
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
          className="absolute bottom-6 -right-3 w-6 h-6 rounded-full bg-[#3B82F6] text-white flex items-center justify-center hover:bg-blue-600 transition-colors shadow-lg z-50"
        >
          {sidebarCollapsed ? <ChevronRight size={14} /> : <ChevronLeft size={14} />}
        </button>
      </aside>

      {/* MAIN CONTENT */}
      <div className="flex-1 flex flex-col min-w-0">
        <header className="h-16 sm:h-20 bg-white border-b border-slate-200 flex items-center justify-between px-4 sm:px-8 z-10">
          <div className="flex items-center gap-2 sm:gap-3">
            <button
              onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
              className="p-2 text-slate-600 hover:bg-slate-100 rounded-lg transition-colors md:hidden"
              title="Toggle Menu"
            >
              <Menu size={22} />
            </button>
            <div className="flex items-center gap-2 md:hidden">
              <div className="w-8 h-8 rounded-lg overflow-hidden shadow-sm flex items-center justify-center bg-slate-900 border border-slate-200 shrink-0">
                <img src="/official-logo.jpg" alt="TechFlex Logo" className="w-full h-full object-cover" />
              </div>
              <span className="text-slate-800 font-bold text-lg tracking-tight">TechFlex</span>
            </div>
          </div>

          <div className="flex items-center gap-3 sm:gap-6">
            {canInstall && (
              <button
                onClick={handleInstallClick}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold shadow-sm transition-all"
                title="Install TechFlex as an app"
              >
                <Download size={14} />
                <span className="hidden sm:inline">Install App</span>
                <span className="sm:hidden">Install</span>
              </button>
            )}
            {/* <div className="flex items-center gap-4 text-slate-500">
              <button className="relative p-2 hover:bg-slate-100 rounded-lg transition-colors">
                <Bell size={20} />
                <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full border-2 border-white"></span>
              </button>
              <button className="p-2 hover:bg-slate-100 rounded-lg transition-colors">
                <HelpCircle size={20} />
              </button>
            </div> */}

            <div className="h-8 w-[1px] bg-slate-200"></div>

            <div className="relative">
              <button
                onClick={() => setShowProfileDropdown(!showProfileDropdown)}
                className="flex items-center gap-3 p-1.5 hover:bg-slate-50 rounded-xl transition-all"
              >
                <div className="w-10 h-10 rounded-full bg-[#3B82F6] flex items-center justify-center text-white font-bold text-sm shadow-inner">
                  {getInitials(currentUser?.name)}
                </div>
                <div className="hidden md:flex flex-col text-left">
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
                  {/* <Link to="/dashboard/profile" className="flex items-center gap-2 px-3 py-2 text-sm text-slate-600 hover:bg-slate-50 hover:text-[#3B82F6] rounded-lg transition-colors">
                    <UserCog size={16} /> My Profile
                  </Link> */}
                  <button
                    onClick={handleLogout}
                    className="w-full flex items-center gap-2 px-3 py-2 text-sm text-red-600 hover:bg-red-50 rounded-lg transition-colors font-medium mt-1"
                  >
                    <LogOut size={16} /> Logout
                  </button>
                </div>
              )}
            </div>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto p-3 sm:p-6 pb-24 md:pb-6">
          {error && (
            <div className="mb-6 flex items-center justify-between p-4 bg-red-50 border border-red-100 text-red-700 rounded-xl animate-bounce-short">
              <div className="flex items-center gap-3">
                <AlertCircle size={20} />
                <p className="text-sm font-medium">{error}</p>
              </div>
              <button onClick={() => setError(null)} className="text-red-400 hover:text-red-600">
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

        {/* MOBILE BOTTOM NAVIGATION BAR */}
        <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-md border-t border-slate-200/80 px-2 py-1 shadow-[0_-4px_16px_rgba(0,0,0,0.06)] flex items-center justify-around pb-[max(0.4rem,env(safe-area-inset-bottom))]">
          <BottomNavLink
            to="/dashboard"
            icon={<LayoutDashboard size={20} />}
            label="Overview"
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
            onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
            className={`flex flex-col items-center justify-center py-1 px-3 rounded-xl transition-all cursor-pointer ${
              !sidebarCollapsed ? 'text-blue-600 font-semibold' : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            <div className={`p-1 rounded-lg transition-transform ${!sidebarCollapsed ? 'scale-110 bg-blue-50 text-blue-600' : ''}`}>
              <Menu size={20} />
            </div>
            <span className="text-[10px] tracking-tight mt-0.5">More</span>
          </button>
        </nav>
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
    className={`flex flex-col items-center justify-center py-1 px-3 rounded-xl transition-all ${
      active
        ? 'text-blue-600 font-semibold'
        : 'text-slate-400 hover:text-slate-600'
    }`}
  >
    <div className={`p-1 rounded-lg transition-transform ${active ? 'scale-110 bg-blue-50 text-blue-600' : ''}`}>
      {icon}
    </div>
    <span className="text-[10px] tracking-tight mt-0.5">{label}</span>
  </Link>
);

export default Dashboard;