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
  X
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

const Dashboard = () => {
  const { currentUser, logout, isAdmin } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [showProfileDropdown, setShowProfileDropdown] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [error, setError] = useState(null);

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
      {/* SIDEBAR */}
      <aside 
        className={`bg-[#0F172A] text-slate-300 flex flex-col transition-all duration-300 ease-in-out relative z-20 shadow-xl ${
          sidebarCollapsed ? 'w-20' : 'w-64'
        }`}
      >
        <div className="p-6 flex items-center gap-3 border-b border-slate-800/50">
          <div className="w-10 h-10 bg-[#3B82F6] rounded-xl flex items-center justify-center shadow-lg shadow-blue-500/20">
            <GraduationCap className="text-white w-6 h-6" />
          </div>
          {!sidebarCollapsed && (
            <span className="text-white font-bold text-xl tracking-tight">EduAdmin</span>
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

          {isAdmin && (
            <div className="px-4 mb-6">
              {!sidebarCollapsed && <p className="text-[10px] font-bold text-slate-500 tracking-widest mb-4 px-2">ACADEMICS</p>}
              <SidebarLink to="/dashboard/courses" icon={<BookOpen size={20} />} label="Courses" collapsed={sidebarCollapsed} active={isActive('/dashboard/courses')} />
              <SidebarLink to="/dashboard/courseenrollment" icon={<PenSquare size={20} />} label="Enrollment" collapsed={sidebarCollapsed} active={isActive('/dashboard/courseenrollment')} />
            </div>
          )}

          <div className="px-4 mb-6">
            {!sidebarCollapsed && <p className="text-[10px] font-bold text-slate-500 tracking-widest mb-4 px-2">FINANCE</p>}
            <SidebarLink to="/dashboard/fees" icon={<CreditCard size={20} />} label="Fee Entry" collapsed={sidebarCollapsed} active={isActive('/dashboard/fees')} />
            <SidebarLink to="/dashboard/feestatus" icon={<BadgeDollarSign size={20} />} label="Fee Status" collapsed={sidebarCollapsed} active={isActive('/dashboard/feestatus')} />
          </div>

          {isAdmin && (
            <div className="px-4 mb-6">
              {!sidebarCollapsed && <p className="text-[10px] font-bold text-slate-500 tracking-widest mb-4 px-2">ADMIN</p>}
              <SidebarLink to="/dashboard/users" icon={<UserCog size={20} />} label="User Management" collapsed={sidebarCollapsed} active={isActive('/dashboard/users')} />
              <SidebarLink to="/dashboard/analtyics" icon={<ChartBar size={20} />} label="Analtyics" collapsed={sidebarCollapsed} active={isActive('/dashboard/settings')} />
            </div>
          )}
        </nav>

        <button 
          onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
          className="absolute bottom-6 -right-3 w-6 h-6 rounded-full bg-[#3B82F6] text-white flex items-center justify-center hover:bg-blue-600 transition-colors shadow-lg"
        >
          {sidebarCollapsed ? <ChevronRight size={14} /> : <ChevronLeft size={14} />}
        </button>
      </aside>

      {/* MAIN CONTENT */}
      <div className="flex-1 flex flex-col min-w-0">
        <header className="h-20 bg-white border-b border-slate-200 flex items-center justify-end px-8 z-10">
          {/* <div className="relative w-full max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            <input 
              type="text" 
              placeholder="Search data, students, or records..." 
              className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-[#3B82F6] outline-none transition-all text-sm"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div> */}

          <div className="flex items-center gap-6">
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

        <main className="flex-1 overflow-y-auto p-8">
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
          
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 min-h-full p-6">
            <Outlet context={{ searchTerm }} />
          </div>
        </main>

        <footer className="px-8 py-4 bg-white border-t border-slate-200 flex justify-between items-center text-xs text-slate-400 font-medium">
          <span>© 2025 EduAdmin System • v2.0.4</span>
          <div className="flex gap-4">
            <a href="#support" className="hover:text-[#3B82F6] transition-colors">Support</a>
            <a href="#privacy" className="hover:text-[#3B82F6] transition-colors">Privacy Policy</a>
          </div>
        </footer>
      </div>
    </div>
  );
};

const SidebarLink = ({ to, icon, label, collapsed, active }) => (
  <Link 
    to={to} 
    className={`flex items-center gap-4 px-4 py-3 rounded-xl transition-all duration-200 group mb-1 ${
      active 
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

export default Dashboard;