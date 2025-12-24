import React, { useState, useEffect } from 'react';
import { db } from '../firebase.js';
import { ref, set, push, onValue, remove, update } from 'firebase/database';

const Courses = () => {
  const [courses, setCourses] = useState([]);
  const [formData, setFormData] = useState({ name: '', base_fee: '', duration: '' }); // duration as number string
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
    // Convert to number if it's the duration or fee field
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
        setIsEditing(null);
      } else {
        const newCourseRef = push(ref(db, 'courses'));
        await set(newCourseRef, formData);
      }
      setFormData({ name: '', base_fee: '', duration: '' });
    } catch (err) {
      alert("Error saving course: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id) => {
    if (window.confirm("Are you sure you want to delete this course?")) {
      await remove(ref(db, `courses/${id}`));
    }
  };

  const startEdit = (course) => {
    setIsEditing(course.id);
    setFormData({
      name: course.name,
      base_fee: course.base_fee,
      duration: course.duration
    });
  };

  return (
    <div style={styles.container}>
      <header style={styles.header}>
        <h1 style={styles.title}>Manage Courses 🎓</h1>
        <p style={styles.subtitle}>Add, update or remove curriculum courses</p>
      </header>

      <div style={styles.layoutGrid}>
        <div style={styles.card}>
          <h3>{isEditing ? '📝 Edit Course' : '➕ Add New Course'}</h3>
          <form onSubmit={handleSubmit} style={styles.form}>
            <div style={styles.inputGroup}>
              <label>Course Name</label>
              <input 
                type="text" name="name" value={formData.name} 
                onChange={handleChange} placeholder="e.g. Web Design" required style={styles.input} 
              />
            </div>
            <div style={styles.inputGroup}>
              <label>Base Fee (PKR)</label>
              <input 
                type="number" name="base_fee" value={formData.base_fee} 
                onChange={handleChange} placeholder="3000" required style={styles.input} 
              />
            </div>
            <div style={styles.inputGroup}>
              {/* UPDATED DURATION FIELD */}
              <label>Duration (Total Months)</label>
              <input 
                type="number" 
                name="duration" 
                value={formData.duration} 
                onChange={handleChange} 
                placeholder="e.g. 3" 
                min="1"
                required 
                style={styles.input} 
              />
            </div>
            <div style={styles.buttonGroup}>
              <button type="submit" disabled={loading} style={styles.submitBtn}>
                {loading ? 'Saving...' : (isEditing ? 'Update Course' : 'Create Course')}
              </button>
              {isEditing && (
                <button type="button" onClick={() => {setIsEditing(null); setFormData({name:'', base_fee:'', duration:''})}} style={styles.cancelBtn}>
                  Cancel
                </button>
              )}
            </div>
          </form>
        </div>

        <div style={styles.listSection}>
          <h3>Course List ({courses.length})</h3>
          <div style={styles.grid}>
            {courses.length > 0 ? courses.map((course) => (
              <div key={course.id} style={styles.courseCard}>
                <div style={styles.courseInfo}>
                  <h4 style={styles.courseName}>{course.name}</h4>
                  <p style={styles.courseDetail}>💰 Fee: {course.base_fee}</p>
                  {/* DISPLAYING DURATION WITH SUFFIX */}
                  <p style={styles.courseDetail}>⏳ Duration: {course.duration} Months</p>
                </div>
                <div style={styles.actions}>
                  <button onClick={() => startEdit(course)} style={styles.editBtn}>Edit</button>
                  <button onClick={() => handleDelete(course.id)} style={styles.deleteBtn}>Delete</button>
                </div>
              </div>
            )) : <p>No courses found. Add one to get started.</p>}
          </div>
        </div>
      </div>
    </div>
  );
};

// ... Styles remain the same as your previous component
const styles = {
    container: { animation: 'fadeIn 0.5s ease-in' },
    header: { marginBottom: '25px' },
    title: { fontSize: '26px', color: '#1b2559', margin: 0 },
    subtitle: { color: '#a3aed0', fontSize: '14px' },
    layoutGrid: { display: 'grid', gridTemplateColumns: '350px 1fr', gap: '30px' },
    card: { background: '#fff', padding: '25px', borderRadius: '15px', boxShadow: '0 4px 20px rgba(0,0,0,0.05)', height: 'fit-content' },
    form: { display: 'flex', flexDirection: 'column', gap: '15px', marginTop: '15px' },
    inputGroup: { display: 'flex', flexDirection: 'column', gap: '5px' },
    input: { padding: '12px', borderRadius: '8px', border: '1px solid #e0e5f2', outline: 'none' },
    submitBtn: { padding: '12px', background: '#4318ff', color: '#fff', border: 'none', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer', flex: 1 },
    cancelBtn: { padding: '12px', background: '#f4f7fe', color: '#1b2559', border: 'none', borderRadius: '8px', cursor: 'pointer' },
    buttonGroup: { display: 'flex', gap: '10px' },
    listSection: { flex: 1 },
    grid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '15px' },
    courseCard: { background: '#fff', padding: '15px', borderRadius: '12px', boxShadow: '0 2px 10px rgba(0,0,0,0.02)', border: '1px solid #f0f0f0' },
    courseName: { margin: '0 0 8px 0', fontSize: '16px', color: '#1b2559' },
    courseDetail: { margin: '2px 0', fontSize: '13px', color: '#707eae' },
    actions: { marginTop: '15px', display: 'flex', gap: '8px' },
    editBtn: { flex: 1, padding: '6px', background: '#eef2ff', color: '#4318ff', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '12px', fontWeight: 'bold' },
    deleteBtn: { flex: 1, padding: '6px', background: '#fff5f5', color: '#e53e3e', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '12px', fontWeight: 'bold' }
  };

export default Courses;