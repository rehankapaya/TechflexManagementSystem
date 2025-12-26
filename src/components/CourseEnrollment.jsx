import React, { useState, useEffect } from 'react';
import { db } from '../firebase.js';
import { ref, onValue, update } from 'firebase/database';

const CourseEnrollment = () => {
  const [students, setStudents] = useState([]);
  const [courses, setCourses] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState({ type: '', msg: '' });

  const [formData, setFormData] = useState({
    courseId: '',
    agreed_monthly_fee: ''
  });

  useEffect(() => {
    const studentsRef = ref(db, 'students');
    const coursesRef = ref(db, 'courses');

    const unsubStudents = onValue(studentsRef, (snap) => {
      const data = snap.val();
      setStudents(data ? Object.keys(data).map(id => ({ id, ...data[id] })) : []);
    });

    const unsubCourses = onValue(coursesRef, (snap) => {
      const data = snap.val();
      setCourses(data ? Object.keys(data).map(id => ({ id, ...data[id] })) : []);
    });

    return () => {
      unsubStudents();
      unsubCourses();
    };
  }, []);

  const handleCourseChange = (e) => {
    const courseId = e.target.value;
    const course = courses.find(c => c.id === courseId);
    setFormData({
      courseId,
      agreed_monthly_fee: course ? course.base_fee : ''
    });
  };

  const handleEnroll = async (e) => {
    e.preventDefault();
    if (!selectedStudent || !formData.courseId) {
      setStatus({ type: 'error', msg: "Please select student and course" });
      return;
    }

    if (selectedStudent.enrolled_courses && selectedStudent.enrolled_courses[formData.courseId]) {
      setStatus({ type: 'error', msg: "Student is already enrolled in this course!" });
      return;
    }

    setLoading(true);
    const selectedCourseData = courses.find(c => c.id === formData.courseId);

    const newCourseEntry = {
      course_name: selectedCourseData.name,
      duration: selectedCourseData.duration,
      agreed_monthly_fee: Number(formData.agreed_monthly_fee),
      enrolledAt: new Date().toISOString(),
      course_status: 'active'
    };

    try {
      await update(ref(db, `students/${selectedStudent.id}/enrolled_courses/${formData.courseId}`), newCourseEntry);
      
      setStatus({ type: 'success', msg: `Successfully enrolled ${selectedStudent.name} in ${selectedCourseData.name}` });
      setSelectedStudent(null);
      setFormData({ courseId: '', agreed_monthly_fee: '' });
      setSearchTerm('');
    } catch (err) {
      setStatus({ type: 'error', msg: "Enrollment failed: " + err.message });
    } finally {
      setLoading(false);
    }
  };

  const filteredStudents = students.filter(s => 
    s.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    s.student_id?.toLowerCase().includes(searchTerm.toLowerCase())
  ).slice(0, 5);

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <h2 style={styles.title}>Multi-Course Enrollment 🎓</h2>
        <p style={styles.subtitle}>Add new courses to existing student profiles seamlessly.</p>
      </div>

      {status.msg && (
        <div style={{
          ...styles.statusBanner, 
          backgroundColor: status.type === 'success' ? '#F0FDF4' : '#FEF2F2',
          color: status.type === 'success' ? '#166534' : '#991B1B',
          borderColor: status.type === 'success' ? '#BBF7D0' : '#FCA5A5'
        }}>
          {status.type === 'success' ? '✅ ' : '⚠️ '} {status.msg}
          <button onClick={() => setStatus({type:'', msg:''})} style={styles.closeStatus}>×</button>
        </div>
      )}

      <div style={styles.card}>
        <div style={styles.section}>
          <label style={styles.label}>1. Search Student (ID or Name)</label>
          <div style={styles.searchContainer}>
            <input 
              type="text" 
              placeholder="Start typing student name..." 
              value={searchTerm} 
              onChange={(e) => setSearchTerm(e.target.value)}
              style={styles.input}
            />
            {searchTerm && !selectedStudent && (
              <div style={styles.dropdown}>
                {filteredStudents.length > 0 ? filteredStudents.map(s => (
                  <div key={s.id} onClick={() => setSelectedStudent(s)} style={styles.dropdownItem}>
                    <div style={styles.dropId}>{s.student_id}</div>
                    <div style={styles.dropName}>{s.name}</div>
                  </div>
                )) : <div style={styles.noResult}>No students found</div>}
              </div>
            )}
          </div>
        </div>

        {selectedStudent && (
          <form onSubmit={handleEnroll} style={styles.formAnim}>
            <div style={styles.studentBadge}>
              <div style={styles.badgeLabel}>Target Student</div>
              <div style={styles.badgeMain}>{selectedStudent.name} <span style={styles.badgeId}>({selectedStudent.student_id})</span></div>
              <div style={styles.badgeList}>
                Currently Enrolled: {Object.values(selectedStudent.enrolled_courses || {}).length > 0 
                  ? Object.values(selectedStudent.enrolled_courses).map(c => c.course_name).join(', ') 
                  : 'None'}
              </div>
            </div>

            <div style={styles.section}>
              <label style={styles.label}>2. Select New Course</label>
              <select value={formData.courseId} onChange={handleCourseChange} style={styles.input} required>
                <option value="">-- Choose from available courses --</option>
                {courses.map(c => (
                  <option key={c.id} value={c.id}>{c.name} (Base Fee: {c.base_fee})</option>
                ))}
              </select>
            </div>

            <div style={styles.section}>
              <label style={styles.label}>3. Negotiated Monthly Fee</label>
              <input 
                type="number" 
                value={formData.agreed_monthly_fee} 
                onChange={(e) => setFormData({...formData, agreed_monthly_fee: e.target.value})}
                style={styles.input}
                placeholder="0.00"
                required
              />
            </div>

            <div style={styles.btnGroup}>
              <button type="submit" disabled={loading} style={styles.btnPrimary}>
                {loading ? "Processing..." : "Confirm Enrollment"}
              </button>
              <button type="button" onClick={() => setSelectedStudent(null)} style={styles.btnCancel}>Reset</button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};

const styles = {
  container: { maxWidth: '800px', margin: '0 auto' },
  header: { marginBottom: '30px' },
  title: { fontSize: '24px', fontWeight: '700', color: '#1E293B', margin: '0 0 8px 0' },
  subtitle: { color: '#64748B', fontSize: '14px' },
  
  card: { background: '#fff', padding: '32px', borderRadius: '16px', border: '1px solid #E2E8F0', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)' },
  
  statusBanner: { padding: '12px 20px', borderRadius: '10px', marginBottom: '20px', border: '1px solid', fontSize: '14px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' },
  closeStatus: { background: 'none', border: 'none', fontSize: '18px', cursor: 'pointer', opacity: 0.5 },

  section: { marginBottom: '20px' },
  label: { display: 'block', fontSize: '13px', fontWeight: '600', color: '#475569', marginBottom: '8px' },
  input: { width: '100%', padding: '12px 16px', borderRadius: '10px', border: '1px solid #E2E8F0', backgroundColor: '#F8FAFC', fontSize: '14px', outline: 'none', transition: 'border-color 0.2s', boxSizing: 'border-box' },
  
  searchContainer: { position: 'relative' },
  dropdown: { position: 'absolute', top: '100%', left: 0, right: 0, background: '#fff', border: '1px solid #E2E8F0', borderRadius: '12px', zIndex: 100, boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)', marginTop: '5px', overflow: 'hidden' },
  dropdownItem: { padding: '12px 16px', cursor: 'pointer', borderBottom: '1px solid #F1F5F9', display: 'flex', justifyContent: 'space-between', transition: 'background 0.2s' },
  dropId: { fontSize: '12px', fontWeight: 'bold', color: '#3B82F6' },
  dropName: { fontSize: '14px', color: '#1E293B' },
  noResult: { padding: '15px', textAlign: 'center', color: '#94A3B8', fontSize: '14px' },

  studentBadge: { backgroundColor: '#F1F5F9', padding: '20px', borderRadius: '12px', marginBottom: '25px', borderLeft: '4px solid #3B82F6' },
  badgeLabel: { fontSize: '10px', color: '#64748B', fontWeight: 'bold', textTransform: 'uppercase', marginBottom: '4px' },
  badgeMain: { fontSize: '16px', fontWeight: '700', color: '#1E293B' },
  badgeId: { color: '#3B82F6', fontWeight: '500' },
  badgeList: { fontSize: '12px', color: '#64748B', marginTop: '8px' },

  btnGroup: { display: 'flex', gap: '12px', marginTop: '30px' },
  btnPrimary: { flex: 2, background: '#3B82F6', color: '#fff', padding: '14px', border: 'none', borderRadius: '10px', fontWeight: '600', cursor: 'pointer', transition: 'background 0.2s' },
  btnCancel: { flex: 1, background: '#F1F5F9', color: '#475569', padding: '14px', border: 'none', borderRadius: '10px', fontWeight: '600', cursor: 'pointer' },

  formAnim: { animation: 'fadeIn 0.3s ease-out' }
};

export default CourseEnrollment;