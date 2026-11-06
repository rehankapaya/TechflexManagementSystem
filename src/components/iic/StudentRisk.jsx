import React, { useState } from 'react';
import { useOutletContext } from 'react-router-dom';
import { ShieldAlert, Search, Eye } from 'lucide-react';
import StudentRiskModal from './StudentRiskModal';

const StudentRisk = () => {
  const { iicData } = useOutletContext();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedStudent, setSelectedStudent] = useState(null);

  if (!iicData) return null;

  const { highRiskAlerts = [] } = iicData;

  const filteredAlerts = highRiskAlerts.filter(s => 
    (s.name || '').toLowerCase().includes(searchTerm.toLowerCase()) || 
    (s.course || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
    (s.student_id || '').toLowerCase().includes(searchTerm.toLowerCase())
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
              placeholder="Search by student name, ID or course..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9 pr-4 py-2 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500 outline-none text-sm w-72"
            />
          </div>
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 flex-1 flex flex-col overflow-hidden">
        <div className="p-6 border-b border-slate-100 bg-rose-50/30">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-rose-100 flex items-center justify-center text-rose-600">
              <ShieldAlert size={20} />
            </div>
            <div>
              <h3 className="font-bold text-slate-800 text-lg">Active Risk Alerts</h3>
              <p className="text-sm text-slate-500">{filteredAlerts.length} student{filteredAlerts.length === 1 ? '' : 's'} flagged based on overdue fees and course engagement.</p>
            </div>
          </div>
        </div>

        <div className="flex-1 overflow-auto custom-scrollbar">
          <table className="w-full text-left border-collapse">
            <thead className="sticky top-0 bg-white shadow-sm z-10">
              <tr className="border-b border-slate-100 text-xs font-bold text-slate-500 uppercase tracking-wider">
                <th className="py-4 px-6">Student</th>
                <th className="py-4 px-6">Course</th>
                <th className="py-4 px-6">Risk Level & Score</th>
                <th className="py-4 px-6">Primary Risk Factors</th>
                <th className="py-4 px-6 text-right">Action</th>
              </tr>
            </thead>
            <tbody>
              {filteredAlerts.length > 0 ? filteredAlerts.map((student) => (
                <tr key={student.id} className="border-b border-slate-50 hover:bg-slate-50/80 transition-colors group">
                  <td className="py-4 px-6">
                    <div 
                      onClick={() => setSelectedStudent(student)}
                      className="font-bold text-slate-800 hover:text-rose-600 cursor-pointer transition-colors"
                      title="Click to view student dossier"
                    >
                      {student.name}
                    </div>
                    <div className="text-xs text-slate-500 font-mono mt-0.5">ID: {student.student_id || student.id}</div>
                  </td>
                  <td className="py-4 px-6 text-sm text-slate-600 font-medium">{student.course}</td>
                  <td className="py-4 px-6">
                    <div className="flex items-center gap-2.5">
                      <div className="w-16 h-2 bg-slate-100 rounded-full overflow-hidden">
                        <div 
                          className={`h-full rounded-full ${
                            student.riskScore >= 70 ? 'bg-rose-500' : student.riskScore >= 40 ? 'bg-orange-500' : 'bg-amber-500'
                          }`}
                          style={{ width: `${Math.min(100, student.riskScore)}%` }}
                        ></div>
                      </div>
                      <span className={`text-sm font-bold ${
                        student.riskScore >= 70 ? 'text-rose-600' : student.riskScore >= 40 ? 'text-orange-600' : 'text-amber-600'
                      }`}>
                        {student.riskScore}
                      </span>
                      <span className={`px-2 py-0.5 rounded-full text-xs font-bold inline-flex items-center ${
                        student.category === 'Critical' 
                          ? 'bg-rose-100 text-rose-700 border border-rose-200' 
                          : student.category === 'High' 
                          ? 'bg-orange-100 text-orange-700 border border-orange-200' 
                          : 'bg-amber-100 text-amber-700 border border-amber-200'
                      }`}>
                        {student.category}
                      </span>
                    </div>
                  </td>
                  <td className="py-4 px-6">
                    <div className="flex flex-wrap gap-1.5">
                      {student.reasons.split(',').map((r, i) => (
                        <span key={i} className="px-2 py-0.5 bg-rose-50 text-rose-700 rounded text-xs font-semibold border border-rose-100">
                          {r.trim()}
                        </span>
                      ))}
                    </div>
                  </td>
                  <td className="py-4 px-6 text-right">
                    <button 
                      onClick={() => setSelectedStudent(student)}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-white rounded-lg text-xs font-bold transition-colors shadow-sm cursor-pointer"
                    >
                      <Eye size={13} /> View Student
                    </button>
                  </td>
                </tr>
              )) : (
                <tr>
                  <td colSpan="5" className="py-12 text-center text-slate-500">
                    <ShieldAlert size={48} className="mx-auto text-emerald-300 mb-4" />
                    <p className="text-lg font-medium text-slate-700">No At-Risk Students Found</p>
                    <p className="text-sm mt-1 text-slate-400">All student course enrollments and fees are currently in good standing.</p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* STUDENT PROFILE & RISK DOSSIER MODAL */}
      {selectedStudent && (
        <StudentRiskModal
          student={selectedStudent}
          onClose={() => setSelectedStudent(null)}
        />
      )}
    </div>
  );
};

export default StudentRisk;
