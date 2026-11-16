import React, { useState, useMemo } from 'react';
import { db } from '../firebase';
import { ref, push, set, remove, update } from 'firebase/database';
import { useData } from '../contexts/DataContext';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import ImageCropModal from './ImageCropModal';
import AdmissionFormScannerModal from './AdmissionFormScannerModal';
import { QUALIFICATION_OPTIONS, matchQualification } from '../utils/admissionFormOcrParser';
export { QUALIFICATION_OPTIONS };
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
  FileText
} from 'lucide-react';

export const COACHING_GRADES = [
  "Class 5",
  "Class 6",
  "Class 7",
  "Class 8",
  "Class 9 (Matric I)",
  "Class 10 (Matric II)",
  "1st Year (Inter I)",
  "2nd Year (Inter II)",
  "O-Levels",
  "A-Levels",
  "General Coaching"
];

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

  // Form State
  const initialFormState = {
    roll_no: '',
    name: '',
    father_name: '',
    gender: 'Male',
    dob: '',
    cnic: '',
    religion: 'Islam',
    grade: COACHING_GRADES[4], // Class 9 default
    timing: '',
    last_qualification: '',
    school_college: '',
    monthly_fee: '',
    admission_fee: '0',
    contact_number: '',
    guardian_contact: '',
    email: '',
    batch_code: '',
    address: '',
    status: 'active',
    joined_date: new Date().toISOString().split('T')[0],
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

  const handleOpenAddModal = () => {
    setEditingStudent(null);
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
    setFormData(prev => ({
      ...prev,
      roll_no: extracted.reg_no || prev.roll_no || autoRollNo,
      name: extracted.name || prev.name,
      father_name: extracted.father_name || prev.father_name,
      gender: extracted.gender || prev.gender || 'Male',
      dob: extracted.dob || prev.dob || '',
      cnic: extracted.cnic || prev.cnic || '',
      religion: extracted.religion || prev.religion || 'Islam',
      grade: extracted.matchedGrade || prev.grade || COACHING_GRADES[4],
      timing: extracted.timing || extracted.timeslot || prev.timing || '',
      last_qualification: matchQualification(extracted.last_qualification || extracted.qualification) || prev.last_qualification || '',
      contact_number: extracted.contact || prev.contact_number,
      guardian_contact: extracted.secondary_contact || prev.guardian_contact,
      address: extracted.address || prev.address,
      email: extracted.email || prev.email || '',
      batch_code: extracted.batch_code || prev.batch_code || '',
      joined_date: extracted.admission_date || prev.joined_date
    }));
    setShowAddModal(true);
    toast.success(`Form details loaded for ${extracted.name || 'coaching student'}! Review and complete enrollment.`);
  };

  const handleEdit = (student) => {
    setEditingStudent(student);
    setFormData({
      roll_no: student.roll_no || student.student_id || '',
      name: student.name || '',
      father_name: student.father_name || '',
      gender: student.gender || 'Male',
      dob: student.dob || '',
      cnic: student.cnic || '',
      religion: student.religion || 'Islam',
      grade: student.grade || COACHING_GRADES[0],
      timing: student.timing || student.timeslot || '',
      last_qualification: student.last_qualification || '',
      school_college: student.school_college || '',
      monthly_fee: student.monthly_fee || '',
      admission_fee: student.admission_fee || '0',
      contact_number: student.contact_number || '',
      guardian_contact: student.guardian_contact || '',
      email: student.email || '',
      batch_code: student.batch_code || '',
      address: student.address || '',
      status: student.status || 'active',
      joined_date: student.joined_date || (student.createdAt ? student.createdAt.split('T')[0] : new Date().toISOString().split('T')[0]),
      profile_image: student.profile_image || student.photo || ''
    });
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
        roll_no: formData.roll_no.trim() || autoRollNo,
        name: formData.name.trim(),
        father_name: formData.father_name.trim(),
        gender: formData.gender || 'Male',
        dob: formData.dob ? formData.dob.trim() : '',
        cnic: formData.cnic ? formData.cnic.trim() : '',
        religion: formData.religion ? formData.religion.trim() : 'Islam',
        grade: formData.grade,
        timing: formData.timing ? formData.timing.trim() : '',
        last_qualification: formData.last_qualification ? formData.last_qualification.trim() : '',
        school_college: formData.school_college.trim(),
        monthly_fee: Number(formData.monthly_fee) || 0,
        admission_fee: Number(formData.admission_fee) || 0,
        contact_number: formData.contact_number.trim(),
        guardian_contact: formData.guardian_contact.trim(),
        email: formData.email ? formData.email.trim() : '',
        batch_code: formData.batch_code ? formData.batch_code.trim() : '',
        address: formData.address.trim(),
        status: formData.status || 'active',
        joined_date: formData.joined_date,
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
        (s.father_name && s.father_name.toLowerCase().includes(q)) ||
        (s.cnic && s.cnic.includes(q)) ||
        (s.contact_number && s.contact_number.includes(q)) ||
        (s.guardian_contact && s.guardian_contact.includes(q));

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
                        <span className="inline-block px-2 py-0.5 rounded-md font-mono text-[10px] font-bold text-emerald-800 bg-emerald-50 border border-emerald-200">
                          {rollNo}
                        </span>
                        <h3 className="font-extrabold text-slate-900 text-sm leading-tight mt-1">
                          {student.name}
                        </h3>
                        {student.father_name && (
                          <p className="text-[11px] text-slate-500 font-medium">S/O {student.father_name}</p>
                        )}
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
                      <span className="font-bold text-slate-800 truncate block mt-0.5">{student.grade || '—'}</span>
                    </div>

                    <div className="p-2 rounded-xl bg-emerald-50/70 border border-emerald-100">
                      <span className="text-[10px] font-bold text-emerald-800 uppercase tracking-wider block">Monthly Fee</span>
                      <span className="font-bold text-emerald-800 font-mono block mt-0.5">
                        PKR {Number(student.monthly_fee || 0).toLocaleString()}
                      </span>
                    </div>
                  </div>

                  {student.contact_number && (
                    <div className="mt-2.5 flex items-center gap-1.5 text-xs text-slate-600 font-mono">
                      <Phone size={12} className="text-slate-400" />
                      <a href={`tel:${student.contact_number}`} className="hover:text-emerald-600 hover:underline">
                        {student.contact_number}
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

              {/* FORM SECTIONS */}
              <div className="space-y-4 max-h-[62vh] overflow-y-auto pr-1">
                {/* 1. Academic Enrollment Section */}
                <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-3">
                  <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
                    <BookOpen size={13} className="text-emerald-600" />
                    <span>Academic & Class Enrollment</span>
                  </span>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[11px] font-bold text-slate-600 uppercase tracking-wider mb-1">
                        Student Roll Number *
                      </label>
                      <input
                        type="text"
                        value={formData.roll_no}
                        onChange={(e) => setFormData({ ...formData, roll_no: e.target.value })}
                        required
                        placeholder="e.g. TFC-001"
                        className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white text-xs font-mono font-bold text-emerald-800 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold text-slate-600 uppercase tracking-wider mb-1">
                        Class / Grade *
                      </label>
                      <select
                        value={formData.grade}
                        onChange={(e) => setFormData({ ...formData, grade: e.target.value })}
                        required
                        className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white text-xs font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 cursor-pointer"
                      >
                        {COACHING_GRADES.map(g => (
                          <option key={g} value={g}>{g}</option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold text-slate-600 uppercase tracking-wider mb-1">
                        Class Timing / Batch Slot
                      </label>
                      <input
                        type="text"
                        placeholder="e.g. 5:30 PM - 7:30 PM or 6-8"
                        value={formData.timing}
                        onChange={(e) => setFormData({ ...formData, timing: e.target.value })}
                        className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white text-xs font-mono font-medium focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold text-slate-600 uppercase tracking-wider mb-1">
                        Batch Code <span className="text-slate-400 font-normal">(Optional)</span>
                      </label>
                      <input
                        type="text"
                        placeholder="e.g. 2 or B-01"
                        value={formData.batch_code}
                        onChange={(e) => setFormData({ ...formData, batch_code: e.target.value })}
                        className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white text-xs font-mono font-medium focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                      />
                    </div>
                  </div>
                </div>

                {/* 2. Student & Parent Information */}
                <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-3">
                  <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
                    <GraduationCap size={13} className="text-emerald-600" />
                    <span>Student Profile & Parent Information</span>
                  </span>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[11px] font-bold text-slate-600 uppercase tracking-wider mb-1">
                        Student Full Name *
                      </label>
                      <input
                        type="text"
                        placeholder="e.g. Abdul Rehman"
                        value={formData.name}
                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                        required
                        className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white text-xs font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold text-slate-600 uppercase tracking-wider mb-1">
                        Father's Name
                      </label>
                      <input
                        type="text"
                        placeholder="e.g. M. Owais Ajmeri"
                        value={formData.father_name}
                        onChange={(e) => setFormData({ ...formData, father_name: e.target.value })}
                        className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white text-xs font-medium focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold text-slate-600 uppercase tracking-wider mb-1">
                        Gender
                      </label>
                      <div className="flex gap-2">
                        {['Male', 'Female'].map(g => (
                          <button
                            key={g}
                            type="button"
                            onClick={() => setFormData({ ...formData, gender: g })}
                            className={`flex-1 py-1.5 text-xs font-bold rounded-xl border transition-all cursor-pointer ${
                              formData.gender === g
                                ? 'bg-emerald-600 text-white border-emerald-600 shadow-xs'
                                : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                            }`}
                          >
                            {g}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold text-slate-600 uppercase tracking-wider mb-1">
                        Date of Birth (D.O.B)
                      </label>
                      <input
                        type="text"
                        placeholder="e.g. 4-11-2010 or DD/MM/YYYY"
                        value={formData.dob}
                        onChange={(e) => setFormData({ ...formData, dob: e.target.value })}
                        className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white text-xs font-mono focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold text-slate-600 uppercase tracking-wider mb-1">
                        N.I.C / B-Form Number
                      </label>
                      <input
                        type="text"
                        placeholder="e.g. 42301-0195991-5"
                        value={formData.cnic}
                        onChange={(e) => setFormData({ ...formData, cnic: e.target.value })}
                        className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white text-xs font-mono font-medium focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold text-slate-600 uppercase tracking-wider mb-1">
                        Religion
                      </label>
                      <input
                        type="text"
                        placeholder="e.g. Islam"
                        value={formData.religion}
                        onChange={(e) => setFormData({ ...formData, religion: e.target.value })}
                        className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white text-xs font-medium focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold text-slate-600 uppercase tracking-wider mb-1">
                        Last Qualification
                      </label>
                      <select
                        value={
                          QUALIFICATION_OPTIONS.includes(formData.last_qualification)
                            ? formData.last_qualification
                            : (formData.last_qualification ? 'Other' : '')
                        }
                        onChange={(e) => {
                          const val = e.target.value;
                          if (val === 'Other') {
                            if (QUALIFICATION_OPTIONS.includes(formData.last_qualification)) {
                              setFormData({ ...formData, last_qualification: '' });
                            }
                          } else {
                            setFormData({ ...formData, last_qualification: val });
                          }
                        }}
                        className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 cursor-pointer"
                      >
                        <option value="">Select Qualification (Optional)</option>
                        {QUALIFICATION_OPTIONS.map((q) => (
                          <option key={q} value={q}>{q}</option>
                        ))}
                      </select>
                      {(!QUALIFICATION_OPTIONS.includes(formData.last_qualification) || formData.last_qualification === 'Other') && (
                        <input
                          type="text"
                          placeholder="Specify custom qualification (e.g. DAE, Hafiz-e-Quran)..."
                          value={formData.last_qualification === 'Other' ? '' : formData.last_qualification}
                          onChange={(e) => setFormData({ ...formData, last_qualification: e.target.value })}
                          className="w-full mt-1.5 px-3 py-2 rounded-xl border border-slate-200 bg-white text-xs font-medium focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                        />
                      )}
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold text-slate-600 uppercase tracking-wider mb-1">
                        School / College Name
                      </label>
                      <input
                        type="text"
                        placeholder="e.g. Govt Degree College"
                        value={formData.school_college}
                        onChange={(e) => setFormData({ ...formData, school_college: e.target.value })}
                        className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white text-xs font-medium focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                      />
                    </div>
                  </div>
                </div>

                {/* 3. Contact & Residential Details */}
                <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-3">
                  <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
                    <Phone size={13} className="text-emerald-600" />
                    <span>Contact Details & Residence</span>
                  </span>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[11px] font-bold text-slate-600 uppercase tracking-wider mb-1">
                        Student Contact / Phone *
                      </label>
                      <div className="relative">
                        <Phone className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={13} />
                        <input
                          type="tel"
                          placeholder="e.g. 0331-2118429"
                          value={formData.contact_number}
                          onChange={(e) => setFormData({ ...formData, contact_number: e.target.value })}
                          required
                          className="w-full pl-8 pr-3 py-2 rounded-xl border border-slate-200 bg-white text-xs font-mono font-medium focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold text-slate-600 uppercase tracking-wider mb-1">
                        WhatsApp / Guardian Phone
                      </label>
                      <div className="relative">
                        <Phone className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={13} />
                        <input
                          type="tel"
                          placeholder="e.g. 0321-9876543"
                          value={formData.guardian_contact}
                          onChange={(e) => setFormData({ ...formData, guardian_contact: e.target.value })}
                          className="w-full pl-8 pr-3 py-2 rounded-xl border border-slate-200 bg-white text-xs font-mono font-medium focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                        />
                      </div>
                    </div>

                    <div className="sm:col-span-2">
                      <label className="block text-[11px] font-bold text-slate-600 uppercase tracking-wider mb-1">
                        Email Address <span className="text-slate-400 font-normal">(Optional)</span>
                      </label>
                      <input
                        type="email"
                        placeholder="e.g. student@gmail.com"
                        value={formData.email}
                        onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                        className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white text-xs font-medium focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                      />
                    </div>

                    <div className="sm:col-span-2">
                      <label className="block text-[11px] font-bold text-slate-600 uppercase tracking-wider mb-1">
                        Residential Address
                      </label>
                      <textarea
                        rows={2}
                        placeholder="e.g. Haji Suleiman Abdullah Bldg, 3rd Floor, Gari Khata, Karachi..."
                        value={formData.address}
                        onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                        className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white text-xs font-medium focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 resize-none"
                      />
                    </div>
                  </div>
                </div>

                {/* 4. Tuition Fee & Commitment */}
                <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-3">
                  <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
                    <DollarSign size={13} className="text-emerald-600" />
                    <span>Tuition Fee Commitment & Admission Info</span>
                  </span>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div>
                      <label className="block text-[11px] font-bold text-slate-600 uppercase tracking-wider mb-1">
                        Monthly Fee (PKR) *
                      </label>
                      <input
                        type="number"
                        placeholder="e.g. 3000"
                        value={formData.monthly_fee}
                        onChange={(e) => setFormData({ ...formData, monthly_fee: e.target.value })}
                        required
                        className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white text-xs font-mono font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold text-slate-600 uppercase tracking-wider mb-1">
                        Admission Fee (PKR)
                      </label>
                      <input
                        type="number"
                        placeholder="e.g. 500"
                        value={formData.admission_fee}
                        onChange={(e) => setFormData({ ...formData, admission_fee: e.target.value })}
                        className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white text-xs font-mono font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold text-slate-600 uppercase tracking-wider mb-1">
                        Admission / Joining Date
                      </label>
                      <input
                        type="date"
                        value={formData.joined_date}
                        onChange={(e) => setFormData({ ...formData, joined_date: e.target.value })}
                        className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white text-xs font-medium focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                      />
                    </div>
                  </div>
                </div>
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
                  <p className="text-xs text-slate-500 font-medium">S/O {viewingStudent.father_name || '—'}</p>
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
              {viewingStudent.gender && (
                <div className="flex justify-between py-1 border-b border-slate-200/60">
                  <span className="text-slate-500 font-medium">Gender:</span>
                  <span className="font-bold text-slate-800">{viewingStudent.gender}</span>
                </div>
              )}
              {viewingStudent.cnic && (
                <div className="flex justify-between py-1 border-b border-slate-200/60">
                  <span className="text-slate-500 font-medium">N.I.C / B-Form:</span>
                  <span className="font-mono font-bold text-slate-800">{viewingStudent.cnic}</span>
                </div>
              )}
              {viewingStudent.dob && (
                <div className="flex justify-between py-1 border-b border-slate-200/60">
                  <span className="text-slate-500 font-medium">Date of Birth:</span>
                  <span className="font-mono font-bold text-slate-800">{viewingStudent.dob}</span>
                </div>
              )}
              {viewingStudent.religion && (
                <div className="flex justify-between py-1 border-b border-slate-200/60">
                  <span className="text-slate-500 font-medium">Religion:</span>
                  <span className="font-medium text-slate-800">{viewingStudent.religion}</span>
                </div>
              )}
              {viewingStudent.timing && (
                <div className="flex justify-between py-1 border-b border-slate-200/60">
                  <span className="text-slate-500 font-medium">Class Timing:</span>
                  <span className="font-mono font-bold text-emerald-800">{viewingStudent.timing}</span>
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
                <span className="text-slate-500 font-medium">Student Contact:</span>
                <span className="font-mono font-bold text-slate-800">{viewingStudent.contact_number || '—'}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-200/60">
                <span className="text-slate-500 font-medium">Guardian Contact:</span>
                <span className="font-mono font-bold text-slate-800">{viewingStudent.guardian_contact || '—'}</span>
              </div>
              {viewingStudent.last_qualification && (
                <div className="flex justify-between py-1 border-b border-slate-200/60">
                  <span className="text-slate-500 font-medium">Last Qualification:</span>
                  <span className="font-medium text-slate-800">{viewingStudent.last_qualification}</span>
                </div>
              )}
              <div className="flex justify-between py-1 border-b border-slate-200/60">
                <span className="text-slate-500 font-medium">School / College:</span>
                <span className="font-bold text-slate-800">{viewingStudent.school_college || '—'}</span>
              </div>
              {viewingStudent.address && (
                <div className="flex justify-between py-1 border-b border-slate-200/60">
                  <span className="text-slate-500 font-medium">Address:</span>
                  <span className="font-medium text-slate-800 text-right max-w-[200px]">{viewingStudent.address}</span>
                </div>
              )}
              {viewingStudent.joined_date && (
                <div className="flex justify-between py-1 border-b border-slate-200/60">
                  <span className="text-slate-500 font-medium">Admission Date:</span>
                  <span className="font-mono text-slate-800">{viewingStudent.joined_date}</span>
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

