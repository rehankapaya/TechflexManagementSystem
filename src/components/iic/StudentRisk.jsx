import React, { useState } from 'react';
import { useOutletContext } from 'react-router-dom';
import { ShieldAlert, Search, Filter } from 'lucide-react';

const StudentRisk = () => {
  const { iicData } = useOutletContext();
  const [searchTerm, setSearchTerm] = useState('');

  if (!iicData) return null;

  const { highRiskAlerts = [] } = iicData;

  const filteredAlerts = highRiskAlerts.filter(s => 
    (s.name || '').toLowerCase().includes(searchTerm.toLowerCase()) || 
    (s.course || '').toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="flex flex-col gap-6 animate-in fade-in slide-in-from-bottom-4 duration-500 h-full">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-800">Student Risk Detection</h2>
          <p className="text-slate-500 text-sm mt-1">Identify and intervene with at-risk students</p>
        </div>
        
        <div className="flex items-center gap-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
            <input 
              type="text" 
              placeholder="Search students..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9 pr-4 py-2 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500 outline-none text-sm w-64"
            />
          </div>
          <button className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 rounded-xl text-sm font-semibold text-slate-600 hover:bg-slate-50">
            <Filter size={16} /> Filter
          </button>
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 flex-1 flex flex-col overflow-hidden">
        <div className="p-6 border-b border-slate-100 bg-rose-50/30">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-rose-100 flex items-center justify-center text-rose-600">
              <ShieldAlert size={20} />
            </div>
            <div>
              <h3 className="font-bold text-slate-800 text-lg">Active Alerts</h3>
              <p className="text-sm text-slate-500">{filteredAlerts.length} students require attention based on AI heuristics.</p>
            </div>
          </div>
        </div>

        <div className="flex-1 overflow-auto custom-scrollbar">
          <table className="w-full text-left border-collapse">
            <thead className="sticky top-0 bg-white shadow-sm z-10">
              <tr className="border-b border-slate-100 text-xs font-bold text-slate-500 uppercase tracking-wider">
                <th className="py-4 px-6">Student Name</th>
                <th className="py-4 px-6">Course</th>
                <th className="py-4 px-6">Risk Score</th>
                <th className="py-4 px-6">Primary Risk Factors</th>
                <th className="py-4 px-6">Suggested Action</th>
              </tr>
            </thead>
            <tbody>
              {filteredAlerts.length > 0 ? filteredAlerts.map((student) => (
                <tr key={student.id} className="border-b border-slate-50 hover:bg-slate-50/80 transition-colors group">
                  <td className="py-4 px-6">
                    <div className="font-bold text-slate-800">{student.name}</div>
                    <div className="text-xs text-slate-500 font-mono mt-0.5">ID: {student.id ? student.id.slice(0,8) : 'N/A'}...</div>
                  </td>
                  <td className="py-4 px-6 text-sm text-slate-600 font-medium">{student.course}</td>
                  <td className="py-4 px-6">
                    <div className="flex items-center gap-2">
                      <div className="w-16 h-2 bg-slate-100 rounded-full overflow-hidden">
                        <div 
                          className={`h-full rounded-full ${student.riskScore >= 70 ? 'bg-rose-500' : 'bg-orange-400'}`}
                          style={{ width: `${student.riskScore}%` }}
                        ></div>
                      </div>
                      <span className={`text-sm font-bold ${student.riskScore >= 70 ? 'text-rose-600' : 'text-orange-600'}`}>
                        {student.riskScore}
                      </span>
                    </div>
                  </td>
                  <td className="py-4 px-6">
                    <div className="flex flex-wrap gap-1">
                      {student.reasons.split(',').map((r, i) => (
                        <span key={i} className="px-2 py-0.5 bg-rose-50 text-rose-700 rounded text-xs font-semibold border border-rose-100">
                          {r.trim()}
                        </span>
                      ))}
                    </div>
                  </td>
                  <td className="py-4 px-6">
                    <button className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-white rounded-lg text-xs font-bold transition-colors shadow-sm opacity-0 group-hover:opacity-100 focus:opacity-100">
                      View Profile
                    </button>
                  </td>
                </tr>
              )) : (
                <tr>
                  <td colSpan="5" className="py-12 text-center text-slate-500">
                    <ShieldAlert size={48} className="mx-auto text-slate-200 mb-4" />
                    <p className="text-lg font-medium">No students match the criteria.</p>
                    <p className="text-sm mt-1">Try adjusting your search filters.</p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default StudentRisk;
