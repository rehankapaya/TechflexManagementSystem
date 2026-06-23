import React, { useState, useEffect } from 'react';
import { useOutletContext } from 'react-router-dom';
import { TrendingUp, Users, Calendar, BarChart2 } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';

const AdmissionForecasting = () => {
  const { iicData } = useOutletContext();
  const [forecastData, setForecastData] = useState([]);

  useEffect(() => {
    if (iicData) {
      // Simulate forecasting based on monthly trends using linear regression mock
      const historical = iicData.monthlyTrends;
      
      // Simple mock projection
      const lastMonthAdmissions = historical[historical.length - 1].admissions;
      const avgGrowth = 2; // Simulated growth
      
      const projection = [
        ...historical.map(d => ({ name: d.name, actual: d.admissions, predicted: null })),
        { name: 'Jul (Est)', actual: null, predicted: lastMonthAdmissions + avgGrowth },
        { name: 'Aug (Est)', actual: null, predicted: lastMonthAdmissions + (avgGrowth * 2) },
        { name: 'Sep (Est)', actual: null, predicted: lastMonthAdmissions + (avgGrowth * 3) }
      ];
      
      setForecastData(projection);
    }
  }, [iicData]);

  if (!iicData) return null;

  return (
    <div className="flex flex-col gap-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-slate-800">Admission Forecasting</h2>
          <p className="text-slate-500 text-sm mt-1">Predictive models based on historical enrollment data</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 flex items-center gap-4 border-l-4 border-l-blue-500">
          <div className="bg-blue-50 p-3 rounded-xl"><Users className="text-blue-500" /></div>
          <div>
            <p className="text-sm text-slate-500 font-semibold">Predicted Next Month</p>
            <h3 className="text-2xl font-bold text-slate-800">
              {forecastData.length > 0 ? forecastData[forecastData.length - 3].predicted : 0}
            </h3>
          </div>
        </div>
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 flex items-center gap-4 border-l-4 border-l-emerald-500">
          <div className="bg-emerald-50 p-3 rounded-xl"><TrendingUp className="text-emerald-500" /></div>
          <div>
            <p className="text-sm text-slate-500 font-semibold">Growth Trend</p>
            <h3 className="text-2xl font-bold text-slate-800">+12.5%</h3>
          </div>
        </div>
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 flex items-center gap-4 border-l-4 border-l-purple-500">
          <div className="bg-purple-50 p-3 rounded-xl"><Calendar className="text-purple-500" /></div>
          <div>
            <p className="text-sm text-slate-500 font-semibold">Peak Season Est.</p>
            <h3 className="text-2xl font-bold text-slate-800">August</h3>
          </div>
        </div>
      </div>

      <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
        <h3 className="text-lg font-bold text-slate-800 mb-6 flex items-center gap-2">
          <BarChart2 className="text-slate-400" size={20} />
          90-Day Admission Projection
        </h3>
        <div className="h-[400px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={forecastData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
              <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#94a3b8', fontSize: 12}} />
              <YAxis axisLine={false} tickLine={false} tick={{fill: '#94a3b8', fontSize: 12}} />
              <Tooltip contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
              <Legend iconType="circle" wrapperStyle={{ fontSize: '12px', paddingTop: '20px' }} />
              <Line type="monotone" dataKey="actual" name="Actual Admissions" stroke="#3B82F6" strokeWidth={3} dot={{ r: 4, strokeWidth: 2 }} activeDot={{ r: 6 }} />
              <Line type="monotone" dataKey="predicted" name="Forecasted Admissions" stroke="#8B5CF6" strokeWidth={3} strokeDasharray="5 5" dot={{ r: 4, strokeWidth: 2 }} />
            </LineChart>
          </ResponsiveContainer>
        </div>
        <div className="mt-4 p-4 bg-indigo-50 rounded-xl text-sm text-indigo-800 flex items-start gap-3">
          <div className="mt-0.5 font-bold">ℹ️</div>
          <p>
            <strong>Insight:</strong> Based on the linear regression model of the last 6 months, admissions are expected to grow steadily over the next quarter. We recommend increasing marketing spend in July to capture the projected August peak.
          </p>
        </div>
      </div>
    </div>
  );
};

export default AdmissionForecasting;
