import React, { useState, useMemo } from 'react';
import { useData } from '../contexts/DataContext';
import { useNavigate } from 'react-router-dom';
import * as XLSX from 'xlsx';
import toast from 'react-hot-toast';
import { MONTHS_SHORT, getCanonicalShortMonth, getMonthIndex, getCoachingStudentEnrollmentMonthDate, parseEnrollmentMonthDate } from '../utils/monthUtils';
import { COACHING_GRADES } from './CoachingStudents';
import CoachingFeeBulkUploadModal from './CoachingFeeBulkUploadModal';
import {
  FileSpreadsheet,
  Search,
  Filter,
  CreditCard,
  CheckCircle2,
  AlertCircle,
  XCircle,
  Download,
  Calendar,
  GraduationCap,
  DollarSign,
  ArrowRight,
  Upload
} from 'lucide-react';

const CoachingFeeStatus = () => {
  const { coachingStudents, coachingFeeTransactions } = useData();
  const navigate = useNavigate();

  const [month, setMonth] = useState(getCanonicalShortMonth());
  const [year, setYear] = useState(new Date().getFullYear().toString());
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedGrade, setSelectedGrade] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState('ALL'); // ALL, PAID, PARTIAL, UNPAID
  const [isBulkUploadOpen, setIsBulkUploadOpen] = useState(false);

  const monthKey = `${month}_${year}`;

  // Process data for the selected month
  const reportData = useMemo(() => {
    const selectedMonthIdx = getMonthIndex(month);
    const selectedYearNum = parseInt(year, 10);
    const selectedPeriodDate = new Date(selectedYearNum, selectedMonthIdx, 1);

    return coachingStudents
      .map(student => {
        const studentHistory = coachingFeeTransactions?.[student.id] || {};
        const trx = studentHistory[monthKey];

        const enrollMonthDate = getCoachingStudentEnrollmentMonthDate(student);
        const leftMonthDate = parseEnrollmentMonthDate(student.left_date || student.status_date);
        const rejoinedMonthDate = parseEnrollmentMonthDate(student.rejoined_date);

        // If no explicit transaction exists for this month, check enrollment & status boundaries
        if (!trx) {
          // 1. Exclude if selected month is before student enrolled
          if (enrollMonthDate && enrollMonthDate > selectedPeriodDate) {
            return null;
          }

          // 2. Inactive / Leave gap check (Scenario: Left in Jan 2025, Rejoined in August 2025)
          // Exclude months between when the student left and when they rejoined (Feb - Jul)
          if (leftMonthDate && selectedPeriodDate > leftMonthDate) {
            if (!rejoinedMonthDate || selectedPeriodDate < rejoinedMonthDate) {
              return null;
            }
          }

          // 3. If student is currently marked as left, completed, or inactive (without specific left_date recorded)
          if ((student.status === 'left' || student.status === 'completed' || student.status === 'inactive') && !leftMonthDate) {
            return null;
          }
        }

        const payable = trx ? Number(trx.payable) : Number(student.monthly_fee) || 0;
        const paid = trx ? Number(trx.paid) : 0;
        const waived = trx ? Number(trx.waived) : 0;
        const balance = payable - paid - waived;

        let status = 'UNPAID';
        if (paid > 0 && balance <= 0) status = 'PAID';
        else if (paid > 0 && balance > 0) status = 'PARTIAL';
        else if (paid === 0 && payable > 0) status = 'UNPAID';
        else if (payable === 0) status = 'PAID';

        return {
          id: student.id,
          roll_no: student.roll_no || student.student_id || 'TFC-???',
          name: student.name,
          father_name: student.father_name,
          grade: student.grade || '—',
          contact: student.contact_number,
          profile_image: student.profile_image || student.photo,
          payable,
          paid,
          waived,
          balance,
          pay_date: trx?.pay_date || '—',
          serial_no: trx?.serial_no || '',
          status
        };
      })
      .filter(Boolean);
  }, [coachingStudents, coachingFeeTransactions, monthKey, month, year]);

  // Filtered rows
  const filteredData = useMemo(() => {
    return reportData.filter(item => {
      const q = searchTerm.toLowerCase();
      const matchSearch =
        !searchTerm ||
        item.name.toLowerCase().includes(q) ||
        item.roll_no.toLowerCase().includes(q) ||
        (item.contact && item.contact.includes(q));

      const matchGrade = selectedGrade === 'ALL' || item.grade === selectedGrade;
      const matchStatus = statusFilter === 'ALL' || item.status === statusFilter;

      return matchSearch && matchGrade && matchStatus;
    });
  }, [reportData, searchTerm, selectedGrade, statusFilter]);

  // Overall KPI metrics
  const metrics = useMemo(() => {
    let totalPayable = 0, totalPaid = 0, totalBalance = 0;
    let paidCount = 0, partialCount = 0, unpaidCount = 0;

    reportData.forEach(r => {
      totalPayable += r.payable;
      totalPaid += r.paid;
      totalBalance += Math.max(0, r.balance);

      if (r.status === 'PAID') paidCount++;
      else if (r.status === 'PARTIAL') partialCount++;
      else unpaidCount++;
    });

    const collectionRate = totalPayable > 0 ? Math.round((totalPaid / totalPayable) * 100) : 100;

    return {
      totalPayable,
      totalPaid,
      totalBalance,
      paidCount,
      partialCount,
      unpaidCount,
      totalStudents: reportData.length,
      collectionRate
    };
  }, [reportData]);

  // Export to Excel
  const exportReport = () => {
    if (!filteredData.length) {
      toast.error("No data to export");
      return;
    }

    const exportRows = filteredData.map(r => ({
      "Roll No": r.roll_no,
      "Student Name": r.name,
      "Father Name": r.father_name || '',
      "Class / Grade": r.grade,
      "Contact": r.contact || '',
      "Period": `${month} ${year}`,
      "Payable (PKR)": r.payable,
      "Paid (PKR)": r.paid,
      "Waived (PKR)": r.waived,
      "Balance (PKR)": r.balance,
      "Slip Serial No": r.serial_no || '—',
      "Payment Date": r.pay_date,
      "Status": r.status
    }));

    const ws = XLSX.utils.json_to_sheet(exportRows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Fee Status");
    XLSX.writeFile(wb, `Coaching_Fee_Status_${month}_${year}.xlsx`);
    toast.success(`Exported status for ${month} ${year}`);
  };

  return (
    <div className="space-y-6 font-sans animate-fade-in pb-12">
      {/* HEADER SECTION */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-200/80">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-emerald-600 to-teal-600 flex items-center justify-center text-white shadow-md shadow-emerald-600/20 shrink-0">
            <FileSpreadsheet size={22} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight">Coaching Fee Status</h1>
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 uppercase tracking-wider">
                Monthly Realization
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5 font-medium">Class-wise collection status, unpaid dues & realization reports</p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          {/* Period selector */}
          <div className="flex items-center bg-white border border-slate-200 rounded-xl p-1 shadow-2xs">
            <div className="flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold text-slate-500">
              <Calendar size={13} className="text-emerald-600" />
              <span>Period:</span>
            </div>
            <select
              value={month}
              onChange={(e) => setMonth(e.target.value)}
              className="px-2 py-1 text-xs font-bold text-slate-800 bg-slate-50 rounded-lg outline-none cursor-pointer"
            >
              {MONTHS_SHORT.map(m => (
                <option key={m} value={m}>{m}</option>
              ))}
            </select>
            <input
              type="number"
              value={year}
              onChange={(e) => setYear(e.target.value)}
              className="w-16 px-2 py-1 text-xs font-mono font-bold text-slate-800 bg-slate-50 rounded-lg outline-none ml-1 text-center"
            />
          </div>

          <button
            type="button"
            onClick={() => setIsBulkUploadOpen(true)}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 font-bold text-xs shadow-2xs cursor-pointer transition-all"
            title="Bulk import monthly fee records from spreadsheet"
          >
            <Upload size={14} className="text-emerald-600" />
            <span>Bulk Upload Fees</span>
          </button>

          <button
            onClick={exportReport}
            className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-xs cursor-pointer transition-all"
          >
            <Download size={14} />
            <span>Export Excel</span>
          </button>
        </div>
      </div>

      {/* KPI METRIC CARDS */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5">
        <div className="p-4 rounded-2xl bg-white border border-slate-300 md:border-slate-200/80 shadow-[0_2px_10px_rgba(15,23,42,0.06)] md:shadow-xs">
          <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Total Expected</span>
          <div className="text-xl sm:text-2xl font-black text-slate-900 font-mono mt-1">
            PKR {metrics.totalPayable.toLocaleString()}
          </div>
          <p className="text-[11px] text-slate-400 mt-0.5">{metrics.totalStudents} coaching students</p>
        </div>

        <div className="p-4 rounded-2xl bg-white border border-slate-300 md:border-slate-200/80 shadow-[0_2px_10px_rgba(15,23,42,0.06)] md:shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-emerald-800 uppercase tracking-wider">Realized / Paid</span>
            <span className="text-xs font-bold font-mono text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">
              {metrics.collectionRate}%
            </span>
          </div>
          <div className="text-xl sm:text-2xl font-black text-emerald-700 font-mono mt-1">
            PKR {metrics.totalPaid.toLocaleString()}
          </div>
          <p className="text-[11px] text-emerald-800 mt-0.5">{metrics.paidCount} paid in full</p>
        </div>

        <div className="p-4 rounded-2xl bg-white border border-slate-300 md:border-slate-200/80 shadow-[0_2px_10px_rgba(15,23,42,0.06)] md:shadow-xs">
          <span className="text-[11px] font-bold text-rose-800 uppercase tracking-wider">Outstanding Dues</span>
          <div className="text-xl sm:text-2xl font-black text-rose-700 font-mono mt-1">
            PKR {metrics.totalBalance.toLocaleString()}
          </div>
          <p className="text-[11px] text-rose-600 mt-0.5">{metrics.unpaidCount + metrics.partialCount} students with balance</p>
        </div>

        <div className="p-4 rounded-2xl bg-white border border-slate-300 md:border-slate-200/80 shadow-[0_2px_10px_rgba(15,23,42,0.06)] md:shadow-xs">
          <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Collection Progress</span>
          <div className="mt-2.5 flex items-center gap-2">
            <div className="flex-1 bg-slate-100 rounded-full h-2.5 overflow-hidden">
              <div
                style={{ width: `${metrics.collectionRate}%` }}
                className={`h-full rounded-full transition-all ${
                  metrics.collectionRate >= 80 ? 'bg-emerald-500' : metrics.collectionRate >= 50 ? 'bg-amber-500' : 'bg-rose-500'
                }`}
              />
            </div>
            <span className="font-mono text-xs font-bold text-slate-800">{metrics.collectionRate}%</span>
          </div>
          <div className="flex justify-between text-[10px] text-slate-400 mt-1.5">
            <span>Paid: {metrics.paidCount}</span>
            <span>Partial: {metrics.partialCount}</span>
            <span>Unpaid: {metrics.unpaidCount}</span>
          </div>
        </div>
      </div>

      {/* SEARCH AND FILTERS */}
      <div className="bg-white p-4 rounded-2xl border border-slate-300 md:border-slate-200/80 shadow-xs flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between">
        <div className="relative flex-1">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
          <input
            type="text"
            placeholder="Search student by name, roll no (TFC-001), phone..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 rounded-xl border border-slate-200 bg-slate-50 text-xs font-medium focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all"
          />
        </div>

        <div className="flex items-center gap-2 overflow-x-auto pb-1 md:pb-0">
          <select
            value={selectedGrade}
            onChange={(e) => setSelectedGrade(e.target.value)}
            className="px-3 py-2 rounded-xl border border-slate-200 bg-slate-50 text-xs font-bold text-slate-700 outline-none cursor-pointer shrink-0"
          >
            <option value="ALL">All Classes / Grades</option>
            {COACHING_GRADES.map(g => (
              <option key={g} value={g}>{g}</option>
            ))}
          </select>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-2 rounded-xl border border-slate-200 bg-slate-50 text-xs font-bold text-slate-700 outline-none cursor-pointer shrink-0"
          >
            <option value="ALL">All Statuses</option>
            <option value="PAID">Paid in Full</option>
            <option value="PARTIAL">Partially Paid</option>
            <option value="UNPAID">Unpaid / Due</option>
          </select>
        </div>
      </div>

      {/* REPORT TABLE */}
      <div className="bg-white rounded-2xl border border-slate-300 md:border-slate-200/80 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 uppercase font-bold tracking-wider text-[11px]">
                <th className="py-3 px-4">Student</th>
                <th className="py-3 px-4">Class / Grade</th>
                <th className="py-3 px-4 text-right">Payable</th>
                <th className="py-3 px-4 text-right">Paid</th>
                <th className="py-3 px-4 text-right">Balance</th>
                <th className="py-3 px-4 text-center">Status</th>
                <th className="py-3 px-4 text-center">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredData.length > 0 ? (
                filteredData.map(item => {
                  let badge = "bg-rose-50 text-rose-700 border-rose-200";
                  if (item.status === 'PAID') badge = "bg-emerald-50 text-emerald-700 border-emerald-200";
                  else if (item.status === 'PARTIAL') badge = "bg-amber-50 text-amber-700 border-amber-200";

                  return (
                    <tr key={item.id} className="hover:bg-slate-50/70 transition-colors">
                      <td className="py-3.5 px-4 font-bold text-slate-900">
                        <div className="flex items-center gap-2.5">
                          {item.profile_image ? (
                            <img src={item.profile_image} alt={item.name} className="w-8 h-8 rounded-lg object-cover border border-slate-200 shrink-0" />
                          ) : (
                            <div className="w-8 h-8 rounded-lg bg-emerald-600 text-white flex items-center justify-center font-bold text-xs shrink-0">
                              {item.name?.charAt(0)}
                            </div>
                          )}
                          <div>
                            <div className="leading-tight">{item.name}</div>
                            <span className="font-mono text-[10px] text-emerald-800 font-bold bg-emerald-50 px-1.5 py-0.2 rounded border border-emerald-100">
                              {item.roll_no}
                            </span>
                          </div>
                        </div>
                      </td>

                      <td className="py-3.5 px-4 font-bold text-slate-700">
                        {item.grade}
                      </td>

                      <td className="py-3.5 px-4 text-right font-mono font-bold text-slate-800">
                        PKR {item.payable.toLocaleString()}
                      </td>

                      <td className="py-3.5 px-4 text-right font-mono font-bold text-emerald-700">
                        PKR {item.paid.toLocaleString()}
                      </td>

                      <td className="py-3.5 px-4 text-right font-mono font-bold">
                        <span className={item.balance > 0 ? 'text-rose-600' : 'text-slate-400'}>
                          PKR {Math.max(0, item.balance).toLocaleString()}
                        </span>
                      </td>

                      <td className="py-3.5 px-4 text-center">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border uppercase tracking-wider ${badge}`}>
                          {item.status}
                        </span>
                      </td>

                      <td className="py-3.5 px-4 text-center">
                        <button
                          onClick={() => navigate(`/dashboard/coaching-fees?studentId=${item.id}`)}
                          className="px-3 py-1 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-700 font-bold text-xs transition-colors cursor-pointer"
                        >
                          {item.status === 'PAID' ? 'Ledger' : 'Collect'}
                        </button>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-400 text-xs">
                    No coaching fee records found for {month} {year}.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* COACHING FEE BULK UPLOAD MODAL */}
      <CoachingFeeBulkUploadModal
        isOpen={isBulkUploadOpen}
        onClose={() => setIsBulkUploadOpen(false)}
        existingStudents={coachingStudents}
        onSuccess={() => {
          toast.success("Coaching fee records refreshed!");
        }}
      />
    </div>
  );
};

export default CoachingFeeStatus;

