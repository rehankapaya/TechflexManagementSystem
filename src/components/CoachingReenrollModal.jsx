import React, { useState, useEffect } from 'react';
import {
  X,
  GraduationCap,
  Calendar,
  DollarSign,
  BookOpen,
  ArrowRight,
  CheckCircle2,
  AlertCircle,
  Loader2,
  RotateCcw,
  Sparkles
} from 'lucide-react';
import toast from 'react-hot-toast';
import { ref, update } from 'firebase/database';
import { db } from '../firebase';
import {
  DEFAULT_ACADEMIC_SESSIONS,
  getNextAcademicSession,
  getNextGradeSuggestion,
  formatSessionDisplay
} from '../utils/sessionUtils';
import {
  COACHING_GRADES,
  COACHING_FIELDS,
  isClassAboveEight
} from '../utils/admissionFormOcrParser';

const CoachingReenrollModal = ({
  isOpen,
  onClose,
  student,
  onSuccess
}) => {
  if (!isOpen || !student) return null;

  const currentSession = student.current_session || student.session || '2024-2025';
  const currentGrade = student.grade || 'Class 8';
  const currentField = student.field || '';
  const currentFee = student.monthly_fee || 0;

  const today = new Date().toISOString().split('T')[0];

  // Suggested values for the next session
  const suggestedSession = getNextAcademicSession(currentSession);
  const suggestedGrade = getNextGradeSuggestion(currentGrade);

  const [targetSession, setTargetSession] = useState(suggestedSession);
  const [isCustomSession, setIsCustomSession] = useState(false);
  const [customSessionText, setCustomSessionText] = useState('');

  const [newGrade, setNewGrade] = useState(suggestedGrade);
  const [newField, setNewField] = useState(
    isClassAboveEight(suggestedGrade) ? (currentField || 'Science') : ''
  );
  const [newMonthlyFee, setNewMonthlyFee] = useState(currentFee);
  const [annualFee, setAnnualFee] = useState(0);
  const [startDate, setStartDate] = useState(today);
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Update suggestions when student changes
  useEffect(() => {
    if (student) {
      const nextSess = getNextAcademicSession(student.current_session || student.session || '2024-2025');
      const nextG = getNextGradeSuggestion(student.grade || 'Class 8');
      setTargetSession(nextSess);
      setNewGrade(nextG);
      setNewField(isClassAboveEight(nextG) ? (student.field || 'Science') : '');
      setNewMonthlyFee(student.monthly_fee || 0);
      setAnnualFee(0);
      setStartDate(today);
      setNotes('');
      setIsCustomSession(false);
    }
  }, [student]);

  // Handle grade change to toggle field
  const handleGradeChange = (gradeVal) => {
    setNewGrade(gradeVal);
    if (!isClassAboveEight(gradeVal)) {
      setNewField('');
    } else if (!newField) {
      setNewField('Science');
    }
  };

  const handleConfirmReenroll = async (e) => {
    e.preventDefault();
    const finalSession = isCustomSession ? customSessionText.trim() : targetSession;
    if (!finalSession) {
      toast.error('Please specify the academic session');
      return;
    }

    if (!newGrade) {
      toast.error('Please select the new class / grade');
      return;
    }

    if (isClassAboveEight(newGrade) && !newField) {
      toast.error('Please select the field / group for Class > 8');
      return;
    }

    setIsSubmitting(true);
    try {
      const existingSessions = student.sessions || {};
      const updatedSessions = { ...existingSessions };

      // 1. If previous session existed, mark it as completed with end date
      if (currentSession && updatedSessions[currentSession]) {
        updatedSessions[currentSession] = {
          ...updatedSessions[currentSession],
          status: 'completed',
          end_date: startDate
        };
      } else if (currentSession) {
        // Create baseline for previous session so history is preserved
        updatedSessions[currentSession] = {
          session_name: currentSession,
          grade: currentGrade,
          field: currentField,
          monthly_fee: Number(currentFee) || 0,
          admission_fee: Number(student.admission_fee) || 0,
          start_date: student.joined_date || student.admission_date || '2024-09-01',
          end_date: startDate,
          status: 'completed'
        };
      }

      // 2. Append new session
      updatedSessions[finalSession] = {
        session_name: finalSession,
        grade: newGrade,
        field: isClassAboveEight(newGrade) ? newField : '',
        monthly_fee: Number(newMonthlyFee) || 0,
        admission_fee: Number(annualFee) || 0,
        start_date: startDate,
        end_date: '',
        status: 'active',
        enrolled_at: new Date().toISOString(),
        notes: notes ? notes.trim() : ''
      };

      // 3. Update the student in Firebase
      const timestamp = new Date().toISOString();
      const updatePayload = {
        current_session: finalSession,
        grade: newGrade,
        field: isClassAboveEight(newGrade) ? newField : '',
        monthly_fee: Number(newMonthlyFee) || 0,
        status: 'active',
        sessions: updatedSessions,
        updatedAt: timestamp
      };

      await update(ref(db, `coaching_students/${student.id}`), updatePayload);

      toast.success(
        `Successfully promoted ${student.name} to ${newGrade} for Session ${finalSession}!`
      );
      if (onSuccess) onSuccess();
      onClose();
    } catch (err) {
      console.error('Re-enrollment error:', err);
      toast.error('Failed to re-enroll student: ' + (err.message || 'Database error'));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/70 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl w-full max-w-xl max-h-[92vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-200">
        
        {/* HEADER */}
        <div className="p-4 sm:p-5 border-b border-slate-100 flex items-center justify-between shrink-0 bg-slate-50/60">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-indigo-100 text-indigo-700 flex items-center justify-center shrink-0">
              <GraduationCap size={22} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-extrabold text-slate-900 text-base sm:text-lg">
                  Re-enroll in New Session
                </h3>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase bg-indigo-100 text-indigo-800">
                  Promote
                </span>
              </div>
              <p className="text-xs text-slate-500">
                Enroll student in the next academic year without resetting past fee records.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-600 rounded-xl hover:bg-slate-200/60 transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* CONTENT FORM */}
        <form onSubmit={handleConfirmReenroll} className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-5">
          
          {/* STUDENT SUMMARY BADGE */}
          <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 flex items-center justify-between gap-3">
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-10 h-10 rounded-xl bg-slate-200 flex items-center justify-center font-bold text-slate-700 text-sm shrink-0 overflow-hidden">
                {student.profile_image || student.photo ? (
                  <img
                    src={student.profile_image || student.photo}
                    alt={student.name}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  (student.name || 'S').charAt(0).toUpperCase()
                )}
              </div>
              <div className="min-w-0">
                <h4 className="font-bold text-slate-900 text-sm truncate">
                  {student.name}
                </h4>
                <div className="flex items-center gap-2 text-xs text-slate-500 font-mono">
                  <span className="font-bold text-indigo-700">
                    {student.roll_no || student.student_id || 'TFC-???'}
                  </span>
                  <span>•</span>
                  <span>{student.gender || 'Male'}</span>
                </div>
              </div>
            </div>

            {/* Previous Session Info */}
            <div className="text-right shrink-0">
              <div className="text-[10px] font-bold text-slate-400 uppercase">
                Current / Past Session
              </div>
              <div className="text-xs font-bold text-slate-800">
                {currentSession}
              </div>
              <div className="text-[11px] text-slate-600 font-medium">
                {currentGrade} {currentField ? `(${currentField})` : ''} • PKR {Number(currentFee).toLocaleString()}
              </div>
            </div>
          </div>

          {/* NEW SESSION DETAILS */}
          <div className="space-y-4">
            
            {/* Target Session Selection */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5 flex items-center justify-between">
                <span>Target Academic Session *</span>
                <button
                  type="button"
                  onClick={() => setIsCustomSession(!isCustomSession)}
                  className="text-[11px] text-indigo-600 hover:text-indigo-800 font-semibold"
                >
                  {isCustomSession ? 'Choose from list' : '+ Custom Session'}
                </button>
              </label>

              {isCustomSession ? (
                <input
                  type="text"
                  placeholder="e.g. 2025-2026"
                  value={customSessionText}
                  onChange={(e) => setCustomSessionText(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-xl border border-slate-300 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600"
                  required
                />
              ) : (
                <select
                  value={targetSession}
                  onChange={(e) => setTargetSession(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-xl border border-slate-300 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 bg-white"
                >
                  {DEFAULT_ACADEMIC_SESSIONS.map((sess) => (
                    <option key={sess} value={sess}>
                      Session {formatSessionDisplay(sess)}
                    </option>
                  ))}
                </select>
              )}
            </div>

            {/* New Class & Field Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  New Class / Grade *
                </label>
                <select
                  value={newGrade}
                  onChange={(e) => handleGradeChange(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-xl border border-slate-300 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 bg-white"
                  required
                >
                  {COACHING_GRADES.map((g) => (
                    <option key={g} value={g}>
                      {g}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  Field / Group {isClassAboveEight(newGrade) ? '*' : '(Optional)'}
                </label>
                <select
                  value={newField}
                  onChange={(e) => setNewField(e.target.value)}
                  disabled={!isClassAboveEight(newGrade)}
                  className={`w-full px-3.5 py-2 rounded-xl border text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 ${
                    isClassAboveEight(newGrade)
                      ? 'border-slate-300 bg-white'
                      : 'border-slate-200 bg-slate-100 text-slate-400 cursor-not-allowed'
                  }`}
                  required={isClassAboveEight(newGrade)}
                >
                  <option value="">Select Field...</option>
                  {COACHING_FIELDS.map((f) => (
                    <option key={f} value={f}>
                      {f}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Fee Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  New Monthly Fee (PKR) *
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-mono text-xs">
                    PKR
                  </span>
                  <input
                    type="number"
                    min="0"
                    step="100"
                    value={newMonthlyFee}
                    onChange={(e) => setNewMonthlyFee(e.target.value)}
                    className="w-full pl-12 pr-3.5 py-2 rounded-xl border border-slate-300 text-xs font-mono font-bold focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600"
                    placeholder="2500"
                    required
                  />
                </div>
                <p className="text-[10px] text-slate-400 mt-1">
                  Previous fee: PKR {Number(currentFee).toLocaleString()}
                </p>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  Re-enrollment / Annual Fee
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-mono text-xs">
                    PKR
                  </span>
                  <input
                    type="number"
                    min="0"
                    step="100"
                    value={annualFee}
                    onChange={(e) => setAnnualFee(e.target.value)}
                    className="w-full pl-12 pr-3.5 py-2 rounded-xl border border-slate-300 text-xs font-mono font-bold focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600"
                    placeholder="0"
                  />
                </div>
                <p className="text-[10px] text-slate-400 mt-1">
                  One-time charge for the new session (or 0)
                </p>
              </div>
            </div>

            {/* Effective Start Date */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                Effective Session Start Date *
              </label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full px-3.5 py-2 rounded-xl border border-slate-300 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600"
                required
              />
              <p className="text-[10px] text-emerald-700 font-semibold mt-1">
                ✓ Fees prior to this date will remain evaluated at PKR {Number(currentFee).toLocaleString()}!
              </p>
            </div>

            {/* Optional Notes */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                Notes / Promotion Remarks (Optional)
              </label>
              <input
                type="text"
                placeholder="e.g. Promoted after final exams with A grade"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="w-full px-3.5 py-2 rounded-xl border border-slate-300 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600"
              />
            </div>
          </div>

          {/* NOTICE BOX */}
          <div className="p-3 rounded-2xl bg-indigo-50/70 border border-indigo-200/80 flex items-start gap-2.5 text-xs text-indigo-900">
            <Sparkles size={16} className="text-indigo-600 shrink-0 mt-0.5" />
            <div className="text-[11px] leading-relaxed">
              <span className="font-bold">Historical Data Protection:</span> All past fee receipts, vouchers, and payments from previous sessions remain completely untouched. The new fee only takes effect starting from Session {isCustomSession ? (customSessionText || 'New') : targetSession}.
            </div>
          </div>

          {/* FOOTER ACTIONS */}
          <div className="pt-2 border-t border-slate-100 flex items-center justify-end gap-2.5">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="px-4 py-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-100 text-slate-600 font-bold text-xs transition-all cursor-pointer"
            >
              Cancel
            </button>

            <button
              type="submit"
              disabled={isSubmitting}
              className="flex items-center gap-2 px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs shadow-md shadow-indigo-600/20 active:scale-95 transition-all cursor-pointer disabled:opacity-50"
            >
              {isSubmitting ? (
                <>
                  <Loader2 size={14} className="animate-spin" />
                  <span>Promoting Student...</span>
                </>
              ) : (
                <>
                  <GraduationCap size={14} />
                  <span>Confirm Re-enrollment</span>
                </>
              )}
            </button>
          </div>
        </form>

      </div>
    </div>
  );
};

export default CoachingReenrollModal;

