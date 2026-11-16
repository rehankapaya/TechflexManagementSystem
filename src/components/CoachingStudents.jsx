import React, { useState, useMemo } from 'react';
import { db } from '../firebase';
import { ref, push, set, remove, update } from 'firebase/database';
import { useData } from '../contexts/DataContext';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import ImageCropModal from './ImageCropModal';
import AdmissionFormScannerModal from './AdmissionFormScannerModal';
import {
  COACHING_GRADES,
  COACHING_FIELDS,
  isClassAboveEight
} from '../utils/admissionFormOcrParser';
export { COACHING_GRADES, COACHING_FIELDS, isClassAboveEight };
import {
  GraduationCap,
  Users,
  Search,
  Plus,
  Pencil,
  Trash2,
  X,
  CreditCard,
  Phone,
  Calendar,
  Building,
  UserCheck,
  UserX,
  Camera,
  CheckCircle2,
  BookOpen,
  DollarSign,
  ArrowRight,
  Filter,
  FileText,
  Upload,
  MessageCircle,
  Smartphone
} from 'lucide-react';

export const getTimeslotOptions = (classType) => {
  if (classType === 'Regular (1 Hour)') {
    return [
      "3:00 PM - 4:00 PM", "4:00 PM - 5:00 PM", "5:00 PM - 6:00 PM",
      "6:00 PM - 7:00 PM", "7:00 PM - 8:00 PM", "8:00 PM - 9:00 PM",
      "9:00 PM - 10:00 PM"
    ];
  } else if (classType === 'Alternate (2 Hours)') {
    return [
      "3:00 PM - 5:00 PM", "4:00 PM - 6:00 PM", "5:00 PM - 7:00 PM",
      "5:30 PM - 7:30 PM", "6:00 PM - 8:00 PM", "7:00 PM - 9:00 PM",
      "8:00 PM - 10:00 PM"
    ];
  }
  return [
    "3:00 PM - 5:00 PM", "5:00 PM - 7:00 PM", "5:30 PM - 7:30 PM",
    "6:00 PM - 8:00 PM", "7:00 PM - 9:00 PM"
  ];
};

export const getNextCoachingRollNo = (studentsList) => {
  if (!studentsList || studentsList.length === 0) return 'TFC-001';
  const numbers = studentsList.map(s => {
    const val = s.roll_no || s.student_id || '';
    const m = val.match(/TFC-(\d+)/i);
    return m ? parseInt(m[1], 10) : 0;
  });
  const max = Math.max(0, ...numbers);
  return `TFC-${String(max + 1).padStart(3, '0')}`;
};

const CoachingStudents = () => {
  const { coachingStudents, coachingStudentsRaw } = useData();
  const { isAdmin } = useAuth();
  const navigate = useNavigate();

  // Search & Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedGrade, setSelectedGrade] = useState('ALL');
  const [selectedStatus, setSelectedStatus] = useState('ALL');

  // Modal States
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingStudent, setEditingStudent] = useState(null);
  const [viewingStudent, setViewingStudent] = useState(null);

  const today = new Date().toISOString().split('T')[0];
  const [showSecondaryContact, setShowSecondaryContact] = useState(false);

  // Form State - Streamlined matching computer students form (course -> class, no laptop, field if class > 8)
  const initialFormState = {
    roll_no: '',
    name: '',
    contact: '',
    secondary_contact: '',
    gender: 'Male',
    grade: COACHING_GRADES.find(g => g.startsWith('Class 9')) || 'Class 9 (Matric I)',
    field: 'Science',
    admission_fee: '0',
    monthly_fee: '',
    joined_date: today,
    status: 'active',
    profile_image: ''
  };

  const [formData, setFormData] = useState(initialFormState);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Crop Modal State
  const [cropModalData, setCropModalData] = useState({
    isOpen: false,
    imageSrc: '',
  });

  const autoRollNo = useMemo(() => {
    return getNextCoachingRollNo(coachingStudents);
  }, [coachingStudents]);

  const [isAdmissionScannerOpen, setIsAdmissionScannerOpen] = useState(false);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => {
      const updated = { ...prev, [name]: value };
      if (name === 'grade') {
        if (!isClassAboveEight(value)) {
          updated.field = '';
        } else if (!updated.field) {
          updated.field = 'Science';
        }
      }
      return updated;
    });
  };

  const handleOpenAddModal = () => {
    setEditingStudent(null);
    setShowSecondaryContact(false);
    setFormData({
      ...initialFormState,
      roll_no: autoRollNo,
      joined_date: new Date().toISOString().split('T')[0]
    });
    setShowAddModal(true);
  };

  const handleAdmissionFormApplied = (extracted) => {
    if (!extracted) return;
    setEditingStudent(null);
    const resolvedGrade = extracted.matchedGrade || extracted.grade || COACHING_GRADES.find(g => g.startsWith('Class 9')) || 'Class 9 (Matric I)';
    setFormData(prev => ({
      ...prev,
      roll_no: autoRollNo,
      name: extracted.name || prev.name,
      contact: extracted.contact || prev.contact,
      secondary_contact: extracted.secondary_contact || prev.secondary_contact,
      gender: (extracted.gender === 'Male' || extracted.gender === 'Female' || extracted.gender === 'Other') ? extracted.gender : prev.gender,
      grade: resolvedGrade,
      field: isClassAboveEight(resolvedGrade) ? (extracted.field || prev.field || 'Science') : '',
      joined_date: extracted.admission_date || prev.joined_date
    }));
    if (extracted.secondary_contact) {
      setShowSecondaryContact(true);
    }
    setShowAddModal(true);
    toast.success(`Form details loaded for ${extracted.name || 'coaching student'}! Review and complete enrollment.`);
  };

  const handleEdit = (student) => {
    setEditingStudent(student);
    const resolvedGrade = student.grade || COACHING_GRADES.find(g => g.startsWith('Class 9')) || 'Class 9 (Matric I)';
    setFormData({
      roll_no: student.roll_no || student.student_id || '',
      name: student.name || '',
      contact: student.contact || student.contact_number || '',
      secondary_contact: student.secondary_contact || student.guardian_contact || '',
      gender: student.gender || 'Male',
      grade: resolvedGrade,
      field: student.field || (isClassAboveEight(resolvedGrade) ? 'Science' : ''),
      monthly_fee: student.monthly_fee || '',
      admission_fee: student.admission_fee || '0',
      status: student.status || 'active',
      joined_date: student.joined_date || (student.createdAt ? student.createdAt.split('T')[0] : new Date().toISOString().split('T')[0]),
      profile_image: student.profile_image || student.photo || ''
    });
    if (student.secondary_contact || student.guardian_contact) {
      setShowSecondaryContact(true);
    } else {
      setShowSecondaryContact(false);
    }
    setShowAddModal(true);
  };

  const handleImageFileChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      toast.error("Please select a valid image file");
      e.target.value = '';
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      setCropModalData({
        isOpen: true,
        imageSrc: event.target.result,
      });
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  const handleCropComplete = (croppedBase64) => {
    if (croppedBase64) {
      setFormData(prev => ({ ...prev, profile_image: croppedBase64 }));
      toast.success("Student photo selected");
    }
    setCropModalData({ isOpen: false, imageSrc: '' });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      toast.error("Please provide the student's name");
      return;
    }

    setIsSubmitting(true);
    try {
      const studentPayload = {
        roll_no: editingStudent ? (editingStudent.roll_no || editingStudent.student_id || formData.roll_no || autoRollNo) : autoRollNo,
        name: formData.name.trim(),
        contact: (formData.contact || '').trim(),
        contact_number: (formData.contact || '').trim(),
        secondary_contact: (formData.secondary_contact || '').trim(),
        guardian_contact: (formData.secondary_contact || '').trim(),
        gender: formData.gender || 'Male',
        grade: formData.grade,
        field: isClassAboveEight(formData.grade) ? (formData.field ? formData.field.trim() : '') : '',
        class_type: 'Regular',
        timeslot: '',
        timing: '',
        admission_fee: Number(formData.admission_fee) || 0,
        monthly_fee: Number(formData.monthly_fee) || 0,
        joined_date: formData.joined_date,
        status: formData.status || 'active',
        profile_image: formData.profile_image || '',
        photo: formData.profile_image || ''
      };

      if (editingStudent) {
        await update(ref(db, `coaching_students/${editingStudent.id}`), {
          ...studentPayload,
          updatedAt: new Date().toISOString()
        });
        toast.success("Coaching student updated successfully!");
      } else {
        const newRef = push(ref(db, 'coaching_students'));
        await set(newRef, {
          ...studentPayload,
          createdAt: new Date().toISOString()
        });
        toast.success(`Student enrolled as ${formData.roll_no || autoRollNo}!`);
      }

      setShowAddModal(false);
      setEditingStudent(null);
      setFormData(initialFormState);
    } catch (err) {
      toast.error(err.message || "Failed to save student record");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (studentId, studentName) => {
    if (!window.confirm(`Are you sure you want to delete coaching record for ${studentName}?`)) return;
    try {
      await remove(ref(db, `coaching_students/${studentId}`));
      toast.success("Student record removed");
      if (viewingStudent?.id === studentId) setViewingStudent(null);
    } catch (err) {
      toast.error("Failed to delete student record");
    }
  };

  const handleToggleStatus = async (studentId, currentStatus) => {
    const nextStatus = currentStatus === 'active' ? 'completed' : currentStatus === 'completed' ? 'left' : 'active';
    try {
      await update(ref(db, `coaching_students/${studentId}`), { status: nextStatus });
      toast.success(`Status updated to ${nextStatus.toUpperCase()}`);
      if (viewingStudent?.id === studentId) {
        setViewingStudent(prev => prev ? { ...prev, status: nextStatus } : prev);
      }
    } catch (err) {
      toast.error("Failed to update status");
    }
  };

  // Filtered Students
  const filteredStudents = useMemo(() => {
    return coachingStudents.filter(s => {
      const q = searchTerm.toLowerCase();
      const matchSearch =
        !searchTerm ||
        (s.name && s.name.toLowerCase().includes(q)) ||
        (s.roll_no && s.roll_no.toLowerCase().includes(q)) ||
        (s.student_id && s.student_id.toLowerCase().includes(q)) ||
        (s.contact && s.contact.includes(q)) ||
        (s.contact_number && s.contact_number.includes(q)) ||
        (s.secondary_contact && s.secondary_contact.includes(q)) ||
        (s.guardian_contact && s.guardian_contact.includes(q)) ||
        (s.field && s.field.toLowerCase().includes(q));

      const matchGrade = selectedGrade === 'ALL' || s.grade === selectedGrade;
      const matchStatus = selectedStatus === 'ALL' || s.status === selectedStatus;

      return matchSearch && matchGrade && matchStatus;
    });
  }, [coachingStudents, searchTerm, selectedGrade, selectedStatus]);

  // Status Metrics
  const stats = useMemo(() => {
    let active = 0, completed = 0, left = 0, totalReceivable = 0;
    coachingStudents.forEach(s => {
      if (s.status === 'completed') completed++;
      else if (s.status === 'left') left++;
      else {
        active++;
        totalReceivable += Number(s.monthly_fee) || 0;
      }
    });
    return { active, completed, left, totalReceivable, total: coachingStudents.length };
  }, [coachingStudents]);

  return (
    <div className="space-y-6 font-sans animate-fade-in pb-12">
      {/* HEADER SECTION */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-200/80">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-emerald-600 to-teal-600 flex items-center justify-center text-white shadow-md shadow-emerald-600/20 shrink-0">
            <GraduationCap size={22} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight">Coaching Students</h1>
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 uppercase tracking-wider">
                Coaching Academy
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5 font-medium">Manage student enrollments, grades & monthly fee commitments</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsAdmissionScannerOpen(true)}
            className="flex items-center gap-2 px-3.5 py-2.5 rounded-xl bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200/80 font-bold text-xs shadow-xs active:scale-95 transition-all cursor-pointer"
            title="Scan student admission form (Camera, Photo, or PDF)"
          >
            <FileText size={16} />
            <span className="hidden sm:inline">Scan Admission Form</span>
            <span className="sm:hidden">Scan Form</span>
          </button>

          <button
            onClick={handleOpenAddModal}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-md shadow-emerald-600/20 active:scale-95 transition-all cursor-pointer w-fit"
          >
            <Plus size={16} />
            <span>New Coaching Student</span>
          </button>
        </div>
      </div>

      {/* KPI METRIC CARDS */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5">
        <div className="p-4 rounded-2xl bg-white border border-slate-300 md:border-slate-200/80 shadow-[0_2px_10px_rgba(15,23,42,0.06)] md:shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Active Students</span>
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
          </div>
          <div className="text-2xl font-extrabold text-emerald-700 font-mono mt-1">{stats.active}</div>
          <p className="text-[11px] text-slate-400 mt-0.5">Currently attending classes</p>
        </div>

        <div className="p-4 rounded-2xl bg-white border border-slate-300 md:border-slate-200/80 shadow-[0_2px_10px_rgba(15,23,42,0.06)] md:shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Expected Monthly</span>
            <DollarSign size={15} className="text-blue-600" />
          </div>
          <div className="text-xl font-extrabold text-blue-700 font-mono mt-1">
            PKR {stats.totalReceivable.toLocaleString()}
          </div>
          <p className="text-[11px] text-slate-400 mt-0.5">Active students monthly fees</p>
        </div>

        <div className="p-4 rounded-2xl bg-white border border-slate-300 md:border-slate-200/80 shadow-[0_2px_10px_rgba(15,23,42,0.06)] md:shadow-xs">
          <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Completed / Passed</span>
          <div className="text-2xl font-extrabold text-indigo-700 font-mono mt-1">{stats.completed}</div>
          <p className="text-[11px] text-slate-400 mt-0.5">Session completed</p>
        </div>

        <div className="p-4 rounded-2xl bg-white border border-slate-300 md:border-slate-200/80 shadow-[0_2px_10px_rgba(15,23,42,0.06)] md:shadow-xs">
          <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Dropped / Left</span>
          <div className="text-2xl font-extrabold text-rose-700 font-mono mt-1">{stats.left}</div>
          <p className="text-[11px] text-slate-400 mt-0.5">Discontinued coaching</p>
        </div>
      </div>

      {/* SEARCH AND FILTERS TOOLBAR */}
      <div className="bg-white p-4 rounded-2xl border border-slate-300 md:border-slate-200/80 shadow-xs flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between">
        <div className="relative flex-1">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
          <input
            type="text"
            placeholder="Search by student name, roll number (TFC-001), phone..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 bg-slate-50 text-xs font-medium focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all"
          />
          {searchTerm && (
            <button
              onClick={() => setSearchTerm('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
            >
              <X size={14} />
            </button>
          )}
        </div>

        <div className="flex items-center gap-2 overflow-x-auto pb-1 md:pb-0">
          <div className="flex items-center gap-1.5 px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl shrink-0">
            <Filter size={14} className="text-slate-400" />
            <select
              value={selectedGrade}
              onChange={(e) => setSelectedGrade(e.target.value)}
              className="bg-transparent text-xs font-bold text-slate-700 outline-none cursor-pointer"
            >
              <option value="ALL">All Classes / Grades</option>
              {COACHING_GRADES.map(g => (
                <option key={g} value={g}>{g}</option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-1.5 px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl shrink-0">
            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="bg-transparent text-xs font-bold text-slate-700 outline-none cursor-pointer"
            >
              <option value="ALL">All Status</option>
              <option value="active">Active Only</option>
              <option value="completed">Completed</option>
              <option value="left">Left</option>
            </select>
          </div>
        </div>
      </div>

      {/* STUDENTS DIRECTORY GRID & TABLE */}
      {filteredStudents.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredStudents.map(student => {
            const rollNo = student.roll_no || student.student_id || 'TFC-???';
            const isActive = student.status === 'active';
            const photo = student.profile_image || student.photo;

            return (
              <div
                key={student.id}
                className="bg-white rounded-2xl border border-slate-300 md:border-slate-200/80 p-4 space-y-3.5 shadow-[0_2px_10px_rgba(15,23,42,0.06)] md:shadow-xs hover:border-emerald-300 transition-all flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3">
                      {photo ? (
                        <img
                          src={photo}
                          alt={student.name}
                          className="w-12 h-12 rounded-xl object-cover border border-slate-200 shrink-0 shadow-2xs"
                        />
                      ) : (
                        <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-emerald-600 to-teal-700 text-white flex items-center justify-center font-extrabold text-base shrink-0 shadow-inner">
                          {student.name?.charAt(0) || 'S'}
                        </div>
                      )}
                      <div>
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="inline-block px-2 py-0.5 rounded-md font-mono text-[10px] font-bold text-emerald-800 bg-emerald-50 border border-emerald-200">
                            {rollNo}
                          </span>
                          <span className="text-[10px] font-semibold text-slate-500">
                            {student.gender || 'Male'}
                          </span>
                        </div>
                        <h3 className="font-extrabold text-slate-900 text-sm leading-tight mt-1">
                          {student.name}
                        </h3>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => handleToggleStatus(student.id, student.status)}
                      className={`px-2 py-0.5 rounded-full text-[10px] font-bold border transition-colors cursor-pointer ${
                        student.status === 'active'
                          ? 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100'
                          : student.status === 'completed'
                          ? 'bg-indigo-50 text-indigo-700 border-indigo-200 hover:bg-indigo-100'
                          : 'bg-rose-50 text-rose-700 border-rose-200 hover:bg-rose-100'
                      }`}
                      title="Click to change status"
                    >
                      {student.status?.toUpperCase() || 'ACTIVE'}
                    </button>
                  </div>

                  <div className="mt-3.5 grid grid-cols-2 gap-2 text-xs">
                    <div className="p-2 rounded-xl bg-slate-50 border border-slate-100">
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Class / Grade</span>
                      <div className="flex items-center gap-1 flex-wrap mt-0.5">
                        <span className="font-bold text-slate-800">{student.grade || '—'}</span>
                        {student.field && (
                          <span className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-emerald-100 text-emerald-800 border border-emerald-200">
                            {student.field}
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="p-2 rounded-xl bg-emerald-50/70 border border-emerald-100">
                      <span className="text-[10px] font-bold text-emerald-800 uppercase tracking-wider block">Monthly Fee</span>
                      <span className="font-bold text-emerald-800 font-mono block mt-0.5">
                        PKR {Number(student.monthly_fee || 0).toLocaleString()}
                      </span>
                    </div>
                  </div>

                  {(student.contact || student.contact_number) && (
                    <div className="mt-2.5 flex items-center gap-1.5 text-xs text-slate-600 font-mono">
                      <Phone size={12} className="text-slate-400" />
                      <a href={`tel:${student.contact || student.contact_number}`} className="hover:text-emerald-600 hover:underline">
                        {student.contact || student.contact_number}
                      </a>
                    </div>
                  )}
                </div>

                <div className="pt-3 border-t border-slate-100 flex items-center justify-between gap-2">
                  <button
                    onClick={() => navigate(`/dashboard/coaching-fees?studentId=${student.id}`)}
                    className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition-all shadow-xs cursor-pointer"
                  >
                    <CreditCard size={13} />
                    <span>Collect Fee</span>
                  </button>

                  <button
                    onClick={() => setViewingStudent(student)}
                    className="p-2 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-600 text-xs font-bold transition-colors cursor-pointer"
                    title="View Full Profile"
                  >
                    <BookOpen size={14} />
                  </button>

                  <button
                    onClick={() => handleEdit(student)}
                    className="p-2 rounded-xl border border-slate-200 hover:bg-slate-50 text-blue-600 text-xs font-bold transition-colors cursor-pointer"
                    title="Edit Record"
                  >
                    <Pencil size={14} />
                  </button>

                  {isAdmin && (
                    <button
                      onClick={() => handleDelete(student.id, student.name)}
                      className="p-2 rounded-xl border border-slate-200 hover:bg-rose-50 text-rose-600 text-xs font-bold transition-colors cursor-pointer"
                      title="Delete Record"
                    >
                      <Trash2 size={14} />
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="bg-white p-12 text-center rounded-2xl border border-slate-200 text-slate-400 space-y-3">
          <GraduationCap size={44} className="mx-auto text-slate-300" />
          <h3 className="font-bold text-slate-700 text-base">No coaching students found</h3>
          <p className="text-xs max-w-sm mx-auto text-slate-400">
            {searchTerm || selectedGrade !== 'ALL' || selectedStatus !== 'ALL'
              ? "Try adjusting your search query or grade/status filter."
              : "Start by registering your first coaching student with automated roll number TFC-001."}
          </p>
          <button
            onClick={handleOpenAddModal}
            className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-xs cursor-pointer mt-2"
          >
            Enroll First Student
          </button>
        </div>
      )}

      {/* ADD / EDIT STUDENT MODAL */}
      {showAddModal && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4 z-50 overflow-y-auto">
          <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl p-6 w-full max-w-2xl space-y-5 animate-in fade-in zoom-in-95 my-8">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-emerald-600 text-white flex items-center justify-center font-bold">
                  <GraduationCap size={18} />
                </div>
                <div>
                  <h3 className="text-base font-extrabold text-slate-900 tracking-tight">
                    {editingStudent ? `Edit Student: ${editingStudent.name}` : 'Enroll Coaching Student'}
                  </h3>
                  <span className="text-[11px] text-slate-400 font-mono font-bold">
                    Roll No: {formData.roll_no || autoRollNo}
                  </span>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {!editingStudent && (
                  <button
                    type="button"
                    onClick={() => setIsAdmissionScannerOpen(true)}
                    className="flex items-center gap-1.5 px-3 py-1 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 rounded-lg text-xs font-bold transition-all cursor-pointer"
                    title="Scan filled admission form"
                  >
                    <FileText size={13} />
                    <span>Scan Form</span>
                  </button>
                )}
                <button
                  onClick={() => setShowAddModal(false)}
                  className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg cursor-pointer"
                >
                  <X size={18} />
                </button>
              </div>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Photo Upload Thumbnail / Avatar Picker */}
              <div className="flex items-center gap-3.5 p-3 rounded-2xl bg-slate-50 border border-slate-200/80">
                <div className="relative group shrink-0">
                  <div className="w-14 h-14 rounded-2xl overflow-hidden bg-slate-200 border-2 border-dashed border-slate-300 flex items-center justify-center shadow-inner">
                    {formData.profile_image ? (
                      <img
                        src={formData.profile_image}
                        alt="Preview"
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <Users className="text-slate-400" size={24} />
                    )}
                  </div>
                  <label
                    htmlFor="coaching-student-photo"
                    className="absolute -bottom-1 -right-1 p-1.5 rounded-full bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs cursor-pointer active:scale-95 transition-all"
                    title="Upload Student Photo"
                  >
                    <Camera size={12} />
                  </label>
                  <input
                    type="file"
                    id="coaching-student-photo"
                    accept="image/*"
                    onChange={handleImageFileChange}
                    className="hidden"
                  />
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-800">Student Photo</span>
                    {formData.profile_image && (
                      <button
                        type="button"
                        onClick={() => setFormData(prev => ({ ...prev, profile_image: '' }))}
                        className="text-[10px] font-bold text-rose-600 hover:text-rose-700 hover:underline cursor-pointer"
                      >
                        Remove Photo
                      </button>
                    )}
                  </div>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    Square crop with zoom, saved in Base64.
                  </p>
                </div>
              </div>

              {/* FORM FIELDS - Matching Students.jsx structure */}
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3.5 max-h-[62vh] overflow-y-auto pr-1">
                {/* 1. Full Name */}
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">Full Name *</label>
                  <input
                    type="text"
                    name="name"
                    placeholder="e.g. Abdul Rehman"
                    value={formData.name}
                    onChange={handleChange}
                    required
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all font-medium"
                  />
                </div>

                {/* 2. Primary Phone (Optional) */}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-xs font-semibold text-slate-600">
                      Primary Phone <span className="text-slate-400 font-normal">(Optional)</span>
                    </label>
                    {!showSecondaryContact && (
                      <button
                        type="button"
                        onClick={() => setShowSecondaryContact(true)}
                        className="text-[11px] font-semibold text-emerald-600 hover:text-emerald-700 hover:underline cursor-pointer flex items-center gap-0.5"
                      >
                        <Plus size={11} />
                        <span>2nd Number</span>
                      </button>
                    )}
                  </div>
                  <input
                    type="text"
                    name="contact"
                    placeholder="03001234567 (Optional)"
                    value={formData.contact}
                    onChange={handleChange}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all font-mono"
                  />
                </div>

                {/* 3. Secondary Phone (Expandable) */}
                {showSecondaryContact && (
                  <div className="animate-in fade-in slide-in-from-top-1">
                    <div className="flex items-center justify-between mb-1">
                      <label className="block text-xs font-semibold text-slate-600">
                        2nd / Parent Phone <span className="text-slate-400 font-normal">(Optional)</span>
                      </label>
                      <button
                        type="button"
                        onClick={() => {
                          setShowSecondaryContact(false);
                          setFormData(prev => ({ ...prev, secondary_contact: '' }));
                        }}
                        className="text-[11px] text-rose-500 hover:text-rose-700 hover:underline cursor-pointer flex items-center gap-0.5"
                        title="Remove secondary phone"
                      >
                        <X size={11} />
                        <span>Remove</span>
                      </button>
                    </div>
                    <input
                      type="text"
                      name="secondary_contact"
                      placeholder="03007654321 (Parent/Alt)"
                      value={formData.secondary_contact}
                      onChange={handleChange}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all font-mono"
                    />
                  </div>
                )}

                {/* 4. Gender */}
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">Gender *</label>
                  <select
                    name="gender"
                    value={formData.gender}
                    onChange={handleChange}
                    required
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all cursor-pointer font-medium"
                  >
                    <option value="">Select Gender</option>
                    <option value="Male">Male</option>
                    <option value="Female">Female</option>
                    <option value="Other">Other</option>
                  </select>
                </div>

                {/* 5. Class / Grade (replaces Course, No Laptop Field!) */}
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">Class *</label>
                  <select
                    name="grade"
                    value={formData.grade}
                    onChange={handleChange}
                    required
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all cursor-pointer font-semibold text-slate-800"
                  >
                    <option value="">Select Class</option>
                    {COACHING_GRADES.map(g => (
                      <option key={g} value={g}>{g}</option>
                    ))}
                  </select>
                </div>

                {/* 6. Option field if user selects class above 8 (Commerce, Science, etc.) */}
                {isClassAboveEight(formData.grade) && (
                  <div className="animate-in fade-in slide-in-from-top-1">
                    <label className="block text-xs font-semibold text-slate-600 mb-1">
                      Field / Group * <span className="text-emerald-600 font-medium">(Commerce, Science, etc.)</span>
                    </label>
                    <select
                      name="field"
                      value={
                        COACHING_FIELDS.includes(formData.field)
                          ? formData.field
                          : (formData.field ? 'Other' : '')
                      }
                      onChange={(e) => {
                        const val = e.target.value;
                        if (val === 'Other') {
                          if (COACHING_FIELDS.includes(formData.field)) {
                            setFormData(prev => ({ ...prev, field: '' }));
                          }
                        } else {
                          setFormData(prev => ({ ...prev, field: val }));
                        }
                      }}
                      required
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all cursor-pointer font-semibold text-slate-800"
                    >
                      <option value="">Select Field / Group</option>
                      {COACHING_FIELDS.map(f => (
                        <option key={f} value={f}>{f}</option>
                      ))}
                    </select>
                    {(!COACHING_FIELDS.includes(formData.field) || formData.field === 'Other') && (
                      <input
                        type="text"
                        placeholder="Specify field (e.g. Fine Arts, DAE)..."
                        value={formData.field === 'Other' ? '' : formData.field}
                        onChange={(e) => setFormData(prev => ({ ...prev, field: e.target.value }))}
                        required
                        className="w-full mt-1.5 px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all"
                      />
                    )}
                  </div>
                )}



                {/* 9. Admission Date */}
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">Admission Date *</label>
                  <input
                    type="date"
                    name="joined_date"
                    value={formData.joined_date}
                    onChange={handleChange}
                    required
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all font-medium"
                  />
                </div>

                {/* 10. Admission Fee */}
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">Admission Fee (PKR)</label>
                  <input
                    type="number"
                    name="admission_fee"
                    placeholder="e.g. 500"
                    value={formData.admission_fee}
                    onChange={handleChange}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all font-mono"
                  />
                </div>

                {/* 11. Agreed Monthly Fee */}
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">Agreed Monthly Fee (PKR) *</label>
                  <input
                    type="number"
                    name="monthly_fee"
                    placeholder="e.g. 3000"
                    value={formData.monthly_fee}
                    onChange={handleChange}
                    required
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all font-mono font-bold text-slate-900"
                  />
                </div>

                {/* 12. Roll Number (Non-editable) */}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-xs font-semibold text-slate-600">Roll Number</label>
                    <span className="text-[10px] text-emerald-700 font-semibold bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200">
                      Auto-generated
                    </span>
                  </div>
                  <input
                    type="text"
                    name="roll_no"
                    value={editingStudent ? (formData.roll_no || editingStudent.roll_no || autoRollNo) : autoRollNo}
                    readOnly
                    disabled
                    className="w-full px-3 py-2 bg-slate-100 border border-slate-200 rounded-xl text-sm font-mono font-bold text-emerald-800 cursor-not-allowed select-none opacity-90 shadow-inner"
                    title="Roll number is auto-generated and non-editable"
                  />
                </div>

                {/* 13. Status (Edit Mode Only) */}
                {editingStudent && (
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 mb-1">Enrollment Status</label>
                    <select
                      name="status"
                      value={formData.status}
                      onChange={handleChange}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all cursor-pointer font-medium"
                    >
                      <option value="active">Active</option>
                      <option value="inactive">Inactive</option>
                    </select>
                  </div>
                )}
              </div>

              <div className="flex gap-2.5 justify-end pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-600 text-xs font-bold transition-all cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-md shadow-emerald-600/20 transition-all cursor-pointer disabled:opacity-60"
                >
                  {isSubmitting ? "Saving..." : editingStudent ? "Save Changes" : "Enroll Student"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* VIEW STUDENT PROFILE MODAL */}
      {viewingStudent && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl p-6 w-full max-w-md space-y-4 animate-in fade-in zoom-in-95">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                {viewingStudent.profile_image || viewingStudent.photo ? (
                  <img
                    src={viewingStudent.profile_image || viewingStudent.photo}
                    alt={viewingStudent.name}
                    className="w-14 h-14 rounded-2xl object-cover border border-slate-200 shadow-xs"
                  />
                ) : (
                  <div className="w-14 h-14 rounded-2xl bg-emerald-600 text-white flex items-center justify-center font-extrabold text-xl">
                    {viewingStudent.name?.charAt(0) || 'S'}
                  </div>
                )}
                <div>
                  <span className="font-mono text-xs font-bold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">
                    {viewingStudent.roll_no || viewingStudent.student_id}
                  </span>
                  <h3 className="font-extrabold text-slate-900 text-base mt-1 leading-tight">{viewingStudent.name}</h3>
                  {viewingStudent.father_name && (
                    <p className="text-xs text-slate-500 font-medium">S/O {viewingStudent.father_name}</p>
                  )}
                </div>
              </div>
              <button
                onClick={() => setViewingStudent(null)}
                className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-100 space-y-2 text-xs max-h-[55vh] overflow-y-auto">
              <div className="flex justify-between py-1 border-b border-slate-200/60">
                <span className="text-slate-500 font-medium">Class / Grade:</span>
                <span className="font-bold text-slate-800">{viewingStudent.grade || '—'}</span>
              </div>
              {viewingStudent.field && (
                <div className="flex justify-between py-1 border-b border-slate-200/60">
                  <span className="text-slate-500 font-medium">Field / Group:</span>
                  <span className="font-bold text-emerald-700">{viewingStudent.field}</span>
                </div>
              )}
              {viewingStudent.gender && (
                <div className="flex justify-between py-1 border-b border-slate-200/60">
                  <span className="text-slate-500 font-medium">Gender:</span>
                  <span className="font-bold text-slate-800">{viewingStudent.gender}</span>
                </div>
              )}
              <div className="flex justify-between py-1 border-b border-slate-200/60">
                <span className="text-slate-500 font-medium">Monthly Fee:</span>
                <span className="font-mono font-bold text-emerald-700">PKR {Number(viewingStudent.monthly_fee || 0).toLocaleString()}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-200/60">
                <span className="text-slate-500 font-medium">Admission Fee:</span>
                <span className="font-mono font-bold text-slate-800">PKR {Number(viewingStudent.admission_fee || 0).toLocaleString()}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-200/60">
                <span className="text-slate-500 font-medium">Primary Contact:</span>
                <span className="font-mono font-bold text-slate-800">{viewingStudent.contact || viewingStudent.contact_number || '—'}</span>
              </div>
              {(viewingStudent.secondary_contact || viewingStudent.guardian_contact) && (
                <div className="flex justify-between py-1 border-b border-slate-200/60">
                  <span className="text-slate-500 font-medium">2nd / Guardian Contact:</span>
                  <span className="font-mono font-bold text-slate-800">{viewingStudent.secondary_contact || viewingStudent.guardian_contact}</span>
                </div>
              )}
              {viewingStudent.joined_date && (
                <div className="flex justify-between py-1 border-b border-slate-200/60">
                  <span className="text-slate-500 font-medium">Admission Date:</span>
                  <span className="font-mono text-slate-800">{viewingStudent.joined_date}</span>
                </div>
              )}
              {viewingStudent.cnic && (
                <div className="flex justify-between py-1 border-b border-slate-200/60">
                  <span className="text-slate-500 font-medium">N.I.C / B-Form:</span>
                  <span className="font-mono font-bold text-slate-800">{viewingStudent.cnic}</span>
                </div>
              )}
              {viewingStudent.address && (
                <div className="flex justify-between py-1 border-b border-slate-200/60">
                  <span className="text-slate-500 font-medium">Address:</span>
                  <span className="font-medium text-slate-800 text-right max-w-[200px]">{viewingStudent.address}</span>
                </div>
              )}
              <div className="flex justify-between py-1">
                <span className="text-slate-500 font-medium">Status:</span>
                <span className="font-bold uppercase text-emerald-700">{viewingStudent.status || 'ACTIVE'}</span>
              </div>
            </div>

            <div className="flex gap-2 pt-2">
              <button
                onClick={() => {
                  setViewingStudent(null);
                  navigate(`/dashboard/coaching-fees?studentId=${viewingStudent.id}`);
                }}
                className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-xs cursor-pointer"
              >
                <CreditCard size={14} />
                <span>Open Fee Ledger</span>
              </button>
              <button
                onClick={() => {
                  const s = viewingStudent;
                  setViewingStudent(null);
                  handleEdit(s);
                }}
                className="px-4 py-2.5 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-700 font-bold text-xs cursor-pointer"
              >
                Edit
              </button>
            </div>
          </div>
        </div>
      )}

      {/* CROP MODAL FOR STUDENT PHOTO */}
      <ImageCropModal
        isOpen={cropModalData.isOpen}
        imageSrc={cropModalData.imageSrc}
        onClose={() => setCropModalData({ isOpen: false, imageSrc: '' })}
        onCropComplete={handleCropComplete}
      />

      {/* ADMISSION FORM SCANNER MODAL */}
      <AdmissionFormScannerModal
        isOpen={isAdmissionScannerOpen}
        onClose={() => setIsAdmissionScannerOpen(false)}
        onApply={handleAdmissionFormApplied}
        coachingGrades={COACHING_GRADES}
        mode="coaching"
      />
    </div>
  );
};

export default CoachingStudents;

