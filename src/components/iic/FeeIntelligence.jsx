import React from 'react';
import { useOutletContext } from 'react-router-dom';
import { DollarSign, AlertCircle, PieChart as PieChartIcon } from 'lucide-react';
import { PieChart, Pie, Cell, Tooltip as RechartsTooltip, ResponsiveContainer, Legend } from 'recharts';

const FeeIntelligence = () => {
  const { iicData } = useOutletContext();

  if (!iicData) return null;

  const { kpis, monthlyTrends } = iicData;

  const feeData = [
    { name: 'Collected Revenue', value: kpis.totalRevenue },
    { name: 'Outstanding Dues', value: kpis.totalOutstanding },
  ];
  const COLORS = ['#10B981', '#F43F5E'];

  // Calculate prediction for current month collection based on outstanding
  const expectedRecovery = kpis.totalOutstanding > 0 ? (kpis.totalOutstanding * 0.4) : 0; // Simulate 40% recovery

  return (
    <div className="flex flex-col gap-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-slate-800">Fee Intelligence</h2>
          <p className="text-slate-500 text-sm mt-1">Revenue analysis and defaulter predictions</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 flex flex-col justify-center">
          <p className="text-sm font-semibold text-slate-500 mb-1">Total Outstanding</p>
          <h3 className="text-3xl font-bold text-rose-500 mb-4">${kpis.totalOutstanding.toLocaleString()}</h3>
          <div className="w-full bg-slate-100 rounded-full h-2">
            <div className="bg-rose-500 h-2 rounded-full" style={{ width: `${(kpis.totalOutstanding / (kpis.totalRevenue + kpis.totalOutstanding) * 100) || 0}%` }}></div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 flex flex-col justify-center">
          <p className="text-sm font-semibold text-slate-500 mb-1">Predicted Recovery (This Month)</p>
          <h3 className="text-3xl font-bold text-emerald-500 mb-4">${expectedRecovery.toLocaleString()}</h3>
          <div className="flex items-center gap-2 text-xs font-semibold text-emerald-600 bg-emerald-50 w-max px-2.5 py-1 rounded-md">
            <TrendingUpMock size={14} /> +4.2% Expected
          </div>
        </div>

        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 flex flex-col justify-center">
          <p className="text-sm font-semibold text-slate-500 mb-1">Avg Collection Time</p>
          <h3 className="text-3xl font-bold text-slate-800 mb-4">12 Days</h3>
          <p className="text-xs text-slate-400">Post due date</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
          <h3 className="text-lg font-bold text-slate-800 mb-6 flex items-center gap-2">
            <PieChartIcon className="text-slate-400" size={20} />
            Revenue vs Outstanding
          </h3>
          <div className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={feeData}
                  cx="50%"
                  cy="50%"
                  innerRadius={80}
                  outerRadius={110}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {feeData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <RechartsTooltip contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
                <Legend verticalAlign="bottom" height={36} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 flex flex-col">
          <h3 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
            <AlertCircle className="text-orange-500" size={20} />
            AI Collection Strategies
          </h3>
          <div className="flex-1 space-y-4">
            <div className="p-4 bg-orange-50 rounded-xl border border-orange-100">
              <h4 className="font-bold text-orange-800 text-sm mb-1">High-Risk Defaulters</h4>
              <p className="text-xs text-orange-700">Send personalized SMS reminders 3 days before the due date for students who have defaulted previously. This can improve recovery by 15%.</p>
            </div>
            <div className="p-4 bg-blue-50 rounded-xl border border-blue-100">
              <h4 className="font-bold text-blue-800 text-sm mb-1">Incentivize Early Payments</h4>
              <p className="text-xs text-blue-700">Offer a 2% discount for payments made 5 days before the deadline. Our models suggest this will increase cash flow early in the month.</p>
            </div>
            <div className="p-4 bg-emerald-50 rounded-xl border border-emerald-100">
              <h4 className="font-bold text-emerald-800 text-sm mb-1">Automated Follow-ups</h4>
              <p className="text-xs text-emerald-700">Implement an automated 3-tier email sequence for past-due accounts (Day 1, Day 5, Day 10). Currently, follow-ups are manual.</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

const TrendingUpMock = ({ size }) => (
  <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="22 7 13.5 15.5 8.5 10.5 2 17"></polyline><polyline points="16 7 22 7 22 13"></polyline></svg>
);

export default FeeIntelligence;
