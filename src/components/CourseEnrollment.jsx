import React, { useState, useEffect } from 'react';
import { db } from '../firebase.js';
import { ref, onValue, update, remove } from 'firebase/database';
import toast from 'react-hot-toast';
import {
  PenSquare,
  Search,
  User,
  BookOpen,
  Clock,
  Calendar,
  CreditCard,
  Trash2,
  CheckCircle2,
  X,
  AlertCircle
} from 'lucide-react';

const CourseEnrollment = () => {
  const [students, setStudents] = useState([]);
  const [courses, setCourses] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [loading, setLoading] = useState(false);

  const [formData, setFormData] = useState({
    courseId: '',
    agreed_monthly_fee: '',
    startDate: new Date().toISOString().split('T')[0],
    class_type: '',
    timeslot: ''
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

  useEffect(() => {
    const studentsRef = ref(db, 'students');
    const coursesRef = ref(db, 'courses');

    const unsubStudents = onValue(studentsRef, (snap) => {
      const data = snap.val();
      const list = data ? Object.keys(data).map(id => ({ id, ...data[id] })) : [];
      setStudents(list);

      if (selectedStudent) {
        const updated = list.find(s => s.id === selectedStudent.id);
        setSelectedStudent(updated);
      }
    });

    const unsubCourses = onValue(coursesRef, (snap) => {
      const data = snap.val();
      setCourses(data ? Object.keys(data).map(id => ({ id, ...data[id] })) : []);
    });

    return () => {
      unsubStudents();
      unsubCourses();
    };
  }, [selectedStudent?.id]);

  const handleCourseChange = (e) => {
    const courseId = e.target.value;
    const course = courses.find(c => c.id === courseId);
    setFormData({
      ...formData,
      courseId,
      agreed_monthly_fee: course ? course.base_fee : ''
    });
  };

  const handleEnroll = async (e) => {
    e.preventDefault();
    if (!selectedStudent || !formData.courseId) {
      toast.error("Please select student and course");
      return;
    }

    if (selectedStudent.enrolled_courses?.[formData.courseId]) {
      toast.error("Student is already enrolled in this course!");
      return;
    }

    setLoading(true);
    const selectedCourseData = courses.find(c => c.id === formData.courseId);

    const getLocalDateIso = (dateStr) => {
      const [year, month, day] = dateStr.split('-');
      const d = new Date(year, month - 1, day, 12, 0, 0);
      return d.toISOString();
    };

    const enrolledDateIso = formData.startDate
      ? getLocalDateIso(formData.startDate)
      : new Date().toISOString();

    const newCourseEntry = {
      course_name: selectedCourseData.name,
      duration: selectedCourseData.duration,
      agreed_monthly_fee: Number(formData.agreed_monthly_fee),
      enrolledAt: enrolledDateIso,
      course_status: 'active',
      class_type: formData.class_type,
      timeslot: formData.timeslot
    };

    try {
      const updates = {};
      updates[`students/${selectedStudent.id}/enrolled_courses/${formData.courseId}`] = newCourseEntry;
      updates[`students/${selectedStudent.id}/status`] = 'active';

      await update(ref(db), updates);
      toast.success(`Enrolled ${selectedStudent.name} in ${selectedCourseData.name}`);
      setFormData({ courseId: '', agreed_monthly_fee: '', startDate: new Date().toISOString().split('T')[0], class_type: '', timeslot: '' });
    } catch (err) {
      toast.error("Enrollment failed: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteCourse = async (courseId, courseName) => {
    if (window.confirm(`Are you sure you want to remove "${courseName}" for this student?`)) {
      try {
        await remove(ref(db, `students/${selectedStudent.id}/enrolled_courses/${courseId}`));
        toast.success(`Removed ${courseName} successfully.`);
      } catch (err) {
        toast.error("Failed to delete: " + err.message);
      }
    }
  };

  const filteredStudents = students.filter(s =>
    s.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    s.student_id?.toLowerCase().includes(searchTerm.toLowerCase())
  ).slice(0, 5);

  return (
    <div className="space-y-6 font-sans animate-fade-in max-w-4xl">
      {/* HEADER */}
      <header className="pb-2 border-b border-slate-200/80">
        <div className="flex items-center gap-2">
          <PenSquare className="text-blue-600" size={24} />
          <h1 className="text-2xl md:text-3xl font-extrabold text-slate-900 tracking-tight">Student Enrollment</h1>
        </div>
        <p className="text-sm text-slate-500 mt-1 font-medium">Assign students to courses, configure class schedules and negotiated fees</p>
      </header>

      {/* MAIN CONTAINER */}
      <div className="bg-white p-6 sm:p-8 rounded-2xl border border-slate-200/80 shadow-xs space-y-6">
        {/* Step 1: Select Student */}
        {!selectedStudent ? (
          <div className="space-y-3">
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
              1. Search and Select Student
            </label>
            <div className="relative">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
              <input
                type="text"
                placeholder="Search by student name or ID (e.g. STU-2025-001)..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-3 rounded-xl border border-slate-200 bg-slate-50 text-sm font-medium focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
              />
            </div>

            {searchTerm && (
              <div className="border border-slate-200 rounded-xl bg-white shadow-lg overflow-hidden divide-y divide-slate-100">
                {filteredStudents.length > 0 ? (
                  filteredStudents.map(student => (
                    <div
                      key={student.id}
                      onClick={() => { setSelectedStudent(student); setSearchTerm(''); }}
                      className="p-3.5 hover:bg-blue-50/70 cursor-pointer flex items-center justify-between transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-blue-100 text-blue-700 flex items-center justify-center font-bold text-xs">
                          {student.name?.charAt(0) || 'S'}
                        </div>
                        <div>
                          <div className="text-sm font-bold text-slate-900">{student.name}</div>
                          <div className="text-xs text-slate-500 font-mono">{student.contact || 'No phone'}</div>
                        </div>
                      </div>
                      <span className="font-mono text-xs font-bold text-blue-600 bg-blue-50 px-2.5 py-1 rounded-md">
                        {student.student_id}
                      </span>
                    </div>
                  ))
                ) : (
                  <div className="p-6 text-center text-xs text-slate-400">
                    No matching student found. Please verify the ID or name.
                  </div>
                )}
              </div>
            )}
          </div>
        ) : (
          <div className="space-y-6">
            {/* Selected Student Banner */}
            <div className="p-5 rounded-xl bg-blue-50/60 border border-blue-200/80 space-y-4">
              <div className="flex items-start justify-between">
                <div>
                  <span className="text-[10px] font-bold text-blue-600 uppercase tracking-wider block">
                    Selected Student
                  </span>
                  <h3 className="text-lg font-bold text-slate-900 mt-0.5">{selectedStudent.name}</h3>
                  <span className="font-mono text-xs text-blue-700 font-semibold">{selectedStudent.student_id}</span>
                </div>
                <button
                  type="button"
                  onClick={() => setSelectedStudent(null)}
                  className="px-3 py-1.5 rounded-lg border border-blue-200 bg-white hover:bg-blue-100 text-blue-700 text-xs font-bold transition-all shadow-xs"
                >
                  Change Student
                </button>
              </div>

              {/* Current Active Enrollments */}
              <div>
                <span className="text-[11px] font-bold text-slate-600 uppercase tracking-wider block mb-2">
                  Currently Enrolled Courses
                </span>
                <div className="space-y-2">
                  {selectedStudent.enrolled_courses && Object.keys(selectedStudent.enrolled_courses).length > 0 ? (
                    Object.entries(selectedStudent.enrolled_courses).map(([id, course]) => (
                      <div
                        key={id}
                        className="p-3 bg-white rounded-xl border border-blue-100 flex items-center justify-between text-xs"
                      >
                        <div>
                          <div className="font-bold text-slate-900">
                            {course.course_name}{' '}
                            <span className="font-mono text-emerald-700 font-normal">
                              (PKR {Number(course.agreed_monthly_fee).toLocaleString()})
                            </span>
                          </div>
                          {course.class_type && course.timeslot && (
                            <div className="text-[11px] text-purple-700 font-medium flex items-center gap-1.5 mt-0.5">
                              <Clock size={11} />
                              <span>{course.class_type} • {course.timeslot}</span>
                            </div>
                          )}
                        </div>
                        <button
                          onClick={() => handleDeleteCourse(id, course.course_name)}
                          className="p-1.5 rounded-lg text-rose-600 hover:bg-rose-50 transition-colors"
                          title="Remove Course"
                        >
                          <Trash2 size={15} />
                        </button>
                      </div>
                    ))
                  ) : (
                    <div className="text-xs text-slate-400 italic">No courses currently enrolled.</div>
                  )}
                </div>
              </div>
            </div>

            {/* Enrollment Form */}
            <form onSubmit={handleEnroll} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1.5 uppercase tracking-wider">
                  2. Select New Course
                </label>
                <select
                  value={formData.courseId}
                  onChange={handleCourseChange}
                  required
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-slate-50 text-xs font-semibold focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                >
                  <option value="">-- Choose from available curriculum --</option>
                  {courses.map(c => (
                    <option key={c.id} value={c.id}>{c.name} (Base: PKR {c.base_fee})</option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-600 mb-1.5 uppercase tracking-wider">
                    3. Class Type
                  </label>
                  <select
                    value={formData.class_type}
                    onChange={(e) => setFormData({ ...formData, class_type: e.target.value, timeslot: '' })}
                    required
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-slate-50 text-xs font-medium focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                  >
                    <option value="">-- Select Class Type --</option>
                    <option value="Regular (1 Hour)">Regular (1 Hour)</option>
                    <option value="Alternate (2 Hours)">Alternate (2 Hours)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-600 mb-1.5 uppercase tracking-wider">
                    4. Timeslot
                  </label>
                  <select
                    value={formData.timeslot}
                    onChange={(e) => setFormData({ ...formData, timeslot: e.target.value })}
                    required
                    disabled={!formData.class_type}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-slate-50 text-xs font-medium focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all disabled:opacity-60"
                  >
                    <option value="">-- Select Timeslot --</option>
                    {getTimeslotOptions(formData.class_type).map(slot => (
                      <option key={slot} value={slot}>{slot}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-600 mb-1.5 uppercase tracking-wider">
                    5. Start Date
                  </label>
                  <input
                    type="date"
                    value={formData.startDate}
                    onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                    required
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-slate-50 text-xs font-medium focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-600 mb-1.5 uppercase tracking-wider">
                    6. Negotiated Monthly Fee (PKR)
                  </label>
                  <input
                    type="number"
                    value={formData.agreed_monthly_fee}
                    onChange={(e) => setFormData({ ...formData, agreed_monthly_fee: e.target.value })}
                    placeholder="5000"
                    required
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-slate-50 text-xs font-mono font-bold text-emerald-700 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                  />
                </div>
              </div>

              <div className="flex gap-3 pt-3">
                <button
                  type="submit"
                  disabled={loading}
                  className="flex-1 py-3 px-4 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold transition-all shadow-xs flex items-center justify-center gap-2 disabled:opacity-60"
                >
                  <CheckCircle2 size={16} />
                  <span>{loading ? "Processing..." : "Confirm Enrollment"}</span>
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedStudent(null)}
                  className="px-5 py-3 rounded-xl border border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-700 text-xs font-bold transition-all"
                >
                  Close
                </button>
              </div>
            </form>
          </div>
        )}
      </div>
    </div>
  );
};

export default CourseEnrollment;
