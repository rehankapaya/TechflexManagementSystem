import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  X, 
  User, 
  Phone, 
  Calendar, 
  GraduationCap, 
  Clock, 
  AlertTriangle, 
  CheckCircle2, 
  ExternalLink, 
  MessageSquare, 
  DollarSign,
  ShieldAlert
} from 'lucide-react';

const StudentRiskModal = ({ student, onClose }) => {
  const navigate = useNavigate();

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  if (!student) return null;

  const formatDate = (dateStr) => {
    if (!dateStr) return '—';
    const d = new Date(dateStr);
    return isNaN(d.getTime()) ? '—' : d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
  };

  const handleSendWhatsApp = () => {
    const rawContact = student.contact || '';
    const digits = rawContact.replace(/[^0-9]/g, '');
    if (!digits) {
      alert(`No contact number recorded for ${student.name}. Please update in the Student Directory.`);
      return;
    }

    const intlPhone = digits.startsWith('0') ? '92' + digits.slice(1) : digits;
    const unpaidList = (student.unpaidBreakdown || []).map(u => `${u.monthLabel} (${u.courseName}): PKR ${u.balance.toLocaleString()}`).join('\n• ');
    
    const message = `Assalam-o-Alaikum ${student.name},\n\nThis is an official communication from Techflex Computer Education regarding your tuition fee schedule.\n\nPending Overdue Fee(s):\n• ${unpaidList || `Total Balance: PKR ${Number(student.studentUnpaid || 0).toLocaleString()}`}\n\nKindly clear your pending dues at your earliest convenience to ensure uninterrupted access to classes and certifications.\n\nJazakAllah Khair,\nTechflex Management`;

    window.open(`https://wa.me/${intlPhone}?text=${encodeURIComponent(message)}`, '_blank');
  };

  const handleOpenDirectory = () => {
    onClose();
    navigate(`/dashboard/students?search=${encodeURIComponent(student.student_id || student.name)}&view=true`);
  };

  const handleOpenFeeStatus = () => {
    onClose();
    navigate(`/dashboard/feestatus?search=${encodeURIComponent(student.student_id || student.name)}`);
  };

  const enrolledCourseList = Object.entries(student.enrolledCourses || {}).map(([cId, cData]) => ({
    id: cId,
    ...cData
  }));

  return (
    <div 
      className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div 
        className="bg-white rounded-2xl shadow-2xl border border-slate-100 max-w-3xl w-full flex flex-col max-h-[90vh] overflow-hidden animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* HEADER */}
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
          <div className="flex items-center gap-3">
            <div className={`w-11 h-11 rounded-xl flex items-center justify-center text-white font-bold text-lg shadow-sm ${
              student.category === 'Critical' ? 'bg-rose-500' : student.category === 'High' ? 'bg-orange-500' : 'bg-amber-500'
            }`}>
              {student.name ? student.name.charAt(0).toUpperCase() : 'S'}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-slate-800 text-lg leading-tight">{student.name}</h3>
                <span className="px-2 py-0.5 rounded-md text-xs font-mono font-semibold bg-slate-100 text-slate-700 border border-slate-200">
                  {student.student_id || student.id}
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">Student Risk Dossier & Financial Overview</p>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <span className={`px-3 py-1 rounded-full text-xs font-bold border ${
              student.category === 'Critical'
                ? 'bg-rose-100 text-rose-700 border-rose-200'
                : student.category === 'High'
                ? 'bg-orange-100 text-orange-700 border-orange-200'
                : 'bg-amber-100 text-amber-700 border-amber-200'
            }`}>
              {student.category} Risk ({student.riskScore} pts)
            </span>
            <button
              onClick={onClose}
              className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-slate-200/60 transition-colors cursor-pointer"
              title="Close Dialog"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* BODY */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6 custom-scrollbar">
          {/* TOP SUMMARY CARDS */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="p-4 rounded-xl bg-slate-50 border border-slate-100">
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">Contact Phone</p>
              <div className="flex items-center gap-2">
                <Phone size={14} className="text-slate-400" />
                <span className="font-mono text-sm font-semibold text-slate-800">
                  {student.contact || 'No phone recorded'}
                </span>
              </div>
            </div>

            <div className="p-4 rounded-xl bg-slate-50 border border-slate-100">
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">Admission Date</p>
              <div className="flex items-center gap-2">
                <Calendar size={14} className="text-slate-400" />
                <span className="text-sm font-medium text-slate-700">
                  {formatDate(student.createdAt)}
                </span>
              </div>
            </div>

            <div className="p-4 rounded-xl bg-slate-50 border border-slate-100">
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">Total Overdue Dues</p>
              <div className="flex items-center gap-2">
                <DollarSign size={14} className="text-rose-500" />
                <span className="text-sm font-bold text-rose-600">
                  PKR {Number(student.studentUnpaid || 0).toLocaleString()}
                </span>
              </div>
            </div>
          </div>

          {/* RISK FACTORS & REASONS */}
          <div className="p-4 rounded-xl bg-rose-50/50 border border-rose-100">
            <div className="flex items-center gap-2 mb-2">
              <ShieldAlert size={16} className="text-rose-600" />
              <h4 className="text-xs font-bold text-rose-900 uppercase tracking-wider">Identified Risk Factors</h4>
            </div>
            <div className="flex flex-wrap gap-2">
              {(student.reasons || '').split(',').map((reason, idx) => (
                <span 
                  key={idx} 
                  className="px-2.5 py-1 bg-white rounded-lg text-xs font-semibold text-rose-700 border border-rose-200 shadow-2xs"
                >
                  {reason.trim()}
                </span>
              ))}
            </div>
          </div>

          {/* OVERDUE FEES BREAKDOWN */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h4 className="font-bold text-slate-800 text-sm flex items-center gap-2">
                <AlertTriangle size={16} className="text-amber-500" />
                Overdue Fee Breakdown ({student.unpaidBreakdown?.length || 0})
              </h4>
              <button
                onClick={handleOpenFeeStatus}
                className="text-xs text-indigo-600 hover:text-indigo-800 font-semibold flex items-center gap-1 cursor-pointer"
              >
                View Fees Details <ExternalLink size={12} />
              </button>
            </div>

            {student.unpaidBreakdown && student.unpaidBreakdown.length > 0 ? (
              <div className="border border-slate-200 rounded-xl overflow-hidden">
                <table className="w-full text-left border-collapse text-xs">
                  <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-semibold">
                    <tr>
                      <th className="py-2.5 px-3">Month</th>
                      <th className="py-2.5 px-3">Course</th>
                      <th className="py-2.5 px-3">Due Date</th>
                      <th className="py-2.5 px-3">Agreed Fee</th>
                      <th className="py-2.5 px-3">Paid / Waived</th>
                      <th className="py-2.5 px-3 text-right">Balance Due</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {student.unpaidBreakdown.map((item, idx) => (
                      <tr key={idx} className="hover:bg-slate-50/60">
                        <td className="py-2.5 px-3 font-semibold text-slate-800">{item.monthLabel}</td>
                        <td className="py-2.5 px-3 text-slate-600">{item.courseName}</td>
                        <td className="py-2.5 px-3 text-slate-500 font-mono">{item.dueDateStr}</td>
                        <td className="py-2.5 px-3 text-slate-700 font-medium">PKR {item.agreedFee?.toLocaleString()}</td>
                        <td className="py-2.5 px-3 text-slate-500">
                          PKR {(item.paid + item.waived).toLocaleString()}
                        </td>
                        <td className="py-2.5 px-3 text-right font-bold text-rose-600">
                          PKR {item.balance?.toLocaleString()}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="flex items-center gap-2 p-3.5 bg-emerald-50 rounded-xl border border-emerald-200/60 text-emerald-800 text-xs font-medium">
                <CheckCircle2 size={16} className="text-emerald-600 shrink-0" />
                <span>All tuition fee records are currently cleared for this student. No overdue balances detected.</span>
              </div>
            )}
          </div>

          {/* ENROLLED COURSES */}
          <div>
            <h4 className="font-bold text-slate-800 text-sm mb-3 flex items-center gap-2">
              <GraduationCap size={16} className="text-indigo-600" />
              Enrolled Courses ({enrolledCourseList.length})
            </h4>

            {enrolledCourseList.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {enrolledCourseList.map((course) => {
                  const isComplete = course.course_status === 'coursecomplete' || course.course_status === 'completed';
                  const isActive = !course.course_status || course.course_status === 'active';

                  return (
                    <div 
                      key={course.id} 
                      className="p-3.5 rounded-xl border border-slate-200 bg-white hover:border-slate-300 transition-colors"
                    >
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="font-bold text-slate-800 text-xs truncate mr-2">{course.course_name}</span>
                        <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold uppercase ${
                          isActive 
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' 
                            : isComplete 
                            ? 'bg-blue-50 text-blue-700 border border-blue-200' 
                            : 'bg-slate-100 text-slate-600 border border-slate-200'
                        }`}>
                          {isActive ? 'Active' : isComplete ? 'Completed' : 'Dropped'}
                        </span>
                      </div>

                      <div className="space-y-1 text-slate-500 text-xs">
                        <div className="flex items-center justify-between">
                          <span className="flex items-center gap-1 text-[11px]"><Clock size={11} className="text-slate-400" /> {course.timeslot || 'No timeslot'}</span>
                          <span className="font-semibold text-slate-800">PKR {Number(course.agreed_monthly_fee || 0).toLocaleString()}/mo</span>
                        </div>
                        <div className="flex items-center justify-between text-[11px] text-slate-400">
                          <span>{course.class_type || 'Regular'}</span>
                          <span>Enrolled: {formatDate(course.enrolledAt)}</span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <p className="text-xs text-slate-400 italic">No courses currently enrolled.</p>
            )}
          </div>
        </div>

        {/* FOOTER ACTIONS */}
        <div className="px-6 py-4 border-t border-slate-100 bg-slate-50/50 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <button
              onClick={handleSendWhatsApp}
              disabled={!student.contact}
              className="flex items-center gap-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white rounded-xl text-xs font-bold transition-colors shadow-sm cursor-pointer"
              title="Open WhatsApp with automated fee reminder"
            >
              <MessageSquare size={14} /> Send WhatsApp Reminder
            </button>

            <button
              onClick={handleOpenDirectory}
              className="flex items-center gap-1.5 px-3.5 py-2 bg-white border border-slate-200 hover:bg-slate-100 text-slate-700 rounded-xl text-xs font-bold transition-colors cursor-pointer"
            >
              <User size={14} /> View in Directory
            </button>

            <button
              onClick={handleOpenFeeStatus}
              className="flex items-center gap-1.5 px-3.5 py-2 bg-white border border-slate-200 hover:bg-slate-100 text-slate-700 rounded-xl text-xs font-bold transition-colors cursor-pointer"
            >
              <DollarSign size={14} /> View Fees Details
            </button>
          </div>

          <button
            onClick={onClose}
            className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-xs font-bold transition-colors cursor-pointer"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

export default StudentRiskModal;
