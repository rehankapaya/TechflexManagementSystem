import React, { useState, useEffect } from 'react';
import { db } from '../firebase.js';
import { ref, onValue, update } from 'firebase/database';

const CourseEnrollment = () => {
  const [students, setStudents] = useState([]);
  const [courses, setCourses] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [loading, setLoading] = useState(false);

  const [formData, setFormData] = useState({
    courseId: '',
    agreed_monthly_fee: ''
  });

  useEffect(() => {
    // Fetch Students
    onValue(ref(db, 'students'), (snap) => {
      const data = snap.val();
      setStudents(data ? Object.keys(data).map(id => ({ id, ...data[id] })) : []);
    });

    // Fetch Available Courses
    onValue(ref(db, 'courses'), (snap) => {
      const data = snap.val();
      setCourses(data ? Object.keys(data).map(id => ({ id, ...data[id] })) : []);
    });
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
    if (!selectedStudent || !formData.courseId) return alert("Please select student and course");

    // Check if student is already enrolled in this course
    if (selectedStudent.enrolled_courses && selectedStudent.enrolled_courses[formData.courseId]) {
      return alert("Student is already enrolled in this course!");
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
      // Logic: Update only the specific course key inside enrolled_courses
      // This prevents overwriting previous courses
      await update(ref(db, `students/${selectedStudent.id}/enrolled_courses/${formData.courseId}`), newCourseEntry);
      
      alert(`Successfully enrolled ${selectedStudent.name} in ${selectedCourseData.name}`);
      setSelectedStudent(null);
      setFormData({ courseId: '', agreed_monthly_fee: '' });
      setSearchTerm('');
    } catch (err) {
      alert("Enrollment failed: " + err.message);
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
      <header style={styles.header}>
        <h2>Multi-Course Enrollment 🎓</h2>
        <p>Enroll existing students into additional courses without duplicating records.</p>
      </header>

      <div style={styles.card}>
        <div style={styles.searchSection}>
          <label style={styles.label}>1. Find Student (ID or Name)</label>
          <input 
            type="text" 
            placeholder="Search..." 
            value={searchTerm} 
            onChange={(e) => setSearchTerm(e.target.value)}
            style={styles.input}
          />
          {searchTerm && !selectedStudent && (
            <div style={styles.dropdown}>
              {filteredStudents.map(s => (
                <div key={s.id} onClick={() => setSelectedStudent(s)} style={styles.dropdownItem}>
                  <strong>{s.student_id}</strong> - {s.name}
                </div>
              ))}
            </div>
          )}
        </div>

        {selectedStudent && (
          <form onSubmit={handleEnroll} style={styles.form}>
            <div style={styles.studentInfo}>
              <p>Selected: <strong>{selectedStudent.name}</strong> ({selectedStudent.student_id})</p>
              <p style={{fontSize: '12px', color: '#64748b'}}>
                Current Enrollments: {Object.values(selectedStudent.enrolled_courses || {}).map(c => c.course_name).join(', ')}
              </p>
            </div>

            <label style={styles.label}>2. Select New Course</label>
            <select value={formData.courseId} onChange={handleCourseChange} style={styles.input} required>
              <option value="">-- Select Course --</option>
              {courses.map(c => (
                <option key={c.id} value={c.id}>{c.name} (PKR {c.base_fee})</option>
              ))}
            </select>

            <label style={styles.label}>3. Agreed Monthly Fee</label>
            <input 
              type="number" 
              value={formData.agreed_monthly_fee} 
              onChange={(e) => setFormData({...formData, agreed_monthly_fee: e.target.value})}
              style={styles.input}
              required
            />

            <div style={{display: 'flex', gap: '10px'}}>
              <button type="submit" disabled={loading} style={styles.btnPrimary}>
                {loading ? "Enrolling..." : "Add New Course"}
              </button>
              <button type="button" onClick={() => setSelectedStudent(null)} style={styles.btnCancel}>Cancel</button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};

const styles = {
  container: { padding: '30px', background: '#f8fafc', minHeight: '100vh', fontFamily: 'system-ui' },
  header: { marginBottom: '25px' },
  card: { background: '#fff', padding: '24px', borderRadius: '16px', boxShadow: '0 4px 6px rgba(0,0,0,0.05)', maxWidth: '500px' },
  searchSection: { position: 'relative', marginBottom: '20px' },
  label: { display: 'block', fontSize: '13px', fontWeight: 'bold', color: '#475569', marginBottom: '8px' },
  input: { width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid #cbd5e1', marginBottom: '15px', boxSizing: 'border-box' },
  dropdown: { position: 'absolute', top: '100%', left: 0, right: 0, background: '#fff', border: '1px solid #e2e8f0', borderRadius: '8px', zIndex: 10, boxShadow: '0 10px 15px rgba(0,0,0,0.1)' },
  dropdownItem: { padding: '12px', cursor: 'pointer', borderBottom: '1px solid #f1f5f9' },
  studentInfo: { background: '#f1f5f9', padding: '15px', borderRadius: '8px', marginBottom: '20px' },
  btnPrimary: { flex: 2, background: '#4318ff', color: '#fff', padding: '12px', border: 'none', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer' },
  btnCancel: { flex: 1, background: '#e2e8f0', color: '#475569', padding: '12px', border: 'none', borderRadius: '8px', cursor: 'pointer' }
};

export default CourseEnrollment;