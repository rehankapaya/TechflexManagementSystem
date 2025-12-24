import React, { useState, useEffect } from 'react';
import { db } from '../firebase.js';
import { useAuth } from '../contexts/AuthContext';
// REMOVED moveBefore to fix the SyntaxError
import { ref, set, push, onValue, remove, update } from 'firebase/database';

const Students = () => {
  const { currentUser, isAdmin } = useAuth();
  const [students, setStudents] = useState([]);
  const [pendingStudents, setPendingStudents] = useState([]);
  const [courses, setCourses] = useState([]);
  
  const [formData, setFormData] = useState({
    name: '',
    courseId: '',
    agreed_monthly_fee: ''
  });

  useEffect(() => {
    // Fetch Courses
    onValue(ref(db, 'courses'), (snap) => {
      const data = snap.val();
      setCourses(data ? Object.keys(data).map(id => ({ id, ...data[id] })) : []);
    });

    // Fetch Active Students
    onValue(ref(db, 'students'), (snap) => {
      const data = snap.val();
      setStudents(data ? Object.keys(data).map(id => ({ id, ...data[id] })) : []);
    });

    // Fetch Pending Approvals
    onValue(ref(db, 'pending_approvals'), (snap) => {
      const data = snap.val();
      setPendingStudents(data ? Object.keys(data).map(id => ({ id, ...data[id] })) : []);
    });
  }, []);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    
    // Logic: When course changes, auto-fill the fee from the course data
    if (name === 'courseId') {
      const selectedCourse = courses.find(c => c.id === value);
      if (selectedCourse) {
        setFormData(prev => ({ 
          ...prev, 
          agreed_monthly_fee: selectedCourse.base_fee 
        }));
      }
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    const selectedCourse = courses.find(c => c.id === formData.courseId);
    
    const studentPayload = {
      name: formData.name,
      addedBy: currentUser.name,
      createdAt: new Date().toISOString(),
      enrolled_courses: {
        [formData.courseId]: {
          course_name: selectedCourse?.name || 'Unknown',
          agreed_monthly_fee: Number(formData.agreed_monthly_fee)
        }
      }
    };

    try {
      if (isAdmin) {
        // Path A: Admin adds directly
        const newRef = push(ref(db, 'students'));
        await set(newRef, { ...studentPayload, status: 'active' });
        alert("Student added directly!");
      } else {
        // Path B: Cashier adds to pending
        const pendingRef = push(ref(db, 'pending_approvals'));
        await set(pendingRef, { ...studentPayload, status: 'pending' });
        alert("Sent to Admin for approval.");
      }
      setFormData({ name: '', courseId: '', agreed_monthly_fee: '' });
    } catch (err) {
      alert("Error: " + err.message);
    }
  };

  const handleApprove = async (tempId, studentData) => {
    try {
      const newStudentRef = push(ref(db, 'students'));
      // Move data from 'pending_approvals' to 'students'
      await set(newStudentRef, { 
        ...studentData, 
        status: 'active', 
        approvedBy: currentUser.name 
      });
      // Delete from pending node
      await remove(ref(db, `pending_approvals/${tempId}`));
    } catch (err) {
      alert(err.message);
    }
  };

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <h2>Student Management</h2>
        <p>Current Role: <strong>{isAdmin ? 'Admin' : 'Cashier'}</strong></p>
      </div>

      <div style={styles.layout}>
        {/* FORM SECTION */}
        <div style={styles.card}>
          <h3>Add Student</h3>
          <form onSubmit={handleSubmit} style={styles.form}>
            <input 
              type="text" name="name" placeholder="Student Name" 
              value={formData.name} onChange={handleChange} required style={styles.input} 
            />
            
            <select name="courseId" value={formData.courseId} onChange={handleChange} required style={styles.input}>
              <option value="">Select Course</option>
              {courses.map(c => (
                <option key={c.id} value={c.id}>{c.name} ({c.duration} Mo)</option>
              ))}
            </select>

            <label style={{fontSize: '12px', color: '#666'}}>Adjust Monthly Fee:</label>
            <input 
              type="number" name="agreed_monthly_fee" value={formData.agreed_monthly_fee} 
              onChange={handleChange} required style={styles.input} 
            />
            
            <button type="submit" style={styles.btnPrimary}>
              {isAdmin ? "Add Now" : "Request Approval"}
            </button>
          </form>
        </div>

        {/* LIST SECTION */}
        <div style={styles.listSection}>
          {isAdmin && pendingStudents.length > 0 && (
            <div style={{...styles.card, borderColor: '#ffcc00', marginBottom: '20px'}}>
              <h3 style={{color: '#cc9900'}}>Pending Approvals</h3>
              {pendingStudents.map(s => (
                <div key={s.id} style={styles.listItem}>
                  <span>{s.name} (Fee: {Object.values(s.enrolled_courses)[0].agreed_monthly_fee})</span>
                  <button onClick={() => handleApprove(s.id, s)} style={styles.btnApprove}>Approve</button>
                </div>
              ))}
            </div>
          )}

          <div style={styles.card}>
            <h3>Active Students</h3>
            {students.map(s => (
              <div key={s.id} style={styles.listItem}>
                <span>{s.name}</span>
                <span style={styles.badge}>{Object.values(s.enrolled_courses)[0].course_name}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

const styles = {
  container: { padding: '20px', fontFamily: 'sans-serif' },
  header: { marginBottom: '20px' },
  layout: { display: 'grid', gridTemplateColumns: '350px 1fr', gap: '20px' },
  card: { background: '#fff', padding: '20px', borderRadius: '10px', boxShadow: '0 2px 10px rgba(0,0,0,0.1)', border: '1px solid #eee' },
  form: { display: 'flex', flexDirection: 'column', gap: '10px' },
  input: { padding: '10px', borderRadius: '5px', border: '1px solid #ccc' },
  btnPrimary: { padding: '12px', background: '#4318ff', color: '#fff', border: 'none', borderRadius: '5px', cursor: 'pointer', fontWeight: 'bold' },
  btnApprove: { background: '#10b981', color: '#fff', border: 'none', padding: '5px 10px', borderRadius: '4px', cursor: 'pointer' },
  listItem: { display: 'flex', justifyContent: 'space-between', padding: '10px 0', borderBottom: '1px solid #f0f0f0', fontSize: '14px' },
  badge: { background: '#eef2ff', color: '#4318ff', padding: '2px 8px', borderRadius: '10px', fontSize: '12px' }
};

export default Students;