import React, { useState, useEffect } from 'react';
import { db } from '../firebase.js';
import { ref, set, push, onValue, remove, update } from 'firebase/database';

const Courses = () => {
  const [courses, setCourses] = useState([]);
  const [formData, setFormData] = useState({ name: '', base_fee: '', duration: '' });
  const [isEditing, setIsEditing] = useState(null);
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState({ type: '', msg: '' });

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

  useEffect(() => {
    if (status.msg) {
      const timer = setTimeout(() => setStatus({ type: '', msg: '' }), 5000);
      return () => clearTimeout(timer);
    }
  }, [status]);

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
        setStatus({ type: 'success', msg: 'Course updated successfully!' });
        setIsEditing(null);
      } else {
        const newCourseRef = push(ref(db, 'courses'));
        await set(newCourseRef, formData);
        setStatus({ type: 'success', msg: 'New course created!' });
      }
      setFormData({ name: '', base_fee: '', duration: '' });
    } catch (err) {
      setStatus({ type: 'error', msg: "Error saving course: " + err.message });
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id) => {
    if (window.confirm("Are you sure you want to delete this course?")) {
      try {
        await remove(ref(db, `courses/${id}`));
        setStatus({ type: 'success', msg: 'Course deleted.' });
      } catch (err) {
        setStatus({ type: 'error', msg: 'Delete failed: ' + err.message });
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
    <div style={styles.container}>
      <header style={styles.header}>
        <h2 style={styles.title}>Course Catalog 🎓</h2>
        <p style={styles.subtitle}>Structure your curriculum and manage tuition fees.</p>
      </header>

      {status.msg && (
        <div style={{
          ...styles.statusBanner, 
          backgroundColor: status.type === 'success' ? '#F0FDF4' : '#FEF2F2',
          color: status.type === 'success' ? '#166534' : '#991B1B',
          borderColor: status.type === 'success' ? '#BBF7D0' : '#FCA5A5'
        }}>
          {status.type === 'success' ? '✅ ' : '⚠️ '} {status.msg}
        </div>
      )}

      <div style={styles.layoutStack}>
        {/* FORM SECTION (TOP) */}
        <div style={styles.card}>
          <h3 style={styles.cardTitle}>{isEditing ? '📝 Edit Course' : '➕ Create New Course'}</h3>
          <form onSubmit={handleSubmit} style={styles.form}>
            <div style={styles.inputGroup}>
              <label style={styles.label}>Course Name</label>
              <input 
                type="text" name="name" value={formData.name} 
                onChange={handleChange} placeholder="e.g. Graphic Design" 
                required style={styles.input} 
              />
            </div>
            
            <div className="form-row" style={styles.inputRow}>
              <div style={styles.inputGroup}>
                <label style={styles.label}>Base Fee (PKR)</label>
                <input 
                  type="number" name="base_fee" value={formData.base_fee} 
                  onChange={handleChange} placeholder="5000" 
                  required style={styles.input} 
                />
              </div>
              <div style={styles.inputGroup}>
                <label style={styles.label}>Duration (Months)</label>
                <input 
                  type="number" name="duration" value={formData.duration} 
                  onChange={handleChange} placeholder="3" 
                  min="1" required style={styles.input} 
                />
              </div>
            </div>

            <div style={styles.buttonGroup}>
              <button type="submit" disabled={loading} style={styles.submitBtn}>
                {loading ? 'Processing...' : (isEditing ? 'Update Course' : 'Create Course')}
              </button>
              {isEditing && (
                <button type="button" onClick={() => {setIsEditing(null); setFormData({name:'', base_fee:'', duration:''})}} style={styles.cancelBtn}>
                  Cancel
                </button>
              )}
            </div>
          </form>
        </div>

        {/* TABLE SECTION (BOTTOM) */}
        <div style={styles.tableCard}>
          <div style={styles.tableHeader}>
            <h3 style={styles.cardTitle}>Active Courses</h3>
            <span style={styles.countBadge}>{courses.length} Courses Found</span>
          </div>
          <div style={styles.tableWrapper}>
            <table style={styles.table}>
              <thead>
                <tr>
                  <th style={styles.th}>Course Name</th>
                  <th style={styles.th}>Duration</th>
                  <th style={styles.th}>Base Fee</th>
                  <th style={styles.th}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {courses.length > 0 ? courses.map((course) => (
                  <tr key={course.id} style={styles.tr}>
                    <td style={styles.td}>
                      <span style={styles.courseNameText}>{course.name}</span>
                    </td>
                    <td style={styles.td}>
                      <span style={styles.durationBadge}>{course.duration} Mo</span>
                    </td>
                    <td style={styles.td}>
                      <span style={styles.feeText}>PKR {course.base_fee.toLocaleString()}</span>
                    </td>
                    <td style={styles.td}>
                      <div style={styles.actionContainer}>
                        <button onClick={() => startEdit(course)} style={styles.editIconBtn} title="Edit">✏️</button>
                        <button onClick={() => handleDelete(course.id)} style={styles.deleteIconBtn} title="Delete">🗑️</button>
                      </div>
                    </td>
                  </tr>
                )) : (
                  <tr>
                    <td colSpan="4" style={styles.emptyTd}>No courses found in the system.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <style>{`
        @media (max-width: 768px) {
          .form-row {
            flex-direction: column !important;
            gap: 16px !important;
          }
        }
      `}</style>
    </div>
  );
};

const styles = {
  container: { maxWidth: '1200px', margin: '0 auto', padding: '10px' },
  header: { marginBottom: '24px' },
  title: { fontSize: '24px', fontWeight: '700', color: '#1E293B', margin: '0 0 4px 0' },
  subtitle: { color: '#64748B', fontSize: '14px' },
  statusBanner: { padding: '12px 18px', borderRadius: '10px', marginBottom: '20px', border: '1px solid', fontSize: '14px', fontWeight: '500' },
  
  // Adjusted for stacked layout
  layoutStack: { display: 'flex', flexDirection: 'column', gap: '30px' },
  
  // Form Card - constrained width so it doesn't look huge on desktop
  card: { background: '#fff', padding: '28px', borderRadius: '16px', border: '1px solid #E2E8F0', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)', maxWidth: '600px', width: '100%' },
  cardTitle: { fontSize: '16px', fontWeight: '700', color: '#1E293B', margin: 0 },
  form: { display: 'flex', flexDirection: 'column', gap: '20px', marginTop: '20px' },
  inputGroup: { display: 'flex', flexDirection: 'column', gap: '8px', flex: 1 },
  inputRow: { display: 'flex', gap: '15px' },
  label: { fontSize: '13px', fontWeight: '600', color: '#475569' },
  input: { padding: '12px 16px', borderRadius: '10px', border: '1px solid #E2E8F0', backgroundColor: '#F8FAFC', outline: 'none', fontSize: '14px', transition: 'border-color 0.2s' },
  
  buttonGroup: { display: 'flex', gap: '10px', marginTop: '5px' },
  submitBtn: { flex: 2, padding: '12px', background: '#3B82F6', color: '#fff', border: 'none', borderRadius: '10px', fontWeight: '600', cursor: 'pointer', transition: 'opacity 0.2s' },
  cancelBtn: { flex: 1, padding: '12px', background: '#F1F5F9', color: '#475569', border: 'none', borderRadius: '10px', fontWeight: '600', cursor: 'pointer' },

  // Table Card - takes full width
  tableCard: { background: '#fff', borderRadius: '16px', border: '1px solid #E2E8F0', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)', overflow: 'hidden', width: '100%' },
  tableHeader: { padding: '20px 24px', borderBottom: '1px solid #E2E8F0', display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#fff' },
  countBadge: { background: '#EFF6FF', color: '#3B82F6', padding: '4px 12px', borderRadius: '20px', fontSize: '12px', fontWeight: '700' },
  tableWrapper: { overflowX: 'auto' },
  table: { width: '100%', borderCollapse: 'collapse', textAlign: 'left', minWidth: '600px' },
  th: { padding: '16px 24px', background: '#F8FAFC', fontSize: '12px', fontWeight: '700', color: '#64748B', borderBottom: '1px solid #E2E8F0', textTransform: 'uppercase', letterSpacing: '0.05em' },
  tr: { borderBottom: '1px solid #F1F5F9', transition: 'background 0.2s' },
  td: { padding: '18px 24px', fontSize: '14px', verticalAlign: 'middle' },
  courseNameText: { fontWeight: '600', color: '#1E293B' },
  durationBadge: { background: '#F1F5F9', color: '#475569', padding: '4px 10px', borderRadius: '6px', fontSize: '12px', fontWeight: '600' },
  feeText: { color: '#10B981', fontWeight: '700' },
  
  actionContainer: { display: 'flex', gap: '10px' },
  editIconBtn: { background: '#EFF6FF', border: 'none', borderRadius: '8px', padding: '8px', cursor: 'pointer', transition: '0.2s' },
  deleteIconBtn: { background: '#FEF2F2', border: 'none', borderRadius: '8px', padding: '8px', cursor: 'pointer', transition: '0.2s' },
  
  emptyTd: { padding: '60px', textAlign: 'center', color: '#94A3B8', fontSize: '15px' }
};

export default Courses;