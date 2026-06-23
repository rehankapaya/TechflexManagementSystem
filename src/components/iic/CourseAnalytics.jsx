import React from 'react';
import { useOutletContext } from 'react-router-dom';
import { BookOpen, Star, TrendingDown } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer, Cell } from 'recharts';

const CourseAnalytics = () => {
  const { iicData } = useOutletContext();

  if (!iicData) return null;

  const { courseAnalytics } = iicData;

  const sortedCourses = [...courseAnalytics].sort((a, b) => b.enrolled - a.enrolled);
  
  const mostPopular = sortedCourses[0];
  const leastPopular = sortedCourses[sortedCourses.length - 1];

  const COLORS = ['#8B5CF6', '#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#EC4899'];

  return (
    <div className="flex flex-col gap-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-slate-800">Course Performance Analytics</h2>
          <p className="text-slate-500 text-sm mt-1">Identify popular courses and revenue drivers</p>
        </div>
      </div>

      {sortedCourses.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 flex items-center gap-5 border-l-4 border-emerald-500">
            <div className="w-14 h-14 bg-emerald-50 rounded-2xl flex items-center justify-center text-emerald-500">
              <Star size={24} />
            </div>
            <div>
              <p className="text-sm font-semibold text-slate-500 mb-1">Most Popular Course</p>
              <h3 className="text-xl font-bold text-slate-800">{mostPopular.name}</h3>
              <p className="text-xs text-emerald-600 font-medium mt-1">{mostPopular.enrolled} Active Enrollments</p>
            </div>
          </div>

          <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 flex items-center gap-5 border-l-4 border-rose-500">
            <div className="w-14 h-14 bg-rose-50 rounded-2xl flex items-center justify-center text-rose-500">
              <TrendingDown size={24} />
            </div>
            <div>
              <p className="text-sm font-semibold text-slate-500 mb-1">Needs Attention</p>
              <h3 className="text-xl font-bold text-slate-800">{leastPopular.name}</h3>
              <p className="text-xs text-rose-600 font-medium mt-1">Only {leastPopular.enrolled} Active Enrollments</p>
            </div>
          </div>
        </div>
      )}

      <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
        <h3 className="text-lg font-bold text-slate-800 mb-6 flex items-center gap-2">
          <BookOpen className="text-slate-400" size={20} />
          Enrollment Distribution
        </h3>
        <div className="h-[400px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={sortedCourses} margin={{ top: 20, right: 30, left: 0, bottom: 60 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
              <XAxis 
                dataKey="name" 
                axisLine={false} 
                tickLine={false} 
                tick={{fill: '#64748b', fontSize: 12}} 
                angle={-45} 
                textAnchor="end"
              />
              <YAxis axisLine={false} tickLine={false} tick={{fill: '#94a3b8', fontSize: 12}} />
              <RechartsTooltip 
                cursor={{fill: '#f8fafc'}}
                contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} 
              />
              <Bar dataKey="enrolled" radius={[6, 6, 0, 0]}>
                {sortedCourses.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
};

export default CourseAnalytics;
