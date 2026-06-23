import React, { useState, useEffect } from 'react';
import { useOutletContext } from 'react-router-dom';
import { generateAIRecommendations } from '../../services/geminiService';
import { Users, UserCheck, UserMinus, DollarSign, Brain, Activity, Lightbulb } from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

const ExecutiveDashboard = () => {
  const { iicData, hasApiKey } = useOutletContext();
  const [recommendations, setRecommendations] = useState('');
  const [loadingAI, setLoadingAI] = useState(false);

  useEffect(() => {
    if (hasApiKey && iicData) {
      const getRecs = async () => {
        setLoadingAI(true);
        try {
          const result = await generateAIRecommendations(iicData.aiContext);
          setRecommendations(result);
        } catch (error) {
          console.error(error);
          setRecommendations(`Failed to generate AI insights.\n\nError: ${error.message || 'Please check your API key.'}`);
        } finally {
          setLoadingAI(false);
        }
      };
      getRecs();
    }
  }, [hasApiKey, iicData]);

  if (!iicData) return null;

  const { kpis, monthlyTrends, highRiskAlerts } = iicData;

  const kpiCards = [
    { title: "Total Admissions", value: kpis.totalAdmissions, icon: <Users size={24} className="text-blue-500" />, bg: "bg-blue-50" },
    { title: "Active Students", value: kpis.activeStudents, icon: <UserCheck size={24} className="text-emerald-500" />, bg: "bg-emerald-50" },
    { title: "Retention Rate", value: `${kpis.retentionRate}%`, icon: <Activity size={24} className="text-purple-500" />, bg: "bg-purple-50" },
    { title: "Total Revenue", value: `$${kpis.totalRevenue.toLocaleString()}`, icon: <DollarSign size={24} className="text-indigo-500" />, bg: "bg-indigo-50" },
  ];

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      {/* KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {kpiCards.map((kpi, index) => (
          <div key={index} className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 flex items-center gap-4 hover:shadow-md transition-shadow">
            <div className={`w-14 h-14 rounded-2xl flex items-center justify-center ${kpi.bg}`}>
              {kpi.icon}
            </div>
            <div>
              <p className="text-sm font-semibold text-slate-500">{kpi.title}</p>
              <h3 className="text-2xl font-bold text-slate-800">{kpi.value}</h3>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Chart */}
        <div className="lg:col-span-2 bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-lg font-bold text-slate-800">Growth & Revenue Trends</h3>
            <span className="text-xs font-semibold px-3 py-1 bg-indigo-50 text-indigo-600 rounded-full">Last 6 Months</span>
          </div>
          <div className="h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={monthlyTrends} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#8B5CF6" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#8B5CF6" stopOpacity={0}/>
                  </linearGradient>
                  <linearGradient id="colorAdmissions" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3B82F6" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#3B82F6" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#94a3b8', fontSize: 12}} />
                <YAxis axisLine={false} tickLine={false} tick={{fill: '#94a3b8', fontSize: 12}} />
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <Tooltip 
                  contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                />
                <Area type="monotone" dataKey="revenue" stroke="#8B5CF6" strokeWidth={3} fillOpacity={1} fill="url(#colorRevenue)" />
                <Area type="monotone" dataKey="admissions" stroke="#3B82F6" strokeWidth={3} fillOpacity={1} fill="url(#colorAdmissions)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* AI Recommendations */}
        <div className="bg-gradient-to-b from-purple-50 to-white p-6 rounded-2xl shadow-sm border border-purple-100 flex flex-col relative overflow-hidden">
          <div className="absolute -right-6 -top-6 text-purple-200/50">
            <Brain size={120} />
          </div>
          <h3 className="text-lg font-bold text-purple-900 mb-4 flex items-center gap-2 relative z-10">
            <Lightbulb className="text-yellow-500" size={20} />
            AI Executive Insights
          </h3>
          
          <div className="flex-1 overflow-y-auto custom-scrollbar relative z-10 text-sm text-slate-700 leading-relaxed pr-2">
            {!hasApiKey ? (
              <div className="flex flex-col items-center justify-center h-full text-center space-y-3">
                <div className="w-12 h-12 bg-white rounded-full flex items-center justify-center shadow-sm">
                  <Brain className="text-slate-400" size={24} />
                </div>
                <p className="text-slate-500 font-medium">Connect Gemini API in the header to unlock real-time AI insights.</p>
              </div>
            ) : loadingAI ? (
              <div className="flex flex-col items-center justify-center h-full space-y-3 animate-pulse">
                <div className="w-10 h-10 border-4 border-purple-200 border-t-purple-600 rounded-full animate-spin"></div>
                <p className="text-purple-600 font-semibold text-xs tracking-wider uppercase">Analyzing Data...</p>
              </div>
            ) : (
              <div className="prose prose-sm prose-purple max-w-none whitespace-pre-wrap">
                {recommendations}
              </div>
            )}
          </div>
        </div>
      </div>
      
      {/* High Risk Alerts preview */}
      <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
        <h3 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
          <UserMinus className="text-rose-500" size={20} />
          Critical Risk Alerts
        </h3>
        {highRiskAlerts.length === 0 ? (
          <p className="text-slate-500 text-sm">No high-risk students detected.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-100 text-sm font-semibold text-slate-500 uppercase tracking-wider">
                  <th className="py-3 px-4">Student</th>
                  <th className="py-3 px-4">Course</th>
                  <th className="py-3 px-4">Risk Factors</th>
                  <th className="py-3 px-4">Score</th>
                </tr>
              </thead>
              <tbody>
                {highRiskAlerts.slice(0, 5).map((student) => (
                  <tr key={student.id} className="border-b border-slate-50 hover:bg-slate-50/50 transition-colors">
                    <td className="py-3 px-4 font-medium text-slate-800">{student.name}</td>
                    <td className="py-3 px-4 text-sm text-slate-600">{student.course}</td>
                    <td className="py-3 px-4 text-sm text-rose-600 font-medium">{student.reasons}</td>
                    <td className="py-3 px-4">
                      <span className={`px-2.5 py-1 rounded-full text-xs font-bold ${
                        student.category === 'Critical' ? 'bg-rose-100 text-rose-700' : 'bg-orange-100 text-orange-700'
                      }`}>
                        {student.riskScore} ({student.category})
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default ExecutiveDashboard;
