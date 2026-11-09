import { useSearchParams } from 'react-router-dom';
import React, { useState, useEffect } from 'react';
import { db } from '../firebase.js';
import { useAuth } from '../contexts/AuthContext';
import { ref, set, push, onValue, remove } from 'firebase/database';
import * as XLSX from 'xlsx';
import toast from 'react-hot-toast';
import {
  Search,
  Download,
  Plus,
  Edit2,
  Trash2,
  User,
  Phone,
  Laptop,
  Calendar,
  GraduationCap,
  Clock,
  CheckCircle2,
  XCircle,
  AlertCircle,
  X,
  ArrowUpDown,
  BookOpen,
  DollarSign,
  ChevronDown,
  Eye,
  MessageSquare,
  Smartphone,
  MessageCircle
} from 'lucide-react';
import { parseLocalDateMidday } from '../utils/monthUtils';
import ContactSyncModal from './ContactSyncModal';
import { syncStudentToGoogleContacts, normalizePhoneNumber } from '../services/contactSyncService';

const Students = () => {
  const { currentUser, isAdmin } = useAuth();
  const [students, setStudents] = useState([]);
  const [pendingStudents, setPendingStudents] = useState([]);
  const [courses, setCourses] = useState([]);
  const [isEditing, setIsEditing] = useState(null);
  const [showQuickEnroll, setShowQuickEnroll] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterCourse, setFilterCourse] = useState('');
  const [loading, setLoading] = useState(false);
  const [sortOrder, setSortOrder] = useState('desc');
  const [statusFilter, setStatusFilter] = useState('all');
  const [laptopFilter, setLaptopFilter] = useState('all');
  const [searchParams] = useSearchParams();
  const [viewingStudent, setViewingStudent] = useState(null);
  const [showContactSyncModal, setShowContactSyncModal] = useState(false);

  useEffect(() => {
    const q = searchParams.get('search') || searchParams.get('id');
    if (q) {
      setSearchTerm(q);
    }
  }, [searchParams]);

  useEffect(() => {
    const q = searchParams.get('search') || searchParams.get('id');
    const autoView = searchParams.get('view') === 'true';
    if (q && autoView && students.length > 0) {
      const matched = students.find(s => 
        (s.student_id && s.student_id.toLowerCase() === q.toLowerCase()) ||
        (s.name && s.name.toLowerCase() === q.toLowerCase()) ||
        s.id === q
      );
      if (matched) {
        setViewingStudent(matched);
      }
    }
  }, [searchParams, students]);

  const today = new Date().toISOString().split('T')[0];

  const [formData, setFormData] = useState({
    name: '', contact: '', gender: '', courseId: '', laptop_status: '',
    agreed_monthly_fee: '', admission_fee: '', createdAt: today,
    class_type: '', timeslot: ''
  });

  const getTimeslotOptions = (classType) => {
    if (classType === 'Regular (1 Hour)') {
      return [
        "3:00 PM - 4:00 PM", "4:00 PM - 5:00 PM", "5:00 PM - 6:00 PM",
        "6:00 PM - 7:00 PM", "7:00 PM - 8:00 PM", "8:00 PM - 9:00 PM",
        "9:00 PM - 10:00 PM"
      ];
    } else if (classType === 'Alternate (2 Hours)') {
      return [
        "3:00 PM - 5:00 PM", "4:00 PM - 6:00 PM", "5:00 PM - 7:00 PM",
        "6:00 PM - 8:00 PM", "7:00 PM - 9:00 PM", "8:00 PM - 10:00 PM"
      ];
    }
    return [];
  };

  const downloadExcel = () => {
    if (filteredStudents.length === 0) {
      toast.error("No data available to export");
      return;
    }

    const excelData = filteredStudents.map(s => ({
      "Student ID": s.student_id,
      "Name": s.name,
      "Gender": s.gender,
      "Contact": s.contact,
      "Admission Fee": s.admission_fee || 0,
      "Admission Date": s.createdAt ? s.createdAt.split('T')[0] : "N/A",
      "Added By": s.addedBy || "N/A"
    }));

    const worksheet = XLSX.utils.json_to_sheet(excelData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Students");
    XLSX.writeFile(workbook, `Student_Directory_${new Date().toLocaleDateString()}.xlsx`);
  };

  useEffect(() => {
    onValue(ref(db, 'courses'), (snap) => {
      const data = snap.val();
      setCourses(data ? Object.keys(data).map(id => ({ id, ...data[id] })) : []);
    });

    onValue(ref(db, 'students'), (snap) => {
      const data = snap.val();
      setStudents(data ? Object.keys(data).map(id => ({ id, ...data[id] })) : []);
    });

    onValue(ref(db, 'pending_approvals'), (snap) => {
      const data = snap.val();
      setPendingStudents(data ? Object.keys(data).map(id => ({ id, ...data[id] })) : []);
    });
  }, []);

  const handleChange = (e) => {
    const { name, value } = e.target;
    
    if (name === 'class_type') {
      setFormData(prev => ({ ...prev, class_type: value, timeslot: '' }));
    } else {
      setFormData(prev => ({ ...prev, [name]: value }));
    }

    if (name === 'courseId' && !isEditing) {
      const selectedCourse = courses.find(c => c.id === value);
      if (selectedCourse) {
        setFormData(prev => ({
          ...prev,
          agreed_monthly_fee: selectedCourse.base_fee,
          admission_fee: selectedCourse.admission_fee || ''
        }));
      }
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    const admissionDateTime = parseLocalDateMidday(formData.createdAt).toISOString();

    try {
      if (isEditing) {
        const currentStudent = students.find(s => s.id === isEditing);
        const courseId = formData.courseId;

        const updatedStudent = {
          ...currentStudent,
          name: formData.name,
          contact: formData.contact,
          gender: formData.gender,
          laptop_status: formData.laptop_status,
          createdAt: admissionDateTime,
          enrolled_courses: {
            ...currentStudent.enrolled_courses,
            [courseId]: {
              ...currentStudent.enrolled_courses[courseId],
              agreed_monthly_fee: Number(formData.agreed_monthly_fee),
              class_type: formData.class_type,
              timeslot: formData.timeslot,
            }
          }
        };

        await set(ref(db, `students/${isEditing}`), updatedStudent);
        toast.success('Student profile updated!');
        syncStudentToGoogleContacts(updatedStudent).catch(() => {});
        setIsEditing(null);
      } else {
        const selectedCourse = courses.find(c => c.id === formData.courseId);
        const courseDuration = selectedCourse?.duration || "N/A";
        const allExistingIds = [...students.map(s => s.student_id), ...pendingStudents.map(s => s.student_id)];
        let nextNumber = 1;
        if (allExistingIds.length > 0) {
          const numbers = allExistingIds.map(id => {
            if (!id) return 0;
            const parts = id.split('-');
            return parseInt(parts[parts.length - 1], 10);
          });
          nextNumber = Math.max(...numbers) + 1;
        }

        const customId = `STU-${String(nextNumber).padStart(3, '0')}`;

        const payloadWithMeta = {
          student_id: customId,
          name: formData.name,
          contact: formData.contact,
          gender: formData.gender,
          laptop_status: formData.laptop_status,
          admission_fee: Number(formData.admission_fee),
          addedBy: currentUser.name || currentUser.email,
          createdAt: admissionDateTime,
          status: 'active',
          enrolled_courses: {
            [formData.courseId]: {
              course_name: selectedCourse?.name || 'Unknown',
              duration: courseDuration,
              agreed_monthly_fee: Number(formData.agreed_monthly_fee),
              enrolledAt: admissionDateTime,
              course_status: "active",
              class_type: formData.class_type,
              timeslot: formData.timeslot
            }
          }
        };

        if (isAdmin) {
          await set(push(ref(db, 'students')), payloadWithMeta);
          toast.success(`Enrolled: ${customId}`);

          // Automatic background sync to mobile contacts & WhatsApp (Option A)
          syncStudentToGoogleContacts(payloadWithMeta).then(res => {
            if (res?.success) {
              toast.success(`📲 Contact synced to phone: ${customId} ${formData.name.trim()} TECHFLEX`, { duration: 4000 });
            }
          }).catch(err => console.warn('Background contact sync skipped:', err));
        } else {
          await set(push(ref(db, 'pending_approvals')), { ...payloadWithMeta, status: 'pending' });
          toast.success(`Request Sent: ${customId}`);
        }
      }
      setFormData({ name: '', contact: '', gender: '', courseId: '', laptop_status: '', agreed_monthly_fee: '', admission_fee: '', createdAt: today, class_type: '', timeslot: '' });
      setShowQuickEnroll(false);
    } catch (err) {
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  };

  const approveStudent = async (reqId, studentData) => {
    try {
      const { id, status: _, ...cleanData } = studentData;
      cleanData.status = 'active';
      cleanData.approvedBy = currentUser.name || currentUser.email || 'Admin';
      
      await set(push(ref(db, 'students')), cleanData);
      await remove(ref(db, `pending_approvals/${reqId}`));
      toast.success(`Approved: ${cleanData.student_id}`);

      // Automatic background sync to mobile contacts & WhatsApp (Option A)
      syncStudentToGoogleContacts(cleanData).then(res => {
        if (res?.success) {
          toast.success(`📲 Contact synced to phone: ${cleanData.student_id} ${cleanData.name.trim()} TECHFLEX`, { duration: 4000 });
        }
      }).catch(err => console.warn('Background contact sync skipped:', err));
    } catch (err) {
      toast.error(err.message);
    }
  };

  const rejectStudent = async (reqId) => {
    if (window.confirm("Reject this student enrollment request?")) {
      try {
        await remove(ref(db, `pending_approvals/${reqId}`));
        toast.success("Request Rejected.");
      } catch (err) {
        toast.error(err.message);
      }
    }
  };

  const startEdit = (student) => {
    const courseKey = Object.keys(student.enrolled_courses || {})[0];
    const courseData = student.enrolled_courses ? student.enrolled_courses[courseKey] : null;
    setIsEditing(student.id);
    setFormData({
      name: student.name,
      contact: student.contact || '',
      gender: student.gender || '',
      laptop_status: student.laptop_status || '',
      courseId: courseKey || '',
      agreed_monthly_fee: courseData ? courseData.agreed_monthly_fee : '',
      admission_fee: student.admission_fee || '',
      createdAt: student.createdAt ? student.createdAt.split('T')[0] : today,
      class_type: courseData ? (courseData.class_type || '') : '',
      timeslot: courseData ? (courseData.timeslot || '') : ''
    });
  };

  const formatDate = (dateString) => {
    if (!dateString) return "—";
    const date = new Date(dateString);
    return isNaN(date.getTime()) ? "—" : date.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
  };

  const filteredStudents = students.filter(s => {
    const matchesSearch = s.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (s.contact && s.contact.includes(searchTerm)) ||
      (s.student_id && s.student_id.toLowerCase().includes(searchTerm.toLowerCase()));
    const matchesCourse = filterCourse === '' || Object.keys(s.enrolled_courses || {}).includes(filterCourse);
    
    const studentStatus = s.status || 'active';
    const matchesStatus = statusFilter === 'all' || studentStatus === statusFilter;
    
    const matchesLaptop = laptopFilter === 'all' || s.laptop_status === laptopFilter;
    
    return matchesSearch && matchesCourse && matchesStatus && matchesLaptop;
  }).sort((a, b) => {
    const idA = a.student_id || "";
    const idB = b.student_id || "";
    return sortOrder === 'asc' ? idA.localeCompare(idB) : idB.localeCompare(idA);
  });

  const handleEditCourseChange = (e) => {
    const cid = e.target.value;
    const editingStudent = students.find(s => s.id === isEditing);
    if (!editingStudent) return;
    const courseData = editingStudent.enrolled_courses ? editingStudent.enrolled_courses[cid] : null;
    setFormData(prev => ({
      ...prev,
      courseId: cid,
      agreed_monthly_fee: courseData ? courseData.agreed_monthly_fee : '',
      class_type: courseData ? (courseData.class_type || '') : '',
      timeslot: courseData ? (courseData.timeslot || '') : ''
    }));
  };

  const activeCount = students.filter(s => s.status === 'active' || !s.status).length;
  const pendingCount = pendingStudents.length;

  return (
    <div className="space-y-6">
      {/* HEADER WITH STATS & ACTION BUTTONS */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-2 border-b border-slate-200/80">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-600 to-indigo-600 flex items-center justify-center text-white shadow-md shadow-blue-500/20">
              <GraduationCap size={22} />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Student Directory</h1>
              <p className="text-sm text-slate-500">Registration, multi-course enrollment & profiles</p>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <div className="hidden lg:flex items-center gap-4 bg-slate-100/80 px-4 py-2 rounded-xl text-xs font-medium text-slate-600 border border-slate-200">
            <span>Total: <strong className="text-slate-900 font-bold">{students.length}</strong></span>
            <span className="text-slate-300">•</span>
            <span>Active: <strong className="text-emerald-700 font-bold">{activeCount}</strong></span>
            {pendingCount > 0 && (
              <>
                <span className="text-slate-300">•</span>
                <span>Pending: <strong className="text-amber-700 font-bold">{pendingCount}</strong></span>
              </>
            )}
          </div>

          <button
            onClick={() => setShowContactSyncModal(true)}
            className="flex items-center gap-2 px-3.5 py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-sm font-semibold transition-all shadow-sm cursor-pointer"
            title="Sync Student Contacts to Phone & WhatsApp (STU-012 Name TECHFLEX)"
          >
            <Smartphone size={16} className="text-emerald-400" />
            <span>Phone Sync</span>
          </button>

          <button
            onClick={downloadExcel}
            className="flex items-center gap-2 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-sm font-semibold transition-all shadow-sm shadow-emerald-600/20 cursor-pointer"
          >
            <Download size={16} />
            <span>Export Excel</span>
          </button>

          <button
            onClick={() => setShowQuickEnroll(!showQuickEnroll)}
            className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-semibold transition-all shadow-md shadow-blue-500/20 cursor-pointer"
          >
            {showQuickEnroll ? <X size={16} /> : <Plus size={16} />}
            <span>{showQuickEnroll ? 'Close Form' : 'New Enrollment'}</span>
          </button>
        </div>
      </div>

      {/* QUICK ENROLLMENT CARD (EXPANDABLE) */}
      {showQuickEnroll && (
        <div className="bg-white border border-blue-200/80 rounded-2xl p-5 shadow-lg shadow-blue-500/5 animate-in fade-in slide-in-from-top-3">
          <div className="flex items-center justify-between pb-3 mb-4 border-b border-slate-100">
            <div className="flex items-center gap-2 text-blue-700 font-semibold text-sm">
              <User size={18} />
              <span>Quick Student Enrollment</span>
            </div>
            <span className="text-xs text-slate-400">All fields required for admission</span>
          </div>

          <form onSubmit={handleSubmit} className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3.5">
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">Full Name</label>
              <input
                type="text"
                name="name"
                placeholder="e.g. Ayesha Ahmed"
                value={formData.name}
                onChange={handleChange}
                required
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">Phone Number</label>
              <input
                type="text"
                name="contact"
                placeholder="03001234567"
                value={formData.contact}
                onChange={handleChange}
                required
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">Gender</label>
              <select
                name="gender"
                value={formData.gender}
                onChange={handleChange}
                required
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all cursor-pointer"
              >
                <option value="">Select Gender</option>
                <option value="Male">Male</option>
                <option value="Female">Female</option>
                <option value="Other">Other</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">Laptop Status</label>
              <select
                name="laptop_status"
                value={formData.laptop_status}
                onChange={handleChange}
                required
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all cursor-pointer"
              >
                <option value="">Select Laptop</option>
                <option value="Has Laptop">Has Laptop</option>
                <option value="No! Provided By ins">No! Provided By Ins.</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">Course</label>
              <select
                name="courseId"
                value={formData.courseId}
                onChange={handleChange}
                required
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all cursor-pointer"
              >
                <option value="">Select Course</option>
                {courses.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">Class Type</label>
              <select
                name="class_type"
                value={formData.class_type}
                onChange={handleChange}
                required
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all cursor-pointer"
              >
                <option value="">Select Class Type</option>
                <option value="Regular (1 Hour)">Regular (1 Hour)</option>
                <option value="Alternate (2 Hours)">Alternate (2 Hours)</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">Timeslot</label>
              <select
                name="timeslot"
                value={formData.timeslot}
                onChange={handleChange}
                required
                disabled={!formData.class_type}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all disabled:opacity-50 cursor-pointer"
              >
                <option value="">Select Timeslot</option>
                {getTimeslotOptions(formData.class_type).map(slot => (
                  <option key={slot} value={slot}>{slot}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">Admission Date</label>
              <input
                type="date"
                name="createdAt"
                value={formData.createdAt}
                onChange={handleChange}
                required
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">Admission Fee (PKR)</label>
              <input
                type="number"
                name="admission_fee"
                placeholder="e.g. 500"
                value={formData.admission_fee}
                onChange={handleChange}
                required
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">Agreed Monthly Fee (PKR)</label>
              <input
                type="number"
                name="agreed_monthly_fee"
                placeholder="e.g. 2500"
                value={formData.agreed_monthly_fee}
                onChange={handleChange}
                required
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
              />
            </div>

            <div className="sm:col-span-2 md:col-span-1 lg:col-span-2 flex items-end">
              <button
                type="submit"
                disabled={loading}
                className="w-full py-2.5 px-4 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-semibold transition-all shadow-md shadow-blue-500/20 disabled:opacity-50 cursor-pointer"
              >
                {loading ? "Processing..." : (isAdmin ? "Confirm Enrollment" : "Submit Request")}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* PENDING APPROVALS ALERT */}
      {isAdmin && pendingStudents.length > 0 && (
        <div className="bg-amber-50/70 border border-amber-200 rounded-2xl p-5 shadow-sm">
          <div className="flex items-center gap-2 mb-3">
            <AlertCircle className="text-amber-600" size={18} />
            <h3 className="text-sm font-bold text-amber-900">
              Pending Enrollment Requests ({pendingStudents.length})
            </h3>
          </div>
          <div className="overflow-x-auto rounded-xl border border-amber-200/60 bg-white">
            <table className="w-full text-left text-sm">
              <thead className="bg-amber-50/50 text-amber-900/80 text-xs uppercase font-semibold border-b border-amber-200/60">
                <tr>
                  <th className="px-4 py-2.5">Name</th>
                  <th className="px-4 py-2.5">Contact</th>
                  <th className="px-4 py-2.5">Course</th>
                  <th className="px-4 py-2.5">Added By</th>
                  <th className="px-4 py-2.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-amber-100">
                {pendingStudents.map(s => (
                  <tr key={s.id} className="hover:bg-amber-50/30 transition-colors">
                    <td className="px-4 py-2.5 font-medium text-slate-800">{s.name}</td>
                    <td className="px-4 py-2.5 text-slate-600">{s.contact}</td>
                    <td className="px-4 py-2.5">
                      {Object.values(s.enrolled_courses || {}).map((c, i) => (
                        <span key={i} className="inline-block px-2 py-0.5 bg-amber-100 text-amber-800 rounded-md text-xs font-medium mr-1">
                          {c.course_name}
                        </span>
                      ))}
                    </td>
                    <td className="px-4 py-2.5 text-slate-500 text-xs">{s.addedBy}</td>
                    <td className="px-4 py-2.5 text-right space-x-2">
                      <button
                        onClick={() => approveStudent(s.id, s)}
                        className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-semibold transition-all cursor-pointer shadow-sm"
                      >
                        Approve
                      </button>
                      <button
                        onClick={() => rejectStudent(s.id)}
                        className="px-2.5 py-1 bg-rose-50 text-rose-600 hover:bg-rose-100 border border-rose-200 rounded-lg text-xs font-semibold transition-all cursor-pointer"
                      >
                        Reject
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* FILTER & SEARCH TOOLBAR */}
      <div className="bg-white border border-slate-200/80 rounded-2xl p-4 shadow-sm space-y-3">
        <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
          {/* SEARCH BAR */}
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            <input
              type="text"
              placeholder="Search by name, student ID, or phone..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
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

          {/* FILTER DROPDOWNS */}
          <div className="flex flex-wrap items-center gap-2">
            <select
              value={filterCourse}
              onChange={(e) => setFilterCourse(e.target.value)}
              className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500/20 cursor-pointer"
            >
              <option value="">All Courses</option>
              {courses.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>

            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500/20 cursor-pointer"
            >
              <option value="all">Status: All</option>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </select>

            <select
              value={laptopFilter}
              onChange={(e) => setLaptopFilter(e.target.value)}
              className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500/20 cursor-pointer"
            >
              <option value="all">Laptop: All</option>
              <option value="Has Laptop">Has Laptop</option>
              <option value="No! Provided By ins">No! Provided By Ins.</option>
            </select>

            <button
              onClick={() => setSortOrder(prev => prev === 'asc' ? 'desc' : 'asc')}
              className="flex items-center gap-1.5 px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-medium transition-colors cursor-pointer"
              title="Toggle Sort Order"
            >
              <ArrowUpDown size={14} />
              <span>ID: {sortOrder.toUpperCase()}</span>
            </button>
          </div>
        </div>
      </div>

      {/* STUDENT TABLE */}
      <div className="bg-white border border-slate-200/80 rounded-2xl shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50/80 text-slate-500 text-xs font-semibold uppercase tracking-wider border-b border-slate-200">
              <tr>
                <th className="px-5 py-3.5">Student ID</th>
                <th className="px-5 py-3.5">Student Info</th>
                <th className="px-5 py-3.5">Course(s)</th>
                <th className="px-5 py-3.5">Timeslot</th>
                <th className="px-5 py-3.5">Admission Fee</th>
                <th className="px-5 py-3.5">Monthly Fee</th>
                <th className="px-5 py-3.5">Admission Date</th>
                <th className="px-5 py-3.5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredStudents.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-5 py-12 text-center text-slate-400">
                    <User size={36} className="mx-auto mb-2 opacity-30" />
                    <p className="text-sm font-medium">No students match your filter criteria</p>
                  </td>
                </tr>
              ) : (
                filteredStudents.map((s) => {
                  const isStudentActive = !s.status || s.status === 'active';
                  return (
                    <tr key={s.id} className="hover:bg-slate-50/60 transition-colors group">
                      <td 
                        onClick={() => setViewingStudent(s)}
                        className="px-5 py-4 font-mono font-bold text-blue-600 text-xs hover:underline cursor-pointer"
                        title="Click to view profile"
                      >
                        {s.student_id}
                      </td>

                      <td className="px-5 py-4">
                        <div className="flex items-center gap-3">
                          <div className={`w-9 h-9 rounded-xl flex items-center justify-center text-xs font-bold shadow-sm ${
                            s.gender === 'Female'
                              ? 'bg-gradient-to-br from-pink-500 to-rose-600 text-white'
                              : 'bg-gradient-to-br from-blue-500 to-indigo-600 text-white'
                          }`}>
                            {s.name ? s.name.charAt(0).toUpperCase() : '?'}
                          </div>
                          <div>
                            <div 
                              onClick={() => setViewingStudent(s)}
                              className="flex items-center gap-1.5 font-semibold text-slate-800 hover:text-blue-600 cursor-pointer transition-colors"
                              title="Click to view profile"
                            >
                              <span>{s.name}</span>
                              <span className="text-[10px] px-1.5 py-0.2 bg-slate-100 text-slate-500 rounded font-normal">
                                {s.gender || 'N/A'}
                              </span>
                            </div>
                            <div className="flex items-center gap-2 text-xs text-slate-400 mt-0.5">
                              <span className="flex items-center gap-1"><Phone size={11} /> {s.contact || 'No phone'}</span>
                              {s.contact && (
                                <a
                                  href={`https://wa.me/${normalizePhoneNumber(s.contact).replace('+', '')}`}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="inline-flex items-center gap-0.5 text-[10px] font-bold text-emerald-600 hover:text-emerald-700 bg-emerald-50 hover:bg-emerald-100 px-1.5 py-0.5 rounded transition-colors"
                                  title="Chat on WhatsApp"
                                  onClick={(e) => e.stopPropagation()}
                                >
                                  <MessageCircle size={10} />
                                  <span>WhatsApp</span>
                                </a>
                              )}
                              <span>•</span>
                              <span className="flex items-center gap-1"><Laptop size={11} /> {s.laptop_status === 'Has Laptop' ? 'Laptop ✓' : 'Ins. Laptop'}</span>
                            </div>
                          </div>
                        </div>
                      </td>

                      <td className="px-5 py-4">
                        <div className="space-y-1">
                          {Object.values(s.enrolled_courses || {}).map((course, idx) => {
                            const isCourseActive = !course.course_status || course.course_status === 'active';
                            return (
                              <span
                                key={idx}
                                className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md text-xs font-medium mr-1.5 ${
                                  isCourseActive
                                    ? 'bg-emerald-50 text-emerald-700 border border-emerald-200/60'
                                    : 'bg-slate-100 text-slate-600 border border-slate-200'
                                }`}
                              >
                                {course.course_name}
                              </span>
                            );
                          })}
                        </div>
                      </td>

                      <td className="px-5 py-4 text-xs text-slate-600">
                        {Object.values(s.enrolled_courses || {}).map((course, idx) => (
                          <div key={idx} className="flex items-center gap-1 py-0.5">
                            <Clock size={11} className="text-slate-400" />
                            <span>{course.timeslot || 'Not Assigned'}</span>
                          </div>
                        ))}
                      </td>

                      <td className="px-5 py-4 font-medium text-slate-800 text-xs">
                        PKR {Number(s.admission_fee || 0).toLocaleString()}
                      </td>

                      <td className="px-5 py-4 text-xs font-semibold text-slate-800">
                        {Object.values(s.enrolled_courses || {}).map((course, idx) => (
                          <div key={idx} className="py-0.5">
                            PKR {Number(course.agreed_monthly_fee || 0).toLocaleString()}
                          </div>
                        ))}
                      </td>

                      <td className="px-5 py-4 text-xs text-slate-500">
                        <div className="flex items-center gap-1">
                          <Calendar size={12} className="text-slate-400" />
                          <span>{formatDate(s.createdAt)}</span>
                        </div>
                      </td>

                      <td className="px-5 py-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={async (e) => {
                              e.stopPropagation();
                              const res = await syncStudentToGoogleContacts(s);
                              if (res?.success) toast.success(`Synced ${s.student_id} to phone contacts!`);
                              else toast.error(res?.message || 'Sync failed');
                            }}
                            className="p-1.5 text-slate-500 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors cursor-pointer"
                            title="Sync Contact to Mobile Phonebook"
                          >
                            <Smartphone size={16} />
                          </button>
                          <button
                            onClick={() => setViewingStudent(s)}
                            className="p-1.5 text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors cursor-pointer"
                            title="View Student Details"
                          >
                            <Eye size={16} />
                          </button>
                          {isAdmin && (
                            <>
                              <button
                                onClick={() => startEdit(s)}
                                className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors cursor-pointer"
                                title="Edit Profile"
                              >
                                <Edit2 size={16} />
                              </button>
                              <button
                                onClick={() => {
                                  if (window.confirm(`Delete record for ${s.name}?`)) {
                                    remove(ref(db, `students/${s.id}`));
                                    toast.success("Student removed");
                                  }
                                }}
                                className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                                title="Delete Student"
                              >
                                <Trash2 size={16} />
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* EDIT MODAL DIALOG */}
      {isEditing && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-100 max-w-2xl w-full p-6 animate-in zoom-in-95">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100 mb-5">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-blue-100 text-blue-600 flex items-center justify-center">
                  <Edit2 size={16} />
                </div>
                <h3 className="font-bold text-slate-800 text-lg">Edit Student Profile</h3>
              </div>
              <button
                onClick={() => setIsEditing(null)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg hover:bg-slate-100 transition-colors"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">Full Name</label>
                  <input
                    type="text"
                    name="name"
                    value={formData.name}
                    onChange={handleChange}
                    required
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">Phone Number</label>
                  <input
                    type="text"
                    name="contact"
                    value={formData.contact}
                    onChange={handleChange}
                    required
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">Gender</label>
                  <select
                    name="gender"
                    value={formData.gender}
                    onChange={handleChange}
                    required
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 cursor-pointer"
                  >
                    <option value="">Select Gender</option>
                    <option value="Male">Male</option>
                    <option value="Female">Female</option>
                    <option value="Other">Other</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">Laptop Status</label>
                  <select
                    name="laptop_status"
                    value={formData.laptop_status}
                    onChange={handleChange}
                    required
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 cursor-pointer"
                  >
                    <option value="">Select Laptop</option>
                    <option value="Has Laptop">Has Laptop</option>
                    <option value="No! Provided By ins">No! Provided By Ins.</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">Admission Date</label>
                  <input
                    type="date"
                    name="createdAt"
                    value={formData.createdAt}
                    onChange={handleChange}
                    required
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">Admission Fee (PKR)</label>
                  <input
                    type="number"
                    name="admission_fee"
                    value={formData.admission_fee}
                    onChange={handleChange}
                    required
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                  />
                </div>
              </div>

              {/* COURSE SETTINGS SECTION */}
              <div className="pt-3 border-t border-slate-100">
                <h4 className="text-xs font-bold uppercase text-slate-400 tracking-wider mb-3">Enrolled Course Settings</h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="sm:col-span-2">
                    <label className="block text-xs font-semibold text-slate-600 mb-1">Select Enrolled Course to Edit</label>
                    <select
                      name="courseId"
                      value={formData.courseId}
                      onChange={handleEditCourseChange}
                      required
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 cursor-pointer"
                    >
                      {(() => {
                        const editingStudent = students.find(s => s.id === isEditing);
                        if (editingStudent && editingStudent.enrolled_courses) {
                          return Object.keys(editingStudent.enrolled_courses).map(cid => (
                            <option key={cid} value={cid}>{editingStudent.enrolled_courses[cid].course_name}</option>
                          ));
                        }
                        return <option value="">Select Course</option>;
                      })()}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-600 mb-1">Class Type</label>
                    <select
                      name="class_type"
                      value={formData.class_type}
                      onChange={handleChange}
                      required
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 cursor-pointer"
                    >
                      <option value="">Select Class Type</option>
                      <option value="Regular (1 Hour)">Regular (1 Hour)</option>
                      <option value="Alternate (2 Hours)">Alternate (2 Hours)</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-600 mb-1">Timeslot</label>
                    <select
                      name="timeslot"
                      value={formData.timeslot}
                      onChange={handleChange}
                      required
                      disabled={!formData.class_type}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 disabled:opacity-50 cursor-pointer"
                    >
                      <option value="">Select Timeslot</option>
                      {getTimeslotOptions(formData.class_type).map(slot => (
                        <option key={slot} value={slot}>{slot}</option>
                      ))}
                    </select>
                  </div>

                  <div className="sm:col-span-2">
                    <label className="block text-xs font-semibold text-slate-600 mb-1">Agreed Monthly Fee (PKR)</label>
                    <input
                      type="number"
                      name="agreed_monthly_fee"
                      value={formData.agreed_monthly_fee}
                      onChange={handleChange}
                      required
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                    />
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsEditing(null)}
                  className="px-4 py-2 border border-slate-200 text-slate-600 hover:bg-slate-50 rounded-xl text-sm font-semibold transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-semibold transition-all shadow-md shadow-blue-500/20 disabled:opacity-50 cursor-pointer"
                >
                  {loading ? "Saving..." : "Update Student"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* VIEW STUDENT DETAILS MODAL */}
      {viewingStudent && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div 
            className="bg-white rounded-2xl shadow-2xl border border-slate-100 max-w-2xl w-full flex flex-col max-h-[90vh] overflow-hidden animate-in zoom-in-95 duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
              <div className="flex items-center gap-3">
                <div className={`w-11 h-11 rounded-xl flex items-center justify-center text-white font-bold text-lg shadow-sm ${
                  viewingStudent.gender === 'Female'
                    ? 'bg-gradient-to-br from-pink-500 to-rose-600'
                    : 'bg-gradient-to-br from-blue-500 to-indigo-600'
                }`}>
                  {viewingStudent.name ? viewingStudent.name.charAt(0).toUpperCase() : 'S'}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-bold text-slate-800 text-lg leading-tight">{viewingStudent.name}</h3>
                    <span className="px-2 py-0.5 rounded-md text-xs font-mono font-semibold bg-slate-100 text-slate-700 border border-slate-200">
                      {viewingStudent.student_id}
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 mt-0.5">Comprehensive Student Profile</p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold ${
                  (!viewingStudent.status || viewingStudent.status === 'active')
                    ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                    : 'bg-slate-100 text-slate-600 border border-slate-200'
                }`}>
                  {(!viewingStudent.status || viewingStudent.status === 'active') ? 'Active' : 'Inactive'}
                </span>
                <button
                  onClick={() => setViewingStudent(null)}
                  className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-slate-200/60 transition-colors cursor-pointer"
                  title="Close Dialog"
                >
                  <X size={18} />
                </button>
              </div>
            </div>

            {/* Body */}
            <div className="flex-1 overflow-y-auto p-6 space-y-6 custom-scrollbar">
              {/* Quick Info Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Gender</p>
                  <p className="text-xs font-semibold text-slate-800">{viewingStudent.gender || 'N/A'}</p>
                </div>
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Laptop Status</p>
                  <p className="text-xs font-semibold text-slate-800">{viewingStudent.laptop_status || 'N/A'}</p>
                </div>
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Admission Fee</p>
                  <p className="text-xs font-semibold text-slate-800">PKR {Number(viewingStudent.admission_fee || 0).toLocaleString()}</p>
                </div>
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Admission Date</p>
                  <p className="text-xs font-semibold text-slate-800">{formatDate(viewingStudent.createdAt)}</p>
                </div>
              </div>

              {/* Contact Card */}
              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200/70 flex items-center justify-between">
                <div>
                  <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Contact Number</p>
                  <p className="text-sm font-bold font-mono text-slate-800 mt-0.5">{viewingStudent.contact || 'No phone recorded'}</p>
                </div>
                {viewingStudent.contact && (
                  <div className="flex items-center gap-2">
                    <button
                      onClick={async () => {
                        const res = await syncStudentToGoogleContacts(viewingStudent);
                        if (res?.success) toast.success(`Synced ${viewingStudent.student_id} to phone contacts!`);
                        else toast.error(res?.message || 'Sync failed');
                      }}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold transition-colors cursor-pointer shadow-sm"
                      title="Sync this contact to Google Contacts & Phonebook"
                    >
                      <Smartphone size={13} /> Sync to Phone
                    </button>
                    <button
                      onClick={() => {
                        const digits = viewingStudent.contact.replace(/[^0-9]/g, '');
                        const waPhone = digits.startsWith('0') ? '92' + digits.slice(1) : digits;
                        window.open(`https://wa.me/${waPhone}`, '_blank');
                      }}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold transition-colors cursor-pointer shadow-sm"
                    >
                      <MessageSquare size={13} /> Open WhatsApp
                    </button>
                  </div>
                )}
              </div>

              {/* Enrolled Courses */}
              <div>
                <h4 className="font-bold text-slate-800 text-sm mb-3 flex items-center gap-2">
                  <GraduationCap size={16} className="text-blue-600" />
                  Enrolled Courses ({Object.keys(viewingStudent.enrolled_courses || {}).length})
                </h4>
                <div className="space-y-2.5">
                  {Object.entries(viewingStudent.enrolled_courses || {}).map(([cId, course]) => {
                    const isCourseActive = !course.course_status || course.course_status === 'active';
                    return (
                      <div key={cId} className="p-3.5 bg-white border border-slate-200 rounded-xl">
                        <div className="flex items-center justify-between mb-1.5">
                          <span className="font-bold text-slate-800 text-xs truncate mr-2">{course.course_name}</span>
                          <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold uppercase ${
                            isCourseActive
                              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                              : 'bg-slate-100 text-slate-600 border border-slate-200'
                          }`}>
                            {isCourseActive ? 'Active' : (course.course_status || 'Inactive')}
                          </span>
                        </div>
                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-xs text-slate-500 mt-2 pt-2 border-t border-slate-100">
                          <div>
                            <span className="text-slate-400 text-[11px] block">Timings:</span>
                            <span className="font-medium text-slate-700">{course.timeslot || 'Not Assigned'}</span>
                          </div>
                          <div>
                            <span className="text-slate-400 text-[11px] block">Class Type:</span>
                            <span className="font-medium text-slate-700">{course.class_type || 'Regular'}</span>
                          </div>
                          <div>
                            <span className="text-slate-400 text-[11px] block">Agreed Monthly Fee:</span>
                            <span className="font-bold text-slate-800">PKR {Number(course.agreed_monthly_fee || 0).toLocaleString()}</span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="px-6 py-4 border-t border-slate-100 bg-slate-50/50 flex items-center justify-between">
              {isAdmin && (
                <button
                  onClick={() => {
                    const s = viewingStudent;
                    setViewingStudent(null);
                    startEdit(s);
                  }}
                  className="inline-flex items-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition-colors cursor-pointer shadow-sm"
                >
                  <Edit2 size={13} /> Edit Profile
                </button>
              )}
              <div className="ml-auto">
                <button
                  onClick={() => setViewingStudent(null)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-xs font-bold transition-colors cursor-pointer"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      {/* PHONE & WHATSAPP CONTACT SYNC MODAL */}
      <ContactSyncModal
        isOpen={showContactSyncModal}
        onClose={() => setShowContactSyncModal(false)}
        students={students}
      />
    </div>
  );
};


export default Students;
