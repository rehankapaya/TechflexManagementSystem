import React, { useState, useEffect } from 'react';
import { Outlet, NavLink, useLocation } from 'react-router-dom';
import { BrainCircuit, TrendingUp, AlertTriangle, MessageSquare, BarChart, Settings, Megaphone, RefreshCw } from 'lucide-react';
import { fetchIICData, getCachedIICData } from '../../services/iicDataAggregator';
import toast, { Toaster } from 'react-hot-toast';

const IICLayout = () => {
  const [apiKey, setApiKey] = useState('');
  const [iicData, setIicData] = useState(() => getCachedIICData());
  const [loading, setLoading] = useState(() => !getCachedIICData());
  const [refreshing, setRefreshing] = useState(false);
  const location = useLocation();

  const loadData = async (force = false) => {
    if (force) setRefreshing(true);
    else if (!iicData) setLoading(true);

    try {
      const data = await fetchIICData(force);
      setIicData(data);
      if (force) {
        toast.success("Intelligence Center data refreshed");
      }
    } catch (error) {
      toast.error("Failed to fetch data for Intelligence Center");
      console.error(error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    const savedKey = localStorage.getItem('IIC_GROQ_API_KEY') || import.meta.env.VITE_GROQ_API_KEY;
    if (savedKey) setApiKey(savedKey);

    // If we don't have cached data in memory/sessionStorage, load it immediately
    if (!iicData) {
      loadData(false);
    }
  }, []);

  const saveApiKey = (e) => {
    e.preventDefault();
    localStorage.setItem('IIC_GROQ_API_KEY', apiKey.trim());
    toast.success("Groq API Key saved securely to your browser.");
  };

  const navLinks = [
    { path: '/dashboard/iic', label: 'Executive', icon: <BrainCircuit size={18} />, exact: true },
    { path: '/dashboard/iic/forecast', label: 'Forecasting', icon: <TrendingUp size={18} /> },
    { path: '/dashboard/iic/risk', label: 'Risk Center', icon: <AlertTriangle size={18} /> },
    { path: '/dashboard/iic/analytics', label: 'Analytics', icon: <BarChart size={18} /> },
    { path: '/dashboard/iic/assistant', label: 'AI Assistant', icon: <MessageSquare size={18} /> },
    { path: '/dashboard/iic/marketing', label: 'Marketing AI', icon: <Megaphone size={18} /> },
  ];

  if (loading && !iicData) {
    return (
      <div className="flex flex-col items-center justify-center h-96 gap-3">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600"></div>
        <p className="text-sm font-semibold text-slate-500">Loading Intelligence Center...</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-full relative font-sans text-slate-800">
      <Toaster position="top-right" />
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-indigo-900 to-purple-900 text-white rounded-t-2xl p-6 shadow-md relative overflow-hidden shrink-0">
        <div className="absolute top-0 left-0 w-full h-full opacity-10 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')]"></div>
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-extrabold tracking-tight flex items-center gap-3">
              <BrainCircuit className="text-purple-400" size={32} />
              Institution Intelligence Center
            </h1>
            <p className="text-indigo-200 mt-1 font-medium">AI-powered analytics and predictive insights</p>
          </div>

          <div className="flex items-center gap-3 self-end md:self-auto">
            <button
              onClick={() => loadData(true)}
              disabled={refreshing}
              className="flex items-center gap-1.5 px-3 py-2 bg-white/10 hover:bg-white/20 text-white rounded-xl text-xs font-bold transition-all border border-white/20 backdrop-blur-sm cursor-pointer disabled:opacity-50"
              title="Refresh Live Data from Database"
            >
              <RefreshCw size={14} className={refreshing ? "animate-spin" : ""} />
              <span>{refreshing ? "Syncing..." : "Sync Data"}</span>
            </button>

            <form onSubmit={saveApiKey} className="flex items-center gap-2 bg-white/10 p-2 rounded-xl backdrop-blur-sm border border-white/20">
              <Settings size={16} className="text-indigo-300 ml-2" />
              <input
                type="password"
                placeholder="Groq API Key..."
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                className="bg-transparent border-none outline-none text-sm text-white placeholder-indigo-300 w-40 px-2"
              />
              <button type="submit" className="bg-purple-500 hover:bg-purple-600 px-3 py-1.5 rounded-lg text-xs font-bold transition-colors cursor-pointer">
                Save
              </button>
            </form>
          </div>
        </div>
      </div>

      <div className="border-b border-slate-200 bg-white shadow-sm sticky top-0 z-10 shrink-0">
        <nav className="flex gap-2 p-2 px-6 overflow-x-auto custom-scrollbar">
          {navLinks.map((link) => {
            const isActive = link.exact ? location.pathname === link.path : location.pathname.startsWith(link.path);
            return (
              <NavLink
                key={link.path}
                to={link.path}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all shrink-0 ${isActive
                  ? 'bg-purple-100 text-purple-700 shadow-sm'
                  : 'text-slate-500 hover:bg-slate-100 hover:text-slate-800'
                  }`}
              >
                {link.icon}
                {link.label}
              </NavLink>
            );
          })}
        </nav>
      </div>

      <div className="flex-1 py-6">
        {/* Pass fetched data to all child routes */}
        <Outlet context={{ iicData, hasApiKey: !!apiKey }} />
      </div>
    </div>
  );
};

export default IICLayout;
