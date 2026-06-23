import React, { useState, useEffect } from 'react';
import { Outlet, NavLink, useLocation } from 'react-router-dom';
import { BrainCircuit, TrendingUp, AlertTriangle, MessageSquare, BarChart, Settings, Megaphone } from 'lucide-react';
import { fetchIICData } from '../../services/iicDataAggregator';
import toast, { Toaster } from 'react-hot-toast';

const IICLayout = () => {
  const [apiKey, setApiKey] = useState('');
  const [iicData, setIicData] = useState(null);
  const [loading, setLoading] = useState(true);
  const location = useLocation();

  useEffect(() => {
    const savedKey = localStorage.getItem('IIC_GROQ_API_KEY');
    if (savedKey) setApiKey(savedKey);

    const loadData = async () => {
      try {
        const data = await fetchIICData();
        setIicData(data);
      } catch (error) {
        toast.error("Failed to fetch data for Intelligence Center");
        console.error(error);
      } finally {
        setLoading(false);
      }
    };
    loadData();
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

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#8B5CF6]"></div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full relative font-sans text-slate-800">
      <Toaster position="top-right" />
      {/* Settings Modal overlay if we want, or just a bar at the top */}
      <div className="bg-gradient-to-r from-indigo-900 to-purple-900 text-white rounded-t-2xl p-6 shadow-md relative overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-full opacity-10 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')]"></div>
        <div className="relative z-10 flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-extrabold tracking-tight flex items-center gap-3">
              <BrainCircuit className="text-purple-400" size={32} />
              Institution Intelligence Center
            </h1>
            <p className="text-indigo-200 mt-1 font-medium">AI-powered analytics and predictive insights</p>
          </div>
          <div className="flex flex-col items-end gap-2">
            <form onSubmit={saveApiKey} className="flex items-center gap-2 bg-white/10 p-2 rounded-xl backdrop-blur-sm border border-white/20">
              <Settings size={16} className="text-indigo-300 ml-2" />
              <input
                type="password"
                placeholder="Groq API Key..."
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                className="bg-transparent border-none outline-none text-sm text-white placeholder-indigo-300 w-48 px-2"
              />
              <button type="submit" className="bg-purple-500 hover:bg-purple-600 px-3 py-1.5 rounded-lg text-xs font-bold transition-colors">
                Save Key
              </button>
            </form>
            {!apiKey && <p className="text-xs text-red-300 animate-pulse font-medium">⚠️ API Key required for AI features</p>}
          </div>
        </div>
      </div>

      <div className="border-b border-slate-200 bg-white shadow-sm sticky top-0 z-10">
        <nav className="flex gap-2 p-2 px-6">
          {navLinks.map((link) => {
            const isActive = link.exact ? location.pathname === link.path : location.pathname.startsWith(link.path);
            return (
              <NavLink
                key={link.path}
                to={link.path}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all ${isActive
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
