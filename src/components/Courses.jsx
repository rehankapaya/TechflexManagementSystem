import React, { useState, useEffect } from 'react';
import { db } from '../firebase.js';
import { ref, set, push, onValue, remove, update } from 'firebase/database';
import toast from 'react-hot-toast';
import {
  BookOpen,
  Plus,
  Pencil,
  Trash2,
  Clock,
  CreditCard,
  Layers,
  CheckCircle2,
  X
} from 'lucide-react';

const Courses = () => {
  const [courses, setCourses] = useState([]);
  const [formData, setFormData] = useState({ name: '', base_fee: '', duration: '' });
  const [isEditing, setIsEditing] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const coursesRef = ref(db, 'courses');
    const unsubscribe = onValue(coursesRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        const list = Object.keys(data).map((id) => ({
          id,
          ...data[id],
        }));
        setCourses(list);
      } else {
        setCourses([]);
      }
    });
    return () => unsubscribe();
  }, []);

  const handleChange = (e) => {
    const value = (e.target.name === 'duration' || e.target.name === 'base_fee')
      ? Number(e.target.value)
      : e.target.value;
    setFormData({ ...formData, [e.target.name]: value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (isEditing) {
        await update(ref(db, `courses/${isEditing}`), formData);
        toast.success('Course updated successfully!');
        setIsEditing(null);
      } else {
        const newCourseRef = push(ref(db, 'courses'));
        await set(newCourseRef, formData);
        toast.success('New course created!');
      }
      setFormData({ name: '', base_fee: '', duration: '' });
    } catch (err) {
      toast.error("Error saving course: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id) => {
    if (window.confirm("Are you sure you want to delete this course?")) {
      try {
        await remove(ref(db, `courses/${id}`));
        toast.success('Course deleted.');
      } catch (err) {
        toast.error('Delete failed: ' + err.message);
      }
    }
  };

  const startEdit = (course) => {
    setIsEditing(course.id);
    setFormData({
      name: course.name,
      base_fee: course.base_fee,
      duration: course.duration
    });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <div className="space-y-6 font-sans animate-fade-in">
      {/* HEADER */}
      <header className="pb-2 border-b border-slate-200/80">
        <div className="flex items-center gap-2">
          <BookOpen className="text-blue-600" size={24} />
          <h1 className="text-2xl md:text-3xl font-extrabold text-slate-900 tracking-tight">Course Catalog</h1>
        </div>
        <p className="text-sm text-slate-500 mt-1 font-medium">Curriculum definitions, duration schedules & baseline tuition fees</p>
      </header>

      {/* STACKED / GRID LAYOUT */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* CREATE / EDIT COURSE FORM (5 cols) */}
        <div className="lg:col-span-5 bg-white p-6 rounded-2xl border border-slate-200/80 shadow-xs">
          <div className="flex items-center justify-between pb-3 mb-5 border-b border-slate-100">
            <h2 className="text-base font-bold text-slate-900 tracking-tight flex items-center gap-2">
              {isEditing ? <Pencil size={18} className="text-amber-600" /> : <Plus size={18} className="text-blue-600" />}
              <span>{isEditing ? 'Edit Course Details' : 'Create New Course'}</span>
            </h2>
            {isEditing && (
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200">
                Editing
              </span>
            )}
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-600 mb-1.5 uppercase tracking-wider">
                Course Title
              </label>
              <input
                type="text"
                name="name"
                value={formData.name}
                onChange={handleChange}
                placeholder="e.g. Full Stack Web Development"
                required
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-slate-50 text-xs font-semibold focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1.5 uppercase tracking-wider">
                  Base Fee (PKR)
                </label>
                <input
                  type="number"
                  name="base_fee"
                  value={formData.base_fee}
                  onChange={handleChange}
                  placeholder="5000"
                  required
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-slate-50 text-xs font-mono font-bold text-emerald-700 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1.5 uppercase tracking-wider">
                  Duration (Months)
                </label>
                <input
                  type="number"
                  name="duration"
                  value={formData.duration}
                  onChange={handleChange}
                  placeholder="3"
                  min="1"
                  required
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-slate-50 text-xs font-mono font-medium focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                />
              </div>
            </div>

            <div className="flex gap-2.5 pt-2">
              <button
                type="submit"
                disabled={loading}
                className="flex-1 py-3 px-4 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold transition-all shadow-xs flex items-center justify-center gap-2 disabled:opacity-60"
              >
                <CheckCircle2 size={16} />
                <span>{loading ? 'Processing...' : (isEditing ? 'Update Course' : 'Create Course')}</span>
              </button>

              {isEditing && (
                <button
                  type="button"
                  onClick={() => {
                    setIsEditing(null);
                    setFormData({ name: '', base_fee: '', duration: '' });
                  }}
                  className="px-4 py-3 rounded-xl border border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-700 text-xs font-bold transition-all"
                >
                  Cancel
                </button>
              )}
            </div>
          </form>
        </div>

        {/* ACTIVE COURSES TABLE (7 cols) */}
        <div className="lg:col-span-7 bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
          <div className="p-4 bg-slate-50/70 border-b border-slate-200/80 flex items-center justify-between text-xs font-bold text-slate-600">
            <span>Active Curriculum ({courses.length})</span>
            <span className="text-xs font-mono font-bold text-blue-600 bg-blue-50 px-2.5 py-0.5 rounded-md">
              {courses.length} Courses
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 uppercase font-bold tracking-wider text-[11px]">
                  <th className="py-3 px-4">Course Name</th>
                  <th className="py-3 px-4">Duration</th>
                  <th className="py-3 px-4 text-right">Base Tuition</th>
                  <th className="py-3 px-4 text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {courses.length > 0 ? (
                  courses.map((course) => (
                    <tr key={course.id} className="hover:bg-slate-50/70 transition-colors">
                      <td className="py-3.5 px-4 font-bold text-slate-900">{course.name}</td>
                      <td className="py-3.5 px-4">
                        <span className="inline-flex items-center gap-1 bg-slate-100 text-slate-700 px-2.5 py-1 rounded-md text-[11px] font-mono font-semibold">
                          <Clock size={12} className="text-slate-400" />
                          <span>{course.duration} Months</span>
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-right font-mono font-bold text-emerald-700">
                        PKR {Number(course.base_fee).toLocaleString()}
                      </td>
                      <td className="py-3.5 px-4 text-center">
                        <div className="inline-flex items-center gap-1">
                          <button
                            onClick={() => startEdit(course)}
                            className="p-1.5 rounded-lg text-blue-600 hover:bg-blue-50 transition-colors"
                            title="Edit Course"
                          >
                            <Pencil size={15} />
                          </button>
                          <button
                            onClick={() => handleDelete(course.id)}
                            className="p-1.5 rounded-lg text-rose-600 hover:bg-rose-50 transition-colors"
                            title="Delete Course"
                          >
                            <Trash2 size={15} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="4" className="py-12 text-center text-slate-400 text-xs">
                      No courses found in the catalog.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Courses;
